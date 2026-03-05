"""
Text generation engine for JARVIS-LLM.

Supports multiple decoding strategies:
- Greedy decoding
- Top-k sampling
- Top-p (nucleus) sampling
- Temperature scaling
- Repetition penalty
- KV-cache for efficient autoregressive generation
"""

import torch
import torch.nn.functional as F
from typing import List, Optional

from ..model.transformer import JARVISTransformer
from ..model.config import ModelConfig


class TextGenerator:
    """Autoregressive text generator with KV-cache support."""

    def __init__(
        self,
        model: JARVISTransformer,
        tokenizer,
        device: Optional[torch.device] = None,
    ):
        self.model = model
        self.tokenizer = tokenizer
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self.model.to(self.device)
        self.model.eval()

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
        """
        # Tokenize prompt
        input_ids = self.tokenizer.encode(prompt, add_bos=True, add_eos=False)
        input_ids = torch.tensor([input_ids], dtype=torch.long, device=self.device)

        if stop_tokens is None:
            stop_tokens = [self.tokenizer.eos_token_id]

        generated_ids = input_ids[0].tolist()
        kv_caches = None

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

            # Sample next token
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

        if not stream:
            # Decode full response (skip prompt tokens)
            response_ids = generated_ids[len(input_ids[0]):]
            return self.tokenizer.decode(response_ids, skip_special=True)

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

    @classmethod
    def from_checkpoint(cls, checkpoint_path: str, device: Optional[str] = None) -> "TextGenerator":
        """Load a generator from a training checkpoint."""
        import os

        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        device = torch.device(device)

        # Load config
        config = ModelConfig.load(os.path.join(checkpoint_path, "model_config.json"))

        # Load model
        model = JARVISTransformer(config)
        state_dict = torch.load(
            os.path.join(checkpoint_path, "model.pt"),
            map_location=device,
        )
        model.load_state_dict(state_dict)

        # Load tokenizer
        from ..data.tokenizer import JARVISTokenizer
        tokenizer = JARVISTokenizer(
            vocab_size=config.vocab_size,
            model_path=os.path.join(checkpoint_path, "tokenizer"),
        )

        return cls(model, tokenizer, device)
