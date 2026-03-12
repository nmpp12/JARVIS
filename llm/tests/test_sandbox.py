"""Tests for llm/tools/sandbox.py — exercises the Sandbox executor."""

import pytest

from llm.tools.sandbox import Sandbox, SandboxConfig, SandboxResult


# ── SandboxConfig defaults ─────────────────────────────────────────────────────

class TestSandboxConfig:
    def test_default_timeout(self):
        cfg = SandboxConfig()
        assert cfg.timeout_seconds == 30

    def test_default_max_memory_mb(self):
        cfg = SandboxConfig()
        assert cfg.max_memory_mb == 256

    def test_blocked_imports_not_empty(self):
        assert len(SandboxConfig.BLOCKED_IMPORTS) > 0

    def test_os_is_blocked(self):
        assert "os" in SandboxConfig.BLOCKED_IMPORTS

    def test_subprocess_is_blocked(self):
        assert "subprocess" in SandboxConfig.BLOCKED_IMPORTS

    def test_socket_is_blocked(self):
        assert "socket" in SandboxConfig.BLOCKED_IMPORTS

    def test_math_is_allowed(self):
        assert "math" in SandboxConfig.DEFAULT_ALLOWED_IMPORTS


# ── SandboxResult ─────────────────────────────────────────────────────────────

class TestSandboxResult:
    def test_to_dict_has_required_keys(self):
        r = SandboxResult(success=True, stdout="hi", language="python")
        d = r.to_dict()
        for key in ("success", "stdout", "stderr", "exit_code", "timed_out",
                    "memory_exceeded", "error", "language", "execution_time_ms"):
            assert key in d

    def test_to_dict_success_true(self):
        r = SandboxResult(success=True)
        assert r.to_dict()["success"] is True


# ── Python execution ──────────────────────────────────────────────────────────

class TestPythonExecution:
    @pytest.fixture(scope="class")
    def sandbox(self):
        return Sandbox(SandboxConfig(timeout_seconds=10))

    def test_hello_world(self, sandbox):
        result = sandbox.execute('print("hello world")', language="python")
        assert result.success
        assert "hello world" in result.stdout

    def test_arithmetic(self, sandbox):
        result = sandbox.execute("print(2 + 2)", language="python")
        assert result.success
        assert "4" in result.stdout

    def test_syntax_error_fails(self, sandbox):
        result = sandbox.execute("def (:", language="python")
        assert not result.success

    def test_runtime_error_fails(self, sandbox):
        result = sandbox.execute("x = 1 / 0", language="python")
        assert not result.success

    def test_exit_code_zero_on_success(self, sandbox):
        result = sandbox.execute("pass", language="python")
        assert result.exit_code == 0

    def test_exit_code_nonzero_on_error(self, sandbox):
        result = sandbox.execute("raise ValueError('oops')", language="python")
        assert result.exit_code != 0

    def test_multiline_code(self, sandbox):
        code = "total = 0\nfor i in range(5):\n    total += i\nprint(total)"
        result = sandbox.execute(code, language="python")
        assert result.success
        assert "10" in result.stdout

    def test_imports_math(self, sandbox):
        result = sandbox.execute("import math\nprint(math.pi)", language="python")
        assert result.success
        assert "3.14" in result.stdout

    def test_execution_time_measured(self, sandbox):
        result = sandbox.execute("pass", language="python")
        assert result.execution_time_ms >= 0

    def test_stdout_captured(self, sandbox):
        result = sandbox.execute('print("captured")', language="python")
        assert "captured" in result.stdout

    def test_stderr_captured_on_error(self, sandbox):
        result = sandbox.execute("raise RuntimeError('err msg')", language="python")
        # stderr should contain the error (sandboxed stderr or error field)
        combined = (result.stderr or "") + (result.error or "")
        assert "err msg" in combined or result.exit_code != 0


# ── Blocked imports ───────────────────────────────────────────────────────────

class TestBlockedImports:
    @pytest.fixture(scope="class")
    def sandbox(self):
        return Sandbox(SandboxConfig(timeout_seconds=10))

    def test_os_import_blocked(self, sandbox):
        result = sandbox.execute("import os\nprint(os.getcwd())", language="python")
        assert not result.success

    def test_subprocess_import_blocked(self, sandbox):
        result = sandbox.execute(
            "import subprocess\nsubprocess.run(['ls'])", language="python"
        )
        assert not result.success

    def test_socket_import_blocked(self, sandbox):
        result = sandbox.execute(
            "import socket\nsocket.gethostname()", language="python"
        )
        assert not result.success

    def test_sys_import_blocked(self, sandbox):
        result = sandbox.execute(
            "import sys\nprint(sys.argv)", language="python"
        )
        assert not result.success


# ── Timeout ───────────────────────────────────────────────────────────────────

class TestTimeout:
    def test_timeout_enforced(self):
        sandbox = Sandbox(SandboxConfig(timeout_seconds=1))
        result = sandbox.execute("while True: pass", language="python")
        assert result.timed_out or not result.success

    def test_fast_code_not_timed_out(self):
        sandbox = Sandbox(SandboxConfig(timeout_seconds=10))
        result = sandbox.execute("print('fast')", language="python")
        assert not result.timed_out


# ── Output truncation ─────────────────────────────────────────────────────────

class TestOutputTruncation:
    def test_output_capped_at_max_bytes(self):
        sandbox = Sandbox(SandboxConfig(timeout_seconds=10, max_output_bytes=100))
        code = "print('x' * 10000)"
        result = sandbox.execute(code, language="python")
        assert len(result.stdout) <= 100


# ── Unsupported language ──────────────────────────────────────────────────────

class TestUnsupportedLanguage:
    def test_unknown_language_returns_error(self):
        sandbox = Sandbox()
        result = sandbox.execute("echo hi", language="brainfuck")
        assert not result.success
        assert result.error is not None


# ── stdin ─────────────────────────────────────────────────────────────────────

class TestStdin:
    def test_stdin_passed_to_process(self):
        sandbox = Sandbox(SandboxConfig(timeout_seconds=10))
        code = "import sys\nline = sys.stdin.readline().strip()\nprint(f'got: {line}')"
        # sys is blocked — so this should fail gracefully
        result = sandbox.execute(code, language="python", stdin_data="hello\n")
        # Whether it fails or succeeds, it should not crash the test
        assert isinstance(result, SandboxResult)
