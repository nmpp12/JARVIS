"""
Speculative Decoding for MOM.

Achieves 2-4x faster generation by using a small draft model to predict
multiple tokens at once, then verifying them in parallel with the main model.

Based on "Fast Inference from Transformers via Speculative Decoding"
(Leviathan et al., 2023) and "SpecInfer" (Miao et al., 2023).

The key insight: a single forward pass of the main model on K tokens
costs almost the same as a single forward pass on 1 token (due to
GPU parallelism). So we speculatively generate K tokens with a tiny
draft model, verify them all at once, and accept the longest prefix
that matches the main model's distribution.

With a good draft model, acceptance rate is 70-90%, yielding 2-4x speedup.
"""

import torch
import torch.nn.functional as F
from typing import List, Optional, Tuple

from ..model.transformer import MOMTransformer
from ..model.config import ModelConfig


class SpeculativeDecoder:
    """Speculative decoding engine for 2-4x faster token generation.

    Uses a small draft model (e.g., 2-layer tiny MOM) to speculatively
    generate K candidate tokens, then verifies them in a single forward
    pass of the main model.
    """

    def __init__(
        self,
        main_model: MOMTransformer,
        draft_model: MOMTransformer,
        tokenizer,
        num_speculative: int = 5,
        device: Optional[torch.device] = None,
    ):
        self.main_model = main_model
        self.draft_model = draft_model
        self.tokenizer = tokenizer
        self.num_speculative = num_speculative
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.main_model.to(self.device).eval()
        self.draft_model.to(self.device).eval()

        # Statistics
        self.total_draft_tokens = 0
        self.accepted_tokens = 0

    @torch.no_grad()
    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 256,
        temperature: float = 0.7,
        top_k: int = 50,
        top_p: float = 0.9,
    ) -> str:
        """Generate text with speculative decoding."""
        input_ids = self.tokenizer.encode(prompt, add_bos=True, add_eos=False)
        input_ids = torch.tensor([input_ids], dtype=torch.long, device=self.device)

        eos_id = self.tokenizer.eos_token_id
        generated = input_ids[0].tolist()

        # Initial prefill for both models
        main_out = self.main_model(input_ids=input_ids, use_cache=True)
        main_kv = main_out["kv_caches"]
        draft_out = self.draft_model(input_ids=input_ids, use_cache=True)
        draft_kv = draft_out["kv_caches"]

        main_logits = main_out["logits"][:, -1, :]
        tokens_generated = 0

        while tokens_generated < max_new_tokens:
            # Phase 1: Draft model generates K speculative tokens
            draft_tokens = []
            draft_probs = []
            current_draft_kv = draft_kv

            # Sample first token from main model's last logits
            first_token = self._sample(main_logits[0], temperature, top_k, top_p)

            # Use draft model to generate K-1 more tokens
            draft_input = torch.tensor([[first_token]], device=self.device)
            for _ in range(self.num_speculative - 1):
                d_out = self.draft_model(
                    input_ids=draft_input, kv_caches=current_draft_kv, use_cache=True
                )
                current_draft_kv = d_out["kv_caches"]
                d_logits = d_out["logits"][:, -1, :]
                d_probs = self._get_probs(d_logits[0], temperature, top_k, top_p)
                d_token = torch.multinomial(d_probs, 1).item()
                draft_tokens.append(d_token)
                draft_probs.append(d_probs)
                draft_input = torch.tensor([[d_token]], device=self.device)

            # Build full candidate sequence: [first_token] + draft_tokens
            candidate = [first_token] + draft_tokens
            candidate_tensor = torch.tensor([candidate], device=self.device)

            # Phase 2: Verify all candidates with main model in ONE forward pass
            main_out = self.main_model(
                input_ids=candidate_tensor, kv_caches=main_kv, use_cache=True
            )
            main_verify_kv = main_out["kv_caches"]
            verify_logits = main_out["logits"]  # (1, K, vocab)

            # Phase 3: Accept/reject using rejection sampling
            accepted = [first_token]  # First token always accepted (from main model)
            all_accepted = True

            for i, (draft_tok, draft_p) in enumerate(zip(draft_tokens, draft_probs)):
                main_p = self._get_probs(verify_logits[0, i], temperature, top_k, top_p)

                # Rejection sampling: accept if main_p >= draft_p for this token
                acceptance_prob = torch.clamp(main_p[draft_tok] / (draft_p[draft_tok] + 1e-10), max=1.0)

                if torch.rand(1, device=self.device).item() < acceptance_prob.item():
                    accepted.append(draft_tok)
                    self.accepted_tokens += 1
                else:
                    # Reject: sample from adjusted distribution
                    adjusted = torch.clamp(main_p - draft_p, min=0)
                    adjusted = adjusted / (adjusted.sum() + 1e-10)
                    corrected_token = torch.multinomial(adjusted, 1).item()
                    accepted.append(corrected_token)
                    all_accepted = False
                    break

                self.total_draft_tokens += 1

            if all_accepted:
                # All draft tokens accepted, sample one more from main model
                bonus_token = self._sample(
                    verify_logits[0, -1], temperature, top_k, top_p
                )
                accepted.append(bonus_token)

            # Update generated sequence
            generated.extend(accepted)
            tokens_generated += len(accepted)

            # Check for EOS
            if eos_id in accepted:
                break

            # Update KV caches to reflect accepted tokens only.
            # main_verify_kv has shape [..., prev_len + K, ...] after verifying K candidates.
            # We need to keep only prev_len + num_accepted positions.
            num_accepted = len(accepted)
            prev_len = main_kv[0][0].shape[2] if main_kv and main_kv[0] is not None else 0
            main_kv = self._trim_kv_cache(main_verify_kv, prev_len + num_accepted)

            # Re-prefill draft model from accepted tokens so its KV state is in sync.
            accepted_tensor = torch.tensor([accepted], device=self.device)
            draft_out = self.draft_model(input_ids=accepted_tensor, kv_caches=draft_kv, use_cache=True)
            draft_kv = draft_out["kv_caches"]

            # Main model logit for the next step = prediction at the last accepted position.
            main_logits = verify_logits[:, num_accepted - 1:num_accepted, :]

        response_ids = generated[len(input_ids[0]):]
        return self.tokenizer.decode(response_ids, skip_special=True)

    def _trim_kv_cache(self, kv_caches, total_length: int):
        """Trim every layer's KV cache to exactly total_length positions.

        Args:
            kv_caches: list of (k, v) tensors with shape (B, H, seq_len, head_dim)
            total_length: number of positions to retain (prefix of the sequence)
        """
        trimmed = []
        for layer_kv in kv_caches:
            if layer_kv is None:
                trimmed.append(None)
                continue
            k, v = layer_kv
            trimmed.append((k[:, :, :total_length], v[:, :, :total_length]))
        return trimmed

    def _sample(self, logits, temperature, top_k, top_p):
        probs = self._get_probs(logits, temperature, top_k, top_p)
        return torch.multinomial(probs, 1).item()

    def _get_probs(self, logits, temperature, top_k, top_p):
        if temperature == 0:
            probs = torch.zeros_like(logits)
            probs[logits.argmax()] = 1.0
            return probs

        logits = logits / temperature

        if top_k > 0:
            top_k = min(top_k, logits.size(-1))
            kth = torch.topk(logits, top_k).values[-1]
            logits[logits < kth] = float("-inf")

        if top_p < 1.0:
            sorted_logits, sorted_idx = torch.sort(logits, descending=True)
            cum_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
            remove = cum_probs > top_p
            remove[1:] = remove[:-1].clone()
            remove[0] = False
            logits[sorted_idx[remove]] = float("-inf")

        return F.softmax(logits, dim=-1)

    @property
    def acceptance_rate(self) -> float:
        if self.total_draft_tokens == 0:
            return 0.0
        return self.accepted_tokens / self.total_draft_tokens

    @property
    def speedup_estimate(self) -> float:
        """Estimate speedup from speculative decoding."""
        ar = self.acceptance_rate
        k = self.num_speculative
        # Expected tokens per step: 1 + ar + ar^2 + ... + ar^k
        expected = sum(ar ** i for i in range(k + 1))
        return expected

    @classmethod
    def from_checkpoint(
        cls,
        main_checkpoint: str,
        draft_checkpoint: Optional[str] = None,
        num_speculative: int = 5,
        device: Optional[str] = None,
    ) -> "SpeculativeDecoder":
        """Load speculative decoder from checkpoints.

        If no draft checkpoint is provided, creates a tiny draft model
        automatically from the main model's config.
        """
        import os

        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        device = torch.device(device)

        # Load main model
        config = ModelConfig.load(os.path.join(main_checkpoint, "model_config.json"))
        main_model = MOMTransformer(config)
        main_model.load_state_dict(
            torch.load(os.path.join(main_checkpoint, "model.pt"), map_location=device)
        )

        # Load or create draft model
        if draft_checkpoint:
            draft_config = ModelConfig.load(os.path.join(draft_checkpoint, "model_config.json"))
            draft_model = MOMTransformer(draft_config)
            draft_model.load_state_dict(
                torch.load(os.path.join(draft_checkpoint, "model.pt"), map_location=device)
            )
        else:
            # Auto-create tiny draft model (2 layers, small hidden dim)
            draft_config = ModelConfig.tiny()
            draft_config.vocab_size = config.vocab_size
            draft_config.use_bitnet = config.use_bitnet
            draft_model = MOMTransformer(draft_config)

        # Load tokenizer
        from ..data.tokenizer import MOMTokenizer
        tokenizer = MOMTokenizer(
            vocab_size=config.vocab_size,
            model_path=os.path.join(main_checkpoint, "tokenizer"),
        )

        return cls(main_model, draft_model, tokenizer, num_speculative, device)
