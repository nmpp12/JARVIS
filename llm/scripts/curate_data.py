#!/usr/bin/env python3
"""
JARVIS-LLM Data Curation Script

Generate and manage ML/DL training data.

Usage:
    # Generate seed data
    python -m llm.scripts.curate_data --output ./data

    # Generate and show statistics
    python -m llm.scripts.curate_data --output ./data --stats

    # Merge with external data
    python -m llm.scripts.curate_data --output ./data --merge external_data.jsonl
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from llm.data.knowledge_curator import KnowledgeCurator


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


if __name__ == "__main__":
    main()
