"""Utility helpers for MOM LLM."""

import os
import random
import torch
import numpy as np


def set_seed(seed: int = 42) -> None:
    """Set random seed for reproducibility."""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def count_parameters(model: torch.nn.Module) -> dict:
    """Count model parameters by component."""
    total = sum(p.numel() for p in model.parameters())
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)

    breakdown = {}
    for name, module in model.named_children():
        params = sum(p.numel() for p in module.parameters())
        breakdown[name] = params

    return {
        "total": total,
        "trainable": trainable,
        "frozen": total - trainable,
        "breakdown": breakdown,
    }


def format_params(n: int) -> str:
    """Format parameter count (e.g., '125M', '1.3B')."""
    if n >= 1e9:
        return f"{n / 1e9:.1f}B"
    elif n >= 1e6:
        return f"{n / 1e6:.0f}M"
    elif n >= 1e3:
        return f"{n / 1e3:.0f}K"
    return str(n)


def get_gpu_memory() -> dict:
    """Get GPU memory usage."""
    if not torch.cuda.is_available():
        return {"available": False}

    return {
        "available": True,
        "device": torch.cuda.get_device_name(0),
        "total_gb": torch.cuda.get_device_properties(0).total_mem / 1e9,
        "allocated_gb": torch.cuda.memory_allocated(0) / 1e9,
        "reserved_gb": torch.cuda.memory_reserved(0) / 1e9,
    }


def estimate_memory_requirements(config) -> dict:
    """Estimate GPU memory needed for training."""
    params = config.num_parameters()
    bytes_per_param = 2  # BF16

    # Model weights
    model_mem = params * bytes_per_param

    # Optimizer states (AdamW: 2 states per param in FP32)
    optimizer_mem = params * 4 * 2

    # Gradients
    gradient_mem = params * bytes_per_param

    # Activations (rough estimate per layer per batch element)
    activation_per_layer = config.max_seq_len * config.hidden_dim * bytes_per_param * 4
    activation_mem = activation_per_layer * config.num_layers

    total = model_mem + optimizer_mem + gradient_mem + activation_mem

    return {
        "model_gb": model_mem / 1e9,
        "optimizer_gb": optimizer_mem / 1e9,
        "gradients_gb": gradient_mem / 1e9,
        "activations_gb": activation_mem / 1e9,
        "total_gb": total / 1e9,
        "recommended_gpu": (
            "RTX 3090/4090 (24GB)" if total / 1e9 < 20
            else "A100 40GB" if total / 1e9 < 35
            else "A100 80GB" if total / 1e9 < 70
            else "Multi-GPU required"
        ),
    }
