"""
Settings widget — model configuration and generation parameters.
"""

from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGroupBox, QLabel,
    QComboBox, QDoubleSpinBox, QSpinBox, QCheckBox, QLineEdit,
    QPushButton, QFileDialog, QFormLayout, QScrollArea,
)
from PyQt5.QtCore import Qt, pyqtSignal


class SettingsWidget(QWidget):
    """Model and generation settings panel."""

    settings_changed = pyqtSignal(dict)
    load_model_requested = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setSpacing(16)

        # --- Model loading ---
        model_group = QGroupBox("Model")
        model_layout = QFormLayout()

        self.checkpoint_path = QLineEdit()
        self.checkpoint_path.setPlaceholderText("/path/to/checkpoint")
        model_layout.addRow("Checkpoint:", self.checkpoint_path)

        self.model_size = QComboBox()
        self.model_size.addItems(["tiny", "small", "medium", "large", "xl"])
        self.model_size.setCurrentText("small")
        model_layout.addRow("Preset:", self.model_size)

        load_btn = QPushButton("Load Model")
        load_btn.clicked.connect(self._load_model)
        model_layout.addRow("", load_btn)

        browse_btn = QPushButton("Browse...")
        browse_btn.setObjectName("secondary_btn")
        browse_btn.clicked.connect(self._browse)
        model_layout.addRow("", browse_btn)

        model_group.setLayout(model_layout)
        layout.addWidget(model_group)

        # --- Generation parameters ---
        gen_group = QGroupBox("Generation")
        gen_layout = QFormLayout()

        self.temperature = QDoubleSpinBox()
        self.temperature.setRange(0.0, 2.0)
        self.temperature.setSingleStep(0.1)
        self.temperature.setValue(0.7)
        gen_layout.addRow("Temperature:", self.temperature)

        self.top_p = QDoubleSpinBox()
        self.top_p.setRange(0.0, 1.0)
        self.top_p.setSingleStep(0.05)
        self.top_p.setValue(0.9)
        gen_layout.addRow("Top-p:", self.top_p)

        self.top_k = QSpinBox()
        self.top_k.setRange(1, 200)
        self.top_k.setValue(50)
        gen_layout.addRow("Top-k:", self.top_k)

        self.max_tokens = QSpinBox()
        self.max_tokens.setRange(1, 4096)
        self.max_tokens.setValue(512)
        gen_layout.addRow("Max tokens:", self.max_tokens)

        self.repetition_penalty = QDoubleSpinBox()
        self.repetition_penalty.setRange(1.0, 2.0)
        self.repetition_penalty.setSingleStep(0.05)
        self.repetition_penalty.setValue(1.1)
        gen_layout.addRow("Rep. penalty:", self.repetition_penalty)

        gen_group.setLayout(gen_layout)
        layout.addWidget(gen_group)

        # --- Optimizations ---
        opt_group = QGroupBox("Optimizations")
        opt_layout = QVBoxLayout()

        self.use_early_exit = QCheckBox("Enable early exit")
        opt_layout.addWidget(self.use_early_exit)

        self.use_speculative = QCheckBox("Enable speculative decoding")
        opt_layout.addWidget(self.use_speculative)

        self.use_triton = QCheckBox("Use Triton kernels")
        self.use_triton.setChecked(True)
        opt_layout.addWidget(self.use_triton)

        self.use_bitnet = QCheckBox("BitNet 1.58-bit quantization")
        self.use_bitnet.setChecked(True)
        opt_layout.addWidget(self.use_bitnet)

        opt_group.setLayout(opt_layout)
        layout.addWidget(opt_group)

        # --- Sandbox settings ---
        sandbox_group = QGroupBox("Code Sandbox")
        sandbox_layout = QFormLayout()

        self.sandbox_timeout = QSpinBox()
        self.sandbox_timeout.setRange(1, 120)
        self.sandbox_timeout.setValue(30)
        self.sandbox_timeout.setSuffix("s")
        sandbox_layout.addRow("Timeout:", self.sandbox_timeout)

        self.sandbox_memory = QSpinBox()
        self.sandbox_memory.setRange(32, 2048)
        self.sandbox_memory.setValue(256)
        self.sandbox_memory.setSuffix(" MB")
        sandbox_layout.addRow("Max memory:", self.sandbox_memory)

        self.auto_execute = QCheckBox("Auto-execute code blocks")
        self.auto_execute.setChecked(True)
        sandbox_layout.addRow("", self.auto_execute)

        sandbox_group.setLayout(sandbox_layout)
        layout.addWidget(sandbox_group)

        layout.addStretch()

        scroll.setWidget(container)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.addWidget(scroll)

    def _browse(self) -> None:
        path = QFileDialog.getExistingDirectory(self, "Select checkpoint directory")
        if path:
            self.checkpoint_path.setText(path)

    def _load_model(self) -> None:
        path = self.checkpoint_path.text().strip()
        if path:
            self.load_model_requested.emit(path)

    def get_generation_params(self) -> dict:
        return {
            "temperature": self.temperature.value(),
            "top_p": self.top_p.value(),
            "top_k": self.top_k.value(),
            "max_tokens": self.max_tokens.value(),
            "repetition_penalty": self.repetition_penalty.value(),
        }

    def get_sandbox_params(self) -> dict:
        return {
            "timeout_seconds": self.sandbox_timeout.value(),
            "max_memory_mb": self.sandbox_memory.value(),
            "auto_execute": self.auto_execute.isChecked(),
        }
