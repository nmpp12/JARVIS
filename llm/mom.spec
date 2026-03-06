# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for MOM (Master of Models)

Build with:
    pyinstaller mom.spec

Or use the build script:
    python build_exe.py
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect all submodules
hiddenimports = (
    collect_submodules('llm') +
    collect_submodules('PyQt5') +
    [
        'torch', 'torch.nn', 'torch.nn.functional',
        'numpy', 'json', 'threading', 'subprocess',
        'dataclasses', 'enum', 'typing',
    ]
)

# Collect data files (configs, etc.)
datas = [
    ('configs/*.yaml', 'llm/configs'),
]

a = Analysis(
    ['scripts/launch_gui.py'],
    pathex=[os.path.dirname(os.path.abspath(SPEC))],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib', 'scipy', 'pandas', 'PIL', 'cv2',
        'IPython', 'notebook', 'jupyter',
        'tkinter', '_tkinter',
        'test', 'tests',
    ],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='MOM',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # No console window — GUI app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Set to 'icon.ico' if you have one
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='MOM',
)
