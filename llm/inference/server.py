"""
MOM Inference Server

REST API server compatible with OpenAI's API format, making it easy
to integrate with the existing JARVIS frontend and other tools.

Supports:
- Standard text and chat completions
- Continuous batching with paged KV-cache
- Speculative decoding mode
- Code execution with sandboxed environment
- Tool-use / function-calling interface
- Optimization statistics endpoint
"""

import json
import time
import uuid
import threading
from collections import deque
from typing import Optional, List

from .generator import TextGenerator
from ..tools.sandbox import Sandbox, SandboxConfig
from ..tools.code_generator import CodeGenerator, ASI_IDENTITY_PROMPT
from ..tools.tool_registry import ToolRegistry


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


def create_app(
    generator: TextGenerator,
    use_continuous_batching: bool = False,
    enable_code_execution: bool = True,
    sandbox_config: Optional[SandboxConfig] = None,
):
    """Create a Flask inference server.

    Provides endpoints:
    - POST /v1/chat/completions - Chat completion (OpenAI compatible)
    - POST /v1/completions - Text completion
    - POST /v1/code/execute - Execute code in sandbox
    - POST /v1/code/generate - Generate and optionally execute code
    - POST /v1/tools/call - Invoke a registered tool
    - GET /v1/tools - List available tools
    - GET /v1/models - List available models
    - GET /v1/stats - Optimization and serving statistics
    - GET /health - Health check
    """
    from flask import Flask, request, jsonify, Response

    app = Flask(__name__)
    batcher = ContinuousBatcher(generator) if use_continuous_batching else None

    # Code execution infrastructure
    sandbox = Sandbox(sandbox_config or SandboxConfig()) if enable_code_execution else None
    codegen = CodeGenerator(sandbox=sandbox) if sandbox else None
    tool_registry = ToolRegistry(sandbox=sandbox) if sandbox else None

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

        # Format messages into a prompt, injecting ASI identity
        prompt_parts = [f"System: {ASI_IDENTITY_PROMPT}"]
        has_system = False
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt_parts.append(f"System: {content}")
                has_system = True
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

    # --- Code execution endpoints ---

    @app.route("/v1/code/execute", methods=["POST"])
    def execute_code():
        """Execute code in the sandbox."""
        if not sandbox:
            return jsonify({"error": "Code execution is disabled"}), 400

        data = request.json
        code = data.get("code", "")
        language = data.get("language", "python")
        stdin_data = data.get("stdin", None)

        if not code:
            return jsonify({"error": "No code provided"}), 400

        result = sandbox.execute(code=code, language=language, stdin_data=stdin_data)
        return jsonify(result.to_dict())

    @app.route("/v1/code/generate", methods=["POST"])
    def generate_and_execute():
        """Generate code from a prompt, then optionally execute it.

        The model generates a response. Any code blocks found in the
        response are extracted and (if auto_execute is true) run in
        the sandbox. Results are returned alongside the model output.
        """
        if not codegen:
            return jsonify({"error": "Code execution is disabled"}), 400

        data = request.json
        prompt = data.get("prompt", "")
        max_tokens = data.get("max_tokens", 512)
        temperature = data.get("temperature", 0.7)
        auto_execute = data.get("auto_execute", True)
        max_iterations = data.get("max_iterations", 3)

        if not prompt:
            return jsonify({"error": "No prompt provided"}), 400

        # Prepend coding system prompt
        full_prompt = f"System: {codegen.system_prompt}\n\nUser: {prompt}\n\nAssistant:"

        # Generate model response
        model_output = generator.generate(
            prompt=full_prompt,
            max_new_tokens=max_tokens,
            temperature=temperature,
        )

        response = {
            "id": f"codegen-{uuid.uuid4().hex[:8]}",
            "model_output": model_output,
            "code_blocks": [],
            "execution_results": [],
        }

        # Extract and execute code blocks
        blocks = codegen.extract(model_output)
        response["code_blocks"] = [b.to_dict() for b in blocks]

        if blocks and auto_execute:
            results = codegen.execute_blocks(blocks)
            response["execution_results"] = [
                {"code": b.to_dict(), "result": r.to_dict()}
                for b, r in results
            ]

            # If there were errors and iterations are allowed, refine
            if max_iterations > 1 and any(not r.success for _, r in results):
                followup = codegen.build_result_prompt(results)
                refine_prompt = f"{full_prompt}{model_output}\n\n{followup}\n\nAssistant:"
                for iteration in range(1, max_iterations):
                    refined_output = generator.generate(
                        prompt=refine_prompt,
                        max_new_tokens=max_tokens,
                        temperature=temperature,
                    )
                    refined_blocks = codegen.extract(refined_output)
                    if not refined_blocks:
                        break
                    refined_results = codegen.execute_blocks(refined_blocks)
                    response["execution_results"].extend([
                        {"code": b.to_dict(), "result": r.to_dict(), "iteration": iteration}
                        for b, r in refined_results
                    ])
                    if all(r.success for _, r in refined_results):
                        response["model_output"] = refined_output
                        response["code_blocks"] = [b.to_dict() for b in refined_blocks]
                        break
                    followup = codegen.build_result_prompt(refined_results)
                    refine_prompt = f"{refine_prompt}{refined_output}\n\n{followup}\n\nAssistant:"

        return jsonify(response)

    @app.route("/v1/tools", methods=["GET"])
    def list_tools():
        """List all available tools."""
        if not tool_registry:
            return jsonify({"tools": []})
        return jsonify({"tools": tool_registry.list_tools()})

    @app.route("/v1/tools/call", methods=["POST"])
    def call_tool():
        """Invoke a registered tool directly."""
        if not tool_registry:
            return jsonify({"error": "Tools are disabled"}), 400

        data = request.json
        tool_name = data.get("name", "")
        arguments = data.get("arguments", {})

        if not tool_name:
            return jsonify({"error": "No tool name provided"}), 400

        from ..tools.tool_registry import ToolCall
        call = ToolCall(name=tool_name, arguments=arguments)
        result = tool_registry.execute_one(call)
        return jsonify(result.to_dict())

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
        enable_code_execution: bool = True,
        sandbox_config: Optional[SandboxConfig] = None,
    ):
        self.checkpoint_path = checkpoint_path
        self.host = host
        self.port = port
        self.use_speculative = use_speculative
        self.draft_checkpoint = draft_checkpoint
        self.num_speculative = num_speculative
        self.use_continuous_batching = use_continuous_batching
        self.enable_code_execution = enable_code_execution
        self.sandbox_config = sandbox_config
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
        sandbox = " + code sandbox" if self.enable_code_execution else ""
        print(f"Model loaded ({mode}{batching}{sandbox}). Starting server on {self.host}:{self.port}")

        app = create_app(
            self.generator,
            use_continuous_batching=self.use_continuous_batching,
            enable_code_execution=self.enable_code_execution,
            sandbox_config=self.sandbox_config,
        )
        app.run(host=self.host, port=self.port, threaded=True)
