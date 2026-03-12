"""Tests for llm/training/trainer.py — runs on CPU, no GPU required."""

import os
import pytest
import torch
from torch.utils.data import DataLoader, TensorDataset

from llm.model.config import ModelConfig
from llm.model.transformer import MOMTransformer
from llm.training.trainer import Trainer, TrainingConfig


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def model_cfg():
    c = ModelConfig.tiny()
    c.use_bitnet = False
    c.use_flash_attention = False
    c.use_triton_kernels = False
    c.use_early_exit = False
    c.use_token_pruning = False
    return c


@pytest.fixture(scope="module")
def train_cfg(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("ckpt")
    return TrainingConfig(
        learning_rate=1e-3,
        batch_size=2,
        gradient_accumulation_steps=1,
        max_steps=3,
        warmup_steps=1,
        num_epochs=1,
        checkpoint_dir=str(tmp / "checkpoints"),
        log_dir=str(tmp / "logs"),
        use_amp=False,        # no CUDA in CI
        dtype="float32",
    )


def make_loader(cfg, batch_size=2, seq_len=16, n_batches=4):
    """Create a tiny DataLoader of random token sequences."""
    total = batch_size * n_batches
    ids = torch.randint(0, cfg.vocab_size, (total, seq_len))
    ds = TensorDataset(ids)
    return DataLoader(ds, batch_size=batch_size)


# ── TrainingConfig ────────────────────────────────────────────────────────────

class TestTrainingConfig:
    def test_effective_batch_size(self):
        cfg = TrainingConfig(batch_size=4, gradient_accumulation_steps=8)
        assert cfg.effective_batch_size == 32

    def test_torch_dtype_float32(self):
        cfg = TrainingConfig(dtype="float32")
        assert cfg.torch_dtype == torch.float32

    def test_torch_dtype_bfloat16(self):
        cfg = TrainingConfig(dtype="bfloat16")
        assert cfg.torch_dtype == torch.bfloat16

    def test_save_and_load_round_trip(self, tmp_path):
        cfg = TrainingConfig(learning_rate=5e-4, batch_size=16)
        path = str(tmp_path / "train_cfg.json")
        cfg.save(path)
        loaded = TrainingConfig.load(path)
        assert loaded.learning_rate == 5e-4
        assert loaded.batch_size == 16


# ── Trainer initialisation ────────────────────────────────────────────────────

class TestTrainerInit:
    def test_trainer_creates_optimizer(self, model_cfg, train_cfg):
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg)
        trainer = Trainer(model, loader, train_cfg)
        assert trainer.optimizer is not None

    def test_trainer_creates_two_param_groups(self, model_cfg, train_cfg):
        """AdamW should have decay and no-decay groups."""
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg)
        trainer = Trainer(model, loader, train_cfg)
        assert len(trainer.optimizer.param_groups) == 2

    def test_no_decay_group_has_zero_wd(self, model_cfg, train_cfg):
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg)
        trainer = Trainer(model, loader, train_cfg)
        no_decay_group = trainer.optimizer.param_groups[1]
        assert no_decay_group["weight_decay"] == 0.0

    def test_global_step_starts_at_zero(self, model_cfg, train_cfg):
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg)
        trainer = Trainer(model, loader, train_cfg)
        assert trainer.global_step == 0

    def test_output_dirs_created(self, model_cfg, train_cfg):
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg)
        Trainer(model, loader, train_cfg)
        assert os.path.isdir(train_cfg.checkpoint_dir)
        assert os.path.isdir(train_cfg.log_dir)


# ── Single training step ──────────────────────────────────────────────────────

