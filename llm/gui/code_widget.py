"""
Code execution widget — write code and run it in the sandbox.

Provides a code editor with syntax-highlighted output, language
selection, and sandbox execution controls.
"""

from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QPlainTextEdit, QTextEdit,
    QPushButton, QLabel, QComboBox, QSplitter, QSizePolicy,
)
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont, QTextCharFormat, QColor, QTextCursor


class CodeEditor(QPlainTextEdit):
    """Simple code editor with monospace font and tab support."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFont(QFont("Cascadia Code", 13))
        self.setTabStopDistance(32)
        self.setPlaceholderText("# Write your code here...\nprint('Hello, World!')")
        self.setLineWrapMode(QPlainTextEdit.LineWrapMode.NoWrap)

    def keyPressEvent(self, event):
        """Handle Tab key for indentation."""
        if event.key() == Qt.Key.Key_Tab:
            self.insertPlainText("    ")
            return
        super().keyPressEvent(event)


class OutputDisplay(QTextEdit):
    """Display for code execution output with color-coded results."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setReadOnly(True)
        self.setFont(QFont("Cascadia Code", 12))
        self.setPlaceholderText("Output will appear here...")

    def show_result(self, stdout: str, stderr: str, exit_code: int,
                    time_ms: float, timed_out: bool = False) -> None:
        """Display execution result with color coding."""
        self.clear()
        cursor = self.textCursor()

        # Status line
        if timed_out:
            self._append_colored(cursor, "TIMEOUT", "#f85149")
            self._append_colored(cursor, f"  ({time_ms:.0f}ms)\n", "#8b949e")
        elif exit_code == 0:
            self._append_colored(cursor, "SUCCESS", "#3fb950")
            self._append_colored(cursor, f"  ({time_ms:.0f}ms)\n", "#8b949e")
        else:
            self._append_colored(cursor, f"EXIT CODE {exit_code}", "#f85149")
            self._append_colored(cursor, f"  ({time_ms:.0f}ms)\n", "#8b949e")

        # Stdout
        if stdout.strip():
            self._append_colored(cursor, "\n--- stdout ---\n", "#8b949e")
            self._append_colored(cursor, stdout, "#e6edf3")

        # Stderr
        if stderr.strip():
            self._append_colored(cursor, "\n--- stderr ---\n", "#8b949e")
            self._append_colored(cursor, stderr, "#f85149")

        if not stdout.strip() and not stderr.strip():
            self._append_colored(cursor, "\n(no output)", "#8b949e")

    def _append_colored(self, cursor: QTextCursor, text: str, color: str) -> None:
        fmt = QTextCharFormat()
        fmt.setForeground(QColor(color))
        cursor.movePosition(QTextCursor.MoveOperation.End)
        cursor.insertText(text, fmt)


class CodeWidget(QWidget):
    """Complete code execution interface."""

    execute_requested = pyqtSignal(str, str)  # code, language

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        # Header with controls
        header = QHBoxLayout()

        title = QLabel("Code Sandbox")
        title.setObjectName("section_label")
        header.addWidget(title)
        header.addStretch()

        # Language selector
        lang_label = QLabel("Language:")
        lang_label.setObjectName("status_label")
        header.addWidget(lang_label)

        self.lang_combo = QComboBox()
        self.lang_combo.addItems(["Python", "JavaScript", "Bash"])
        self.lang_combo.setFixedWidth(120)
        header.addWidget(self.lang_combo)

        layout.addLayout(header)

        # Splitter: editor on top, output on bottom
        splitter = QSplitter(Qt.Orientation.Vertical)

        self.editor = CodeEditor()
        splitter.addWidget(self.editor)

        self.output = OutputDisplay()
        splitter.addWidget(self.output)

        splitter.setSizes([400, 200])
        layout.addWidget(splitter, stretch=1)

        # Button row
        btn_row = QHBoxLayout()
        btn_row.addStretch()

        clear_btn = QPushButton("Clear")
        clear_btn.setObjectName("secondary_btn")
        clear_btn.setFixedWidth(80)
        clear_btn.clicked.connect(self._clear)
        btn_row.addWidget(clear_btn)

        self.run_btn = QPushButton("Run")
        self.run_btn.setFixedWidth(100)
        self.run_btn.clicked.connect(self._run)
        btn_row.addWidget(self.run_btn)

        layout.addLayout(btn_row)

    def _run(self) -> None:
        code = self.editor.toPlainText().strip()
        if not code:
            return
        lang = self.lang_combo.currentText().lower()
        self.run_btn.setEnabled(False)
        self.run_btn.setText("Running...")
        self.execute_requested.emit(code, lang)

    def show_result(self, stdout: str, stderr: str, exit_code: int,
                    time_ms: float, timed_out: bool = False) -> None:
        self.output.show_result(stdout, stderr, exit_code, time_ms, timed_out)
        self.run_btn.setEnabled(True)
        self.run_btn.setText("Run")

    def _clear(self) -> None:
        self.editor.clear()
        self.output.clear()
