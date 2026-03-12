"""
MOM Transformer - A modern GPT-style decoder-only transformer.

Key architectural choices (aligned with LLaMA/Mistral family):
- Rotary Positional Embeddings (RoPE) for length generalization
- Grouped Query Attention (GQA) for efficient KV-cache
- RMSNorm (faster than LayerNorm, no mean-centering)
- SwiGLU activation (better than GELU for language modeling)
- Optional Flash Attention 2 support
- Pre-norm architecture (norm before attention/FFN)
- BitNet b1.58 ternary quantization (1.58 bits per weight)
"""

import math
from typing import Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F

from .config import ModelConfig
from .bitnet import BitLinear, replace_linear_with_bitlinear, quantize_model
from .early_exit import EarlyExitClassifier, EarlyExitManager
from .efficient_attention import DynamicTokenPruner
from .triton_kernels import fused_rmsnorm_triton, is_triton_available


class RMSNorm(nn.Module):
    """Root Mean Square Layer Normalization.

    Uses fused Triton kernel when available for ~2x speedup.
    """

    def __init__(self, dim: int, eps: float = 1e-6, use_triton: bool = True):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(dim))
        self.use_triton = use_triton and is_triton_available()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.use_triton and not self.training:
            return fused_rmsnorm_triton(x, self.weight, self.eps)
        norm = torch.rsqrt(x.float().pow(2).mean(-1, keepdim=True) + self.eps)
        return (x.float() * norm).type_as(x) * self.weight


def precompute_rope_freqs(dim: int, max_seq_len: int, theta: float = 10000.0) -> torch.Tensor:
    """Precompute the complex exponential frequencies for RoPE."""
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2).float() / dim))
    t = torch.arange(max_seq_len, dtype=torch.float32)
    freqs = torch.outer(t, freqs)
    return torch.polar(torch.ones_like(freqs), freqs)  # complex64


def apply_rope(
    q: torch.Tensor, k: torch.Tensor, freqs: torch.Tensor
) -> Tuple[torch.Tensor, torch.Tensor]:
    """Apply Rotary Positional Embeddings to Q and K tensors."""
    # Reshape to complex pairs: (B, H, T, D) -> (B, H, T, D/2) as complex
    q_complex = torch.view_as_complex(q.float().reshape(*q.shape[:-1], -1, 2))
    k_complex = torch.view_as_complex(k.float().reshape(*k.shape[:-1], -1, 2))

    # Broadcast freqs: (T, D/2) -> (1, 1, T, D/2)
    freqs = freqs.unsqueeze(0).unsqueeze(0)

    q_out = torch.view_as_real(q_complex * freqs).flatten(-2)
    k_out = torch.view_as_real(k_complex * freqs).flatten(-2)
    return q_out.type_as(q), k_out.type_as(k)


