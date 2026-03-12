#!/usr/bin/env python3
"""
MOM Data Curation Script

Generate and manage ML/DL training data.

Usage:
    # Generate seed data
    python -m llm.scripts.curate_data --output ./data

    # Generate, tokenize, and split into train/eval binary files
    python -m llm.scripts.curate_data --output ./data --pretokenize --eval-split 0.15

    # Generate and show statistics
    python -m llm.scripts.curate_data --output ./data --stats

    # Merge with external data
    python -m llm.scripts.curate_data --output ./data --merge external_data.jsonl
"""

import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from llm.data.knowledge_curator import KnowledgeCurator
from llm.data.dataset import MLKnowledgeDataset
from llm.data.tokenizer import MOMTokenizer


def pretokenize_and_split(jsonl_path: str, output_dir: str, vocab_size: int,
                           max_seq_len: int, eval_split: float) -> None:
    """Tokenize JSONL data and split into train/eval binary files."""
    tok = MOMTokenizer(vocab_size=vocab_size)

    # Tokenize full dataset to binary
    full_bin = os.path.join(output_dir, "_full.bin")
    MLKnowledgeDataset.pretokenize(jsonl_path, full_bin, tok, max_seq_len)

    data = np.memmap(full_bin, dtype=np.uint16, mode="r")
    total_tokens = len(data)

    # Split at token boundary
    split_idx = int(total_tokens * (1.0 - eval_split))
    # Align to seq_len boundary so no partial sequences
    split_idx = (split_idx // max_seq_len) * max_seq_len

    train_path = os.path.join(output_dir, "ml_knowledge_train.bin")
    eval_path  = os.path.join(output_dir, "ml_knowledge_eval.bin")

    np.array(data[:split_idx], dtype=np.uint16).tofile(train_path)
    np.array(data[split_idx:], dtype=np.uint16).tofile(eval_path)
    os.remove(full_bin)

    train_samples = split_idx // max_seq_len
    eval_samples  = (total_tokens - split_idx) // max_seq_len
    print(f"  Train: {split_idx:,} tokens → {train_samples} sequences  ({train_path})")
    print(f"  Eval:  {total_tokens - split_idx:,} tokens → {eval_samples} sequences  ({eval_path})")


def main():
    parser = argparse.ArgumentParser(description="Curate ML/DL training data")
    parser.add_argument("--output", type=str, default="./data",
                        help="Output directory for data")
    parser.add_argument("--stats", action="store_true",
                        help="Show dataset statistics")
    parser.add_argument("--merge", type=str, nargs="+",
                        help="External JSONL files to merge")
    parser.add_argument("--filename", type=str, default="ml_knowledge.jsonl",
                        help="Output filename")
    parser.add_argument("--pretokenize", action="store_true",
                        help="Tokenize JSONL to binary and split into train/eval")
    parser.add_argument("--eval-split", type=float, default=0.15,
                        help="Fraction of data to use as eval set (default 0.15)")
    parser.add_argument("--vocab-size", type=int, default=32000)
    parser.add_argument("--max-seq-len", type=int, default=256)
    args = parser.parse_args()

    curator = KnowledgeCurator(args.output)

    # Generate seed knowledge
    print("Generating comprehensive ML/DL knowledge base...")
    curator.generate_seed_knowledge()

    # Merge external data if provided
    if args.merge:
        for path in args.merge:
            print(f"Merging: {path}")
            curator.load_external_data(path)

    # Save dataset
    output_path = curator.save_dataset(args.filename)

    if args.stats:
        stats = curator.get_stats()
        print(f"\nDataset Statistics:")
        print(f"  Total entries: {stats['total_entries']}")
        print(f"  Total characters: {stats['total_chars']:,}")
        print(f"\n  Categories:")
        for cat, count in sorted(stats['categories'].items()):
            print(f"    {cat}: {count}")
        print(f"\n  Difficulty levels:")
        for diff, count in sorted(stats['difficulties'].items()):
            print(f"    {diff}: {count}")

    print(f"\nData saved to: {output_path}")

    if args.pretokenize:
        print(f"\nPre-tokenizing and splitting (eval={args.eval_split:.0%})...")
        pretokenize_and_split(
            jsonl_path=output_path,
            output_dir=args.output,
            vocab_size=args.vocab_size,
            max_seq_len=args.max_seq_len,
            eval_split=args.eval_split,
        )


if __name__ == "__main__":
    main()
