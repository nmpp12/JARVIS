# JARVIS - Advanced AI Assistant

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

*A sophisticated AI assistant with Ollama integration, voice interface, and self-improvement capabilities, inspired by Tony Stark's JARVIS.*

</div>

## 🌟 Features

### 🤖 AI Capabilities
- **Ollama Integration**: Connect to local Ollama models for privacy and customization
- **Multiple Model Support**: Switch between different AI models (Llama2, CodeLlama, Mistral, etc.)
- **Conversation Memory**: Maintains context across interactions
- **Intent Recognition**: Automatically classifies and routes different types of requests

### 🧠 Self-Improvement System
- **Code Analysis**: Automatically analyzes its own codebase for improvements
- **Performance Monitoring**: Tracks response quality and interaction patterns
- **Automatic Optimization**: Can implement code improvements autonomously
- **Learning from Interactions**: Adapts based on user feedback

### 🎤 Voice Interface
- **Speech Recognition**: Natural voice commands using Web Speech API
- **Text-to-Speech**: Responds with synthesized voice
- **Voice Activity Visualization**: Real-time audio level indicators
- **Multi-language Support**: Configurable language settings

### 🔌 Plugin System
- **Calendar**: Event management and scheduling
- **Weather**: Real-time weather information
- **Tasks**: To-do list and task management
- **Code**: Code analysis and generation
- **News**: Latest news and updates
- **Extensible**: Easy to add new plugins

### 💼 Skill Managers
- **Business**: Business management and productivity
- **Finance**: Financial tracking and analysis
- **Health**: Health and wellness monitoring
- **Education**: Learning resources and management
- **Legal**: Legal assistance and documentation

### 💻 Modern UI
- **Arc Reactor Design**: Inspired by Iron Man's technology
- **Real-time Status**: Visual indicators for system state
- **Responsive Design**: Works on desktop and mobile
- **Dark Theme**: Easy on the eyes

## 📋 Prerequisites

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

### 2. Pull AI Models

```bash
ollama pull llama2
ollama pull codellama
ollama pull mistral
```

### 3. Start Ollama Service

```bash
ollama serve
```

## 🚀 Installation

1. **Clone the repository**
```bash
git clone https://github.com/nmpp12/JARVIS.git
cd JARVIS
```

2. **Checkout the rebuild branch**
```bash
git checkout rebuild
```

3. **Install dependencies**
```bash
npm install
```

4. **Start the development server**
```bash
npm run dev
```

5. **Open your browser**
```
http://localhost:3000
```

## 📖 Usage

### Basic Interaction
- Type messages in the input field or click the microphone for voice commands
- JARVIS responds with text and optionally speaks the response
- Status indicator shows current system state

### Model Selection
- Use the model dropdown to switch between available Ollama models
- Different models have different capabilities

### Voice Commands
- Click microphone button to start voice recognition
- Speak clearly and wait for transcription
- Voice responses can be enabled/disabled

### Self-Improvement
- Enable "Self-Improvement" toggle
- Ask "improve yourself" or "analyze your code"
- JARVIS shows suggestions and can implement them

## 🏗️ Project Structure

```
JARVIS/
├── src/
│   ├── ai/              # AI and Ollama integration
│   ├── core/            # Core system components
│   ├── plugins/         # Plugin system
│   ├── skills/          # Skill managers
│   ├── services/        # External services
│   ├── storage/         # Data persistence
│   ├── ui/              # UI components
│   ├── voice/           # Voice recognition/synthesis
│   ├── styles/          # CSS styling
│   └── main.js          # Application entry point
├── server/              # Backend proxy server
├── index.html           # Main HTML file
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```

## 🔧 Configuration

### Ollama Settings
The system automatically detects available Ollama models. Ensure Ollama is running on `http://localhost:11434` (default port).

### Voice Settings
Voice recognition uses the browser's Web Speech API. For best results:
- Use Chrome or Edge browsers
- Allow microphone permissions
- Speak clearly in quiet environment

## 🛠️ Development

### Adding New Plugins

1. Create new plugin file in `src/plugins/`
2. Extend `BasePlugin` class
3. Implement required methods
4. Register in `PluginManager`

### Adding New Skills

1. Create new skill file in `src/skills/`
2. Define skill capabilities
3. Integrate with core system

## 🐛 Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check available models: `ollama list`
- Verify API endpoint accessibility

### Voice Recognition Problems
- Check browser compatibility (Chrome/Edge recommended)
- Ensure microphone permissions granted
- Test in quiet environment

### Self-Improvement Not Working
- Verify dependencies installed
- Check browser console for errors
- Ensure file system access permissions

## 🔒 Security

- All AI processing happens locally through Ollama
- No data sent to external services
- Voice data processed locally by browser
- Self-improvement only modifies own code

## 🤝 Contributing

This is a demonstration project. Feel free to fork and extend for your needs.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Inspired by Marvel's JARVIS
- Built with Ollama AI
- Uses Web Speech API

---

<div align="center">

Made with ❤️ by nmpp12

</div>