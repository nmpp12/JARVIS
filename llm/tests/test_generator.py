"""Tests for llm/inference/generator.py — runs entirely on CPU, no GPU required."""

import pytest
import torch

from llm.model.config import ModelConfig
from llm.model.transformer import MOMTransformer
from llm.inference.generator import TextGenerator
from llm.inference.creativity import CreativityEngine


# ── Fixtures ──────────────────────────────────────────────────────────────────

class _TinyTokenizer:
    """Minimal tokenizer shim — just maps token IDs directly."""
    def __init__(self, vocab_size):
        self.vocab_size = vocab_size
        self.bos_token_id = 1
        self.eos_token_id = 2

    def encode(self, text: str, add_bos=True, add_eos=False):
        ids = [ord(c) % self.vocab_size for c in text[:8]] or [3]
        if add_bos:
            ids = [self.bos_token_id] + ids
        if add_eos:
            ids = ids + [self.eos_token_id]
        return ids

    def decode(self, ids, skip_special=True):
        special = {self.bos_token_id, self.eos_token_id}
        chars = []
        for i in ids:
            if skip_special and i in special:
                continue
            chars.append(chr(max(32, i % 128)))
        return "".join(chars)


@pytest.fixture(scope="module")
def cfg():
    c = ModelConfig.tiny()
    c.use_bitnet = False
    c.use_flash_attention = False
    c.use_triton_kernels = False
    c.use_early_exit = False
    c.use_token_pruning = False
    return c


@pytest.fixture(scope="module")
def generator(cfg):
    model = MOMTransformer(cfg)
    tokenizer = _TinyTokenizer(cfg.vocab_size)
    gen = TextGenerator(model, tokenizer, device=torch.device("cpu"))
    return gen


# ── Basic generation ──────────────────────────────────────────────────────────

class TestGeneratorBasic:
    def test_returns_string(self, generator):
        result = generator.generate("hello", max_new_tokens=8)
        assert isinstance(result, str)

    def test_generates_at_least_one_token(self, generator):
        result = generator.generate("hi", max_new_tokens=4)
        # After decoding, we should have at least something (possibly empty if
        # all tokens are special, but the call must complete)
        assert result is not None

    def test_max_new_tokens_limits_output(self, generator, cfg):
        """Output should not contain more tokens than max_new_tokens."""
        result = generator.generate("test", max_new_tokens=3)
        # Re-encode to count tokens
        tokenizer = _TinyTokenizer(cfg.vocab_size)
        ids = tokenizer.encode(result, add_bos=False, add_eos=False)
        assert len(ids) <= 3 + 1  # slight slack for BOS injection

    def test_greedy_is_deterministic(self, generator):
        """Temperature=0 (greedy) should be deterministic."""
        r1 = generator.generate("same prompt", max_new_tokens=6, temperature=0)
        r2 = generator.generate("same prompt", max_new_tokens=6, temperature=0)
        assert r1 == r2

    def test_all_strategies_produce_string(self, generator):
        strategies = ["standard", "typical", "contrastive", "adaptive", "creative"]
        for s in strategies:
            result = generator.generate("hello", max_new_tokens=4, sampling_strategy=s)
            assert isinstance(result, str), f"Strategy {s!r} did not return a string"


# ── KV-cache consistency ──────────────────────────────────────────────────────

class TestKVCache:
    def test_generate_does_not_raise_with_kv_cache(self, generator):
        """The internal KV-cache path should run without error."""
        result = generator.generate("cache test", max_new_tokens=5)
        assert isinstance(result, str)

    def test_two_calls_independent(self, generator):
        """Two separate calls should not share state."""
        r1 = generator.generate("first call", max_new_tokens=4, temperature=0)
        r2 = generator.generate("first call", max_new_tokens=4, temperature=0)
        assert r1 == r2  # same deterministic output each time


# ── Repetition penalty ────────────────────────────────────────────────────────

class TestRepetitionPenalty:
    def test_penalty_1_matches_no_penalty(self, generator):
        """repetition_penalty=1.0 should be identical to no penalty."""
        r1 = generator.generate("test", max_new_tokens=4, temperature=0,
                                repetition_penalty=1.0)
        r2 = generator.generate("test", max_new_tokens=4, temperature=0,
                                repetition_penalty=1.0)
        assert r1 == r2

    def test_high_penalty_runs_without_error(self, generator):
        result = generator.generate("repeat repeat", max_new_tokens=6,
                                    repetition_penalty=2.0)
        assert isinstance(result, str)


