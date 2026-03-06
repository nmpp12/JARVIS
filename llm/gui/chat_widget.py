"""
Chat widget — the main conversation interface.

Displays messages in a scrollable view with distinct styling for
user vs assistant messages, and supports streaming token display.
"""

from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QLineEdit,
    QPushButton, QLabel, QSizePolicy,
)
from PyQt5.QtCore import Qt, pyqtSignal, QTimer
from PyQt5.QtGui import QFont, QTextCursor, QKeyEvent


class ChatDisplay(QTextEdit):
    """Read-only chat display with message formatting."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setReadOnly(True)
        self.setFont(QFont("Segoe UI", 13))
        self._message_count = 0

    def add_message(self, role: str, content: str) -> None:
        """Add a formatted message to the chat."""
        self._message_count += 1
        cursor = self.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)

        if self._message_count > 1:
            cursor.insertHtml("<br>")

        if role == "user":
            cursor.insertHtml(
                f'<div style="margin:8px 0;">'
                f'<span style="color:#58a6ff;font-weight:600;">You</span><br>'
                f'<span style="color:#e6edf3;">{_escape(content)}</span>'
                f'</div>'
            )
        elif role == "assistant":
            cursor.insertHtml(
                f'<div style="margin:8px 0;">'
                f'<span style="color:#3fb950;font-weight:600;">MOM</span><br>'
                f'<span style="color:#e6edf3;">{_escape(content)}</span>'
                f'</div>'
            )
        elif role == "system":
            cursor.insertHtml(
                f'<div style="margin:4px 0;">'
                f'<span style="color:#8b949e;font-style:italic;">{_escape(content)}</span>'
                f'</div>'
            )
        elif role == "code_result":
            cursor.insertHtml(
                f'<div style="margin:4px 0;padding:8px;background:#161b22;'
                f'border:1px solid #30363d;border-radius:4px;">'
                f'<span style="color:#79c0ff;font-family:monospace;">{_escape(content)}</span>'
                f'</div>'
            )

        self.setTextCursor(cursor)
        self.ensureCursorVisible()

    def append_to_last(self, text: str) -> None:
        """Append text to the last message (for streaming)."""
        cursor = self.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)
        cursor.insertText(text)
        self.setTextCursor(cursor)
        self.ensureCursorVisible()

    def clear_chat(self) -> None:
        """Clear all messages."""
        self.clear()
        self._message_count = 0


class ChatInput(QLineEdit):
    """Chat input with Enter to send and Shift+Enter for newline."""

    submit_signal = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setPlaceholderText("Send a message...")
        self.setFont(QFont("Segoe UI", 14))
        self.returnPressed.connect(self._on_submit)

    def _on_submit(self) -> None:
        text = self.text().strip()
        if text:
            self.submit_signal.emit(text)
            self.clear()


class ChatWidget(QWidget):
    """Complete chat interface with display, input, and controls."""

    message_submitted = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(8)

        # Header
        header = QHBoxLayout()
        title = QLabel("Chat")
        title.setObjectName("section_label")
        header.addWidget(title)
        header.addStretch()

        self.status_label = QLabel("Ready")
        self.status_label.setObjectName("status_label")
        header.addWidget(self.status_label)

        clear_btn = QPushButton("Clear")
        clear_btn.setObjectName("secondary_btn")
        clear_btn.setFixedWidth(70)
        clear_btn.clicked.connect(self._clear)
        header.addWidget(clear_btn)

        layout.addLayout(header)

        # Chat display
        self.display = ChatDisplay()
        layout.addWidget(self.display, stretch=1)

        # Input row
        input_row = QHBoxLayout()
        input_row.setSpacing(8)

        self.input = ChatInput()
        self.input.submit_signal.connect(self._on_submit)
        input_row.addWidget(self.input, stretch=1)

        self.send_btn = QPushButton("Send")
        self.send_btn.setFixedWidth(80)
        self.send_btn.clicked.connect(lambda: self.input._on_submit())
        input_row.addWidget(self.send_btn)

        layout.addLayout(input_row)

    def _on_submit(self, text: str) -> None:
        self.display.add_message("user", text)
        self.set_generating(True)
        self.message_submitted.emit(text)

    def add_response(self, text: str) -> None:
        self.display.add_message("assistant", text)
        self.set_generating(False)

    def add_code_result(self, text: str) -> None:
        self.display.add_message("code_result", text)

    def add_system_message(self, text: str) -> None:
        self.display.add_message("system", text)

    def set_generating(self, generating: bool) -> None:
        self.send_btn.setEnabled(not generating)
        self.input.setEnabled(not generating)
        self.status_label.setText("Generating..." if generating else "Ready")

    def _clear(self) -> None:
        self.display.clear_chat()


def _escape(text: str) -> str:
    """Escape HTML special characters but preserve newlines."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br>")
        .replace("  ", "&nbsp;&nbsp;")
    )
