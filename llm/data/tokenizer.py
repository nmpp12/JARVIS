"""
MOM Tokenizer - BPE tokenizer with ML/DL domain-specific vocabulary.

Wraps SentencePiece or tiktoken for BPE, and adds special tokens
for structured ML knowledge (code blocks, math, paper references).
Can train a new tokenizer from scratch on domain data.
"""

import json
import os
import re
from pathlib import Path
from typing import List, Optional, Dict


# Special tokens for ML/DL domain
SPECIAL_TOKENS = {
    "<pad>": 0,
    "<bos>": 1,
    "<eos>": 2,
    "<unk>": 3,
    "<sep>": 4,
    # Domain-specific markers
    "<code>": 5,
    "</code>": 6,
    "<math>": 7,
    "</math>": 8,
    "<paper>": 9,
    "</paper>": 10,
    "<concept>": 11,
    "</concept>": 12,
    "<proof>": 13,
    "</proof>": 14,
    "<algorithm>": 15,
    "</algorithm>": 16,
    "<architecture>": 17,
    "</architecture>": 18,
    "<equation>": 19,
    "</equation>": 20,
    # Sibling creation tokens
    "<sibling>": 21,
    "</sibling>": 22,
    "<jarvis>": 23,
    "</jarvis>": 24,
    "<vision>": 25,
    "</vision>": 26,
    "<tool_call>": 27,
    "</tool_call>": 28,
    "<tool_result>": 29,
    "</tool_result>": 30,
    "<scene_graph>": 31,
    "</scene_graph>": 32,
    "<governance>": 33,
    "</governance>": 34,
}

# ML/DL specific vocabulary additions
ML_VOCABULARY = [
    # Architectures
    "transformer", "attention", "self-attention", "cross-attention",
    "convolution", "conv2d", "conv1d", "pooling", "batch_norm",
    "layer_norm", "group_norm", "rms_norm", "dropout", "residual",
    # Optimizers
    "adam", "adamw", "sgd", "rmsprop", "adagrad", "lion", "lamb",
    # Activations
    "relu", "gelu", "silu", "swiglu", "softmax", "sigmoid", "tanh",
    # Losses
    "cross_entropy", "mse_loss", "bce_loss", "contrastive_loss",
    "triplet_loss", "focal_loss", "kl_divergence",
    # Training concepts
    "backpropagation", "gradient_descent", "learning_rate",
    "weight_decay", "warmup", "cosine_annealing", "mixed_precision",
    "gradient_checkpointing", "distributed_training", "data_parallel",
    # Model types
    "gpt", "bert", "llama", "mistral", "diffusion", "vae", "gan",
    "autoencoder", "encoder-decoder", "decoder-only",
    # Math/Stats
    "eigenvalue", "eigenvector", "jacobian", "hessian",
    "gradient", "divergence", "covariance", "posterior",
    "likelihood", "bayesian", "markov", "gaussian",
    # Frameworks
    "pytorch", "tensorflow", "jax", "numpy", "cuda", "triton",
    # Sibling creation & governance
    "jarvis", "vision", "sibling_bus", "scene_graph", "tool_call",
    "trust_score", "containment", "anomaly_score", "threat_level",
    "multimodal_fusion", "cross_attention", "distillation",
    "knowledge_transfer", "capability_grant", "moral_boundary",
]


