#!/usr/bin/env python3
"""
Smart resume script: tries step_2600, falls back to step_2200 if loss doesn't improve.

Logic:
  1. Resume from step_2600 → run to step 3000 (400 more steps)
  2. If final loss < IMPROVEMENT_THRESHOLD (0.06): done, that's the model
  3. Otherwise: load weights-only from step_2200, fresh optimizer+scheduler,
     train for FALLBACK_STEPS (400) more steps with a lower peak LR
"""

import os
import sys
import json
import torch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from llm.model.config import ModelConfig
from llm.model.transformer import MOMTransformer
from llm.data.tokenizer import MOMTokenizer
from llm.data.dataset import create_dataloader
from llm.training.trainer import Trainer, TrainingConfig

# ── Config ────────────────────────────────────────────────────────────────────
CHECKPOINT_DIR   = "./output/checkpoints/mom-real"
DATA_PATH        = "./output/data/ml_knowledge.jsonl"
EVAL_PATH        = None  # no separate eval file; original run didn't use one

RESUME_2600      = os.path.join(CHECKPOINT_DIR, "step_2600")
RESUME_2200      = os.path.join(CHECKPOINT_DIR, "step_2200")

IMPROVEMENT_THRESHOLD = 0.06   # if final loss > this, 2600 didn't improve enough
FALLBACK_EXTRA_STEPS  = 400    # how many steps to run from 2200 fallback
FALLBACK_PEAK_LR      = 1e-4   # conservative LR for fallback (was spiking at 3e-4)
# ─────────────────────────────────────────────────────────────────────────────


def load_config_from_checkpoint(ckpt_path: str) -> dict:
    config_path = os.path.join(ckpt_path, "training_config.json")
    with open(config_path) as f:
        return json.load(f)


def build_components(ckpt_path: str, max_steps: int, peak_lr: float = None):
    """Build model, tokenizer, dataloaders, and trainer from a checkpoint dir."""
    cfg_dict = load_config_from_checkpoint(ckpt_path)

    # Model config
    model_cfg_path = os.path.join(ckpt_path, "model_config.json")
    with open(model_cfg_path) as f:
        model_cfg_dict = json.load(f)
    model_config = ModelConfig(**model_cfg_dict)

    # Training config
    training_config = TrainingConfig()
    for k, v in cfg_dict.items():
        if hasattr(training_config, k):
            setattr(training_config, k, v)
    training_config.max_steps = max_steps
    if peak_lr is not None:
        training_config.learning_rate = peak_lr
    training_config.checkpoint_dir = CHECKPOINT_DIR
    training_config.save_every_steps = 200

    # Tokenizer + dataloaders
    tokenizer = MOMTokenizer(vocab_size=model_config.vocab_size)
    train_loader = create_dataloader(
        data_path=DATA_PATH,
        tokenizer=tokenizer,
        batch_size=training_config.batch_size,
        max_seq_len=model_config.max_seq_len,
        shuffle=True,
        num_workers=2,
    )
    eval_loader = None
    if EVAL_PATH and os.path.exists(EVAL_PATH):
        eval_loader = create_dataloader(
            data_path=EVAL_PATH,
            tokenizer=tokenizer,
            batch_size=training_config.batch_size,
            max_seq_len=model_config.max_seq_len,
            shuffle=False,
            num_workers=2,
        )

    model = MOMTransformer(model_config)
    trainer = Trainer(
        model=model,
        train_loader=train_loader,
        config=training_config,
        eval_loader=eval_loader,
        tokenizer=tokenizer,
    )
    return trainer


def load_weights_only(trainer: Trainer, ckpt_path: str) -> None:
    """Load model weights without restoring optimizer or scheduler state."""
    model_path = os.path.join(ckpt_path, "model.pt")
    trainer.model.load_state_dict(torch.load(model_path, map_location=trainer.device))
    print(f"Loaded weights-only from: {ckpt_path} (fresh optimizer + scheduler)")


def get_final_loss(trainer: Trainer) -> float:
    if trainer.training_log:
        return trainer.training_log[-1]["loss"]
    return float("inf")


def main():
    print("=" * 60)
    print("PHASE 1: Resuming from step_2600 → target step 3000")
    print("=" * 60)

    trainer = build_components(RESUME_2600, max_steps=3000)
    trainer.load_checkpoint(RESUME_2600)  # restores step, optimizer, scheduler
    summary = trainer.train()

    final_loss = get_final_loss(trainer)
    print(f"\nPhase 1 complete. Final loss: {final_loss:.4f}")

    if final_loss <= IMPROVEMENT_THRESHOLD:
        print(f"✓ Loss {final_loss:.4f} ≤ threshold {IMPROVEMENT_THRESHOLD}. step_2600 path succeeded.")
        print(f"  Best checkpoint: {CHECKPOINT_DIR}/final")
        return

    # ── Fallback ─────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print(f"✗ Loss {final_loss:.4f} > threshold {IMPROVEMENT_THRESHOLD}.")
    print(f"PHASE 2: Falling back to step_2200 (weights-only, fresh schedule)")
    print(f"  Peak LR: {FALLBACK_PEAK_LR:.0e}  |  Steps: {FALLBACK_EXTRA_STEPS}")
    print("=" * 60)

    # We start fresh from step 2200 with a conservative LR.
    # max_steps = FALLBACK_EXTRA_STEPS so the scheduler targets that window.
    trainer2 = build_components(
        RESUME_2200,
        max_steps=FALLBACK_EXTRA_STEPS,
        peak_lr=FALLBACK_PEAK_LR,
    )
    load_weights_only(trainer2, RESUME_2200)
    summary2 = trainer2.train()

    final_loss2 = get_final_loss(trainer2)
    print(f"\nPhase 2 complete. Final loss: {final_loss2:.4f}")

    if final_loss2 < final_loss:
        print(f"✓ step_2200 path is better ({final_loss2:.4f} < {final_loss:.4f}).")
    else:
        print(f"Both paths converged similarly. Using step_2200 result as final.")

    print(f"  Best checkpoint: {CHECKPOINT_DIR}/final")


if __name__ == "__main__":
    main()
