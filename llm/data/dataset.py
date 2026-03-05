"""
Dataset and data loading utilities for MOM training.

Supports:
- Pre-tokenized binary datasets (memory-mapped for large corpora)
- On-the-fly tokenization from text files
- Structured ML/DL knowledge format (concept, code, math blocks)
- Dynamic batching with sequence packing
"""

import json
import os
import struct
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader


class MLKnowledgeDataset(Dataset):
    """Dataset for ML/DL knowledge training data.

    Supports two data formats:
    1. Pre-tokenized binary (.bin) - memory-mapped for large-scale training
    2. JSONL text format - each line is a JSON object with a "text" field

    The JSONL format supports structured ML content:
    {
        "text": "The attention mechanism computes...",
        "category": "deep_learning",
        "subcategory": "transformers",
        "difficulty": "advanced",
        "source": "attention_is_all_you_need"
    }
    """

    def __init__(
        self,
        data_path: str,
        tokenizer,
        max_seq_len: int = 2048,
        mode: str = "auto",
    ):
        self.tokenizer = tokenizer
        self.max_seq_len = max_seq_len
        self.data_path = data_path

        if mode == "auto":
            mode = "binary" if data_path.endswith(".bin") else "jsonl"

        if mode == "binary":
            self._load_binary(data_path)
        else:
            self._load_jsonl(data_path)

    def _load_binary(self, path: str) -> None:
        """Load pre-tokenized data as memory-mapped array."""
        self.data = np.memmap(path, dtype=np.uint16, mode="r")
        self.num_tokens = len(self.data)
        self.num_samples = self.num_tokens // self.max_seq_len
        self.mode = "binary"

    def _load_jsonl(self, path: str) -> None:
        """Load and tokenize JSONL text data."""
        self.samples = []

        if os.path.isdir(path):
            files = sorted(Path(path).glob("*.jsonl"))
        else:
            files = [Path(path)]

        for fpath in files:
            with open(fpath) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        text = entry.get("text", entry.get("content", ""))
                        if text:
                            self.samples.append(text)
                    except json.JSONDecodeError:
                        # Treat as raw text
                        self.samples.append(line)

        self.num_samples = len(self.samples)
        self.mode = "jsonl"

    def __len__(self) -> int:
        return self.num_samples

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        if self.mode == "binary":
            start = idx * self.max_seq_len
            end = start + self.max_seq_len + 1  # +1 for label shifting
            chunk = self.data[start:end].astype(np.int64)
            x = torch.from_numpy(chunk[:-1])
            y = torch.from_numpy(chunk[1:])
        else:
            text = self.samples[idx]
            tokens = self.tokenizer.encode(text, add_bos=True, add_eos=True)

            # Truncate or pad
            if len(tokens) > self.max_seq_len + 1:
                tokens = tokens[: self.max_seq_len + 1]

            tokens = torch.tensor(tokens, dtype=torch.long)
            x = tokens[:-1]
            y = tokens[1:]

            # Pad if needed
            if len(x) < self.max_seq_len:
                pad_len = self.max_seq_len - len(x)
                x = torch.cat([x, torch.full((pad_len,), self.tokenizer.pad_token_id)])
                y = torch.cat([y, torch.full((pad_len,), -100)])  # -100 = ignore in loss

        return {"input_ids": x, "labels": y}

    @staticmethod
    def pretokenize(
        input_path: str,
        output_path: str,
        tokenizer,
        max_seq_len: int = 2048,
    ) -> None:
        """Pre-tokenize text data into binary format for faster loading."""
        all_tokens = []

        with open(input_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                    text = entry.get("text", entry.get("content", ""))
                except json.JSONDecodeError:
                    text = line

                if text:
                    tokens = tokenizer.encode(text, add_bos=True, add_eos=True)
                    all_tokens.extend(tokens)

        # Write as uint16 array
        arr = np.array(all_tokens, dtype=np.uint16)
        arr.tofile(output_path)
        print(f"Pre-tokenized {len(all_tokens):,} tokens -> {output_path}")


class DataCollator:
    """Collates samples into batches with dynamic padding."""

    def __init__(self, pad_token_id: int = 0, max_seq_len: int = 2048):
        self.pad_token_id = pad_token_id
        self.max_seq_len = max_seq_len

    def __call__(self, batch: List[Dict[str, torch.Tensor]]) -> Dict[str, torch.Tensor]:
        input_ids = torch.stack([item["input_ids"] for item in batch])
        labels = torch.stack([item["labels"] for item in batch])

        # Create attention mask (1 for real tokens, 0 for padding)
        attention_mask = (input_ids != self.pad_token_id).long()

        return {
            "input_ids": input_ids,
            "labels": labels,
            "attention_mask": attention_mask,
        }


def create_dataloader(
    data_path: str,
    tokenizer,
    batch_size: int = 8,
    max_seq_len: int = 2048,
    shuffle: bool = True,
    num_workers: int = 4,
) -> DataLoader:
    """Create a DataLoader for training."""
    dataset = MLKnowledgeDataset(
        data_path=data_path,
        tokenizer=tokenizer,
        max_seq_len=max_seq_len,
    )
    collator = DataCollator(
        pad_token_id=tokenizer.pad_token_id,
        max_seq_len=max_seq_len,
    )
    return DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=shuffle,
        num_workers=num_workers,
        collate_fn=collator,
        pin_memory=True,
        drop_last=True,
    )
