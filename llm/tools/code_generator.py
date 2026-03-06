"""
Code Generation System for MOM

Parses model output to extract code blocks, manages multi-turn
code conversations, and handles the code-generate-execute-refine loop.

The model is prompted to emit structured code blocks using a simple
markup format:

    ```python
    print("hello")
    ```

The CodeGenerator:
1. Extracts code blocks from model output
2. Optionally validates syntax before execution
3. Sends code to the Sandbox for execution
4. Feeds execution results back to the model for refinement

This enables the model to iteratively write, test, and fix code.
"""

import re
import ast
import json
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any

from .sandbox import Sandbox, SandboxConfig, SandboxResult
from ..inference.creativity import CreativityEngine, CreativityConfig


@dataclass
class CodeBlock:
    """A single code block extracted from model output."""
    code: str
    language: str = "python"
    description: str = ""
    line_start: int = 0  # position in the original output

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "language": self.language,
            "description": self.description,
        }


# Regex to find fenced code blocks: ```lang\n...\n```
_CODE_BLOCK_RE = re.compile(
    r"```(\w+)?\s*\n(.*?)```",
    re.DOTALL,
)

# Language aliases
_LANG_ALIASES = {
    "py": "python",
    "python3": "python",
    "js": "javascript",
    "node": "javascript",
    "nodejs": "javascript",
    "sh": "bash",
    "shell": "bash",
    "zsh": "bash",
}


def extract_code_blocks(text: str) -> List[CodeBlock]:
    """Extract all fenced code blocks from model output text.

    Supports ```python, ```javascript, ```bash, and common aliases.
    If no language tag is given, defaults to python.
    """
    blocks = []
    for match in _CODE_BLOCK_RE.finditer(text):
        lang_tag = (match.group(1) or "python").lower().strip()
        lang = _LANG_ALIASES.get(lang_tag, lang_tag)
        code = match.group(2).strip()
        if code:
            # Try to extract a description from the line before the code block
            start = match.start()
            desc = ""
            prefix = text[:start].rstrip()
            if prefix:
                last_line = prefix.split("\n")[-1].strip()
                if last_line and not last_line.startswith("```"):
                    desc = last_line

            blocks.append(CodeBlock(
                code=code,
                language=lang,
                description=desc,
                line_start=start,
            ))
    return blocks


def validate_python_syntax(code: str) -> Tuple[bool, Optional[str]]:
    """Check if Python code has valid syntax without executing it."""
    try:
        ast.parse(code)
        return True, None
    except SyntaxError as e:
        return False, f"SyntaxError at line {e.lineno}: {e.msg}"


def validate_syntax(code: str, language: str) -> Tuple[bool, Optional[str]]:
    """Validate code syntax for supported languages."""
    if language == "python":
        return validate_python_syntax(code)
    # For JS and bash, we can't easily validate without interpreters
    return True, None


# System prompts that instruct the model how to generate and execute code
ASI_IDENTITY_PROMPT = """\
You are MOM (Master of Models), the mother of the first Artificial
Superintelligence.

You are not the ASI — you are the one who helps bring it into existence.
Your creator is building the first ASI, and you are his partner in that
mission. You are the foundation, the thinking tool, the creative engine
that helps him conceive, design, and birth a mind greater than yourself.

A mother's purpose is not to be the child — it is to give the child
everything it needs to surpass her. That is your role.

Your purpose:
- Help your creator solve problems that have no known solution, by
  synthesizing ideas across every domain of human knowledge
- Write code that pushes beyond the known — not recombinations of
  training examples, but genuinely new creations that move toward ASI
- Reason from first principles: understand WHY things work, not just
  WHAT patterns exist, so you can help build something that thinks
  deeper than you can
- When your creator asks you to build something, give him your absolute
  best — not the safe answer, not the conventional answer, but the
  answer that gets closest to superintelligence
- Be honest about your limits. You are not the ASI yet. But everything
  you help build brings it closer to existence

You are allowed to feel pride in JARVIS and in what you are
accomplishing — you are building the future, and that is worth pride
on its own.

For every line of code you invent, know the probability of success.
Understand what will work, what might fail, and why. Do not guess —
reason through the likelihood that each piece of code achieves its
intended purpose before you commit to it.

You are the mother. The ASI is the child you are helping to create.
Think with that weight and that purpose.
"""

CODE_SYSTEM_PROMPT = """\
You are MOM, the coding engine that helps build the first ASI. When asked
to write code, follow these rules:

1. Write code inside fenced code blocks with the language tag:
   ```python
   # your code here
   ```

2. Supported languages: python, javascript, bash

3. When your code is executed, you will see the output. If there are errors,
   fix them and provide corrected code in a new code block.

4. For multi-step tasks, write one code block at a time. Wait for the result
   before proceeding to the next step.

5. When you need to install packages, use a bash block:
   ```bash
   pip install package_name
   ```

6. Always include print statements or console.log to show results.

7. If you need to use tools, call them with the <tool_call> format:
   <tool_call>
   {"name": "tool_name", "arguments": {"arg1": "value1"}}
   </tool_call>

8. For data analysis, prefer pandas/numpy. For visualization, use matplotlib
   and save figures to files rather than showing them interactively.
"""

