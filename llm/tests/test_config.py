"""Tests for llm/model/config.py"""

import json
import os
import tempfile

import pytest

from llm.model.config import ModelConfig


class TestModelConfigPresets:
    def test_tiny_preset_dimensions(self):
        cfg = ModelConfig.tiny()
        assert cfg.hidden_dim == 256
        assert cfg.num_layers == 6
        assert cfg.num_heads == 8
        assert cfg.num_kv_heads == 2

    def test_laptop_preset_is_cpu_friendly(self):
        cfg = ModelConfig.laptop()
        assert cfg.use_flash_attention is False
        assert cfg.use_triton_kernels is False
        assert cfg.use_early_exit is True
        assert cfg.use_sliding_window is True
        assert cfg.use_bitnet is True

    def test_small_preset_dimensions(self):
        cfg = ModelConfig.small()
        assert cfg.hidden_dim == 768
        assert cfg.num_layers == 12

    def test_medium_preset_dimensions(self):
        cfg = ModelConfig.medium()
        assert cfg.hidden_dim == 1024
        assert cfg.num_layers == 24

    def test_large_preset_dimensions(self):
        cfg = ModelConfig.large()
        assert cfg.hidden_dim == 2048

    def test_xl_preset_dimensions(self):
        cfg = ModelConfig.xl()
        assert cfg.hidden_dim == 4096
        assert cfg.num_layers == 32


class TestModelConfigProperties:
    def test_head_dim_divides_evenly(self):
        for preset in (ModelConfig.tiny, ModelConfig.small, ModelConfig.medium,
                       ModelConfig.large, ModelConfig.xl):
            cfg = preset()
            assert cfg.hidden_dim % cfg.num_heads == 0, (
                f"{preset.__name__}: hidden_dim={cfg.hidden_dim} not divisible by num_heads={cfg.num_heads}"
            )

    def test_head_dim_property(self):
        cfg = ModelConfig.tiny()
        assert cfg.head_dim == cfg.hidden_dim // cfg.num_heads

    def test_kv_heads_le_attention_heads(self):
        for preset in (ModelConfig.tiny, ModelConfig.laptop, ModelConfig.small,
                       ModelConfig.medium, ModelConfig.large, ModelConfig.xl):
            cfg = preset()
            assert cfg.num_kv_heads <= cfg.num_heads


class TestParameterEstimation:
    def test_num_parameters_positive(self):
        for preset in (ModelConfig.tiny, ModelConfig.small):
            cfg = preset()
            assert cfg.num_parameters() > 0

    def test_tiny_roughly_15m_params(self):
        cfg = ModelConfig.tiny()
        params = cfg.num_parameters()
        # Allow a ±50% window around 15M — the estimate is intentionally rough
        assert 7_000_000 < params < 30_000_000, f"Unexpected param count: {params:,}"

    def test_larger_preset_has_more_params(self):
        tiny = ModelConfig.tiny().num_parameters()
        small = ModelConfig.small().num_parameters()
        medium = ModelConfig.medium().num_parameters()
        assert tiny < small < medium

    def test_estimate_model_size_keys(self):
        cfg = ModelConfig.tiny()
        size = cfg.estimate_model_size()
        assert "total_params" in size
        assert "fp16_mb" in size
        assert "bitnet_mb" in size
        assert "compression_ratio" in size
        assert "avg_bits_per_param" in size

    def test_bitnet_compression_ratio_gt_1(self):
        cfg = ModelConfig.tiny()
        cfg.use_bitnet = True
        size = cfg.estimate_model_size()
        assert size["compression_ratio"] > 1.0

    def test_no_bitnet_compression_ratio_is_1(self):
        cfg = ModelConfig.tiny()
        cfg.use_bitnet = False
        size = cfg.estimate_model_size()
        assert abs(size["compression_ratio"] - 1.0) < 1e-6


class TestConfigSaveLoad:
    def test_round_trip_save_load(self):
        original = ModelConfig.tiny()
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            original.save(path)
            loaded = ModelConfig.load(path)
        assert loaded.hidden_dim == original.hidden_dim
        assert loaded.num_layers == original.num_layers
        assert loaded.num_heads == original.num_heads
        assert loaded.use_bitnet == original.use_bitnet

    def test_save_creates_valid_json(self):
        cfg = ModelConfig.tiny()
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "config.json")
            cfg.save(path)
            with open(path) as f:
                data = json.load(f)
        assert "hidden_dim" in data
        assert "num_layers" in data

    def test_load_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            ModelConfig.load("/nonexistent/path/config.json")


class TestConfigRepr:
    def test_repr_contains_param_count(self):
        cfg = ModelConfig.tiny()
        r = repr(cfg)
        assert "M" in r or "B" in r  # millions or billions

    def test_repr_mentions_bitnet_when_enabled(self):
        cfg = ModelConfig.tiny()
        cfg.use_bitnet = True
        assert "BitNet" in repr(cfg)

    def test_repr_no_bitnet_tag_when_disabled(self):
        cfg = ModelConfig.tiny()
        cfg.use_bitnet = False
        assert "BitNet" not in repr(cfg)
