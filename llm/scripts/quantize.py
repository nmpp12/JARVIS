#!/usr/bin/env python3
"""
MOM Post-Training Quantization Script

Converts a trained MOM model to packed 1.58-bit ternary format
for ultra-compact storage and efficient inference.

Usage:
    # Quantize a checkpoint
    python -m llm.scripts.quantize --checkpoint checkpoints/mom-small/final

    # Quantize and save to specific output
    python -m llm.scripts.quantize --checkpoint checkpoints/mom-small/final \
        --output checkpoints/mom-small-1.58bit

    # Show size comparison without saving
    python -m llm.scripts.quantize --checkpoint checkpoints/mom-small/final --dry-run
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import torch

from llm.model.config import ModelConfig
from llm.model.transformer import MOMTransformer
from llm.model.bitnet import quantize_model, pack_model_for_storage, BitLinear


def parse_args():
    parser = argparse.ArgumentParser(description="Quantize MOM to 1.58-bit ternary format")
    parser.add_argument("--checkpoint", type=str, required=True,
                        help="Path to trained model checkpoint")
    parser.add_argument("--output", type=str, default=None,
                        help="Output path for quantized model (default: <checkpoint>-1.58bit)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show size estimates without saving")
    parser.add_argument("--device", type=str, default="cpu",
                        help="Device for quantization")
    return parser.parse_args()


def format_bytes(n: int) -> str:
    if n >= 1e9:
        return f"{n / 1e9:.2f} GB"
    elif n >= 1e6:
        return f"{n / 1e6:.2f} MB"
    elif n >= 1e3:
        return f"{n / 1e3:.2f} KB"
    return f"{n} B"


def main():
    args = parse_args()

    # Load model config
    config_path = os.path.join(args.checkpoint, "model_config.json")
    if not os.path.exists(config_path):
        print(f"Error: No model_config.json found at {args.checkpoint}")
        sys.exit(1)

    config = ModelConfig.load(config_path)
    print(f"\nModel: {config}")
    print(f"BitNet enabled: {config.use_bitnet}")

    # Show size estimates
    size_info = config.estimate_model_size()
    print(f"\n{'='*60}")
    print(f"Size Estimates:")
    print(f"  Total parameters:  {size_info['total_params']:,}")
    print(f"  FP16 size:         {size_info['fp16_mb']:.1f} MB")
    print(f"  BitNet 1.58b size: {size_info['bitnet_mb']:.1f} MB")
    print(f"  Compression ratio: {size_info['compression_ratio']:.1f}x")
    print(f"  Avg bits/param:    {size_info['avg_bits_per_param']:.2f}")
    print(f"{'='*60}")

    if args.dry_run:
        print("\nDry run complete. Use without --dry-run to quantize and save.")
        return

    # Load model
    print(f"\nLoading model from {args.checkpoint}...")
    model = MOMTransformer(config)
    state_dict = torch.load(
        os.path.join(args.checkpoint, "model.pt"),
        map_location=args.device,
    )
    model.load_state_dict(state_dict)

    # Count BitLinear layers
    bitlinear_count = sum(1 for m in model.modules() if isinstance(m, BitLinear))
    print(f"Found {bitlinear_count} BitLinear layers to quantize")

    if bitlinear_count == 0:
        print("Warning: No BitLinear layers found. Was the model trained with use_bitnet=True?")
        print("If you trained without BitNet, you can still quantize post-hoc by setting use_bitnet=True in config.")

    # Quantize
    print("\nQuantizing weights to ternary {-1, 0, +1}...")
    stats = model.quantize_for_inference()

    print(f"\nQuantization Results:")
    print(f"  Layers quantized:  {stats['layers_quantized']}")
    print(f"  Parameters:        {stats['total_params']:,}")
    print(f"  Original size:     {format_bytes(stats['original_bytes'])}")
    print(f"  Quantized size:    {format_bytes(stats['quantized_bytes'])}")
    print(f"  Compression:       {stats['compression_ratio']:.1f}x")
    print(f"  Bits per param:    {stats['bits_per_param']:.2f}")

    # Save
    output_path = args.output or f"{args.checkpoint}-1.58bit"
    print(f"\nSaving quantized model to {output_path}...")

    storage_stats = pack_model_for_storage(model, output_path)

    # Also save config
    config.save(os.path.join(output_path, "model_config.json"))

    # Copy tokenizer if present
    tok_path = os.path.join(args.checkpoint, "tokenizer")
    if os.path.exists(tok_path):
        import shutil
        shutil.copytree(tok_path, os.path.join(output_path, "tokenizer"), dirs_exist_ok=True)

    print(f"\nFinal file size: {storage_stats['file_size_mb']:.2f} MB")

    # Compare with original
    orig_model_path = os.path.join(args.checkpoint, "model.pt")
    if os.path.exists(orig_model_path):
        orig_size = os.path.getsize(orig_model_path)
        print(f"Original file:   {orig_size / (1024*1024):.2f} MB")
        print(f"File reduction:  {orig_size / max(storage_stats['file_size_bytes'], 1):.1f}x")

    print(f"\nDone! Quantized model saved to: {output_path}")


if __name__ == "__main__":
    main()
