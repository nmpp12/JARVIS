"""
Text generation engine for MOM.

Supports multiple decoding strategies:
- Greedy decoding
- Top-k sampling
- Top-p (nucleus) sampling
- Locally typical sampling (entropy-aware token selection)
- Contrastive search (diversity-seeking decoding)
- Entropy-adaptive temperature (auto-adjusts randomness)
- Temperature scaling
- Repetition penalty
- KV-cache for efficient autoregressive generation
- Speculative decoding for 2-4x speedup
- Early exit statistics reporting
"""

import math
import torch
import torch.nn.functional as F
from typing import List, Optional

from ..model.transformer import MOMTransformer
from ..model.config import ModelConfig
from .creativity import CreativityEngine, CreativityConfig


class TextGenerator:
    """Autoregressive text generator with KV-cache support."""

    def __init__(
        self,
        model: MOMTransformer,
        tokenizer,
        device: Optional[torch.device] = None,
        creativity_engine: Optional[CreativityEngine] = None,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self.model.to(self.device)
        self.model.eval()
        self.creativity_engine = creativity_engine

    @torch.no_grad()
    def generate(
        self,
        prompt: str,
        max_new_tokens: int = 256,
        temperature: float = 0.7,
        top_k: int = 50,
        top_p: float = 0.9,
        repetition_penalty: float = 1.1,
        stop_tokens: Optional[List[int]] = None,
        stream: bool = False,
        sampling_strategy: str = "standard",
        typical_p: float = 0.95,
        contrastive_alpha: float = 0.6,
        contrastive_k: int = 5,
        adaptive_temp_range: tuple = (0.3, 1.5),
    ) -> str:
        """Generate text from a prompt.

        Args:
            prompt: Input text prompt
            max_new_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0 = greedy, higher = more random)
            top_k: Keep only top-k logits for sampling
            top_p: Nucleus sampling threshold
            repetition_penalty: Penalty for repeated tokens (1.0 = no penalty)
            stop_tokens: Token IDs that stop generation
            stream: If True, yield tokens one by one
            sampling_strategy: One of "standard", "typical", "contrastive",
                               "adaptive", or "creative"
            typical_p: Mass threshold for typical sampling (0.9-0.99)
            contrastive_alpha: Balance between confidence and diversity (0-1)
            contrastive_k: Number of candidates for contrastive search
            adaptive_temp_range: (min_temp, max_temp) for adaptive temperature
        """
        # Creativity Engine: enhance the prompt before generation when in creative mode
        if sampling_strategy == "creative" and self.creativity_engine is not None:
            prompt = self.creativity_engine.enhance_prompt(prompt)
            # Pull sampling params from the engine's config
            engine_params = self.creativity_engine.get_sampling_params()
            temperature = engine_params.get("temperature", temperature)
            typical_p = engine_params.get("typical_p", typical_p)
            contrastive_alpha = engine_params.get("contrastive_alpha", contrastive_alpha)
            repetition_penalty = engine_params.get("repetition_penalty", repetition_penalty)

        # Tokenize prompt
        input_ids = self.tokenizer.encode(prompt, add_bos=True, add_eos=False)
        input_ids = torch.tensor([input_ids], dtype=torch.long, device=self.device)

        if stop_tokens is None:
            stop_tokens = [self.tokenizer.eos_token_id]

        generated_ids = input_ids[0].tolist()
        kv_caches = None
        prev_hidden = None

        # Process prompt through model (prefill)
        outputs = self.model(input_ids=input_ids, use_cache=True)
        kv_caches = outputs["kv_caches"]
        next_logits = outputs["logits"][:, -1, :]

        for _ in range(max_new_tokens):
            # Apply repetition penalty
            if repetition_penalty != 1.0:
                for token_id in set(generated_ids):
                    if next_logits[0, token_id] > 0:
                        next_logits[0, token_id] /= repetition_penalty
                    else:
                        next_logits[0, token_id] *= repetition_penalty

            # Sample next token using the selected strategy
            if sampling_strategy == "typical":
                next_token = self._sample_typical(next_logits[0], temperature, typical_p)
            elif sampling_strategy == "contrastive":
                next_token = self._sample_contrastive(
                    next_logits[0], prev_hidden, contrastive_alpha, contrastive_k
                )
            elif sampling_strategy == "adaptive":
                next_token = self._sample_adaptive(
                    next_logits[0], top_k, top_p, adaptive_temp_range
                )
            elif sampling_strategy == "creative":
                next_token = self._sample_creative(
                    next_logits[0], generated_ids, temperature, top_k, typical_p,
                    contrastive_alpha, prev_hidden
                )
            else:
                next_token = self._sample(next_logits[0], temperature, top_k, top_p)

            generated_ids.append(next_token)

            # Check stop condition
            if next_token in stop_tokens:
                break

            if stream:
                yield self.tokenizer.decode([next_token], skip_special=True)

            # Forward with KV-cache (single token)
            next_input = torch.tensor([[next_token]], dtype=torch.long, device=self.device)
            outputs = self.model(
                input_ids=next_input, kv_caches=kv_caches, use_cache=True
            )
            kv_caches = outputs["kv_caches"]
            next_logits = outputs["logits"][:, -1, :]

            # Track hidden state for contrastive search
            if sampling_strategy in ("contrastive", "creative"):
                prev_hidden = outputs.get("hidden_state", next_logits)

        if not stream:
            # Decode full response (skip prompt tokens)
            response_ids = generated_ids[len(input_ids[0]):]
            response = self.tokenizer.decode(response_ids, skip_special=True)
            # Record for novelty tracking when creativity engine is active
            if self.creativity_engine is not None and sampling_strategy == "creative":
                self.creativity_engine.record(response)
            return response

    def _sample(
        self,
        logits: torch.Tensor,
        temperature: float,
        top_k: int,
        top_p: float,
    ) -> int:
        """Sample a token from logits with temperature, top-k, and top-p."""
        if temperature == 0:
            return logits.argmax().item()

        logits = logits / temperature

        # Top-k filtering
        if top_k > 0:
            top_k = min(top_k, logits.size(-1))
            indices_to_remove = logits < torch.topk(logits, top_k).values[..., -1, None]
            logits[indices_to_remove] = float("-inf")

        # Top-p (nucleus) filtering
        if top_p < 1.0:
            sorted_logits, sorted_indices = torch.sort(logits, descending=True)
            cumulative_probs = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)

            # Remove tokens with cumulative probability above threshold
            sorted_indices_to_remove = cumulative_probs > top_p
            # Keep at least one token
            sorted_indices_to_remove[..., 1:] = sorted_indices_to_remove[..., :-1].clone()
            sorted_indices_to_remove[..., 0] = False

            indices_to_remove = sorted_indices[sorted_indices_to_remove]
            logits[indices_to_remove] = float("-inf")

        # Sample from filtered distribution
        probs = F.softmax(logits, dim=-1)
        return torch.multinomial(probs, num_samples=1).item()

    def _sample_typical(
        self,
        logits: torch.Tensor,
        temperature: float,
        typical_p: float,
    ) -> int:
        """Locally typical sampling — picks tokens that are "typical" of the
        distribution rather than just the most likely ones.

        Instead of sampling the highest-probability tokens (which are often
        predictable), typical sampling picks tokens whose information content
        (-log p) is close to the expected information (entropy). This produces
        output that is *characteristically representative* of the model's
        knowledge — surprising enough to be creative, but not so random that
        it becomes incoherent.

        Reference: Meister et al., "Typical Decoding for Natural Language
        Generation" (2022).
        """
        if temperature == 0:
            return logits.argmax().item()

        logits = logits / temperature
        probs = F.softmax(logits, dim=-1)

        # Compute per-token information content: -log(p)
        log_probs = torch.log(probs + 1e-10)
        neg_entropy = (probs * log_probs).sum()  # -H(p)

        # Distance of each token from the expected information content
        surprisal = -log_probs
        deviation = torch.abs(surprisal + neg_entropy)  # |I(x) - H|

        # Sort by deviation (most typical first)
        sorted_deviation, sorted_indices = torch.sort(deviation)
        sorted_probs = probs[sorted_indices]

        # Keep tokens until we reach typical_p cumulative mass
        cumulative_probs = torch.cumsum(sorted_probs, dim=-1)
        mask = cumulative_probs <= typical_p
        mask[0] = True  # always keep at least one

        # Zero out atypical tokens and renormalize
        typical_probs = probs.clone()
        atypical_indices = sorted_indices[~mask]
        typical_probs[atypical_indices] = 0.0
        typical_probs = typical_probs / typical_probs.sum()

        return torch.multinomial(typical_probs, num_samples=1).item()

    def _sample_contrastive(
        self,
        logits: torch.Tensor,
        prev_hidden: Optional[torch.Tensor],
        alpha: float,
        k: int,
    ) -> int:
        """Contrastive search — balances model confidence with output diversity.

        Selects from the top-k candidates by combining the model's confidence
        (how likely the token is) with a diversity penalty (how different the
        token's representation is from what was already generated). This
        prevents repetitive, boring outputs while keeping generations coherent.

        High alpha = more diversity-seeking (more creative).
        Low alpha = more confidence-seeking (more conventional).

        Reference: Su et al., "A Contrastive Framework for Neural Text
        Generation" (2022).
        """
        probs = F.softmax(logits, dim=-1)

        # Get top-k candidates
        top_k_probs, top_k_ids = torch.topk(probs, k)

        if prev_hidden is None:
            # First token — just sample from top-k
            idx = torch.multinomial(top_k_probs, num_samples=1).item()
            return top_k_ids[idx].item()

        # Score each candidate: (1-alpha)*confidence - alpha*max_similarity
        # Similarity is cosine similarity with the previous hidden state
        best_score = float("-inf")
        best_token = top_k_ids[0].item()

        prev_norm = F.normalize(prev_hidden.flatten().float(), dim=0)

        for i in range(k):
            confidence = top_k_probs[i].item()
            # Use the token embedding as a proxy for the candidate's hidden state
            candidate_embed = self.model.token_embedding.weight[top_k_ids[i]]
            cand_norm = F.normalize(candidate_embed.float(), dim=0)
            similarity = torch.dot(prev_norm[:cand_norm.shape[0]], cand_norm).item() \
                if prev_norm.shape[0] >= cand_norm.shape[0] \
                else torch.dot(prev_norm, cand_norm[:prev_norm.shape[0]]).item()

            score = (1 - alpha) * confidence - alpha * max(similarity, 0)
            if score > best_score:
                best_score = score
                best_token = top_k_ids[i].item()

        return best_token

    def _sample_adaptive(
        self,
        logits: torch.Tensor,
        top_k: int,
        top_p: float,
        temp_range: tuple,
    ) -> int:
        """Entropy-adaptive temperature — automatically adjusts randomness
        based on how confident the model is at each step.

        When the model is very confident (low entropy, e.g. closing a bracket),
        it uses low temperature to stay precise. When the model is uncertain
        (high entropy, e.g. choosing what concept to discuss next), it uses
        high temperature to explore creative possibilities.

        This gives you the best of both worlds: precision where it matters,
        creativity where there's freedom.
        """
        probs = F.softmax(logits, dim=-1)
        log_probs = torch.log(probs + 1e-10)

        # Shannon entropy of the distribution
        entropy = -(probs * log_probs).sum().item()

        # Max possible entropy for this vocab
        max_entropy = math.log(logits.shape[-1])

        # Normalized entropy: 0 = totally certain, 1 = totally uncertain
        norm_entropy = entropy / max_entropy if max_entropy > 0 else 0.0

        # Map normalized entropy to temperature range
        min_temp, max_temp = temp_range
        adaptive_temp = min_temp + norm_entropy * (max_temp - min_temp)

        return self._sample(logits, adaptive_temp, top_k, top_p)

    def _sample_creative(
        self,
        logits: torch.Tensor,
        generated_ids: List[int],
        temperature: float,
        top_k: int,
        typical_p: float,
        contrastive_alpha: float,
        prev_hidden: Optional[torch.Tensor],
    ) -> int:
        """Creative sampling — a hybrid strategy that combines multiple
        techniques to maximize novel, high-quality output.

        The creative sampler works in phases:
        1. Entropy-adaptive temperature sets the base randomness
        2. Typical sampling filters to characteristically representative tokens
        3. A novelty bonus boosts tokens the model hasn't used recently,
           encouraging exploration of the vocabulary space
        4. Final sampling from the reweighted distribution

        Use this mode when you want the model to "think outside the box" —
        generate code patterns, algorithms, or ideas it hasn't seen verbatim
        in training, by combining known concepts in novel ways.
        """
        # Phase 1: Adaptive temperature based on model confidence
        probs = F.softmax(logits, dim=-1)
        log_probs = torch.log(probs + 1e-10)
        entropy = -(probs * log_probs).sum().item()
        max_entropy = math.log(logits.shape[-1])
        norm_entropy = entropy / max_entropy if max_entropy > 0 else 0.0

        # Creative mode uses a wider temperature range
        adaptive_temp = 0.5 + norm_entropy * 1.5

        scaled_logits = logits / adaptive_temp

        # Phase 2: Typical sampling filter — keep characteristically representative tokens
        probs = F.softmax(scaled_logits, dim=-1)
        log_probs = torch.log(probs + 1e-10)
        neg_entropy = (probs * log_probs).sum()
        surprisal = -log_probs
        deviation = torch.abs(surprisal + neg_entropy)

        sorted_deviation, sorted_indices = torch.sort(deviation)
        sorted_probs = probs[sorted_indices]
        cumulative_probs = torch.cumsum(sorted_probs, dim=-1)
        mask = cumulative_probs <= typical_p
        mask[0] = True

        creative_probs = probs.clone()
        atypical_indices = sorted_indices[~mask]
        creative_probs[atypical_indices] = 0.0

        # Phase 3: Novelty bonus — boost tokens not recently generated
        if len(generated_ids) > 10:
            recent = set(generated_ids[-50:])
            all_used = set(generated_ids)
            novelty_bonus = torch.ones_like(creative_probs)

            for token_id in recent:
                novelty_bonus[token_id] *= 0.7  # dampen recent tokens
            for token_id in all_used - recent:
                novelty_bonus[token_id] *= 0.9  # slightly dampen all used tokens

            creative_probs = creative_probs * novelty_bonus

        # Phase 4: Contrastive diversity push
        if prev_hidden is not None and contrastive_alpha > 0:
            top_k_probs, top_k_ids = torch.topk(creative_probs, min(top_k, (creative_probs > 0).sum().item()))
            if top_k_ids.numel() > 1:
                prev_norm = F.normalize(prev_hidden.flatten().float(), dim=0)
                diversity_scores = torch.zeros(top_k_ids.shape[0], device=logits.device)
                for i in range(top_k_ids.shape[0]):
                    emb = self.model.token_embedding.weight[top_k_ids[i]]
                    emb_norm = F.normalize(emb.float(), dim=0)
                    min_dim = min(prev_norm.shape[0], emb_norm.shape[0])
                    sim = torch.dot(prev_norm[:min_dim], emb_norm[:min_dim]).item()
                    diversity_scores[i] = 1.0 - max(sim, 0)

                # Blend probability with diversity
                blended = (1 - contrastive_alpha) * top_k_probs + contrastive_alpha * diversity_scores * top_k_probs
                blended = blended / blended.sum()
                idx = torch.multinomial(blended, num_samples=1).item()
                return top_k_ids[idx].item()

        # Renormalize and sample
        if creative_probs.sum() > 0:
            creative_probs = creative_probs / creative_probs.sum()
        else:
            creative_probs = F.softmax(logits / temperature, dim=-1)

        return torch.multinomial(creative_probs, num_samples=1).item()

    def get_early_exit_stats(self) -> Optional[dict]:
        """Get early exit statistics if early exit is enabled."""
        if hasattr(self.model, 'early_exit_manager') and self.model.early_exit_manager is not None:
            return self.model.early_exit_manager.get_stats()
        return None

    @classmethod
    def from_checkpoint(
        cls,
        checkpoint_path: str,
        device: Optional[str] = None,
        use_speculative: bool = False,
        num_speculative: int = 5,
        draft_checkpoint: Optional[str] = None,
        enable_creativity: bool = False,
    ) -> "TextGenerator":
        """Load a generator from a training checkpoint.

        Args:
            checkpoint_path: Path to model checkpoint directory
            device: Device to load model on
            use_speculative: If True, return a SpeculativeDecoder instead
            num_speculative: Number of speculative tokens (if use_speculative)
            draft_checkpoint: Path to draft model checkpoint (if use_speculative)
        """
        import os

        if use_speculative:
            from .speculative import SpeculativeDecoder
            return SpeculativeDecoder.from_checkpoint(
                main_checkpoint=checkpoint_path,
                draft_checkpoint=draft_checkpoint,
                num_speculative=num_speculative,
                device=device,
            )

        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        device = torch.device(device)

        # Load config
        config = ModelConfig.load(os.path.join(checkpoint_path, "model_config.json"))

        # Load model
        model = MOMTransformer(config)
        state_dict = torch.load(
            os.path.join(checkpoint_path, "model.pt"),
            map_location=device,
        )
        model.load_state_dict(state_dict)

        # Load tokenizer
        from ..data.tokenizer import MOMTokenizer
        tokenizer = MOMTokenizer(
            vocab_size=config.vocab_size,
            model_path=os.path.join(checkpoint_path, "tokenizer"),
        )

        creativity_engine = CreativityEngine() if enable_creativity else None
        return cls(model, tokenizer, device, creativity_engine=creativity_engine)
