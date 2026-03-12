"""Tests for llm/model/transformer.py — runs entirely on CPU, no GPU required."""

import pytest
import torch

from llm.model.config import ModelConfig
from llm.model.transformer import MOMTransformer, RMSNorm, precompute_rope_freqs, apply_rope


# Use the tiny preset throughout — fast enough for CPU tests
@pytest.fixture(scope="module")
def cfg():
    c = ModelConfig.tiny()
    c.use_bitnet = False          # skip quantization in unit tests
    c.use_flash_attention = False  # no CUDA flash attention in CI
    c.use_triton_kernels = False   # no Triton in CI
    c.use_early_exit = False
    c.use_token_pruning = False
    return c


@pytest.fixture(scope="module")
def model(cfg):
    m = MOMTransformer(cfg)
    m.eval()
    return m


# ── RMSNorm ──────────────────────────────────────────────────────────────────

class TestRMSNorm:
    def test_output_shape_unchanged(self):
        norm = RMSNorm(64)
        x = torch.randn(2, 10, 64)
        assert norm(x).shape == x.shape

    def test_output_dtype_preserved(self):
        norm = RMSNorm(64)
        x = torch.randn(2, 4, 64).half()
        out = norm(x)
        assert out.dtype == torch.float16

    def test_learned_weight_is_ones_at_init(self):
        norm = RMSNorm(32)
        assert torch.allclose(norm.weight, torch.ones(32))


# ── RoPE ─────────────────────────────────────────────────────────────────────

class TestRoPE:
    def test_freqs_shape(self):
        freqs = precompute_rope_freqs(dim=64, max_seq_len=128)
        assert freqs.shape == (128, 32)  # T × (dim/2) complex

    def test_apply_rope_shape_preserved(self):
        B, H, T, D = 2, 4, 8, 32
        q = torch.randn(B, H, T, D)
        k = torch.randn(B, H, T, D)
        freqs = precompute_rope_freqs(dim=D, max_seq_len=T)
        q_out, k_out = apply_rope(q, k, freqs)
        assert q_out.shape == q.shape
        assert k_out.shape == k.shape

    def test_apply_rope_dtype_preserved(self):
        B, H, T, D = 1, 2, 4, 16
        q = torch.randn(B, H, T, D)
        k = torch.randn(B, H, T, D)
        freqs = precompute_rope_freqs(dim=D, max_seq_len=T)
        q_out, k_out = apply_rope(q, k, freqs)
        assert q_out.dtype == q.dtype
        assert k_out.dtype == k.dtype


# ── MOMTransformer forward pass ───────────────────────────────────────────────

class TestMOMTransformerForward:
    def test_output_keys(self, model, cfg):
        B, T = 2, 16
        ids = torch.randint(0, cfg.vocab_size, (B, T))
        out = model(input_ids=ids)
        assert "logits" in out

    def test_logits_shape(self, model, cfg):
        B, T = 2, 16
        ids = torch.randint(0, cfg.vocab_size, (B, T))
        out = model(input_ids=ids)
        assert out["logits"].shape == (B, T, cfg.vocab_size)

    def test_loss_computed_when_labels_provided(self, model, cfg):
        B, T = 2, 16
        ids = torch.randint(0, cfg.vocab_size, (B, T))
        out = model(input_ids=ids, labels=ids)
        assert "loss" in out
        assert out["loss"].shape == ()      # scalar
        assert out["loss"].item() > 0

    def test_loss_is_scalar_float(self, model, cfg):
        ids = torch.randint(0, cfg.vocab_size, (1, 8))
        out = model(input_ids=ids, labels=ids)
        assert isinstance(out["loss"].item(), float)

    def test_ignore_index_minus100(self, model, cfg):
        """Labels of -100 should be masked out, not raise errors."""
        ids = torch.randint(0, cfg.vocab_size, (1, 8))
        labels = ids.clone()
        labels[0, :4] = -100
        out = model(input_ids=ids, labels=labels)
        assert "loss" in out

    def test_kv_cache_returned_when_requested(self, model, cfg):
        ids = torch.randint(0, cfg.vocab_size, (1, 8))
        out = model(input_ids=ids, use_cache=True)
        assert "kv_caches" in out
        assert len(out["kv_caches"]) == cfg.num_layers

    def test_kv_cache_shape(self, model, cfg):
        T = 8
        ids = torch.randint(0, cfg.vocab_size, (1, T))
        out = model(input_ids=ids, use_cache=True)
        k, v = out["kv_caches"][0]
        assert k.shape[2] == T  # sequence length dimension

    def test_single_token_with_kv_cache(self, model, cfg):
        """Single-token generation step with an existing KV cache."""
        # Prefill
        ids = torch.randint(0, cfg.vocab_size, (1, 8))
        out = model(input_ids=ids, use_cache=True)
        kv_caches = out["kv_caches"]

        # One new token
        next_id = torch.randint(0, cfg.vocab_size, (1, 1))
        out2 = model(input_ids=next_id, kv_caches=kv_caches, use_cache=True)
        assert out2["logits"].shape == (1, 1, cfg.vocab_size)

    def test_different_sequence_lengths(self, model, cfg):
        for T in (1, 4, 16, 32):
            ids = torch.randint(0, cfg.vocab_size, (1, T))
            out = model(input_ids=ids)
            assert out["logits"].shape == (1, T, cfg.vocab_size)

    def test_num_parameters_positive(self, model):
        assert model.num_parameters() > 0

    def test_float_mask_treated_as_bool(self, model, cfg):
        """A 0.0/1.0 float mask should work the same as a bool mask."""
        T = 4
        ids = torch.randint(0, cfg.vocab_size, (1, T))
        # Causal mask as float (1=attend, 0=mask)
        causal_float = torch.tril(torch.ones(T, T))
        causal_bool  = causal_float.bool()

        out_float = model(input_ids=ids, attention_mask=causal_float)
        out_bool  = model(input_ids=ids, attention_mask=causal_bool)

        # Both should produce finite logits with the same shape
        assert out_float["logits"].shape == out_bool["logits"].shape
        assert out_float["logits"].isfinite().all()
        assert out_bool["logits"].isfinite().all()


# ── Early exit ───────────────────────────────────────────────────────────────

class TestEarlyExit:
    def test_early_exit_model_forward(self):
        cfg = ModelConfig.tiny()
        cfg.use_bitnet = False
        cfg.use_flash_attention = False
        cfg.use_triton_kernels = False
        cfg.use_early_exit = True
        cfg.early_exit_confidence = 0.0  # exit at every layer
        cfg.early_exit_min_layer = 0

        model = MOMTransformer(cfg)
        model.eval()
        ids = torch.randint(0, cfg.vocab_size, (1, 8))
        out = model(input_ids=ids, use_cache=False)
        # Should have exited early — logits still present
        assert "logits" in out

    def test_early_exit_stats_available(self):
        cfg = ModelConfig.tiny()
        cfg.use_bitnet = False
        cfg.use_flash_attention = False
        cfg.use_triton_kernels = False
        cfg.use_early_exit = True
        cfg.early_exit_confidence = 0.5

        model = MOMTransformer(cfg)
        model.eval()
        ids = torch.randint(0, cfg.vocab_size, (1, 4))
        model(input_ids=ids)
        stats = model.early_exit_manager.get_stats()
        assert "avg_exit_layer" in stats
        assert "total_tokens" in stats
