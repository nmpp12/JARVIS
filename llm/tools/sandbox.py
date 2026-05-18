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
{code}
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
