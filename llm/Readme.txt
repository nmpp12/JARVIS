MOM - Custom LLM Application
=============================

A standalone desktop application for chatting with a custom LLM
and running code in a sandboxed environment.


REQUIREMENTS
------------
- Python 3.8+
- pip install pyqt5 torch numpy


RUNNING FROM SOURCE
-------------------
    python llm/scripts/launch_gui.py

The Code tab works immediately with no model loaded.
To chat with the model, load a trained checkpoint via the Settings panel.


BUILDING THE EXECUTABLE
------------------------
Install the build tool:

    pip install pyinstaller

Build a single-file executable:

    python llm/build_exe.py --onefile

Build options:

    --onefile     Single-file executable (easier to distribute)
    --clean       Remove previous build artifacts before building
    --debug       Keep the console window open (useful for troubleshooting)
    --icon PATH   Set a custom icon (.ico file) for the executable
    --shortcut    Create a desktop shortcut after building

The output will be at:

    dist/MOM.exe          (single-file mode, Windows)
    dist/MOM              (single-file mode, Linux/Mac)
    dist/MOM/MOM.exe      (directory mode, Windows)
    dist/MOM/MOM          (directory mode, Linux/Mac)


CREATING A DESKTOP SHORTCUT
----------------------------
Add --shortcut when building to automatically place a shortcut on your desktop:

    python llm/build_exe.py --onefile --shortcut

You can combine it with a custom icon:

    python llm/build_exe.py --onefile --shortcut --icon path/to/icon.ico

This works on all platforms:
- Windows  : Creates a .lnk shortcut
- macOS    : Creates a symlink on the Desktop
- Linux    : Creates a .desktop launcher file


TABS
----
- Chat      : Talk to the loaded LLM model
- Code      : Write and run Python code in a sandboxed environment
- Settings  : Load/unload model checkpoints and adjust generation parameters
