"""Learning rate schedulers for MOM LLM training."""

import math
from torch.optim.lr_scheduler import _LRScheduler


class CosineWarmupScheduler(_LRScheduler):
    """Cosine annealing with linear warmup.

    Standard schedule for LLM pretraining:
    1. Linear warmup from 0 to peak LR over warmup_steps
    2. Cosine decay from peak LR to min_lr over remaining steps

    Args:
        optimizer: The optimizer to schedule
        warmup_steps: Number of warmup steps
        total_steps: Total training steps
        min_lr_ratio: Minimum LR as fraction of peak (default: 0.1)
    """

    def __init__(
        self,
        optimizer,
        warmup_steps: int,
        total_steps: int,
        min_lr_ratio: float = 0.1,
        last_epoch: int = -1,
    ):
        self.warmup_steps = warmup_steps
        self.total_steps = total_steps
        self.min_lr_ratio = min_lr_ratio
        super().__init__(optimizer, last_epoch)

    def get_lr(self):
        step = self.last_epoch
        if step < self.warmup_steps:
            # Linear warmup
            scale = step / max(1, self.warmup_steps)
        else:
            # Cosine decay
            progress = (step - self.warmup_steps) / max(
                1, self.total_steps - self.warmup_steps
            )
            scale = self.min_lr_ratio + 0.5 * (1.0 - self.min_lr_ratio) * (
                1.0 + math.cos(math.pi * progress)
            )
        return [base_lr * scale for base_lr in self.base_lrs]


class WarmupStableDecayScheduler(_LRScheduler):
    """Warmup-Stable-Decay (WSD) schedule.

    An alternative to cosine scheduling used in some LLM training runs:
    1. Linear warmup to peak LR
    2. Constant peak LR for the majority of training
    3. Linear decay to min LR at the end

    This schedule is simpler to tune and allows extending training
    without restarting the schedule.
    """

    def __init__(
        self,
        optimizer,
        warmup_steps: int,
        stable_steps: int,
        decay_steps: int,
        min_lr_ratio: float = 0.0,
        last_epoch: int = -1,
    ):
        self.warmup_steps = warmup_steps
        self.stable_steps = stable_steps
        self.decay_steps = decay_steps
        self.min_lr_ratio = min_lr_ratio
        self.total_steps = warmup_steps + stable_steps + decay_steps
        super().__init__(optimizer, last_epoch)

    def get_lr(self):
        step = self.last_epoch
        if step < self.warmup_steps:
            scale = step / max(1, self.warmup_steps)
        elif step < self.warmup_steps + self.stable_steps:
            scale = 1.0
        else:
            decay_progress = (step - self.warmup_steps - self.stable_steps) / max(
                1, self.decay_steps
            )
            scale = 1.0 - (1.0 - self.min_lr_ratio) * min(1.0, decay_progress)
        return [base_lr * scale for base_lr in self.base_lrs]