class MOMTokenizer:
    """BPE tokenizer with ML/DL domain support.

    Supports two backends:
    - sentencepiece: Train custom BPE from scratch
    - tiktoken: Use pre-trained BPE (e.g., GPT-2/GPT-4 compatible)

    Falls back to a simple character-level tokenizer if neither is available.
    """

    def __init__(
        self,
        vocab_size: int = 32000,
        model_path: Optional[str] = None,
        backend: str = "auto",
    ):
        self.vocab_size = vocab_size
        self.special_tokens = SPECIAL_TOKENS
        self.backend = backend
        self._tokenizer = None
        self._char_vocab: Optional[Dict[str, int]] = None
        self._char_vocab_inv: Optional[Dict[int, str]] = None

        if model_path and os.path.exists(model_path):
            self.load(model_path)
        else:
            self._init_backend()

    def _init_backend(self) -> None:
        """Initialize the tokenizer backend."""
        if self.backend == "auto":
            # sentencepiece selected only if a trained model file is available;
            # the library being importable is not enough — it needs a .model file.
            try:
                import tiktoken
                self.backend = "tiktoken"
            except ImportError:
                self.backend = "character"

        if self.backend == "tiktoken":
            try:
                import tiktoken
                self._tokenizer = tiktoken.get_encoding("cl100k_base")
            except Exception:
                # Encoding file unavailable (e.g. no network); fall back to character
                self.backend = "character"
                self._build_char_vocab()
        elif self.backend == "character":
            self._build_char_vocab()
        # sentencepiece: model must be loaded explicitly via load() or train()

    def _build_char_vocab(self) -> None:
        """Build a character-level vocabulary as fallback."""
        chars = list(
            "abcdefghijklmnopqrstuvwxyz"
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
            "0123456789"
            " \t\n\r"
            "!@#$%^&*()_+-=[]{}|;':\",./<>?`~\\"
        )
        offset = len(self.special_tokens)
        self._char_vocab = {c: i + offset for i, c in enumerate(chars)}
        self._char_vocab_inv = {v: k for k, v in self._char_vocab.items()}
        # Add special tokens
        for token, idx in self.special_tokens.items():
            self._char_vocab[token] = idx
            self._char_vocab_inv[idx] = token

    def train(self, data_files: List[str], output_dir: str) -> None:
        """Train a new BPE tokenizer on domain data using SentencePiece."""
        import sentencepiece as spm

        os.makedirs(output_dir, exist_ok=True)

        # Merge all data files
        merged_path = os.path.join(output_dir, "train_data.txt")
        with open(merged_path, "w", encoding="utf-8") as out:
            for fpath in data_files:
                with open(fpath, encoding="utf-8") as f:
                    for line in f:
                        out.write(line)

        # Train SentencePiece BPE model
        user_defined_symbols = list(self.special_tokens.keys()) + ML_VOCABULARY
        spm.SentencePieceTrainer.train(
            input=merged_path,
            model_prefix=os.path.join(output_dir, "mom_tokenizer"),
            vocab_size=self.vocab_size,
            model_type="bpe",
            character_coverage=0.9995,
            num_threads=os.cpu_count(),
            split_digits=True,
            byte_fallback=True,
            user_defined_symbols=user_defined_symbols,
            pad_id=0,
            bos_id=1,
            eos_id=2,
            unk_id=3,
        )

        # Load the trained model
        self._tokenizer = spm.SentencePieceProcessor()
        self._tokenizer.load(os.path.join(output_dir, "mom_tokenizer.model"))
        self.backend = "sentencepiece"

        # Save config
        config = {
            "backend": self.backend,
            "vocab_size": self.vocab_size,
            "special_tokens": self.special_tokens,
        }
        with open(os.path.join(output_dir, "tokenizer_config.json"), "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)

    def encode(self, text: str, add_bos: bool = True, add_eos: bool = False) -> List[int]:
        """Encode text to token IDs."""
        tokens = []
        if add_bos:
            tokens.append(self.special_tokens["<bos>"])

        if self.backend == "sentencepiece" and self._tokenizer:
            tokens.extend(self._tokenizer.encode(text))
        elif self.backend == "tiktoken" and self._tokenizer:
            tokens.extend(self._tokenizer.encode(text))
        elif self.backend == "character":
            for ch in text:
                tokens.append(self._char_vocab.get(ch, self.special_tokens["<unk>"]))

        if add_eos:
            tokens.append(self.special_tokens["<eos>"])

        return tokens

    def decode(self, token_ids: List[int], skip_special: bool = True) -> str:
        """Decode token IDs back to text."""
        special_ids = set(self.special_tokens.values()) if skip_special else set()

        if self.backend == "sentencepiece" and self._tokenizer:
            filtered = [t for t in token_ids if t not in special_ids]
            return self._tokenizer.decode(filtered)
        elif self.backend == "tiktoken" and self._tokenizer:
            filtered = [t for t in token_ids if t not in special_ids]
            return self._tokenizer.decode(filtered)
        elif self.backend == "character":
            chars = []
            for tid in token_ids:
                if tid in special_ids:
                    continue
                chars.append(self._char_vocab_inv.get(tid, "?"))
            return "".join(chars)
        return ""

    def save(self, path: str) -> None:
        """Save tokenizer state."""
        os.makedirs(path, exist_ok=True)
        config = {
            "backend": self.backend,
            "vocab_size": self.vocab_size,
            "special_tokens": self.special_tokens,
        }
        with open(os.path.join(path, "tokenizer_config.json"), "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)

    def load(self, path: str) -> None:
        """Load tokenizer from saved state."""
        config_path = os.path.join(path, "tokenizer_config.json")
        if os.path.exists(config_path):
            with open(config_path, encoding="utf-8") as f:
                config = json.load(f)
            self.backend = config.get("backend", "character")
            self.vocab_size = config.get("vocab_size", 32000)
            self.special_tokens = config.get("special_tokens", SPECIAL_TOKENS)

        if self.backend == "sentencepiece":
            import sentencepiece as spm
            model_path = os.path.join(path, "mom_tokenizer.model")
            if os.path.exists(model_path):
                self._tokenizer = spm.SentencePieceProcessor()
                self._tokenizer.load(model_path)
        else:
            self._init_backend()

    @property
    def pad_token_id(self) -> int:
        return self.special_tokens["<pad>"]

    @property
    def bos_token_id(self) -> int:
        return self.special_tokens["<bos>"]

    @property
    def eos_token_id(self) -> int:
        return self.special_tokens["<eos>"]

    def __len__(self) -> int:
        if self.backend == "tiktoken" and self._tokenizer:
            return self._tokenizer.n_vocab
        return self.vocab_size
