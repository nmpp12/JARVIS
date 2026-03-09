#!/usr/bin/env python3
"""
MOM Text Generation Script

Usage:
    # Interactive mode
    python -m llm.scripts.generate --checkpoint checkpoints/jarvis-small/final

    # Single prompt
    python -m llm.scripts.generate --checkpoint checkpoints/jarvis-small/final \
        --prompt "Explain the attention mechanism in transformers"

    # Start API server
    python -m llm.scripts.generate --checkpoint checkpoints/jarvis-small/final --serve
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from llm.inference.generator import TextGenerator


def parse_args():
    parser = argparse.ArgumentParser(description="Generate text with MOM")
    parser.add_argument("--checkpoint", type=str, required=True,
                        help="Path to model checkpoint")
    parser.add_argument("--prompt", type=str, help="Text prompt (interactive if not set)")
    parser.add_argument("--max-tokens", type=int, default=256,
                        help="Maximum tokens to generate")
    parser.add_argument("--temperature", type=float, default=0.7)
    parser.add_argument("--top-k", type=int, default=50)
    parser.add_argument("--top-p", type=float, default=0.9)
    parser.add_argument("--serve", action="store_true",
                        help="Start as API server")
    parser.add_argument("--port", type=int, default=8000,
                        help="Server port (with --serve)")
    parser.add_argument("--device", type=str, default=None,
                        help="Device (cuda/cpu)")
    parser.add_argument("--cpu", action="store_true",
                        help="CPU mode: cap threads, disable GPU features")
    parser.add_argument("--threads", type=int, default=None,
                        help="Max CPU threads (default: half your cores, max 4)")
    return parser.parse_args()


def interactive_mode(generator: TextGenerator, args):
    """Run interactive text generation."""
    print("\n" + "=" * 60)
    print("MOM Interactive Mode")
    print("Type your prompt and press Enter. Type 'quit' to exit.")
    print("=" * 60 + "\n")

    while True:
        try:
            prompt = input("You: ").strip()
            if prompt.lower() in ("quit", "exit", "q"):
                print("Goodbye!")
                break
            if not prompt:
                continue

            print("\nJARVIS: ", end="", flush=True)
            response = generator.generate(
                prompt=prompt,
                max_new_tokens=args.max_tokens,
                temperature=args.temperature,
                top_k=args.top_k,
                top_p=args.top_p,
            )
            print(response)
            print()

        except KeyboardInterrupt:
            print("\nGoodbye!")
            break


def main():
    args = parse_args()

    if args.cpu:
        from llm.inference.server import configure_cpu_threads
        threads = configure_cpu_threads(args.threads)
        print(f"CPU mode: {threads} threads")
        if args.device is None:
            args.device = "cpu"

    if args.serve:
        from llm.inference.server import InferenceServer
        server = InferenceServer(
            args.checkpoint, port=args.port,
            cpu_mode=args.cpu, cpu_threads=args.threads,
        )
        server.start()
        return

    print(f"Loading model from {args.checkpoint}...")
    generator = TextGenerator.from_checkpoint(args.checkpoint, device=args.device)
    print("Model loaded!")

    if args.prompt:
        response = generator.generate(
            prompt=args.prompt,
            max_new_tokens=args.max_tokens,
            temperature=args.temperature,
            top_k=args.top_k,
            top_p=args.top_p,
        )
        print(f"\nPrompt: {args.prompt}")
        print(f"\nResponse: {response}")
    else:
        interactive_mode(generator, args)


if __name__ == "__main__":
    main()
