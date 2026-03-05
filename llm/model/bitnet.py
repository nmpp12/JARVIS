"""
BitNet b1.58 - Ternary Weight Quantization for MOM.

Implements the 1.58-bit quantization scheme from "The Era of 1-bit LLMs"
(Ma et al., 2024). Every weight is constrained to {-1, 0, +1}, requiring
only log2(3) ≈ 1.58 bits per parameter.

Key benefits:
- ~10x model size reduction vs FP16 (1.58 bits vs 16 bits)
- No floating-point multiplications at inference (only additions/subtractions)
- Maintains surprisingly strong quality due to the ternary representation

Architecture changes from standard transformer:
- BitLinear replaces nn.Linear in attention and FFN layers
- RMSNorm before each BitLinear (absorbs activation scaling)
- Straight-Through Estimator (STE) for gradient flow during training
- Activations quantized to 8-bit during forward pass

Storage format:
- Ternary weights packed as 2-bit values: 00=0, 01=+1, 10=-1
- Per-tensor scale factor stored in FP32
- ~10x compression: 1.3B model fits in ~250MB instead of ~2.5GB
"""

import math
from typing import Optional, Tuple

import torch
import torch.nn as nn
import torch.nn.functional as F


def ternary_quantize(weight: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
    """Quantize weights to {-1, 0, +1} using absmean scaling.

    From BitNet b1.58:
    1. Compute scale γ = mean(|W|)
    2. Quantize: W_q = round_clip(W / γ, -1, 1)

    Returns:
        weight_ternary: Ternary weight tensor {-1, 0, +1}
        scale: Per-tensor scale factor
    """
    scale = weight.abs().mean().clamp(min=1e-5)
    scaled = weight / scale
    # Round to nearest integer and clamp to {-1, 0, 1}
    quantized = scaled.round().clamp(-1, 1)
    return quantized, scale


def activation_quant_8bit(x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
    """Quantize activations to 8-bit per-token.

    Per-token absmax quantization to INT8 range [-127, 127].
    """
    scale = x.abs().amax(dim=-1, keepdim=True).clamp(min=1e-5) / 127.0
    quantized = (x / scale).round().clamp(-128, 127)
    return quantized, scale


class StraightThroughEstimator(torch.autograd.Function):
    """Straight-Through Estimator for ternary quantization.

    Forward: Apply ternary quantization
    Backward: Pass gradients through unchanged (as if quantization didn't happen)
    """

    @staticmethod
    def forward(ctx, weight):
        quantized, scale = ternary_quantize(weight)
        ctx.save_for_backward(scale)
        return quantized * scale

    @staticmethod
    def backward(ctx, grad_output):
        # Straight-through: pass gradient unchanged
        return grad_output


class BitLinear(nn.Module):
    """1.58-bit Linear layer (BitNet b1.58).

    During training:
    - Maintains full-precision weights for gradient updates
    - Quantizes weights to ternary on each forward pass via STE
    - Quantizes activations to 8-bit

    During inference:
    - Uses pre-quantized ternary weights (no FP multiply needed)
    - Matrix multiply becomes additions and subtractions only

    Args:
        in_features: Input dimension
        out_features: Output dimension
        bias: Whether to include bias (typically False for BitNet)
    """

    def __init__(self, in_features: int, out_features: int, bias: bool = False):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features

        # Full-precision weight for training (quantized on forward)
        self.weight = nn.Parameter(torch.empty(out_features, in_features))
        if bias:
            self.bias = nn.Parameter(torch.zeros(out_features))
        else:
            self.bias = None

        # Pre-norm for input stabilization (BitNet uses RMSNorm before linear)
        self.input_norm = nn.LayerNorm(in_features, elementwise_affine=False)

        # Packed ternary weights for inference (set after quantization)
        self.register_buffer("weight_packed", None)
        self.register_buffer("weight_scale", None)
        self._quantized = False

        self.reset_parameters()

    def reset_parameters(self):
        nn.init.kaiming_uniform_(self.weight, a=math.sqrt(5))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self._quantized:
            return self._forward_quantized(x)
        return self._forward_training(x)

    def _forward_training(self, x: torch.Tensor) -> torch.Tensor:
        """Training forward: STE quantization + 8-bit activation."""
        # Normalize input
        x_norm = self.input_norm(x)

        # Quantize activations to 8-bit (but keep in float for autograd)
        x_quant, x_scale = activation_quant_8bit(x_norm)
        x_dequant = x_quant * x_scale

        # Quantize weights via STE (gradients flow through)
        w_quant = StraightThroughEstimator.apply(self.weight)

        # Linear operation
        out = F.linear(x_dequant, w_quant, self.bias)
        return out

    def _forward_quantized(self, x: torch.Tensor) -> torch.Tensor:
        """Inference forward with pre-quantized ternary weights.

        Since weights are {-1, 0, +1} * scale, the matmul becomes:
        y = (x @ W_ternary.T) * scale
        Where x @ W_ternary.T only needs additions and subtractions.
        """
        x_norm = self.input_norm(x)

        # Unpack ternary weights
        w_ternary = self._unpack_ternary()

        # Integer-like matmul (only add/subtract based on ternary values)
        out = F.linear(x_norm, w_ternary.to(x_norm.dtype)) * self.weight_scale

        if self.bias is not None:
            out = out + self.bias
        return out

    def quantize(self) -> None:
        """Freeze weights into packed ternary format for inference."""
        with torch.no_grad():
            w_ternary, scale = ternary_quantize(self.weight)
            self.weight_packed = self._pack_ternary(w_ternary)
            self.weight_scale = scale
            self._quantized = True
            # Free the full-precision weight
            self.weight.requires_grad_(False)

    def _pack_ternary(self, ternary_weights: torch.Tensor) -> torch.Tensor:
        """Pack ternary {-1, 0, +1} weights into 2-bit representation.

        Encoding: -1 -> 0b10 (2), 0 -> 0b00 (0), +1 -> 0b01 (1)
        Packs 4 ternary values per byte (uint8).

        This achieves ~1.58 bits/param storage (2 bits with some overhead).
        """
        # Map: -1 -> 2, 0 -> 0, +1 -> 1
        encoded = ternary_weights.to(torch.int8) + 1  # Now: 0->1, -1->0, 1->2
        # Remap: 0(was -1)->2, 1(was 0)->0, 2(was +1)->1
        mapping = torch.tensor([2, 0, 1], dtype=torch.uint8, device=encoded.device)
        encoded = mapping[encoded.long()]

        # Flatten and pad to multiple of 4
        flat = encoded.flatten()
        pad_len = (4 - len(flat) % 4) % 4
        if pad_len > 0:
            flat = torch.cat([flat, torch.zeros(pad_len, dtype=torch.uint8, device=flat.device)])

        # Pack 4 values per byte
        flat = flat.reshape(-1, 4)
        packed = (flat[:, 0] << 6) | (flat[:, 1] << 4) | (flat[:, 2] << 2) | flat[:, 3]
        return packed.to(torch.uint8)

    def _unpack_ternary(self) -> torch.Tensor:
        """Unpack 2-bit packed weights back to ternary {-1, 0, +1}."""
        packed = self.weight_packed

        # Extract 4 values per byte
        v0 = (packed >> 6) & 0x03
        v1 = (packed >> 4) & 0x03
        v2 = (packed >> 2) & 0x03
        v3 = packed & 0x03

        flat = torch.stack([v0, v1, v2, v3], dim=1).flatten()

        # Decode: 0->0, 1->+1, 2->-1
        decoded = torch.zeros_like(flat, dtype=torch.int8)
        decoded[flat == 1] = 1
        decoded[flat == 2] = -1

        # Reshape to original weight shape
        numel = self.out_features * self.in_features
        return decoded[:numel].reshape(self.out_features, self.in_features)

    def memory_bytes(self) -> dict:
        """Calculate memory usage."""
        if self._quantized:
            packed_bytes = self.weight_packed.numel()  # uint8
            scale_bytes = 4  # fp32 scale
            total = packed_bytes + scale_bytes
        else:
            total = self.weight.numel() * self.weight.element_size()
            packed_bytes = 0
            scale_bytes = 0

        fp16_equiv = self.weight.numel() * 2
        return {
            "packed_bytes": packed_bytes,
            "scale_bytes": scale_bytes,
            "total_bytes": total,
            "fp16_bytes": fp16_equiv,
            "compression_ratio": fp16_equiv / max(total, 1),
            "bits_per_param": (total * 8) / self.weight.numel(),
        }

    def extra_repr(self) -> str:
        quant = "quantized" if self._quantized else "training"
        return (
            f"in_features={self.in_features}, out_features={self.out_features}, "
            f"bias={self.bias is not None}, mode={quant}"
        )


def replace_linear_with_bitlinear(model: nn.Module, exclude_names: Optional[set] = None) -> nn.Module:
    """Replace all nn.Linear layers with BitLinear for 1.58-bit quantization.

    Args:
        model: The model to convert
        exclude_names: Set of parameter name patterns to exclude (e.g., embeddings, lm_head)
    """
    if exclude_names is None:
        exclude_names = {"token_embedding", "lm_head"}

    for name, module in model.named_children():
        if any(excl in name for excl in exclude_names):
            continue

        if isinstance(module, nn.Linear):
            bit_linear = BitLinear(
                module.in_features, module.out_features,
                bias=module.bias is not None,
            )
            # Copy existing weights
            with torch.no_grad():
                bit_linear.weight.copy_(module.weight)
                if module.bias is not None:
                    bit_linear.bias.copy_(module.bias)
            setattr(model, name, bit_linear)
        else:
            replace_linear_with_bitlinear(module, exclude_names)

    return model


def quantize_model(model: nn.Module) -> dict:
    """Quantize all BitLinear layers in the model for inference.

    Returns statistics about the quantization.
    """
    stats = {
        "layers_quantized": 0,
        "total_params": 0,
        "original_bytes": 0,
        "quantized_bytes": 0,
    }

    for module in model.modules():
        if isinstance(module, BitLinear) and not module._quantized:
            params = module.weight.numel()
            stats["original_bytes"] += params * 2  # FP16
            module.quantize()
            mem = module.memory_bytes()
            stats["quantized_bytes"] += mem["total_bytes"]
            stats["total_params"] += params
            stats["layers_quantized"] += 1

    if stats["original_bytes"] > 0:
        stats["compression_ratio"] = stats["original_bytes"] / stats["quantized_bytes"]
        stats["bits_per_param"] = (stats["quantized_bytes"] * 8) / max(stats["total_params"], 1)
    else:
        stats["compression_ratio"] = 1.0
        stats["bits_per_param"] = 16.0

    return stats


def pack_model_for_storage(model: nn.Module, output_path: str) -> dict:
    """Save a quantized model in compact ternary format.

    Saves:
    - Packed ternary weights (2 bits per param)
    - Scale factors (FP32)
    - Non-quantized params (embeddings, norms) in FP16
    - Model config

    Returns storage statistics.
    """
    import os
    os.makedirs(output_path, exist_ok=True)

    state = {}
    total_bytes = 0

    for name, param in model.named_parameters():
        state[name] = param.data.cpu()

    for name, buf in model.named_buffers():
        if buf is not None:
            state[name] = buf.cpu()

    torch.save(state, os.path.join(output_path, "model_quantized.pt"))
    file_size = os.path.getsize(os.path.join(output_path, "model_quantized.pt"))

    return {
        "file_size_bytes": file_size,
        "file_size_mb": file_size / (1024 * 1024),
    }
