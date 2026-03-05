"""Model configuration for MOM."""

from dataclasses import dataclass, field
from typing import Optional
import json
import os


@dataclass
class ModelConfig:
    """Configuration for the MOM Transformer model.

    Supports multiple size presets from tiny (for testing) to large-scale models.
    Uses modern architecture choices: RoPE, GQA, RMSNorm, SwiGLU.
    """

    # Core dimensions
    vocab_size: int = 32000
    hidden_dim: int = 2048
    num_layers: int = 24
    num_heads: int = 16
    num_kv_heads: int = 4  # Grouped Query Attention
    intermediate_dim: int = 5504  # SwiGLU intermediate size (~2.7x hidden)
    max_seq_len: int = 4096

    # Regularization
    dropout: float = 0.0
    attention_dropout: float = 0.0
    embed_dropout: float = 0.0

    # Architecture choices
    rope_theta: float = 10000.0
    rms_norm_eps: float = 1e-6
    tie_word_embeddings: bool = True
    use_flash_attention: bool = True

    # Quantization
    use_bitnet: bool = True  # Enable 1.58-bit BitNet quantization
    bitnet_exclude: str = "token_embedding,lm_head"  # Layers to keep in full precision

    # Training
    initializer_range: float = 0.02
    gradient_checkpointing: bool = False

    # Metadata
    model_type: str = "mom"

    @classmethod
    def tiny(cls) -> "ModelConfig":
        """Tiny model for testing (~15M params)."""
        return cls(
            hidden_dim=256,
            num_layers=6,
            num_heads=8,
            num_kv_heads=2,
            intermediate_dim=704,
            max_seq_len=512,
        )

    @classmethod
    def small(cls) -> "ModelConfig":
        """Small model (~125M params)."""
        return cls(
            hidden_dim=768,
            num_layers=12,
            num_heads=12,
            num_kv_heads=4,
            intermediate_dim=2048,
            max_seq_len=2048,
        )

    @classmethod
    def medium(cls) -> "ModelConfig":
        """Medium model (~350M params)."""
        return cls(
            hidden_dim=1024,
            num_layers=24,
            num_heads=16,
            num_kv_heads=4,
            intermediate_dim=2816,
            max_seq_len=4096,
        )

    @classmethod
    def large(cls) -> "ModelConfig":
        """Large model (~1.3B params)."""
        return cls(
            hidden_dim=2048,
            num_layers=24,
            num_heads=16,
            num_kv_heads=4,
            intermediate_dim=5504,
            max_seq_len=4096,
        )

    @classmethod
    def xl(cls) -> "ModelConfig":
        """XL model (~7B params)."""
        return cls(
            hidden_dim=4096,
            num_layers=32,
            num_heads=32,
            num_kv_heads=8,
            intermediate_dim=11008,
            max_seq_len=8192,
        )

    @property
    def head_dim(self) -> int:
        return self.hidden_dim // self.num_heads

    def num_parameters(self) -> int:
        """Estimate total parameter count."""
        embed = self.vocab_size * self.hidden_dim
        # QKV projections (GQA: Q uses full heads, KV uses fewer)
        qkv = self.hidden_dim * (self.hidden_dim + 2 * self.num_kv_heads * self.head_dim)
        attn_out = self.hidden_dim * self.hidden_dim
        # SwiGLU: gate + up projection (2x intermediate) + down projection
        ffn = self.hidden_dim * self.intermediate_dim * 3
        # Norms (2 per layer)
        norms = self.hidden_dim * 2
        per_layer = qkv + attn_out + ffn + norms
        total = embed + self.num_layers * per_layer
        if not self.tie_word_embeddings:
            total += self.vocab_size * self.hidden_dim
        return total

    def estimate_model_size(self) -> dict:
        """Estimate model size in both FP16 and 1.58-bit BitNet."""
        params = self.num_parameters()
        embed_params = self.vocab_size * self.hidden_dim
        if not self.tie_word_embeddings:
            embed_params *= 2

        quantizable = params - embed_params  # Embeddings stay full precision
        fp16_bytes = params * 2
        if self.use_bitnet:
            # Quantizable params: ~2 bits each, embeddings: 16 bits
            bitnet_bytes = (quantizable * 2 / 8) + (embed_params * 2)
            bits_per_param = (bitnet_bytes * 8) / params
        else:
            bitnet_bytes = fp16_bytes
            bits_per_param = 16.0

        return {
            "total_params": params,
            "fp16_mb": fp16_bytes / (1024 * 1024),
            "bitnet_mb": bitnet_bytes / (1024 * 1024),
            "compression_ratio": fp16_bytes / max(bitnet_bytes, 1),
            "avg_bits_per_param": bits_per_param,
        }

    def save(self, path: str) -> None:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.__dict__, f, indent=2)

    @classmethod
    def load(cls, path: str) -> "ModelConfig":
        with open(path) as f:
            data = json.load(f)
        return cls(**data)

    def __repr__(self) -> str:
        params = self.num_parameters()
        if params >= 1e9:
            size = f"{params / 1e9:.1f}B"
        else:
            size = f"{params / 1e6:.0f}M"
        bitnet_tag = ", BitNet 1.58b" if self.use_bitnet else ""
        return f"ModelConfig({size} params, {self.num_layers}L, {self.hidden_dim}D, {self.num_heads}H{bitnet_tag})"
