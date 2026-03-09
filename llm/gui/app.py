"""
MOM Desktop Application

Main window that combines chat, code execution, and settings
into a tabbed interface. Connects the GUI to the model backend
via background threads for non-blocking inference.
"""

import sys
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTabWidget, QVBoxLayout, QHBoxLayout,
    QWidget, QSplitter, QLabel, QStatusBar, QMenuBar, QAction,
    QMessageBox, QFileDialog, QProgressBar,
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt5.QtGui import QFont, QIcon

from .styles import DARK_THEME
from .chat_widget import ChatWidget
from .code_widget import CodeWidget
from .settings_widget import SettingsWidget


class GenerateThread(QThread):
    """Background thread for model inference."""
    finished = pyqtSignal(str)
    error = pyqtSignal(str)

    def __init__(self, generator, prompt: str, params: dict):
        super().__init__()
        self.generator = generator
        self.prompt = prompt
        self.params = params

    def run(self):
        try:
            result = self.generator.generate(
                prompt=self.prompt,
                max_new_tokens=self.params.get("max_tokens", 512),
                temperature=self.params.get("temperature", 0.7),
                top_p=self.params.get("top_p", 0.9),
                top_k=self.params.get("top_k", 50),
            )
            self.finished.emit(result)
        except Exception as e:
            self.error.emit(str(e))


class CodeExecuteThread(QThread):
    """Background thread for sandbox code execution."""
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)

    def __init__(self, sandbox, code: str, language: str):
        super().__init__()
        self.sandbox = sandbox
        self.code = code
        self.language = language

    def run(self):
        try:
            result = self.sandbox.execute(
                code=self.code,
                language=self.language,
            )
            self.finished.emit(result.to_dict())
        except Exception as e:
            self.error.emit(str(e))


class LoadModelThread(QThread):
    """Background thread for model loading."""
    finished = pyqtSignal(object)  # generator
    error = pyqtSignal(str)

    def __init__(self, checkpoint_path: str):
        super().__init__()
        self.checkpoint_path = checkpoint_path

    def run(self):
        try:
            from ..inference.generator import TextGenerator
            generator = TextGenerator.from_checkpoint(self.checkpoint_path)
            self.finished.emit(generator)
        except Exception as e:
            self.error.emit(str(e))


