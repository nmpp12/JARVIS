"""
MOM GUI Stylesheet — dark theme with blue accents.
"""

DARK_THEME = """
QMainWindow {
    background-color: #0d1117;
}

QWidget {
    background-color: #0d1117;
    color: #e6edf3;
    font-family: "Segoe UI", "SF Pro Display", "Helvetica Neue", sans-serif;
    font-size: 13px;
}

/* ---- Tab bar ---- */
QTabWidget::pane {
    border: 1px solid #30363d;
    border-radius: 6px;
    background: #0d1117;
}
QTabBar::tab {
    background: #161b22;
    color: #8b949e;
    padding: 8px 20px;
    border: 1px solid #30363d;
    border-bottom: none;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    margin-right: 2px;
}
QTabBar::tab:selected {
    background: #0d1117;
    color: #58a6ff;
    border-bottom: 2px solid #58a6ff;
}
QTabBar::tab:hover {
    color: #e6edf3;
}

/* ---- Text areas ---- */
QTextEdit, QPlainTextEdit {
    background-color: #161b22;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 10px;
    font-family: "Cascadia Code", "JetBrains Mono", "Fira Code", "Consolas", monospace;
    font-size: 13px;
    selection-background-color: #264f78;
}

/* ---- Input field ---- */
QLineEdit {
    background-color: #161b22;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 14px;
}
QLineEdit:focus {
    border: 1px solid #58a6ff;
}

/* ---- Buttons ---- */
QPushButton {
    background-color: #238636;
    color: #ffffff;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    font-size: 13px;
}
QPushButton:hover {
    background-color: #2ea043;
}
QPushButton:pressed {
    background-color: #1a7f37;
}
QPushButton:disabled {
    background-color: #21262d;
    color: #484f58;
}
QPushButton#danger_btn {
    background-color: #da3633;
}
QPushButton#danger_btn:hover {
    background-color: #f85149;
}
QPushButton#secondary_btn {
    background-color: #21262d;
    border: 1px solid #30363d;
}
QPushButton#secondary_btn:hover {
    background-color: #30363d;
}

/* ---- Combo box ---- */
QComboBox {
    background-color: #161b22;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 6px 12px;
}
QComboBox::drop-down {
    border: none;
    width: 24px;
}
QComboBox QAbstractItemView {
    background-color: #161b22;
    color: #e6edf3;
    border: 1px solid #30363d;
    selection-background-color: #264f78;
}

/* ---- Spin boxes ---- */
QSpinBox, QDoubleSpinBox {
    background-color: #161b22;
    color: #e6edf3;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 4px 8px;
}

/* ---- Sliders ---- */
QSlider::groove:horizontal {
    border: none;
    height: 4px;
    background: #30363d;
    border-radius: 2px;
}
QSlider::handle:horizontal {
    background: #58a6ff;
    width: 16px;
    height: 16px;
    margin: -6px 0;
    border-radius: 8px;
}

/* ---- Splitter ---- */
QSplitter::handle {
    background: #30363d;
    width: 2px;
}

/* ---- Scroll bars ---- */
QScrollBar:vertical {
    background: #0d1117;
    width: 10px;
    border: none;
}
QScrollBar::handle:vertical {
    background: #30363d;
    border-radius: 5px;
    min-height: 30px;
}
QScrollBar::handle:vertical:hover {
    background: #484f58;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0;
}

/* ---- Labels ---- */
QLabel#title_label {
    font-size: 18px;
    font-weight: 700;
    color: #58a6ff;
}
QLabel#status_label {
    font-size: 12px;
    color: #8b949e;
}
QLabel#section_label {
    font-size: 14px;
    font-weight: 600;
    color: #e6edf3;
    padding: 4px 0;
}

/* ---- Group box ---- */
QGroupBox {
    border: 1px solid #30363d;
    border-radius: 6px;
    margin-top: 12px;
    padding-top: 16px;
    font-weight: 600;
}
QGroupBox::title {
    subcontrol-origin: margin;
    padding: 0 8px;
    color: #8b949e;
}

/* ---- Check box ---- */
QCheckBox {
    spacing: 8px;
    color: #e6edf3;
}
QCheckBox::indicator {
    width: 16px;
    height: 16px;
    border: 1px solid #30363d;
    border-radius: 3px;
    background: #161b22;
}
QCheckBox::indicator:checked {
    background: #238636;
    border-color: #238636;
}

/* ---- Progress bar ---- */
QProgressBar {
    background: #21262d;
    border: none;
    border-radius: 4px;
    height: 8px;
    text-align: center;
    font-size: 0px;
}
QProgressBar::chunk {
    background: #58a6ff;
    border-radius: 4px;
}

/* ---- Status bar ---- */
QStatusBar {
    background: #161b22;
    border-top: 1px solid #30363d;
    color: #8b949e;
    font-size: 12px;
}

/* ---- Menu bar ---- */
QMenuBar {
    background: #161b22;
    border-bottom: 1px solid #30363d;
    color: #e6edf3;
}
QMenuBar::item:selected {
    background: #30363d;
}
QMenu {
    background: #161b22;
    border: 1px solid #30363d;
    color: #e6edf3;
}
QMenu::item:selected {
    background: #264f78;
}
"""
