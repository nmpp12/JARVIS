"""
Tool Registry and Function-Calling Interface

Provides a structured way for the model to invoke tools (code execution,
web search, file operations, etc.) using a JSON-based calling convention.

The model emits tool calls in its output:
    <tool_call>
    {"name": "execute_code", "arguments": {"code": "print(42)", "language": "python"}}
    </tool_call>

The ToolRegistry:
1. Registers available tools with their schemas
2. Parses tool calls from model output
3. Validates arguments against schemas
4. Dispatches calls to handler functions
5. Formats results for the model

Built-in tools:
- execute_code: Run code in the sandbox
- execute_multi: Run multiple code blocks
- list_files: List files created in sandbox
"""

import re
import json
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

from .sandbox import Sandbox, SandboxConfig, SandboxResult


@dataclass
class Tool:
    """Definition of a callable tool."""
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema for parameters
    handler: Callable  # Function to call
    requires_sandbox: bool = False

    def to_schema(self) -> dict:
        """Return the tool schema for the model prompt."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
        }


@dataclass
class ToolCall:
    """A parsed tool call from model output."""
    name: str
    arguments: Dict[str, Any]
    raw_text: str = ""

    def to_dict(self) -> dict:
        return {"name": self.name, "arguments": self.arguments}


@dataclass
class ToolResult:
    """Result of executing a tool call."""
    tool_name: str
    success: bool
    output: Any = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "output": self.output,
            "error": self.error,
        }

    def to_prompt(self) -> str:
        """Format as a prompt segment for the model."""
        if self.success:
            output_str = json.dumps(self.output, indent=2, default=str) if not isinstance(self.output, str) else self.output
            return f"<tool_result>\nTool: {self.tool_name}\nStatus: success\nOutput:\n{output_str}\n</tool_result>"
        else:
            return f"<tool_result>\nTool: {self.tool_name}\nStatus: error\nError: {self.error}\n</tool_result>"


# Regex to find tool calls in model output
_TOOL_CALL_RE = re.compile(
    r"<tool_call>\s*(.*?)\s*</tool_call>",
    re.DOTALL,
)


def parse_tool_calls(text: str) -> List[ToolCall]:
    """Extract tool calls from model output text."""
    calls = []
    for match in _TOOL_CALL_RE.finditer(text):
        raw = match.group(1).strip()
        try:
            data = json.loads(raw)
            if isinstance(data, dict) and "name" in data:
                calls.append(ToolCall(
                    name=data["name"],
                    arguments=data.get("arguments", {}),
                    raw_text=raw,
                ))
        except json.JSONDecodeError:
            continue
    return calls


class ToolRegistry:
    """Registry of available tools with dispatch and validation.

    Usage:
        registry = ToolRegistry()
        # Tools are pre-registered; or add custom ones:
        registry.register(Tool(
            name="my_tool",
            description="Does something",
            parameters={"type": "object", "properties": {...}},
            handler=my_handler_fn,
        ))

        # Process model output
        calls = registry.parse(model_output)
        results = registry.execute(calls)
        followup = registry.format_results(results)
    """

    def __init__(self, sandbox: Optional[Sandbox] = None):
        self.sandbox = sandbox or Sandbox()
        self.tools: Dict[str, Tool] = {}
        self._register_builtins()

    def _register_builtins(self) -> None:
        """Register built-in tools."""
        self.register(Tool(
            name="execute_code",
            description="Execute code in a sandboxed environment. Returns stdout, stderr, and exit code.",
            parameters={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "The source code to execute",
                    },
                    "language": {
                        "type": "string",
                        "enum": ["python", "javascript", "bash"],
                        "description": "Programming language (default: python)",
                    },
                },
                "required": ["code"],
            },
            handler=self._handle_execute_code,
            requires_sandbox=True,
        ))

        self.register(Tool(
            name="execute_multi",
            description="Execute multiple code blocks sequentially. Stdout from each block is piped as stdin to the next.",
            parameters={
                "type": "object",
                "properties": {
                    "blocks": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "code": {"type": "string"},
                                "language": {"type": "string", "enum": ["python", "javascript", "bash"]},
                            },
                            "required": ["code"],
                        },
                        "description": "List of code blocks to execute in order",
                    },
                },
                "required": ["blocks"],
            },
            handler=self._handle_execute_multi,
            requires_sandbox=True,
        ))

        self.register(Tool(
            name="check_syntax",
            description="Validate code syntax without executing it. Only works for Python.",
            parameters={
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Code to validate"},
                    "language": {"type": "string", "description": "Programming language"},
                },
                "required": ["code"],
            },
            handler=self._handle_check_syntax,
        ))

    def register(self, tool: Tool) -> None:
        """Register a tool."""
        self.tools[tool.name] = tool

    def unregister(self, name: str) -> None:
        """Remove a tool."""
        self.tools.pop(name, None)

    def list_tools(self) -> List[dict]:
        """Return schemas for all registered tools."""
        return [t.to_schema() for t in self.tools.values()]

    def get_tools_prompt(self) -> str:
        """Generate a prompt section describing available tools.

        This is appended to the system prompt so the model knows
        what tools it can call and how to call them.
        """
        if not self.tools:
            return ""

        lines = ["You have access to the following tools:\n"]
        for tool in self.tools.values():
            params_str = json.dumps(tool.parameters, indent=2)
            lines.append(f"### {tool.name}")
            lines.append(f"{tool.description}")
            lines.append(f"Parameters: {params_str}")
            lines.append("")

        lines.append("To use a tool, emit a tool call in your response:")
        lines.append("<tool_call>")
        lines.append('{"name": "tool_name", "arguments": {"param": "value"}}')
        lines.append("</tool_call>")
        lines.append("")
        lines.append("You will receive the result in a <tool_result> block.")
        return "\n".join(lines)

    def parse(self, model_output: str) -> List[ToolCall]:
        """Parse tool calls from model output."""
        return parse_tool_calls(model_output)

    def execute(self, calls: List[ToolCall]) -> List[ToolResult]:
        """Execute a list of tool calls and return results."""
        results = []
        for call in calls:
            result = self.execute_one(call)
            results.append(result)
        return results

    def execute_one(self, call: ToolCall) -> ToolResult:
        """Execute a single tool call."""
        tool = self.tools.get(call.name)
        if tool is None:
            return ToolResult(
                tool_name=call.name,
                success=False,
                error=f"Unknown tool: {call.name}. Available: {list(self.tools.keys())}",
            )

        # Validate required parameters
        required = tool.parameters.get("required", [])
        missing = [p for p in required if p not in call.arguments]
        if missing:
            return ToolResult(
                tool_name=call.name,
                success=False,
                error=f"Missing required parameters: {missing}",
            )

        try:
            output = tool.handler(**call.arguments)
            return ToolResult(
                tool_name=call.name,
                success=True,
                output=output,
            )
        except Exception as e:
            return ToolResult(
                tool_name=call.name,
                success=False,
                error=f"{type(e).__name__}: {e}",
            )

    def format_results(self, results: List[ToolResult]) -> str:
        """Format tool results as a prompt for the model."""
        return "\n\n".join(r.to_prompt() for r in results)

    def process_turn(self, model_output: str) -> Tuple[List[ToolResult], Optional[str]]:
        """Process a full model turn: parse calls, execute, format results.

        Returns:
            (results, followup_prompt) - followup is None if no tool calls found
        """
        calls = self.parse(model_output)
        if not calls:
            return [], None

        results = self.execute(calls)
        followup = self.format_results(results)
        return results, followup

    # --- Built-in tool handlers ---

    def _handle_execute_code(self, code: str, language: str = "python") -> dict:
        """Execute code in sandbox and return results."""
        result = self.sandbox.execute(code=code, language=language)
        return result.to_dict()

    def _handle_execute_multi(self, blocks: List[dict]) -> List[dict]:
        """Execute multiple code blocks sequentially."""
        results = self.sandbox.execute_multi(blocks)
        return [r.to_dict() for r in results]

    def _handle_check_syntax(self, code: str, language: str = "python") -> dict:
        """Check syntax without execution."""
        from .code_generator import validate_syntax
        valid, error = validate_syntax(code, language)
        return {"valid": valid, "error": error}