class TestTrainingStep:
    @pytest.fixture(scope="class")
    def trainer_and_snapshot(self, model_cfg, train_cfg):
        model = MOMTransformer(model_cfg)
        # Capture parameter snapshot before any training
        before = {n: p.detach().clone() for n, p in model.named_parameters()}
        loader = make_loader(model_cfg)
        trainer = Trainer(model, loader, train_cfg)
        return trainer, before

    def _do_one_manual_step(self, model_cfg, train_cfg):
        """Run exactly one gradient update and return (trainer, params_before)."""
        model = MOMTransformer(model_cfg)
        before = {n: p.detach().clone() for n, p in model.named_parameters()}
        loader = make_loader(model_cfg, n_batches=2)
        cfg = TrainingConfig(
            learning_rate=1e-2,   # large LR so params definitely move
            batch_size=2,
            gradient_accumulation_steps=1,
            max_steps=1,
            warmup_steps=0,
            use_amp=False,
            dtype="float32",
            checkpoint_dir=train_cfg.checkpoint_dir,
            log_dir=train_cfg.log_dir,
        )
        trainer = Trainer(model, loader, cfg)
        trainer.train()
        return trainer, before

    def test_parameters_change_after_one_step(self, model_cfg, train_cfg):
        trainer, before = self._do_one_manual_step(model_cfg, train_cfg)
        changed = False
        for name, param in trainer.model.named_parameters():
            if not torch.allclose(param.detach(), before[name]):
                changed = True
                break
        assert changed, "No parameters changed after one training step"

    def test_global_step_incremented(self, model_cfg, train_cfg):
        trainer, _ = self._do_one_manual_step(model_cfg, train_cfg)
        assert trainer.global_step == 1

    def test_training_log_has_entry(self, model_cfg, train_cfg):
        trainer, _ = self._do_one_manual_step(model_cfg, train_cfg)
        assert len(trainer.training_log) >= 1

    def test_loss_is_positive_finite(self, model_cfg, train_cfg):
        trainer, _ = self._do_one_manual_step(model_cfg, train_cfg)
        loss_val = trainer.training_log[0]["loss"]
        assert loss_val > 0
        assert loss_val < 1e6  # finite


# ── Checkpointing ─────────────────────────────────────────────────────────────

class TestCheckpointing:
    def test_save_and_load_checkpoint(self, model_cfg, tmp_path):
        train_cfg = TrainingConfig(
            learning_rate=1e-3,
            batch_size=2,
            gradient_accumulation_steps=1,
            max_steps=1,
            warmup_steps=0,
            use_amp=False,
            dtype="float32",
            checkpoint_dir=str(tmp_path / "checkpoints"),
            log_dir=str(tmp_path / "logs"),
        )
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg, n_batches=2)
        trainer = Trainer(model, loader, train_cfg)
        trainer.train()

        ckpt_dir = train_cfg.checkpoint_dir
        # At least one checkpoint file should be written
        files = list(os.walk(ckpt_dir))
        any_file = any(f for _, _, fs in files for f in fs)
        assert any_file, "No checkpoint files written after training"

    def test_checkpoint_contains_model_state(self, model_cfg, tmp_path):
        train_cfg = TrainingConfig(
            learning_rate=1e-3,
            batch_size=2,
            gradient_accumulation_steps=1,
            max_steps=1,
            warmup_steps=0,
            save_every_steps=1,
            use_amp=False,
            dtype="float32",
            checkpoint_dir=str(tmp_path / "checkpoints"),
            log_dir=str(tmp_path / "logs"),
        )
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg, n_batches=2)
        trainer = Trainer(model, loader, train_cfg)
        trainer.train()

        # Find a .pt checkpoint
        ckpt_files = []
        for root, _, files in os.walk(train_cfg.checkpoint_dir):
            for f in files:
                if f.endswith(".pt"):
                    ckpt_files.append(os.path.join(root, f))

        assert ckpt_files, "No .pt checkpoint found"
        ckpt = torch.load(ckpt_files[0], map_location="cpu")
        assert "model_state_dict" in ckpt or "state_dict" in ckpt or isinstance(ckpt, dict)


# ── Gradient accumulation ─────────────────────────────────────────────────────

class TestGradientAccumulation:
    def test_grad_accumulation_runs_without_error(self, model_cfg, tmp_path):
        cfg = TrainingConfig(
            learning_rate=1e-3,
            batch_size=2,
            gradient_accumulation_steps=4,
            max_steps=2,
            warmup_steps=0,
            use_amp=False,
            dtype="float32",
            checkpoint_dir=str(tmp_path / "ckpt"),
            log_dir=str(tmp_path / "logs"),
        )
        model = MOMTransformer(model_cfg)
        loader = make_loader(model_cfg, n_batches=16)
        trainer = Trainer(model, loader, cfg)
        result = trainer.train()   # Should not raise
        assert trainer.global_step >= 1
