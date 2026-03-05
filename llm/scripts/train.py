#!/usr/bin/env python3
"""
MOM Training Script

Usage:
    # Train with default config (small model)
    python -m llm.scripts.train

    # Train with specific config
    python -m llm.scripts.train --config llm/configs/train_medium.yaml

    # Train tiny model for testing
    python -m llm.scripts.train --preset tiny --max-steps 100

    # Resume from checkpoint
    python -m llm.scripts.train --resume checkpoints/jarvis-small/step_5000

    # Generate seed data and train
    python -m llm.scripts.train --generate-data --preset small
"""

import argparse
import os
import sys
import yaml

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import torch

from llm.model.config import ModelConfig
from llm.model.transformer import MOMTransformer
from llm.data.tokenizer import MOMTokenizer
from llm.data.dataset import MLKnowledgeDataset, DataCollator, create_dataloader
from llm.data.knowledge_curator import KnowledgeCurator
from llm.training.trainer import Trainer, TrainingConfig


def parse_args():
    parser = argparse.ArgumentParser(description="Train MOM")
    parser.add_argument("--config", type=str, help="Path to YAML config file")
    parser.add_argument("--preset", type=str, default="small",
                        choices=["tiny", "small", "medium", "large", "xl"],
                        help="Model size preset")
    parser.add_argument("--data-path", type=str, help="Path to training data")
    parser.add_argument("--eval-path", type=str, help="Path to eval data")
    parser.add_argument("--resume", type=str, help="Resume from checkpoint path")
    parser.add_argument("--max-steps", type=int, help="Override max training steps")
    parser.add_argument("--batch-size", type=int, help="Override batch size")
    parser.add_argument("--lr", type=float, help="Override learning rate")
    parser.add_argument("--generate-data", action="store_true",
                        help="Generate seed ML/DL knowledge data before training")
    parser.add_argument("--output-dir", type=str, default="./output",
                        help="Output directory for data and checkpoints")
    return parser.parse_args()


def load_yaml_config(path: str) -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


def generate_seed_data(output_dir: str) -> str:
    """Generate seed ML/DL training data."""
    data_dir = os.path.join(output_dir, "data")
    curator = KnowledgeCurator(data_dir)
    curator.generate_seed_knowledge()

    # Save dataset
    data_path = curator.save_dataset("ml_knowledge.jsonl")

    stats = curator.get_stats()
    print(f"\nGenerated seed data:")
    print(f"  Total entries: {stats['total_entries']}")
    print(f"  Total characters: {stats['total_chars']:,}")
    print(f"  Categories: {stats['categories']}")
    print(f"  Difficulties: {stats['difficulties']}")

    return data_path


def main():
    args = parse_args()

    # Load config from YAML or use defaults
    yaml_config = {}
    if args.config and os.path.exists(args.config):
        yaml_config = load_yaml_config(args.config)

    # Create model config
    model_cfg = yaml_config.get("model", {})
    preset = model_cfg.get("preset", args.preset)
    model_config = getattr(ModelConfig, preset)()

    # Override from yaml
    if "vocab_size" in model_cfg:
        model_config.vocab_size = model_cfg["vocab_size"]
    if "max_seq_len" in model_cfg:
        model_config.max_seq_len = model_cfg["max_seq_len"]
    if "use_flash_attention" in model_cfg:
        model_config.use_flash_attention = model_cfg["use_flash_attention"]
    if "gradient_checkpointing" in model_cfg:
        model_config.gradient_checkpointing = model_cfg["gradient_checkpointing"]

    print(f"\nModel: {model_config}")

    # Create training config
    train_cfg = yaml_config.get("training", {})
    training_config = TrainingConfig(
        learning_rate=args.lr or train_cfg.get("learning_rate", 3e-4),
        min_lr=train_cfg.get("min_lr", 3e-5),
        weight_decay=train_cfg.get("weight_decay", 0.1),
        beta1=train_cfg.get("beta1", 0.9),
        beta2=train_cfg.get("beta2", 0.95),
        max_grad_norm=train_cfg.get("max_grad_norm", 1.0),
        batch_size=args.batch_size or train_cfg.get("batch_size", 8),
        gradient_accumulation_steps=train_cfg.get("gradient_accumulation_steps", 4),
        max_seq_len=model_config.max_seq_len,
        num_epochs=train_cfg.get("num_epochs", 3),
        max_steps=args.max_steps or train_cfg.get("max_steps"),
        warmup_steps=train_cfg.get("warmup_steps", 2000),
        dtype=train_cfg.get("dtype", "bfloat16"),
        use_amp=train_cfg.get("use_amp", True),
        checkpoint_dir=train_cfg.get("checkpoint_dir", os.path.join(args.output_dir, "checkpoints")),
        save_every_steps=train_cfg.get("save_every_steps", 1000),
        eval_every_steps=train_cfg.get("eval_every_steps", 500),
        log_every_steps=train_cfg.get("log_every_steps", 10),
        gradient_checkpointing=model_cfg.get("gradient_checkpointing", False),
        wandb_project=train_cfg.get("wandb_project"),
        wandb_run_name=train_cfg.get("wandb_run_name"),
        log_dir=os.path.join(args.output_dir, "logs"),
    )

    # Generate seed data if requested
    data_cfg = yaml_config.get("data", {})
    data_path = args.data_path or data_cfg.get("train_path")
    eval_path = args.eval_path or data_cfg.get("eval_path")

    if args.generate_data or not data_path:
        print("\nGenerating seed ML/DL knowledge data...")
        data_path = generate_seed_data(args.output_dir)

    if not os.path.exists(data_path):
        print(f"Error: Data path '{data_path}' does not exist.")
        print("Use --generate-data to create seed training data.")
        sys.exit(1)

    # Initialize tokenizer
    tokenizer = MOMTokenizer(vocab_size=model_config.vocab_size)

    # Create data loaders
    print(f"\nLoading training data from: {data_path}")
    train_loader = create_dataloader(
        data_path=data_path,
        tokenizer=tokenizer,
        batch_size=training_config.batch_size,
        max_seq_len=model_config.max_seq_len,
        shuffle=True,
        num_workers=data_cfg.get("num_workers", 4),
    )

    eval_loader = None
    if eval_path and os.path.exists(eval_path):
        print(f"Loading eval data from: {eval_path}")
        eval_loader = create_dataloader(
            data_path=eval_path,
            tokenizer=tokenizer,
            batch_size=training_config.batch_size,
            max_seq_len=model_config.max_seq_len,
            shuffle=False,
            num_workers=2,
        )

    # Create model
    model = MOMTransformer(model_config)
    print(f"Model parameters: {model.num_parameters():,}")
    print(f"Device: {'cuda' if torch.cuda.is_available() else 'cpu'}")

    # Create trainer
    trainer = Trainer(
        model=model,
        train_loader=train_loader,
        config=training_config,
        eval_loader=eval_loader,
        tokenizer=tokenizer,
    )

    # Resume if specified
    if args.resume:
        trainer.load_checkpoint(args.resume)

    # Train!
    summary = trainer.train()
    print(f"\nTraining summary: {summary}")


if __name__ == "__main__":
    main()