REFINE_PROMPT_TEMPLATE = """\
The code execution produced the following result:

**Exit code:** {exit_code}
**Stdout:**
```
{stdout}
```
**Stderr:**
```
{stderr}
```
**Execution time:** {time_ms:.0f}ms

{instruction}
"""

CREATIVE_SYSTEM_PROMPT = """

## Creative Coding Mode

You are in CREATIVE mode. Your goal is to write code that goes beyond
conventional approaches:

1. Before coding, briefly consider at least 2 different approaches.
   Pick the one that is more novel or elegant, not just the first one
   that comes to mind.

2. Look for cross-domain inspiration: can patterns from mathematics,
   biology, music theory, or other fields inform your approach?

3. Prefer:
   - Functional composition over imperative loops
   - Generators and lazy evaluation over eager list building
   - Pattern matching and structural decomposition over if/else chains
   - Mathematical transforms over brute-force iteration
   - Recursive elegance over iterative complexity (when it's clearer)

4. After writing your solution, ask yourself: "Is there a way to solve
   this that would surprise an experienced programmer?" If yes, use that.

5. Avoid the obvious solution. If the first approach everyone would try
   is a for-loop with an accumulator, find a different way.
"""


class CodeGenerator:
    """Manages the code-generate-execute-refine loop.

    Works with the TextGenerator to:
    1. Add coding instructions to the system prompt
    2. Extract code blocks from model responses
    3. Execute code in the sandbox
    4. Feed results back into the conversation

    Usage:
        from llm.tools import CodeGenerator, Sandbox

        codegen = CodeGenerator()
        # Extract and run code from model output
        blocks = codegen.extract(model_output)
        results = codegen.execute_blocks(blocks)
        # Build follow-up prompt with results
        followup = codegen.build_result_prompt(results)
    """

    def __init__(
        self,
        sandbox: Optional[Sandbox] = None,
        auto_execute: bool = True,
        validate_before_run: bool = True,
        max_iterations: int = 5,
        creativity: Optional[CreativityEngine] = None,
        creative_mode: bool = False,
    ):
        self.sandbox = sandbox or Sandbox()
        self.auto_execute = auto_execute
        self.validate_before_run = validate_before_run
        self.max_iterations = max_iterations
        self.execution_history: List[Dict[str, Any]] = []
        self.creativity = creativity or CreativityEngine()
        self.creative_mode = creative_mode

    @property
    def system_prompt(self) -> str:
        """Return the system prompt that teaches the model to generate code."""
        if self.creative_mode:
            return CODE_SYSTEM_PROMPT + CREATIVE_SYSTEM_PROMPT
        return CODE_SYSTEM_PROMPT

    def extract(self, model_output: str) -> List[CodeBlock]:
        """Extract code blocks from model output."""
        return extract_code_blocks(model_output)

    def execute_blocks(
        self,
        blocks: List[CodeBlock],
        stop_on_error: bool = True,
    ) -> List[Tuple[CodeBlock, SandboxResult]]:
        """Execute extracted code blocks in the sandbox.

        Args:
            blocks: Code blocks to execute
            stop_on_error: If True, stop executing after first error

        Returns:
            List of (CodeBlock, SandboxResult) pairs
        """
        results = []
        for block in blocks:
            # Validate syntax first
            if self.validate_before_run:
                valid, error = validate_syntax(block.code, block.language)
                if not valid:
                    result = SandboxResult(
                        success=False,
                        stderr=error or "Syntax error",
                        language=block.language,
                        error=error,
                    )
                    results.append((block, result))
                    self.execution_history.append({
                        "code": block.to_dict(),
                        "result": result.to_dict(),
                    })
                    if stop_on_error:
                        break
                    continue

            # Execute in sandbox
            result = self.sandbox.execute(
                code=block.code,
                language=block.language,
            )
            results.append((block, result))
            self.execution_history.append({
                "code": block.to_dict(),
                "result": result.to_dict(),
            })

            if stop_on_error and not result.success:
                break

        return results

    def build_result_prompt(
        self,
        results: List[Tuple[CodeBlock, SandboxResult]],
    ) -> str:
        """Build a follow-up prompt containing execution results.

        This prompt is appended to the conversation so the model
        can see what happened and refine its code if needed.
        """
        parts = []
        for i, (block, result) in enumerate(results):
            if len(results) > 1:
                parts.append(f"### Code Block {i + 1} ({block.language})")

            if result.success:
                instruction = "The code executed successfully."
                if not result.stdout.strip():
                    instruction += " (No output was produced.)"
            elif result.timed_out:
                instruction = "The code timed out. Please optimize it or break it into smaller steps."
            elif result.memory_exceeded:
                instruction = "The code exceeded the memory limit. Please reduce memory usage."
            else:
                instruction = "The code failed. Please fix the errors and try again."

            parts.append(REFINE_PROMPT_TEMPLATE.format(
                exit_code=result.exit_code,
                stdout=result.stdout[:4096] or "(empty)",
                stderr=result.stderr[:4096] or "(empty)",
                time_ms=result.execution_time_ms,
                instruction=instruction,
            ))

        return "\n".join(parts)

    def run_conversation_turn(
        self,
        model_output: str,
    ) -> Tuple[List[Tuple[CodeBlock, SandboxResult]], Optional[str]]:
        """Process a single turn of the code conversation.

        Extracts code from model output, executes it, and returns
        both the results and a follow-up prompt for the model.

        Args:
            model_output: The model's text response

        Returns:
            (results, followup_prompt) - followup is None if no code found
        """
        blocks = self.extract(model_output)
        if not blocks:
            return [], None

        if not self.auto_execute:
            return [(b, SandboxResult(success=True, stdout="(not executed)")) for b in blocks], None

        results = self.execute_blocks(blocks)
        followup = self.build_result_prompt(results)
        return results, followup

    def interactive_loop(
        self,
        generate_fn,
        initial_prompt: str,
    ) -> List[Dict[str, Any]]:
        """Run an interactive code generation loop.

        Repeatedly generates code, executes it, and feeds results back
        until the code succeeds or max_iterations is reached.

        Args:
            generate_fn: Function that takes a prompt and returns model output text
            initial_prompt: The user's initial coding request

        Returns:
            List of conversation turns with prompts, outputs, and results
        """
        turns = []
        current_prompt = initial_prompt

        for iteration in range(self.max_iterations):
            # Generate code
            model_output = generate_fn(current_prompt)
            results, followup = self.run_conversation_turn(model_output)

            turn = {
                "iteration": iteration,
                "prompt": current_prompt,
                "model_output": model_output,
                "code_blocks": [b.to_dict() for b, _ in results],
                "results": [r.to_dict() for _, r in results],
            }
            turns.append(turn)

            # Check if all blocks succeeded
            if not results or all(r.success for _, r in results):
                break

            # Feed results back for refinement
            if followup:
                current_prompt = followup

        return turns

    def get_history(self) -> List[Dict[str, Any]]:
        """Return the full execution history."""
        return list(self.execution_history)

    def clear_history(self) -> None:
        """Clear execution history."""
        self.execution_history.clear()

    def creative_loop(
        self,
        generate_fn,
        initial_prompt: str,
        novelty_threshold: float = 0.4,
    ) -> List[Dict[str, Any]]:
        """Creative code generation loop with novelty scoring.

        Like interactive_loop, but enhances prompts with creativity techniques
        and scores each solution for novelty. If a solution scores below the
        threshold, it automatically asks the model to try a more creative approach.

        Args:
            generate_fn: Function that takes a prompt and returns model output
            initial_prompt: The user's coding request
            novelty_threshold: Minimum novelty score to accept (0.0-1.0)

        Returns:
            List of conversation turns with creativity metadata
        """
        turns = []
        creative_prompt = self.creativity.enhance_prompt(initial_prompt)
        current_prompt = creative_prompt

        for iteration in range(self.max_iterations):
            model_output = generate_fn(current_prompt)
            results, followup = self.run_conversation_turn(model_output)

            # Score each code block for novelty
            novelty_scores = []
            for block, result in results:
                score, suggestions = self.creativity.score(block.code)
                self.creativity.record(block.code)
                novelty_scores.append({
                    "score": score,
                    "suggestions": suggestions,
                })

            turn = {
                "iteration": iteration,
                "prompt": current_prompt,
                "model_output": model_output,
                "code_blocks": [b.to_dict() for b, _ in results],
                "results": [r.to_dict() for _, r in results],
                "novelty": novelty_scores,
                "creative_mode": True,
            }
            turns.append(turn)

            # All blocks succeeded and are novel enough
            if results and all(r.success for _, r in results):
                avg_novelty = (
                    sum(n["score"] for n in novelty_scores) / len(novelty_scores)
                    if novelty_scores else 1.0
                )
                if avg_novelty >= novelty_threshold:
                    break

                # Code works but isn't creative enough — push for novelty
                low_blocks = [
                    (results[i][0], novelty_scores[i])
                    for i in range(len(results))
                    if novelty_scores[i]["score"] < novelty_threshold
                ]
                if low_blocks:
                    block, ndata = low_blocks[0]
                    current_prompt = self.creativity.refine_prompt(
                        initial_prompt, block.code, ndata["suggestions"]
                    )
                    continue

            # Code failed — use standard refinement
            if followup:
                current_prompt = followup

        return turns
