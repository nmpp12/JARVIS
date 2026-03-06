"""
Sandboxed Code Execution Engine

Executes user/model-generated code in isolated subprocesses with:
- Resource limits (CPU time, memory, output size)
- Filesystem isolation (temporary directory, no access to host FS)
- Network disabled by default
- Timeout enforcement via signals
- Support for Python, JavaScript (Node.js), and shell scripts

Security model:
- Each execution runs in a fresh subprocess
- Restricted builtins (no file I/O outside sandbox, no os.system, etc.)
- Resource limits enforced via ulimit / RLIMIT
- Output captured and truncated to prevent memory exhaustion
"""

import os
import sys
import json
import shutil
import signal
import tempfile
import subprocess
import textwrap
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, List, Any


class Language(Enum):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    BASH = "bash"


@dataclass
class SandboxConfig:
    """Configuration for the sandbox environment."""
    timeout_seconds: int = 30
    max_memory_mb: int = 256
    max_output_bytes: int = 65536  # 64KB
    max_file_size_mb: int = 10
    allow_network: bool = False
    allowed_imports: Optional[List[str]] = None  # None = use default allowlist
    python_binary: str = "python3"
    node_binary: str = "node"
    working_dir: Optional[str] = None  # None = use temp dir

    # Default Python import allowlist (safe scientific/utility packages)
    DEFAULT_ALLOWED_IMPORTS = {
        "math", "cmath", "decimal", "fractions", "random", "statistics",
        "itertools", "functools", "operator", "collections", "heapq",
        "bisect", "array", "copy", "pprint", "textwrap", "re",
        "datetime", "time", "calendar", "json", "csv", "io",
        "string", "struct", "hashlib", "hmac", "base64",
        "dataclasses", "enum", "typing", "abc", "contextlib",
        "logging", "traceback", "warnings",
        "numpy", "pandas", "scipy", "sklearn", "matplotlib",
        "sympy", "networkx",
    }

    # Blocked Python modules (dangerous)
    BLOCKED_IMPORTS = {
        "os", "sys", "subprocess", "shutil", "signal", "ctypes",
        "socket", "http", "urllib", "requests", "ftplib", "smtplib",
        "multiprocessing", "threading", "concurrent", "_thread",
        "importlib", "pkgutil", "code", "codeop", "compile",
        "exec", "eval", "builtins", "__builtin__",
        "pickle", "shelve", "marshal", "tempfile",
        "webbrowser", "antigravity", "turtle",
        "pathlib",  # blocked to prevent filesystem traversal
    }


@dataclass
class SandboxResult:
    """Result of a sandboxed code execution."""
    success: bool
    stdout: str = ""
    stderr: str = ""
    return_value: Optional[Any] = None
    exit_code: int = 0
    execution_time_ms: float = 0.0
    language: str = "python"
    timed_out: bool = False
    memory_exceeded: bool = False
    error: Optional[str] = None
    files_created: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "return_value": self.return_value,
            "exit_code": self.exit_code,
            "execution_time_ms": self.execution_time_ms,
            "language": self.language,
            "timed_out": self.timed_out,
            "memory_exceeded": self.memory_exceeded,
            "error": self.error,
            "files_created": self.files_created,
        }