class MOMWindow(QMainWindow):
    """Main application window."""

    def __init__(self):
        super().__init__()
        self.setWindowTitle("MOM - Master of Models")
        self.setMinimumSize(1000, 700)
        self.resize(1200, 800)

        self.generator = None
        self.sandbox = None
        self._active_threads = []

        self._init_sandbox()
        self._init_ui()
        self._init_menu()
        self._init_statusbar()

    def _init_sandbox(self):
        """Initialize the code sandbox."""
        try:
            from ..tools.sandbox import Sandbox, SandboxConfig
            self.sandbox = Sandbox(SandboxConfig())
        except ImportError:
            self.sandbox = None

    def _init_ui(self):
        """Build the main UI layout."""
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(0)

        # Title bar
        title_row = QHBoxLayout()
        title = QLabel("MOM")
        title.setObjectName("title_label")
        title_row.addWidget(title)

        subtitle = QLabel("Master of Models")
        subtitle.setObjectName("status_label")
        title_row.addWidget(subtitle)
        title_row.addStretch()

        self.model_status = QLabel("No model loaded")
        self.model_status.setObjectName("status_label")
        title_row.addWidget(self.model_status)

        layout.addLayout(title_row)

        # Main content: tabs on left, settings on right
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Tab widget (chat + code)
        self.tabs = QTabWidget()

        self.chat_widget = ChatWidget()
        self.chat_widget.message_submitted.connect(self._on_chat_message)
        self.tabs.addTab(self.chat_widget, "Chat")

        self.code_widget = CodeWidget()
        self.code_widget.execute_requested.connect(self._on_code_execute)
        self.tabs.addTab(self.code_widget, "Code")

        splitter.addWidget(self.tabs)

        # Settings panel
        self.settings_widget = SettingsWidget()
        self.settings_widget.load_model_requested.connect(self._load_model)
        self.settings_widget.setMaximumWidth(350)
        splitter.addWidget(self.settings_widget)

        splitter.setSizes([800, 300])
        layout.addWidget(splitter, stretch=1)

    def _init_menu(self):
        """Build the menu bar."""
        menubar = self.menuBar()

        # File menu
        file_menu = menubar.addMenu("File")

        load_action = QAction("Load Model...", self)
        load_action.setShortcut("Ctrl+O")
        load_action.triggered.connect(self._browse_and_load)
        file_menu.addAction(load_action)

        file_menu.addSeparator()

        quit_action = QAction("Quit", self)
        quit_action.setShortcut("Ctrl+Q")
        quit_action.triggered.connect(self.close)
        file_menu.addAction(quit_action)

        # View menu
        view_menu = menubar.addMenu("View")

        chat_action = QAction("Chat Tab", self)
        chat_action.setShortcut("Ctrl+1")
        chat_action.triggered.connect(lambda: self.tabs.setCurrentIndex(0))
        view_menu.addAction(chat_action)

        code_action = QAction("Code Tab", self)
        code_action.setShortcut("Ctrl+2")
        code_action.triggered.connect(lambda: self.tabs.setCurrentIndex(1))
        view_menu.addAction(code_action)

        # Help menu
        help_menu = menubar.addMenu("Help")

        about_action = QAction("About MOM", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)

    def _init_statusbar(self):
        """Build the status bar."""
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        self.progress = QProgressBar()
        self.progress.setFixedWidth(150)
        self.progress.setVisible(False)
        self.status_bar.addPermanentWidget(self.progress)

        self.status_bar.showMessage("Ready — load a model to start chatting")

    # --- Actions ---

    def _on_chat_message(self, text: str):
        """Handle user chat message."""
        if self.generator is None:
            self.chat_widget.add_system_message(
                "No model loaded. Go to Settings to load a checkpoint, "
                "or the sandbox will still work in the Code tab."
            )
            self.chat_widget.set_generating(False)
            return

        params = self.settings_widget.get_generation_params()

        # Build prompt with system context
        from ..tools.code_generator import ASI_IDENTITY_PROMPT
        prompt = f"System: {ASI_IDENTITY_PROMPT}\n\nUser: {text}\n\nAssistant:"

        self.progress.setVisible(True)
        self.progress.setRange(0, 0)  # indeterminate
        self.status_bar.showMessage("Generating...")

        thread = GenerateThread(self.generator, prompt, params)
        thread.finished.connect(self._on_generate_done)
        thread.error.connect(self._on_generate_error)
        thread.finished.connect(lambda: self._cleanup_thread(thread))
        thread.error.connect(lambda: self._cleanup_thread(thread))
        self._active_threads.append(thread)
        thread.start()

    def _on_generate_done(self, text: str):
        """Handle completed generation."""
        self.chat_widget.add_response(text)
        self.progress.setVisible(False)
        self.status_bar.showMessage("Ready")

        # Check for code blocks and auto-execute
        if self.sandbox and self.settings_widget.auto_execute.isChecked():
            try:
                from ..tools.code_generator import extract_code_blocks
                blocks = extract_code_blocks(text)
                for block in blocks:
                    result = self.sandbox.execute(block.code, block.language)
                    output = result.stdout if result.success else result.stderr
                    status = "OK" if result.success else "ERROR"
                    self.chat_widget.add_code_result(
                        f"[{block.language}] {status} ({result.execution_time_ms:.0f}ms)\n{output}"
                    )
            except ImportError:
                pass

    def _on_generate_error(self, error: str):
        """Handle generation error."""
        self.chat_widget.add_system_message(f"Error: {error}")
        self.chat_widget.set_generating(False)
        self.progress.setVisible(False)
        self.status_bar.showMessage("Error during generation")

    def _on_code_execute(self, code: str, language: str):
        """Handle code execution request from code tab."""
        if self.sandbox is None:
            self.code_widget.show_result("", "Sandbox not available", 1, 0)
            return

        self.status_bar.showMessage(f"Executing {language} code...")
        self.progress.setVisible(True)
        self.progress.setRange(0, 0)

        thread = CodeExecuteThread(self.sandbox, code, language)
        thread.finished.connect(self._on_code_done)
        thread.error.connect(self._on_code_error)
        thread.finished.connect(lambda: self._cleanup_thread(thread))
        thread.error.connect(lambda: self._cleanup_thread(thread))
        self._active_threads.append(thread)
        thread.start()

    def _on_code_done(self, result: dict):
        """Handle completed code execution."""
        self.code_widget.show_result(
            stdout=result.get("stdout", ""),
            stderr=result.get("stderr", ""),
            exit_code=result.get("exit_code", 0),
            time_ms=result.get("execution_time_ms", 0),
            timed_out=result.get("timed_out", False),
        )
        self.progress.setVisible(False)
        self.status_bar.showMessage("Code execution complete")

    def _on_code_error(self, error: str):
        """Handle code execution error."""
        self.code_widget.show_result("", error, 1, 0)
        self.progress.setVisible(False)
        self.status_bar.showMessage("Code execution failed")

    def _load_model(self, path: str):
        """Load model from checkpoint in background."""
        self.model_status.setText("Loading model...")
        self.status_bar.showMessage(f"Loading model from {path}...")
        self.progress.setVisible(True)
        self.progress.setRange(0, 0)

        thread = LoadModelThread(path)
        thread.finished.connect(self._on_model_loaded)
        thread.error.connect(self._on_model_error)
        thread.finished.connect(lambda: self._cleanup_thread(thread))
        thread.error.connect(lambda: self._cleanup_thread(thread))
        self._active_threads.append(thread)
        thread.start()

    def _on_model_loaded(self, generator):
        """Handle model loaded successfully."""
        self.generator = generator
        self.model_status.setText("Model loaded")
        self.progress.setVisible(False)
        self.status_bar.showMessage("Model loaded successfully")
        self.chat_widget.add_system_message("Model loaded and ready.")

    def _on_model_error(self, error: str):
        """Handle model loading error."""
        self.model_status.setText("Load failed")
        self.progress.setVisible(False)
        self.status_bar.showMessage("Model loading failed")
        QMessageBox.critical(self, "Error", f"Failed to load model:\n{error}")

    def _browse_and_load(self):
        """Browse for checkpoint directory and load."""
        path = QFileDialog.getExistingDirectory(self, "Select checkpoint directory")
        if path:
            self.settings_widget.checkpoint_path.setText(path)
            self._load_model(path)

    def _show_about(self):
        """Show about dialog."""
        QMessageBox.about(
            self,
            "About MOM",
            "<h2>MOM — Master of Models</h2>"
            "<p>A transformer-based language model with:</p>"
            "<ul>"
            "<li>BitNet 1.58-bit quantization</li>"
            "<li>Speculative decoding</li>"
            "<li>Early exit inference</li>"
            "<li>Sandboxed code execution</li>"
            "<li>Tool-use interface</li>"
            "</ul>"
            "<p>Built for JARVIS AI Assistant.</p>"
        )

    def _cleanup_thread(self, thread):
        """Remove finished thread from active list."""
        if thread in self._active_threads:
            self._active_threads.remove(thread)

    def closeEvent(self, event):
        """Clean up on close."""
        for thread in self._active_threads:
            thread.quit()
            thread.wait(2000)
        event.accept()


def MOMApp(argv=None):
    """Launch the MOM desktop application.

    Returns the QApplication and MOMWindow for programmatic control.
    """
    if argv is None:
        argv = sys.argv

    app = QApplication(argv)
    app.setApplicationName("MOM")
    app.setOrganizationName("JARVIS")
    app.setStyleSheet(DARK_THEME)

    window = MOMWindow()
    window.show()

    return app, window


def main():
    """Entry point for the desktop application."""
    app, window = MOMApp()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