class GroupedQueryAttention(nn.Module):
    """Multi-Head Attention with Grouped Query Attention (GQA).

    GQA shares KV heads across multiple Q heads, reducing KV-cache size
    while maintaining model quality. When num_kv_heads == num_heads, this
    becomes standard MHA. When num_kv_heads == 1, it becomes MQA.
    """

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.num_heads = config.num_heads
        self.num_kv_heads = config.num_kv_heads
        self.head_dim = config.head_dim
        self.num_groups = config.num_heads // config.num_kv_heads

        self.q_proj = nn.Linear(config.hidden_dim, config.num_heads * self.head_dim, bias=False)
        self.k_proj = nn.Linear(config.hidden_dim, config.num_kv_heads * self.head_dim, bias=False)
        self.v_proj = nn.Linear(config.hidden_dim, config.num_kv_heads * self.head_dim, bias=False)
        self.o_proj = nn.Linear(config.num_heads * self.head_dim, config.hidden_dim, bias=False)

        self.attn_dropout = nn.Dropout(config.attention_dropout)
        self.use_flash = config.use_flash_attention

    def forward(
        self,
        x: torch.Tensor,
        rope_freqs: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
        kv_cache: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
    ) -> Tuple[torch.Tensor, Optional[Tuple[torch.Tensor, torch.Tensor]]]:
        B, T, _ = x.shape

        q = self.q_proj(x).view(B, T, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(B, T, self.num_kv_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(B, T, self.num_kv_heads, self.head_dim).transpose(1, 2)

        # Apply RoPE
        q, k = apply_rope(q, k, rope_freqs[:T])

        # KV cache for inference
        if kv_cache is not None:
            k_cache, v_cache = kv_cache
            k = torch.cat([k_cache, k], dim=2)
            v = torch.cat([v_cache, v], dim=2)
        new_kv_cache = (k, v)

        # Expand KV heads for GQA: repeat each KV head for its group
        if self.num_groups > 1:
            k = k.repeat_interleave(self.num_groups, dim=1)
            v = v.repeat_interleave(self.num_groups, dim=1)

        # Normalize mask to boolean (True = attend, False = mask out).
        # Callers may pass float 0/1 tensors or bool tensors; we standardize here
        # so both the Flash and manual paths see identical semantics.
        bool_mask: Optional[torch.Tensor] = None
        if mask is not None:
            bool_mask = mask.bool() if mask.dtype != torch.bool else mask

        # Attention computation
        if self.use_flash and hasattr(F, "scaled_dot_product_attention"):
            attn_out = F.scaled_dot_product_attention(
                q, k, v,
                attn_mask=bool_mask,        # bool: True = attend
                dropout_p=self.attn_dropout.p if self.training else 0.0,
                is_causal=(bool_mask is None and kv_cache is None),
            )
        else:
            scale = 1.0 / math.sqrt(self.head_dim)
            scores = torch.matmul(q, k.transpose(-2, -1)) * scale
            if bool_mask is not None:
                scores = scores.masked_fill(~bool_mask, float("-inf"))
            elif kv_cache is None:
                # Causal mask
                causal = torch.tril(torch.ones(T, T, device=x.device, dtype=torch.bool))
                scores = scores.masked_fill(~causal, float("-inf"))
            attn_weights = F.softmax(scores, dim=-1)
            attn_weights = self.attn_dropout(attn_weights)
            attn_out = torch.matmul(attn_weights, v)

        # Merge heads and project
        attn_out = attn_out.transpose(1, 2).contiguous().view(B, T, -1)
        return self.o_proj(attn_out), new_kv_cache


class SwiGLU(nn.Module):
    """SwiGLU Feed-Forward Network.

    SwiGLU(x) = (Swish(W_gate * x) ⊙ (W_up * x)) * W_down
    Empirically outperforms GELU/ReLU FFNs in language modeling.
    """

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.gate_proj = nn.Linear(config.hidden_dim, config.intermediate_dim, bias=False)
        self.up_proj = nn.Linear(config.hidden_dim, config.intermediate_dim, bias=False)
        self.down_proj = nn.Linear(config.intermediate_dim, config.hidden_dim, bias=False)
        self.dropout = nn.Dropout(config.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.dropout(self.down_proj(F.silu(self.gate_proj(x)) * self.up_proj(x)))


class TransformerBlock(nn.Module):
    """Single transformer block with pre-norm architecture."""

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.attention_norm = RMSNorm(config.hidden_dim, config.rms_norm_eps)
        self.attention = GroupedQueryAttention(config)
        self.ffn_norm = RMSNorm(config.hidden_dim, config.rms_norm_eps)
        self.ffn = SwiGLU(config)

    def forward(
        self,
        x: torch.Tensor,
        rope_freqs: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
        kv_cache: Optional[Tuple[torch.Tensor, torch.Tensor]] = None,
    ) -> Tuple[torch.Tensor, Optional[Tuple[torch.Tensor, torch.Tensor]]]:
        # Pre-norm attention with residual
        h = self.attention_norm(x)
        h, new_kv_cache = self.attention(h, rope_freqs, mask, kv_cache)
        x = x + h

        # Pre-norm FFN with residual
        x = x + self.ffn(self.ffn_norm(x))
        return x, new_kv_cache


class MOMTransformer(nn.Module):
    """MOM (Master of Models) - Decoder-only Transformer.

    A modern transformer LLM architecture incorporating:
    - RoPE (Rotary Positional Embeddings)
    - GQA (Grouped Query Attention)
    - RMSNorm
    - SwiGLU activations
    - BitNet b1.58 ternary quantization ({-1, 0, +1} weights, ~1.58 bits/param)
    - Optional gradient checkpointing
    - KV-cache for efficient autoregressive generation
    """

    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config

        # Token embedding (no positional embedding - using RoPE)
        self.token_embedding = nn.Embedding(config.vocab_size, config.hidden_dim)
        self.embed_dropout = nn.Dropout(config.embed_dropout)

        # Transformer layers
        use_triton = config.use_triton_kernels
        self.layers = nn.ModuleList([TransformerBlock(config) for _ in range(config.num_layers)])
        self.norm = RMSNorm(config.hidden_dim, config.rms_norm_eps, use_triton=use_triton)

        # Language model head
        self.lm_head = nn.Linear(config.hidden_dim, config.vocab_size, bias=False)
        if config.tie_word_embeddings:
            self.lm_head.weight = self.token_embedding.weight

        # Early exit classifiers (one per layer)
        self.early_exit_classifiers = None
        self.early_exit_manager = None
        if config.use_early_exit:
            self.early_exit_classifiers = nn.ModuleList([
                EarlyExitClassifier(config.hidden_dim, config.vocab_size)
                for _ in range(config.num_layers)
            ])
            self.early_exit_manager = EarlyExitManager(
                confidence_threshold=config.early_exit_confidence,
                min_exit_layer=config.early_exit_min_layer,
            )

        # Dynamic token pruning
        self.token_pruner = None
        if config.use_token_pruning:
            self.token_pruner = DynamicTokenPruner(
                config.hidden_dim, threshold=config.token_pruning_threshold
            )

        # Precompute RoPE frequencies
        self.register_buffer(
            "rope_freqs",
            precompute_rope_freqs(config.head_dim, config.max_seq_len * 2, config.rope_theta),
            persistent=False,
        )

        # Initialize weights
        self.apply(self._init_weights)

        # Share LM head with early exit classifiers
        if self.early_exit_classifiers is not None:
            for clf in self.early_exit_classifiers:
                clf.lm_head = self.lm_head

        # Apply BitNet 1.58-bit quantization if enabled
        if config.use_bitnet:
            exclude = set(config.bitnet_exclude.split(","))
            replace_linear_with_bitlinear(self, exclude_names=exclude)

    def _init_weights(self, module: nn.Module) -> None:
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=self.config.initializer_range)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, BitLinear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=self.config.initializer_range)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=self.config.initializer_range)

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: Optional[torch.Tensor] = None,
        labels: Optional[torch.Tensor] = None,
        kv_caches: Optional[list] = None,
        use_cache: bool = False,
    ) -> dict:
        B, T = input_ids.shape

        # Embeddings
        h = self.embed_dropout(self.token_embedding(input_ids))

        # Prepare RoPE freqs for current sequence
        rope_freqs = self.rope_freqs[:T]
        if kv_caches is not None and kv_caches[0] is not None:
            # During generation, offset the position
            past_len = kv_caches[0][0].shape[2]
            rope_freqs = self.rope_freqs[past_len : past_len + T]

        # Token pruning: determine which tokens need full computation
        prune_mask = None
        if self.token_pruner is not None and not self.training:
            _, prune_mask = self.token_pruner(h)

        # Process through transformer layers
        new_kv_caches = []
        exit_logits_list = []
        early_exit_result = None

        for i, layer in enumerate(self.layers):
            cache = kv_caches[i] if kv_caches is not None else None

            # Token pruning: only process important tokens through this layer
            if prune_mask is not None and i > 0:
                h_important = h[prune_mask].unsqueeze(0) if h[prune_mask].dim() == 1 else h
                # For simplicity, process all tokens but skip could be added
                # Full selective computation requires custom CUDA kernels

            if self.config.gradient_checkpointing and self.training:
                h, new_cache = torch.utils.checkpoint.checkpoint(
                    layer, h, rope_freqs, attention_mask, cache,
                    use_reentrant=False,
                )
            else:
                h, new_cache = layer(h, rope_freqs, attention_mask, cache)
            new_kv_caches.append(new_cache)

            # Early exit check
            if self.early_exit_classifiers is not None:
                confidence, exit_logits = self.early_exit_classifiers[i](h)
                exit_logits_list.append(exit_logits)

                if not self.training and self.early_exit_manager is not None:
                    exit_mask = self.early_exit_manager.should_exit(confidence, i)
                    self.early_exit_manager.update_stats(exit_mask, i)

                    # If all tokens are confident, exit early
                    if exit_mask.all() and exit_logits is not None:
                        h_normed = self.norm(h)
                        early_exit_result = {
                            "logits": exit_logits,
                            "exit_layer": i,
                        }
                        if use_cache:
                            # Pad remaining KV caches with None
                            while len(new_kv_caches) < len(self.layers):
                                new_kv_caches.append(None)
                            early_exit_result["kv_caches"] = new_kv_caches
                        return early_exit_result

        h = self.norm(h)
        logits = self.lm_head(h)

        result = {"logits": logits}
        if use_cache:
            result["kv_caches"] = new_kv_caches

        # Compute loss if labels provided
        if labels is not None:
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()
            loss = F.cross_entropy(
                shift_logits.view(-1, self.config.vocab_size),
                shift_labels.view(-1),
                ignore_index=-100,
            )
            # Add early exit training loss
            if self.early_exit_manager is not None and exit_logits_list:
                loss = self.early_exit_manager.compute_training_loss(
                    exit_logits_list, labels, self.config.vocab_size, loss
                )
            result["loss"] = loss

        return result

    def quantize_for_inference(self) -> dict:
        """Quantize all BitLinear layers to packed ternary format for inference.

        After calling this, the model uses ~1.58 bits per weight parameter
        (excluding embeddings and LM head which stay in full precision).
        Inference uses only additions/subtractions instead of multiplications.

        Returns quantization statistics.
        """
        stats = quantize_model(self)
        self.eval()
        return stats

    def num_parameters(self, only_trainable: bool = True) -> int:
        if only_trainable:
            return sum(p.numel() for p in self.parameters() if p.requires_grad)
        return sum(p.numel() for p in self.parameters())

    @torch.no_grad()
    def estimate_flops(self, seq_len: int) -> int:
        """Estimate FLOPs per forward pass (approximate)."""
        C = self.config
        # Attention: 4 * seq * hidden^2 + 2 * seq^2 * hidden
        attn_flops = 4 * seq_len * C.hidden_dim ** 2 + 2 * seq_len ** 2 * C.hidden_dim
        # FFN (SwiGLU): 3 * seq * hidden * intermediate
        ffn_flops = 3 * seq_len * C.hidden_dim * C.intermediate_dim
        # Per layer, times num layers, times 2 (forward + backward ≈ 3x forward)
        return C.num_layers * (attn_flops + ffn_flops) * 2
