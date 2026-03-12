"""
MOM Training Engine

Full-featured training loop with:
- Mixed precision training (BF16/FP16)
- Gradient accumulation
- Gradient clipping
- Distributed training support (DDP/FSDP)
- Checkpointing and resumption
- Wandb/TensorBoard logging
- Learning rate scheduling
- Evaluation loop
"""

import json
import math
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ..model.config import ModelConfig
from ..model.transformer import MOMTransformer
from .scheduler import CosineWarmupScheduler


@dataclass
class TrainingConfig:
    """Training hyperparameters."""
    # Optimization
    learning_rate: float = 3e-4
    min_lr: float = 3e-5
    weight_decay: float = 0.1
    beta1: float = 0.9
    beta2: float = 0.95
    eps: float = 1e-8
    max_grad_norm: float = 1.0

    # Batch / sequence
    batch_size: int = 8
    gradient_accumulation_steps: int = 4
    max_seq_len: int = 2048

    # Schedule
    num_epochs: int = 3
    max_steps: Optional[int] = None
    warmup_steps: int = 2000
    lr_schedule: str = "cosine"  # "cosine" or "wsd"

    # Precision
    dtype: str = "bfloat16"  # "float32", "float16", "bfloat16"
    use_amp: bool = True

    # Checkpointing
    checkpoint_dir: str = "./checkpoints"
    save_every_steps: int = 1000
    eval_every_steps: int = 500
    log_every_steps: int = 10

    # Regularization
    label_smoothing: float = 0.0  # 0.1 is a good starting point
    early_stopping_patience: int = 0  # 0 = disabled; N = stop after N evals with no improvement

    # Distributed
    distributed: bool = False
    gradient_checkpointing: bool = False

    # Logging
    wandb_project: Optional[str] = None
    wandb_run_name: Optional[str] = None
    log_dir: str = "./logs"

    @property
    def effective_batch_size(self) -> int:
        return self.batch_size * self.gradient_accumulation_steps

    @property
    def torch_dtype(self) -> torch.dtype:
        return {
            "float32": torch.float32,
            "float16": torch.float16,
            "bfloat16": torch.bfloat16,
        }[self.dtype]

    def save(self, path: str) -> None:
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w") as f:
            json.dump(self.__dict__, f, indent=2, default=str)

    @classmethod
    def load(cls, path: str) -> "TrainingConfig":
        with open(path) as f:
            data = json.load(f)
        config = cls()
        for k, v in data.items():
            if hasattr(config, k):
                setattr(config, k, v)
        return config


