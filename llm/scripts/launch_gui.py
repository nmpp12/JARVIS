#!/usr/bin/env python3
"""
MOM Desktop Application — Entry Point

Launch the MOM GUI with:
    python -m llm.scripts.launch_gui
    python llm/scripts/launch_gui.py

Or after building the .exe:
    ./dist/MOM/MOM
"""

import sys
import os

# Ensure the llm package is importable when running as a script
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _root not in sys.path:
    sys.path.insert(0, os.path.dirname(_root))


def main():
    """Launch the MOM desktop application."""
    from llm.gui.app import MOMApp

    app, window = MOMApp(sys.argv)
    window.chat_widget.add_system_message(
        "Welcome to MOM (Master of Models).\n\n"
        "- Use the Chat tab to talk with the model\n"
        "- Use the Code tab to write and execute code in the sandbox\n"
        "- Use Settings (right panel) to load a model checkpoint\n\n"
        "The code sandbox is always available, even without a model loaded."
    )
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
