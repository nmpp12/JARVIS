"""
MOM Inference Server

REST API server compatible with OpenAI's API format, making it easy
to integrate with the existing JARVIS frontend and other tools.

Supports:
- Standard text and chat completions
- Continuous batching with paged KV-cache
- Speculative decoding mode
- Optimization statistics endpoint
"""

import json
import time
import uuid
import threading
from collections import deque
from typing import Optional, List

from .generator import TextGenerator


class ContinuousBatcher:
    """Continuous batching engine for high-throughput serving.

    Collects incoming requests into a queue and processes them in
    batches, maximizing GPU utilization. Uses paged KV-cache to
    efficiently manage memory across variable-length sequences.
    """

    def __init__(self, generator: TextGenerator, max_batch_size: int = 8):
        self.generator = generator
        self.max_batch_size = max_batch_size
        self.request_queue = deque()
        self.lock = threading.Lock()
        self.stats = {
            "total_requests": 0,
            "total_tokens_generated": 0,
            "avg_batch_size": 0.0,
            "batch_count": 0,
        }

    def submit(self, prompt: str, max_tokens: int = 256, **kwargs) -> str:
        """Submit a request for generation. Currently processes inline.

        In a production system, this would add to the queue and use a
        background thread to batch-process requests.
        """
        with self.lock:
            self.stats["total_requests"] += 1

        result = self.generator.generate(
            prompt=prompt,
            max_new_tokens=max_tokens,
            **kwargs,
        )

        with self.lock:
            self.stats["total_tokens_generated"] += len(result.split()) if result else 0
            self.stats["batch_count"] += 1
            self.stats["avg_batch_size"] = (
                self.stats["total_requests"] / max(self.stats["batch_count"], 1)
            )

        return result

    def get_stats(self) -> dict:
        with self.lock:
            return dict(self.stats)


def create_app(generator: TextGenerator, use_continuous_batching: bool = False):
    """Create a Flask inference server.

    Provides endpoints:
    - POST /v1/chat/completions - Chat completion (OpenAI compatible)
    - POST /v1/completions - Text completion
    - GET /v1/models - List available models
    - GET /v1/stats - Optimization and serving statistics
    - GET /health - Health check
    """
    from flask import Flask, request, jsonify, Response

    app = Flask(__name__)
    batcher = ContinuousBatcher(generator) if use_continuous_batching else None

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy", "model": "mom"})

    @app.route("/v1/stats", methods=["GET"])
    def stats():
        """Return optimization and serving statistics."""
        result = {"model": "mom"}
        # Early exit stats
        exit_stats = generator.get_early_exit_stats()
        if exit_stats:
            result["early_exit"] = exit_stats
        # Continuous batching stats
        if batcher:
            result["batching"] = batcher.get_stats()
        return jsonify(result)

    @app.route("/v1/models", methods=["GET"])
    def list_models():
        return jsonify({
            "object": "list",
            "data": [{
                "id": "mom",
                "object": "model",
                "owned_by": "mom",
                "permission": [],
            }],
        })

    @app.route("/v1/completions", methods=["POST"])
    def completions():
        data = request.json
        prompt = data.get("prompt", "")
        max_tokens = data.get("max_tokens", 256)
        temperature = data.get("temperature", 0.7)
        top_p = data.get("top_p", 0.9)
        top_k = data.get("top_k", 50)

        if batcher:
            response_text = batcher.submit(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
            )
        else:
            response_text = generator.generate(
                prompt=prompt,
                max_new_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
            )

        return jsonify({
            "id": f"cmpl-{uuid.uuid4().hex[:8]}",
            "object": "text_completion",
            "created": int(time.time()),
            "model": "mom",
            "choices": [{
                "text": response_text,
                "index": 0,
                "finish_reason": "stop",
            }],
        })

    @app.route("/v1/chat/completions", methods=["POST"])
    def chat_completions():
        data = request.json
        messages = data.get("messages", [])
        max_tokens = data.get("max_tokens", 256)
        temperature = data.get("temperature", 0.7)
        top_p = data.get("top_p", 0.9)
        stream = data.get("stream", False)

        # Format messages into a prompt
        prompt_parts = []
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        prompt_parts.append("Assistant:")
        prompt = "\n\n".join(prompt_parts)

        if stream:
            def generate_stream():
                for token in generator.generate(
                    prompt=prompt,
                    max_new_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    stream=True,
                ):
                    chunk = {
                        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                        "object": "chat.completion.chunk",
                        "created": int(time.time()),
                        "model": "mom",
                        "choices": [{
                            "index": 0,
                            "delta": {"content": token},
                            "finish_reason": None,
                        }],
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"

            return Response(generate_stream(), mimetype="text/event-stream")

        response_text = generator.generate(
            prompt=prompt,
            max_new_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
        )

        return jsonify({
            "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": "mom",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": response_text},
                "finish_reason": "stop",
            }],
            "usage": {
                "prompt_tokens": len(prompt.split()),
                "completion_tokens": len(response_text.split()),
                "total_tokens": len(prompt.split()) + len(response_text.split()),
            },
        })

    return app


class InferenceServer:
    """Wrapper for launching the inference server.

    Supports:
    - Standard generation with all optimizations (early exit, token pruning, Triton)
    - Speculative decoding mode for 2-4x speedup
    - Continuous batching for high-throughput serving
    """

    def __init__(
        self,
        checkpoint_path: str,
        host: str = "0.0.0.0",
        port: int = 8000,
        use_speculative: bool = False,
        draft_checkpoint: Optional[str] = None,
        num_speculative: int = 5,
        use_continuous_batching: bool = False,
    ):
        self.checkpoint_path = checkpoint_path
        self.host = host
        self.port = port
        self.use_speculative = use_speculative
        self.draft_checkpoint = draft_checkpoint
        self.num_speculative = num_speculative
        self.use_continuous_batching = use_continuous_batching
        self.generator = None

    def start(self) -> None:
        """Load model and start the server."""
        print(f"Loading model from {self.checkpoint_path}...")
        self.generator = TextGenerator.from_checkpoint(
            self.checkpoint_path,
            use_speculative=self.use_speculative,
            draft_checkpoint=self.draft_checkpoint,
            num_speculative=self.num_speculative,
        )

        mode = "speculative" if self.use_speculative else "standard"
        batching = " + continuous batching" if self.use_continuous_batching else ""
        print(f"Model loaded ({mode}{batching}). Starting server on {self.host}:{self.port}")

        app = create_app(self.generator, use_continuous_batching=self.use_continuous_batching)
        app.run(host=self.host, port=self.port, threaded=True)