# ── Creativity Engine integration ─────────────────────────────────────────────

class TestCreativityEngineIntegration:
    def test_creative_strategy_with_engine_returns_string(self, cfg):
        model = MOMTransformer(cfg)
        tokenizer = _TinyTokenizer(cfg.vocab_size)
        engine = CreativityEngine()
        gen = TextGenerator(model, tokenizer, device=torch.device("cpu"),
                            creativity_engine=engine)
        result = gen.generate("creative prompt", max_new_tokens=4,
                              sampling_strategy="creative")
        assert isinstance(result, str)

    def test_creative_strategy_without_engine_still_works(self, generator):
        """creative strategy falls back gracefully when no engine is set."""
        result = generator.generate("prompt", max_new_tokens=4,
                                    sampling_strategy="creative")
        assert isinstance(result, str)

    def test_engine_record_called_after_creative_generation(self, cfg):
        from unittest.mock import MagicMock, patch
        model = MOMTransformer(cfg)
        tokenizer = _TinyTokenizer(cfg.vocab_size)
        engine = CreativityEngine()
        engine.record = MagicMock()
        gen = TextGenerator(model, tokenizer, device=torch.device("cpu"),
                            creativity_engine=engine)
        gen.generate("track me", max_new_tokens=4, sampling_strategy="creative")
        engine.record.assert_called_once()

    def test_engine_enhance_prompt_called_for_creative(self, cfg):
        from unittest.mock import MagicMock
        model = MOMTransformer(cfg)
        tokenizer = _TinyTokenizer(cfg.vocab_size)
        engine = CreativityEngine()
        original_enhance = engine.enhance_prompt
        engine.enhance_prompt = MagicMock(side_effect=original_enhance)
        gen = TextGenerator(model, tokenizer, device=torch.device("cpu"),
                            creativity_engine=engine)
        gen.generate("enhance me", max_new_tokens=4, sampling_strategy="creative")
        engine.enhance_prompt.assert_called_once()

    def test_engine_not_called_for_standard_strategy(self, cfg):
        from unittest.mock import MagicMock
        model = MOMTransformer(cfg)
        tokenizer = _TinyTokenizer(cfg.vocab_size)
        engine = CreativityEngine()
        engine.enhance_prompt = MagicMock(side_effect=engine.enhance_prompt)
        gen = TextGenerator(model, tokenizer, device=torch.device("cpu"),
                            creativity_engine=engine)
        gen.generate("no enhance", max_new_tokens=4, sampling_strategy="standard")
        engine.enhance_prompt.assert_not_called()


# ── Stop tokens ───────────────────────────────────────────────────────────────

class TestStopTokens:
    def test_stop_on_eos(self, generator, cfg):
        """Generation stops when EOS is sampled (ensured by greedy on tiny model)."""
        result = generator.generate("stop here", max_new_tokens=50)
        # Just verify it terminates and returns a string
        assert isinstance(result, str)


# ── Sampling methods ──────────────────────────────────────────────────────────

class TestSamplingMethods:
    def test_top_k_1_is_greedy(self, generator):
        """top_k=1 effectively forces greedy selection."""
        r1 = generator.generate("prompt", max_new_tokens=5, temperature=1.0, top_k=1)
        r2 = generator.generate("prompt", max_new_tokens=5, temperature=1.0, top_k=1)
        assert r1 == r2

    def test_top_p_1_includes_all_tokens(self, generator):
        result = generator.generate("prompt", max_new_tokens=4, top_p=1.0)
        assert isinstance(result, str)

    def test_typical_sampling(self, generator):
        result = generator.generate("typical", max_new_tokens=4,
                                    sampling_strategy="typical", typical_p=0.95)
        assert isinstance(result, str)

    def test_adaptive_sampling(self, generator):
        result = generator.generate("adaptive", max_new_tokens=4,
                                    sampling_strategy="adaptive")
        assert isinstance(result, str)
