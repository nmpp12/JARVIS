from PyQt5.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, QTextEdit, QLineEdit, QPushButton, QWidget)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QColor, QPalette
import speech_recognition as sr
import pyttsx3
import google.generativeai as genai

# --- JARVIS Configuration ---
GEMINI_API_KEY = 'YOUR_API_KEY'
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# --- GUI Setup ---
class JARVIS_UI(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("JARVIS AI")
        self.setGeometry(100, 100, 800, 600)
        self.setStyleSheet("background-color: #0a0a0a; color: #ffffff;")
        self.setWindowIcon(QIcon("iron-man.ico"))

        # Central Widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)

        # Terminal Output (Dark with glowing text)
        self.terminal = QTextEdit()
        self.terminal.setReadOnly(True)
        self.terminal.setFont(QFont("Consolas", 10))
        self.terminal.setStyleSheet("""
            QTextEdit {
                background-color: #121212;
                color: #00ff00;
                border: 1px solid #333;
                padding: 10px;
            }
        """)
        layout.addWidget(self.terminal)

        # Input Area
        self.input_field = QLineEdit()
        self.input_field.setPlaceholderText("Type or press voice command...")
        self.input_field.setStyleSheet("""
            QLineEdit {
                background: #1e1e1e;
                color: #ffffff;
                border: 1px solid #333;
                padding: 8px;
            }
        """)
        self.input_field.returnPressed.connect(self.process_input)
        layout.addWidget(self.input_field)

        # Voice Command Button
        self.voice_btn = QPushButton("🎤 Voice Command")
        self.voice_btn.setStyleSheet("""
            QPushButton {
                background: #ff4d4d;
                color: white;
                border: none;
                padding: 8px;
                font-weight: bold;
            }
            QPushButton:hover {
                background: #ff6666;
            }
        """)
        self.voice_btn.clicked.connect(self.listen)
        layout.addWidget(self.voice_btn)

        # Initialize voice engine
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 180)

        # Welcome message
        self.print_output("JARVIS Online. How can I assist you today?")

    def print_output(self, text):
        """Display text in terminal."""
        self.terminal.append(f"JARVIS: {text}")

    def speak(self, text):
        """Make JARVIS speak."""
        self.print_output(text)
        self.engine.say(text)
        self.engine.runAndWait()

    def listen(self):
        """Start voice recognition in a separate thread."""
        self.voice_thread = VoiceThread()
        self.voice_thread.result_signal.connect(self.handle_voice_result)
        self.voice_thread.start()

    def handle_voice_result(self, text):
        """Process voice command result."""
        if text:
            self.input_field.setText(text)
            self.process_input()

    def process_input(self):
        """Process text input."""
        user_text = self.input_field.text()
        if not user_text:
            return

        self.terminal.append(f"You: {user_text}")
        self.input_field.clear()

        # Process command (replace with your logic)
        if "hello" in user_text.lower():
            self.speak("Hello, sir. How may I assist you?")
        elif "time" in user_text.lower():
            from datetime import datetime
            current_time = datetime.now().strftime("%H:%M")
            self.speak(f"The current time is {current_time}.")
        else:
            # Ask Gemini for a response
            try:
                response = model.generate_content(user_text)
                self.speak(response.text)
            except Exception as e:
                self.speak(f"Error processing request: {e}")

# --- Voice Recognition Thread ---
class VoiceThread(QThread):
    result_signal = pyqtSignal(str)

    def run(self):
        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            try:
                audio = recognizer.listen(source, timeout=5)
                text = recognizer.recognize_google(audio)
                self.result_signal.emit(text)
            except sr.UnknownValueError:
                self.result_signal.emit("")
            except sr.RequestError:
                self.result_signal.emit("")

# --- Run the App ---
if __name__ == "__main__":
    app = QApplication([])
    jarvis = JARVIS_UI()
    jarvis.show()
    app.exec_()
