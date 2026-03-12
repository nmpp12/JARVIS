#!/usr/bin/env python3
"""
MOM Pre-training Data Downloader

Downloads open-source text corpora suitable for pre-training MOM.
All sources are openly licensed.

Usage:
    # Download everything (recommended for first run)
    python -m llm.scripts.download_data --output ./data/pretrain

    # Specific sources only
    python -m llm.scripts.download_data --output ./data/pretrain --sources wikipedia wikitext

    # Tiny subset for testing the pipeline
    python -m llm.scripts.download_data --output ./data/pretrain --sources wikitext --max-samples 5000

    # After downloading, train on it
    python -m llm.scripts.train --preset laptop --data ./data/pretrain

Available sources (all open-license):
    wikipedia   English Wikipedia (~20GB text, CC-BY-SA)
    wikitext    WikiText-103 (~500MB, preprocessed Wikipedia, MIT-like)
    tinystories TinyStories (~470MB, simple synthetic stories, useful for small models)
    seed        MOM's built-in ML/DL knowledge base (no download needed)
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# ── Source definitions ──────────────────────────────────────────────────────

SOURCES = {
    "wikipedia": {
        "description": "English Wikipedia (~20GB, CC-BY-SA). Best for general knowledge.",
        "hf_dataset": "wikipedia",
        "hf_config": "20220301.en",
        "text_field": "text",
        "split": "train",
    },
    "wikitext": {
        "description": "WikiText-103 (~500MB). Preprocessed Wikipedia, good for quick experiments.",
        "hf_dataset": "wikitext",
        "hf_config": "wikitext-103-raw-v1",
        "text_field": "text",
        "split": "train",
    },
    "tinystories": {
        "description": "TinyStories (~470MB). Short synthetic stories. "
                       "Ideal for testing small models since content is simple.",
        "hf_dataset": "roneneldan/TinyStories",
        "hf_config": None,
        "text_field": "text",
        "split": "train",
    },
}


# ── Downloader ──────────────────────────────────────────────────────────────

def download_hf_source(
    source_name: str,
    source_cfg: dict,
    output_dir: str,
    max_samples: int = None,
    min_length: int = 50,
) -> str:
    """Download a HuggingFace dataset and save as JSONL.

    Returns the path to the saved file.
    """
    try:
        from datasets import load_dataset
    except ImportError:
        print("  ERROR: 'datasets' package not installed.")
        print("  Run: pip install datasets")
        return None

    print(f"\n[{source_name}] {source_cfg['description']}")
    print(f"  Loading from HuggingFace: {source_cfg['hf_dataset']}")

    try:
        load_kwargs = {
            "path": source_cfg["hf_dataset"],
            "split": source_cfg["split"],
            "trust_remote_code": True,
        }
        if source_cfg["hf_config"]:
            load_kwargs["name"] = source_cfg["hf_config"]

        dataset = load_dataset(**load_kwargs, streaming=True)
    except Exception as e:
        print(f"  ERROR downloading {source_name}: {e}")
        return None

    output_path = os.path.join(output_dir, f"{source_name}.jsonl")
    text_field = source_cfg["text_field"]

    count = 0
    skipped = 0
    with open(output_path, "w", encoding="utf-8") as f:
        for example in dataset:
            text = example.get(text_field, "").strip()

            # Skip very short entries
            if len(text) < min_length:
                skipped += 1
                continue

            f.write(json.dumps({"text": text, "source": source_name}) + "\n")
            count += 1

            if count % 10_000 == 0:
                size_mb = os.path.getsize(output_path) / (1024 * 1024)
                print(f"  {count:,} samples written ({size_mb:.0f} MB)...", end="\r")

            if max_samples and count >= max_samples:
                break

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  Done: {count:,} samples, {skipped:,} skipped, {size_mb:.1f} MB → {output_path}")
    return output_path


def generate_seed_data(output_dir: str) -> str:
    """Generate MOM's built-in ML/DL knowledge base (no download needed)."""
    from llm.data.knowledge_curator import KnowledgeCurator

    print("\n[seed] MOM's built-in ML/DL knowledge base")
    print("  Generating comprehensive ML/DL knowledge...")

    curator = KnowledgeCurator(output_dir)
    curator.generate_seed_knowledge()
    output_path = curator.save_dataset("seed.jsonl")

    stats = curator.get_stats()
    print(f"  Done: {stats['total_entries']} entries → {output_path}")
    return output_path


def merge_jsonl(files: list, output_path: str) -> None:
    """Merge multiple JSONL files into one, shuffling for better training."""
    import random

    print(f"\nMerging {len(files)} source files...")
    all_lines = []
    for path in files:
        if path and os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                lines = f.readlines()
                all_lines.extend(lines)
                print(f"  + {os.path.basename(path)}: {len(lines):,} lines")

    random.shuffle(all_lines)

    with open(output_path, "w", encoding="utf-8") as f:
        f.writelines(all_lines)

    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"\nMerged dataset: {len(all_lines):,} total samples, {size_mb:.1f} MB")
    print(f"Saved to: {output_path}")


# ── CLI ─────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="Download pre-training data for MOM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="\n".join(
            f"  {name:12s} {cfg['description']}"
            for name, cfg in SOURCES.items()
        ),
    )
    parser.add_argument(
        "--output", type=str, default="./data/pretrain",
        help="Directory to save downloaded data (default: ./data/pretrain)",
    )
    parser.add_argument(
        "--sources", nargs="+",
        choices=list(SOURCES.keys()) + ["seed"],
        default=["seed", "wikitext"],
        help="Sources to download (default: seed wikitext)",
    )
    parser.add_argument(
        "--max-samples", type=int, default=None,
        help="Max samples per source (useful for testing; default: all)",
    )
    parser.add_argument(
        "--min-length", type=int, default=50,
        help="Minimum text length in characters to keep (default: 50)",
    )
    parser.add_argument(
        "--no-merge", action="store_true",
        help="Keep per-source files separate, don't merge into train.jsonl",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    os.makedirs(args.output, exist_ok=True)

    print("=" * 60)
    print("MOM Data Downloader")
    print(f"Output directory: {args.output}")
    print(f"Sources: {', '.join(args.sources)}")
    if args.max_samples:
        print(f"Max samples per source: {args.max_samples:,}")
    print("=" * 60)

    downloaded = []

    for source_name in args.sources:
        if source_name == "seed":
            path = generate_seed_data(args.output)
        elif source_name in SOURCES:
            path = download_hf_source(
                source_name,
                SOURCES[source_name],
                args.output,
                max_samples=args.max_samples,
                min_length=args.min_length,
            )
        else:
            print(f"Unknown source: {source_name}")
            continue

        if path:
            downloaded.append(path)

    if not args.no_merge and len(downloaded) > 1:
        merge_path = os.path.join(args.output, "train.jsonl")
        merge_jsonl(downloaded, merge_path)
    elif len(downloaded) == 1:
        print(f"\nSingle source — no merge needed.")
        print(f"Training file: {downloaded[0]}")
    else:
        print("\nNo files downloaded.")
        sys.exit(1)

    print("\nNext step — train MOM:")
    print(f"  python -m llm.scripts.train --preset laptop --data {args.output}/train.jsonl")


if __name__ == "__main__":
    main()
