#!/usr/bin/env python3
"""
Build script for packaging MOM as a standalone executable.

Usage:
    python build_exe.py              # Build the .exe (or binary on Linux/Mac)
    python build_exe.py --onefile    # Single-file executable
    python build_exe.py --clean      # Clean build artifacts first

Requirements:
    pip install pyinstaller pyqt5

The output will be in:
    dist/MOM/MOM.exe      (directory mode, default)
    dist/MOM.exe           (onefile mode)
"""

import argparse
import os
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description="Build MOM executable")
    parser.add_argument("--onefile", action="store_true",
                        help="Build as a single executable file")
    parser.add_argument("--clean", action="store_true",
                        help="Clean build artifacts before building")
    parser.add_argument("--debug", action="store_true",
                        help="Build with debug console enabled")
    parser.add_argument("--icon", type=str, default=None,
                        help="Path to .ico file for the executable icon")
    args = parser.parse_args()

    root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root)

    # Clean previous builds
    if args.clean:
        for d in ["build", "dist"]:
            path = os.path.join(root, d)
            if os.path.exists(path):
                print(f"Cleaning {path}...")
                shutil.rmtree(path)

    # Verify dependencies
    _check_dependency("PyQt5", "pip install pyqt5")
    _check_dependency("PyInstaller", "pip install pyinstaller")

    # Build command
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name", "MOM",
        "--noconfirm",
    ]

    if args.onefile:
        cmd.append("--onefile")
    else:
        cmd.append("--onedir")

    if not args.debug:
        cmd.append("--windowed")  # No console window

    if args.icon and os.path.isfile(args.icon):
        cmd.extend(["--icon", args.icon])

    # Hidden imports for PyTorch and our modules
    hidden = [
        "torch", "torch.nn", "torch.nn.functional", "torch.cuda",
        "numpy", "sentencepiece", "tiktoken",
        "llm", "llm.model", "llm.inference", "llm.tools", "llm.gui",
        "llm.model.config", "llm.model.transformer", "llm.model.bitnet",
        "llm.model.early_exit", "llm.model.efficient_attention",
        "llm.model.triton_kernels",
        "llm.inference.generator", "llm.inference.server",
        "llm.inference.speculative",
        "llm.tools.sandbox", "llm.tools.code_generator",
        "llm.tools.tool_registry",
        "llm.gui.app", "llm.gui.chat_widget", "llm.gui.code_widget",
        "llm.gui.settings_widget", "llm.gui.styles",
    ]
    for h in hidden:
        cmd.extend(["--hidden-import", h])

    # Exclude heavy optional packages to reduce size
    excludes = [
        "matplotlib", "scipy", "pandas", "PIL", "cv2",
        "IPython", "notebook", "jupyter", "tkinter", "_tkinter",
        "test", "tests", "unittest",
    ]
    for e in excludes:
        cmd.extend(["--exclude-module", e])

    # Add data files
    configs_dir = os.path.join(root, "configs")
    if os.path.isdir(configs_dir):
        sep = ";" if sys.platform == "win32" else ":"
        cmd.extend(["--add-data", f"{configs_dir}{sep}llm/configs"])

    # Entry point
    cmd.append(os.path.join("scripts", "launch_gui.py"))

    print(f"\nBuilding MOM executable...")
    print(f"Command: {' '.join(cmd)}\n")

    result = subprocess.run(cmd)

    if result.returncode == 0:
        if args.onefile:
            exe_path = os.path.join(root, "dist", "MOM.exe" if sys.platform == "win32" else "MOM")
        else:
            exe_path = os.path.join(root, "dist", "MOM", "MOM.exe" if sys.platform == "win32" else "MOM")

        print(f"\n{'='*50}")
        print(f"Build successful!")
        print(f"Executable: {exe_path}")
        print(f"{'='*50}")
    else:
        print(f"\nBuild failed with exit code {result.returncode}")
        sys.exit(1)


def _check_dependency(name: str, install_cmd: str):
    """Check if a Python package is installed."""
    try:
        __import__(name)
    except ImportError:
        print(f"Missing dependency: {name}")
        print(f"Install with: {install_cmd}")
        sys.exit(1)


if __name__ == "__main__":
    main()
