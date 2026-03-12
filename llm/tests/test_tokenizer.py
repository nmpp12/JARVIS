"""Tests for llm/data/tokenizer.py — character-level backend (no external deps)."""

import pytest

from llm.data.tokenizer import MOMTokenizer, SPECIAL_TOKENS, ML_VOCABULARY


@pytest.fixture
def tok():
    """Character-level tokenizer (no sentencepiece/tiktoken needed in CI)."""
    return MOMTokenizer(vocab_size=32000, backend="character")


class TestSpecialTokens:
    def test_all_required_special_tokens_present(self):
        required = ["<pad>", "<bos>", "<eos>", "<unk>"]
        for token in required:
            assert token in SPECIAL_TOKENS

    def test_sibling_tokens_present(self):
        for token in ("<jarvis>", "</jarvis>", "<vision>", "</vision>",
                      "<tool_call>", "</tool_call>", "<governance>", "</governance>"):
            assert token in SPECIAL_TOKENS, f"Missing sibling token: {token}"

    def test_token_ids_are_unique(self):
        ids = list(SPECIAL_TOKENS.values())
        assert len(ids) == len(set(ids)), "Duplicate token IDs detected"

    def test_pad_is_zero(self):
        assert SPECIAL_TOKENS["<pad>"] == 0

    def test_bos_is_one(self):
        assert SPECIAL_TOKENS["<bos>"] == 1

    def test_eos_is_two(self):
        assert SPECIAL_TOKENS["<eos>"] == 2


class TestMLVocabulary:
    def test_ml_vocabulary_is_non_empty(self):
        assert len(ML_VOCABULARY) > 0

    def test_common_terms_present(self):
        for term in ("transformer", "attention", "pytorch", "gradient"):
            assert term in ML_VOCABULARY, f"Expected '{term}' in ML_VOCABULARY"


class TestTokenizerProperties:
    def test_pad_token_id_property(self, tok):
        assert tok.pad_token_id == SPECIAL_TOKENS["<pad>"]

    def test_bos_token_id_property(self, tok):
        assert tok.bos_token_id == SPECIAL_TOKENS["<bos>"]

    def test_eos_token_id_property(self, tok):
        assert tok.eos_token_id == SPECIAL_TOKENS["<eos>"]

    def test_len_equals_vocab_size(self, tok):
        assert len(tok) == tok.vocab_size


class TestEncoding:
    def test_encode_returns_list_of_ints(self, tok):
        ids = tok.encode("hello")
        assert isinstance(ids, list)
        assert all(isinstance(i, int) for i in ids)

    def test_encode_prepends_bos_by_default(self, tok):
        ids = tok.encode("hello")
        assert ids[0] == SPECIAL_TOKENS["<bos>"]

    def test_encode_no_bos_when_disabled(self, tok):
        ids = tok.encode("hello", add_bos=False)
        assert ids[0] != SPECIAL_TOKENS["<bos>"]

    def test_encode_appends_eos_when_requested(self, tok):
        ids = tok.encode("hello", add_eos=True)
        assert ids[-1] == SPECIAL_TOKENS["<eos>"]

    def test_empty_string_encodes_to_bos_only(self, tok):
        ids = tok.encode("", add_bos=True, add_eos=False)
        assert ids == [SPECIAL_TOKENS["<bos>"]]

    def test_unknown_character_maps_to_unk(self, tok):
        # Use a character outside the char vocab
        ids = tok.encode("\x00", add_bos=False)
        assert SPECIAL_TOKENS["<unk>"] in ids


class TestDecoding:
    def test_roundtrip_ascii(self, tok):
        text = "hello world"
        ids = tok.encode(text, add_bos=False, add_eos=False)
        decoded = tok.decode(ids)
        assert decoded == text

    def test_decode_skips_special_tokens_by_default(self, tok):
        ids = tok.encode("hi", add_bos=True, add_eos=True)
        decoded = tok.decode(ids)
        assert decoded == "hi"

    def test_decode_includes_special_ids_when_skip_special_false(self, tok):
        ids = [SPECIAL_TOKENS["<bos>"], *tok.encode("hi", add_bos=False, add_eos=False)]
        decoded = tok.decode(ids, skip_special=False)
        # The BOS special token should appear in the output (as the tag string)
        assert "<bos>" in decoded

    def test_decode_empty_list(self, tok):
        assert tok.decode([]) == ""

    def test_roundtrip_alphanumeric(self, tok):
        for text in ("abc123", "Hello World", "x = 42"):
            ids = tok.encode(text, add_bos=False, add_eos=False)
            assert tok.decode(ids) == text


class TestSaveLoad:
    def test_save_and_load_preserves_backend(self, tmp_path, tok):
        tok.save(str(tmp_path))
        loaded = MOMTokenizer(backend="character")
        loaded.load(str(tmp_path))
        assert loaded.backend == "character"

    def test_save_creates_config_file(self, tmp_path, tok):
        tok.save(str(tmp_path))
        assert (tmp_path / "tokenizer_config.json").exists()