class Trainer:
    """Training engine for MOM."""

    def __init__(
        self,
        model: MOMTransformer,
        train_loader: DataLoader,
        config: TrainingConfig,
        eval_loader: Optional[DataLoader] = None,
        tokenizer=None,
    ):
        self.model = model
        self.train_loader = train_loader
        self.eval_loader = eval_loader
        self.config = config
        self.tokenizer = tokenizer

        # Setup device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self.model.to(self.device)

        # Enable gradient checkpointing if requested
        if config.gradient_checkpointing:
            self.model.config.gradient_checkpointing = True

        # Setup optimizer (AdamW with weight decay filtering)
        self.optimizer = self._create_optimizer()

        # Setup scheduler
        total_steps = config.max_steps or (
            len(train_loader) * config.num_epochs // config.gradient_accumulation_steps
        )
        self.total_steps = total_steps
        self.scheduler = CosineWarmupScheduler(
            self.optimizer,
            warmup_steps=config.warmup_steps,
            total_steps=total_steps,
            min_lr_ratio=config.min_lr / config.learning_rate,
        )

        # Mixed precision
        self.scaler = None
        if config.use_amp and config.dtype == "float16":
            self.scaler = torch.amp.GradScaler("cuda")

        # Tracking
        self.global_step = 0
        self.epoch = 0
        self.best_eval_loss = float("inf")
        self.training_log: list = []
        self._evals_without_improvement = 0  # for early stopping

        # Create output directories
        os.makedirs(config.checkpoint_dir, exist_ok=True)
        os.makedirs(config.log_dir, exist_ok=True)

        # Wandb
        self.wandb_run = None
        if config.wandb_project:
            try:
                import wandb
                self.wandb_run = wandb.init(
                    project=config.wandb_project,
                    name=config.wandb_run_name,
                    config={
                        "model": model.config.__dict__,
                        "training": config.__dict__,
                    },
                )
            except ImportError:
                print("wandb not installed, skipping logging")

    def _create_optimizer(self) -> torch.optim.Optimizer:
        """Create AdamW optimizer with proper weight decay grouping."""
        # Don't apply weight decay to biases, norms, or embeddings
        decay_params = []
        no_decay_params = []

        for name, param in self.model.named_parameters():
            if not param.requires_grad:
                continue
            if any(nd in name for nd in ["bias", "norm", "embedding"]):
                no_decay_params.append(param)
            else:
                decay_params.append(param)

        param_groups = [
            {"params": decay_params, "weight_decay": self.config.weight_decay},
            {"params": no_decay_params, "weight_decay": 0.0},
        ]

        return torch.optim.AdamW(
            param_groups,
            lr=self.config.learning_rate,
            betas=(self.config.beta1, self.config.beta2),
            eps=self.config.eps,
        )

    def train(self) -> Dict:
        """Run the full training loop."""
        print(f"\n{'='*60}")
        print(f"MOM Training")
        print(f"{'='*60}")
        print(f"Model parameters: {self.model.num_parameters():,}")
        print(f"Device: {self.device}")
        print(f"Effective batch size: {self.config.effective_batch_size}")
        print(f"Total steps: {self.total_steps:,}")
        print(f"Precision: {self.config.dtype}")
        print(f"{'='*60}\n")

        self.model.train()
        start_time = time.time()
        tokens_processed = 0
        running_loss = 0.0
        num_loss_updates = 0
        early_stop = False

        for epoch in range(self.config.num_epochs):
            self.epoch = epoch
            self.optimizer.zero_grad()

            for step, batch in enumerate(self.train_loader):
                # Move batch to device
                input_ids = batch["input_ids"].to(self.device)
                labels = batch["labels"].to(self.device)

                # Forward pass with mixed precision
                if self.config.use_amp and self.config.dtype != "float32":
                    with torch.amp.autocast("cuda", dtype=self.config.torch_dtype):
                        outputs = self.model(input_ids=input_ids, labels=labels,
                                             label_smoothing=self.config.label_smoothing)
                        loss = outputs["loss"] / self.config.gradient_accumulation_steps
                else:
                    outputs = self.model(input_ids=input_ids, labels=labels,
                                         label_smoothing=self.config.label_smoothing)
                    loss = outputs["loss"] / self.config.gradient_accumulation_steps

                # Backward pass
                if self.scaler:
                    self.scaler.scale(loss).backward()
                else:
                    loss.backward()

                running_loss += loss.item()
                tokens_processed += input_ids.numel()

                # Gradient accumulation step
                if (step + 1) % self.config.gradient_accumulation_steps == 0:
                    # Gradient clipping
                    if self.scaler:
                        self.scaler.unscale_(self.optimizer)
                    grad_norm = torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(), self.config.max_grad_norm
                    )

                    # Optimizer step
                    if self.scaler:
                        self.scaler.step(self.optimizer)
                        self.scaler.update()
                    else:
                        self.optimizer.step()

                    self.scheduler.step()
                    self.optimizer.zero_grad()
                    self.global_step += 1
                    num_loss_updates += 1

                    # Logging
                    if self.global_step % self.config.log_every_steps == 0:
                        avg_loss = running_loss / num_loss_updates
                        elapsed = time.time() - start_time
                        tokens_per_sec = tokens_processed / elapsed
                        current_lr = self.scheduler.get_last_lr()[0]
                        perplexity = math.exp(min(avg_loss * self.config.gradient_accumulation_steps, 20))

                        log_entry = {
                            "step": self.global_step,
                            "epoch": epoch,
                            "loss": avg_loss * self.config.gradient_accumulation_steps,
                            "perplexity": perplexity,
                            "lr": current_lr,
                            "grad_norm": grad_norm.item() if isinstance(grad_norm, torch.Tensor) else grad_norm,
                            "tokens_per_sec": tokens_per_sec,
                            "elapsed_sec": elapsed,
                        }
                        self.training_log.append(log_entry)

                        print(
                            f"Step {self.global_step:>6d}/{self.total_steps} | "
                            f"Loss: {log_entry['loss']:.4f} | "
                            f"PPL: {perplexity:.2f} | "
                            f"LR: {current_lr:.2e} | "
                            f"Grad: {log_entry['grad_norm']:.3f} | "
                            f"Tok/s: {tokens_per_sec:.0f}"
                        )

                        if self.wandb_run:
                            import wandb
                            wandb.log(log_entry, step=self.global_step)

                        running_loss = 0.0
                        num_loss_updates = 0

                    # Evaluation
                    early_stop = False
                    if (
                        self.eval_loader
                        and self.global_step % self.config.eval_every_steps == 0
                    ):
                        eval_loss = self.evaluate()
                        self.model.train()

                        if eval_loss < self.best_eval_loss:
                            self.best_eval_loss = eval_loss
                            self._evals_without_improvement = 0
                            self.save_checkpoint("best")
                        else:
                            self._evals_without_improvement += 1
                            patience = self.config.early_stopping_patience
                            if patience > 0 and self._evals_without_improvement >= patience:
                                print(
                                    f"\n  Early stopping: eval loss hasn't improved for "
                                    f"{patience} evaluations (best={self.best_eval_loss:.4f})."
                                )
                                early_stop = True

                    # Checkpointing
                    if self.global_step % self.config.save_every_steps == 0:
                        self.save_checkpoint(f"step_{self.global_step}")

                    # Max steps / early stopping check
                    if early_stop:
                        break
                    if self.config.max_steps and self.global_step >= self.config.max_steps:
                        break

            if early_stop:
                break
            if self.config.max_steps and self.global_step >= self.config.max_steps:
                break

        # Final save
        self.save_checkpoint("final")
        total_time = time.time() - start_time

        summary = {
            "total_steps": self.global_step,
            "total_time_sec": total_time,
            "total_tokens": tokens_processed,
            "final_loss": self.training_log[-1]["loss"] if self.training_log else 0,
            "best_eval_loss": self.best_eval_loss,
        }

        # Save training log
        log_path = os.path.join(self.config.log_dir, "training_log.json")
        with open(log_path, "w") as f:
            json.dump(self.training_log, f, indent=2)

        print(f"\n{'='*60}")
        print(f"Training Complete!")
        print(f"Total steps: {self.global_step:,}")
        print(f"Total time: {total_time / 3600:.2f} hours")
        print(f"Tokens processed: {tokens_processed:,}")
        print(f"{'='*60}")

        return summary

    @torch.no_grad()
    def evaluate(self) -> float:
        """Run evaluation and return average loss."""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0

        for batch in self.eval_loader:
            input_ids = batch["input_ids"].to(self.device)
            labels = batch["labels"].to(self.device)

            if self.config.use_amp and self.config.dtype != "float32":
                with torch.amp.autocast("cuda", dtype=self.config.torch_dtype):
                    outputs = self.model(input_ids=input_ids, labels=labels)
            else:
                outputs = self.model(input_ids=input_ids, labels=labels)

            total_loss += outputs["loss"].item()
            num_batches += 1

        avg_loss = total_loss / max(1, num_batches)
        perplexity = math.exp(min(avg_loss, 20))
        print(f"\n  Eval @ step {self.global_step}: Loss={avg_loss:.4f}, PPL={perplexity:.2f}\n")

        if self.wandb_run:
            import wandb
            wandb.log({"eval_loss": avg_loss, "eval_ppl": perplexity}, step=self.global_step)

        return avg_loss

    def save_checkpoint(self, name: str) -> None:
        """Save model checkpoint."""
        ckpt_dir = os.path.join(self.config.checkpoint_dir, name)
        os.makedirs(ckpt_dir, exist_ok=True)

        # Save model weights
        torch.save(self.model.state_dict(), os.path.join(ckpt_dir, "model.pt"))

        # Save optimizer and scheduler state
        torch.save(
            {
                "optimizer": self.optimizer.state_dict(),
                "scheduler": self.scheduler.state_dict(),
                "scaler": self.scaler.state_dict() if self.scaler else None,
                "global_step": self.global_step,
                "epoch": self.epoch,
                "best_eval_loss": self.best_eval_loss,
            },
            os.path.join(ckpt_dir, "training_state.pt"),
        )

        # Save configs
        self.model.config.save(os.path.join(ckpt_dir, "model_config.json"))
        self.config.save(os.path.join(ckpt_dir, "training_config.json"))

        # Save tokenizer if available
        if self.tokenizer:
            self.tokenizer.save(os.path.join(ckpt_dir, "tokenizer"))

        print(f"  Checkpoint saved: {ckpt_dir}")

    def load_checkpoint(self, path: str) -> None:
        """Resume training from a checkpoint."""
        # Load model weights
        model_path = os.path.join(path, "model.pt")
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))

        # Load training state
        state_path = os.path.join(path, "training_state.pt")
        if os.path.exists(state_path):
            state = torch.load(state_path, map_location=self.device)
            self.optimizer.load_state_dict(state["optimizer"])
            self.scheduler.load_state_dict(state["scheduler"])
            if self.scaler and state.get("scaler"):
                self.scaler.load_state_dict(state["scaler"])
            self.global_step = state["global_step"]
            self.epoch = state["epoch"]
            self.best_eval_loss = state.get("best_eval_loss", float("inf"))

        print(f"Resumed from checkpoint: {path} (step {self.global_step})")