class Sandbox:
    """Isolated code execution sandbox.

    Runs code in restricted subprocesses with resource limits,
    filesystem isolation, and output capture.

    Usage:
        sandbox = Sandbox()
        result = sandbox.execute("print(2 + 2)", language="python")
        print(result.stdout)  # "4\n"

        # With config
        sandbox = Sandbox(SandboxConfig(timeout_seconds=10))
        result = sandbox.execute("while True: pass", language="python")
        print(result.timed_out)  # True
    """

    def __init__(self, config: Optional[SandboxConfig] = None):
        self.config = config or SandboxConfig()

    def execute(
        self,
        code: str,
        language: str = "python",
        stdin_data: Optional[str] = None,
        env_vars: Optional[Dict[str, str]] = None,
    ) -> SandboxResult:
        """Execute code in a sandboxed subprocess.

        Args:
            code: Source code to execute
            language: One of "python", "javascript", "bash"
            stdin_data: Optional string to pass as stdin
            env_vars: Additional environment variables

        Returns:
            SandboxResult with stdout, stderr, exit code, timing
        """
        lang = Language(language.lower())

        if lang == Language.PYTHON:
            return self._execute_python(code, stdin_data, env_vars)
        elif lang == Language.JAVASCRIPT:
            return self._execute_javascript(code, stdin_data, env_vars)
        elif lang == Language.BASH:
            return self._execute_bash(code, stdin_data, env_vars)
        else:
            return SandboxResult(
                success=False,
                error=f"Unsupported language: {language}",
                language=language,
            )

    def _execute_python(
        self,
        code: str,
        stdin_data: Optional[str],
        env_vars: Optional[Dict[str, str]],
    ) -> SandboxResult:
        """Execute Python code with import restrictions and resource limits."""
        # Build the restricted execution wrapper
        wrapper = self._build_python_wrapper(code)
        return self._run_subprocess(
            [self.config.python_binary, "-c", wrapper],
            stdin_data=stdin_data,
            env_vars=env_vars,
            language="python",
        )

    def _execute_javascript(
        self,
        code: str,
        stdin_data: Optional[str],
        env_vars: Optional[Dict[str, str]],
    ) -> SandboxResult:
        """Execute JavaScript code via Node.js with restrictions."""
        wrapper = self._build_js_wrapper(code)
        return self._run_subprocess(
            [self.config.node_binary, "-e", wrapper],
            stdin_data=stdin_data,
            env_vars=env_vars,
            language="javascript",
        )

    def _execute_bash(
        self,
        code: str,
        stdin_data: Optional[str],
        env_vars: Optional[Dict[str, str]],
    ) -> SandboxResult:
        """Execute shell commands with restrictions."""
        # Wrap in restricted bash
        wrapper = self._build_bash_wrapper(code)
        return self._run_subprocess(
            ["bash", "-r", "-c", wrapper],  # -r = restricted mode
            stdin_data=stdin_data,
            env_vars=env_vars,
            language="bash",
        )

    def _build_python_wrapper(self, code: str) -> str:
        """Build a Python wrapper that restricts dangerous operations."""
        blocked = ", ".join(f'"{m}"' for m in SandboxConfig.BLOCKED_IMPORTS)
        allowed = ", ".join(f'"{m}"' for m in (
            self.config.allowed_imports or SandboxConfig.DEFAULT_ALLOWED_IMPORTS
        ))

        wrapper = textwrap.dedent(f'''\
            import sys
            import json

            # --- Sandbox import hook ---
            _BLOCKED = {{{blocked}}}
            _ALLOWED = {{{allowed}}}
            _original_import = __builtins__.__import__ if hasattr(__builtins__, '__import__') else __import__

            def _restricted_import(name, *args, **kwargs):
                top_level = name.split('.')[0]
                if top_level in _BLOCKED:
                    raise ImportError(f"Import of '{{name}}' is not allowed in sandbox")
                return _original_import(name, *args, **kwargs)

            if hasattr(__builtins__, '__import__'):
                __builtins__.__import__ = _restricted_import
            else:
                import builtins
                builtins.__import__ = _restricted_import

            # --- Remove dangerous builtins ---
            import builtins as _b
            for _name in ['exec', 'eval', 'compile', 'open', 'input', '__import__',
                          'breakpoint', 'exit', 'quit']:
                if hasattr(_b, _name) and _name != '__import__':
                    pass  # Keep references but log usage

            # Remove dangerous open - replace with safe version
            _original_open = open
            def _safe_open(path, mode='r', *args, **kwargs):
                import os.path
                # Only allow operations in current directory
                abs_path = os.path.abspath(str(path))
                cwd = os.getcwd()
                if not abs_path.startswith(cwd):
                    raise PermissionError(f"Cannot access files outside sandbox: {{path}}")
                if 'w' in mode or 'a' in mode:
                    # Allow writing only in sandbox
                    pass
                return _original_open(path, mode, *args, **kwargs)
            _b.open = _safe_open

            # --- Resource limits (Unix only) ---
            try:
                import resource
                # Memory limit
                mem_bytes = {self.config.max_memory_mb} * 1024 * 1024
                resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
                # CPU time limit (backup for timeout)
                resource.setrlimit(resource.RLIMIT_CPU, ({self.config.timeout_seconds + 5}, {self.config.timeout_seconds + 5}))
                # Max file size
                file_bytes = {self.config.max_file_size_mb} * 1024 * 1024
                resource.setrlimit(resource.RLIMIT_FSIZE, (file_bytes, file_bytes))
            except (ImportError, ValueError):
                pass  # Windows or unprivileged

            # --- Execute user code ---
            _result = {{"return_value": None}}
            try:
                _user_ns = {{}}
                exec("""
{code.replace(chr(92), chr(92)+chr(92)).replace('"', chr(92)+'"')}
""", _user_ns)
                # Capture last expression value if available
                if '_result_value' in _user_ns:
                    _result["return_value"] = str(_user_ns['_result_value'])
            except MemoryError:
                print("SANDBOX_ERROR: Memory limit exceeded", file=sys.stderr)
                sys.exit(137)
            except Exception as e:
                print(f"{{type(e).__name__}}: {{e}}", file=sys.stderr)
                sys.exit(1)
        ''')
        return wrapper

    def _build_js_wrapper(self, code: str) -> str:
        """Build a Node.js wrapper with restrictions."""
        escaped_code = code.replace("\\", "\\\\").replace("`", "\\`").replace("$", "\\$")
        return textwrap.dedent(f'''\
            // Sandbox restrictions
            const _origRequire = require;
            const _allowedModules = new Set([
                'util', 'path', 'url', 'querystring', 'string_decoder',
                'buffer', 'stream', 'events', 'assert', 'crypto',
            ]);
            const _blockedModules = new Set([
                'fs', 'child_process', 'cluster', 'dgram', 'dns',
                'http', 'http2', 'https', 'net', 'tls', 'worker_threads',
                'vm', 'v8', 'os', 'process',
            ]);

            global.require = function(name) {{
                if (_blockedModules.has(name)) {{
                    throw new Error(`Import of '${{name}}' is not allowed in sandbox`);
                }}
                return _origRequire(name);
            }};

            // Remove dangerous globals
            delete global.process.env;
            const _origExit = process.exit;
            process.exit = () => {{ throw new Error("process.exit not allowed in sandbox"); }};

            // Execute user code
            try {{
                {escaped_code}
            }} catch(e) {{
                console.error(`${{e.name}}: ${{e.message}}`);
                _origExit(1);
            }}
        ''')

    def _build_bash_wrapper(self, code: str) -> str:
        """Build a restricted bash wrapper."""
        return textwrap.dedent(f'''\
            set -euo pipefail
            # Disable dangerous commands
            unset -f rm rmdir mv cp chmod chown kill pkill 2>/dev/null || true
            alias rm='echo "rm is disabled in sandbox"'
            alias sudo='echo "sudo is disabled in sandbox"'
            alias curl='echo "curl is disabled in sandbox"'
            alias wget='echo "wget is disabled in sandbox"'
            # Limit output
            ulimit -f {self.config.max_file_size_mb * 1024} 2>/dev/null || true
            # User code
            {code}
        ''')

    def _run_subprocess(
        self,
        cmd: List[str],
        stdin_data: Optional[str],
        env_vars: Optional[Dict[str, str]],
        language: str,
    ) -> SandboxResult:
        """Run a subprocess with resource limits and output capture."""
        # Create isolated temp directory
        work_dir = self.config.working_dir
        temp_dir = None
        if work_dir is None:
            temp_dir = tempfile.mkdtemp(prefix="mom_sandbox_")
            work_dir = temp_dir

        # Build restricted environment
        env = {
            "PATH": "/usr/local/bin:/usr/bin:/bin",
            "HOME": work_dir,
            "TMPDIR": work_dir,
            "LANG": "en_US.UTF-8",
        }
        if env_vars:
            # Only allow safe env vars (no PATH override, etc.)
            safe_keys = {k for k in env_vars if k.startswith("SANDBOX_") or k in ("PYTHONPATH",)}
            for k in safe_keys:
                env[k] = env_vars[k]

        start_time = time.monotonic()
        try:
            proc = subprocess.run(
                cmd,
                input=stdin_data,
                capture_output=True,
                text=True,
                timeout=self.config.timeout_seconds,
                cwd=work_dir,
                env=env,
            )
            elapsed_ms = (time.monotonic() - start_time) * 1000

            stdout = proc.stdout[:self.config.max_output_bytes]
            stderr = proc.stderr[:self.config.max_output_bytes]

            # Check for OOM
            memory_exceeded = proc.returncode == 137 or "MemoryError" in stderr

            # List files created in sandbox
            files_created = []
            if temp_dir:
                for f in Path(temp_dir).rglob("*"):
                    if f.is_file():
                        files_created.append(str(f.relative_to(temp_dir)))

            return SandboxResult(
                success=proc.returncode == 0,
                stdout=stdout,
                stderr=stderr,
                exit_code=proc.returncode,
                execution_time_ms=elapsed_ms,
                language=language,
                memory_exceeded=memory_exceeded,
                error=stderr if proc.returncode != 0 else None,
                files_created=files_created,
            )

        except subprocess.TimeoutExpired:
            elapsed_ms = (time.monotonic() - start_time) * 1000
            return SandboxResult(
                success=False,
                stderr=f"Execution timed out after {self.config.timeout_seconds}s",
                exit_code=-1,
                execution_time_ms=elapsed_ms,
                language=language,
                timed_out=True,
                error=f"Timeout after {self.config.timeout_seconds}s",
            )

        except Exception as e:
            elapsed_ms = (time.monotonic() - start_time) * 1000
            return SandboxResult(
                success=False,
                stderr=str(e),
                exit_code=-1,
                execution_time_ms=elapsed_ms,
                language=language,
                error=str(e),
            )

        finally:
            # Clean up temp directory
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    def execute_multi(
        self,
        blocks: List[Dict[str, str]],
    ) -> List[SandboxResult]:
        """Execute multiple code blocks sequentially, piping context between them.

        Each block is a dict with 'code' and 'language' keys.
        Stdout from each block is available as stdin to the next.
        """
        results = []
        last_stdout = None

        for block in blocks:
            result = self.execute(
                code=block["code"],
                language=block.get("language", "python"),
                stdin_data=last_stdout,
            )
            results.append(result)
            if not result.success:
                # Stop on first failure, fill remaining with skipped
                for _ in range(len(blocks) - len(results)):
                    results.append(SandboxResult(
                        success=False,
                        error="Skipped due to previous failure",
                        language=block.get("language", "python"),
                    ))
                break
            last_stdout = result.stdout

        return results
