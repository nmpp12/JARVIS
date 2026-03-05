"""
MOM Inference Server

REST API server compatible with OpenAI's API format, making it easy
to integrate with the existing JARVIS frontend and other tools.
"""

import json
import time
import uuid
from typing import Optional

from .generator import TextGenerator


def create_app(generator: TextGenerator):
    """Create a Flask inference server.

    Provides endpoints:
    - POST /v1/chat/completions - Chat completion (OpenAI compatible)
    - POST /v1/completions - Text completion
    - GET /v1/models - List available models
    - GET /health - Health check
    """
    from flask import Flask, request, jsonify, Response

    app = Flask(__name__)

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "healthy", "model": "mom"})

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
    """Wrapper for launching the inference server."""

    def __init__(self, checkpoint_path: str, host: str = "0.0.0.0", port: int = 8000):
        self.checkpoint_path = checkpoint_path
        self.host = host
        self.port = port
        self.generator = None

    def start(self) -> None:
        """Load model and start the server."""
        print(f"Loading model from {self.checkpoint_path}...")
        self.generator = TextGenerator.from_checkpoint(self.checkpoint_path)
        print(f"Model loaded. Starting server on {self.host}:{self.port}")

        app = create_app(self.generator)
        app.run(host=self.host, port=self.port, threaded=True)
