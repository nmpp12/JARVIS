# JARVIS - Advanced AI Assistant

A sophisticated AI assistant with Ollama integration and self-improvement capabilities, inspired by Tony Stark's JARVIS.

## Features

### 🤖 AI Capabilities
- **Ollama Integration**: Connect to local Ollama models for privacy and customization
- **Multiple Model Support**: Switch between different AI models on the fly
- **Conversation Memory**: Maintains context across interactions
- **Intent Recognition**: Automatically classifies and routes different types of requests

### 🧠 Self-Improvement System
- **Code Analysis**: Automatically analyzes its own codebase for improvements
- **Performance Monitoring**: Tracks response quality and interaction patterns
- **Automatic Optimization**: Can implement code improvements autonomously
- **Learning from Interactions**: Adapts based on user feedback and usage patterns

### 🎤 Voice Interface
- **Speech Recognition**: Natural voice commands using Web Speech API
- **Text-to-Speech**: Responds with synthesized voice
- **Voice Activity Visualization**: Real-time audio level indicators
- **Multi-language Support**: Configurable language settings

### 💻 Advanced UI
- **Arc Reactor Design**: Inspired by Iron Man's technology
- **Real-time Status**: Visual indicators for system state
- **Code Improvement Panel**: Shows suggested optimizations
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

1. **Ollama**: Install Ollama on your system
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows
   # Download from https://ollama.ai/download
   ```

2. **AI Models**: Pull at least one model
   ```bash
   ollama pull llama2
   ollama pull codellama
   ollama pull mistral
   ```

3. **Start Ollama Service**:
   ```bash
   ollama serve
   ```

## Installation

1. Clone or download the project files
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## Usage

### Basic Interaction
- Type messages in the input field or use the microphone button for voice commands
- JARVIS will respond with text and optionally speak the response
- The status indicator shows the current system state

### Model Selection
- Use the model dropdown to switch between available Ollama models
- Different models have different capabilities and response styles

### Self-Improvement
- Enable the "Self-Improvement" toggle to allow JARVIS to analyze and improve its own code
- Ask "improve yourself" or "analyze your code" to trigger manual analysis
- JARVIS will show suggested improvements and can implement them automatically

### Voice Commands
- Click the microphone button to start voice recognition
- Speak clearly and wait for the transcription
- Voice responses can be enabled/disabled based on interaction type

## Configuration

### Ollama Settings
The system automatically detects available Ollama models. Ensure Ollama is running on `http://localhost:11434` (default port).

### Voice Settings
Voice recognition uses the browser's built-in Web Speech API. For best results:
- Use Chrome or Edge browsers
- Allow microphone permissions
- Speak clearly in a quiet environment

### Self-Improvement Settings
The self-improvement system can be configured to:
- Analyze code automatically or on-demand
- Set improvement thresholds
- Enable/disable automatic implementation

## Architecture

### Core Components
- **AIAssistant**: Main orchestration and command processing
- **OllamaClient**: Interface to Ollama API
- **SelfImprovement**: Code analysis and optimization system
- **UIManager**: User interface management
- **VoiceManager**: Speech recognition and synthesis

### Self-Improvement System
The self-improvement system uses:
- **AST Analysis**: Parses JavaScript code for structural analysis
- **Pattern Recognition**: Identifies common improvement opportunities
- **Performance Metrics**: Tracks response quality and user satisfaction
- **Safe Implementation**: Only applies improvements that pass safety checks

## Customization

### Adding New Capabilities
Extend the `AIAssistant` class to add new command types:

```javascript
async handleCustomCommand(input, intent) {
    // Your custom logic here
    return {
        text: "Custom response",
        speak: true
    };
}
```

### Custom Models
Add support for new Ollama models by updating the model selection logic in `OllamaClient.js`.

### UI Themes
Modify `src/styles/main.css` to customize the visual appearance.

## Troubleshooting

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Check if models are available: `ollama list`
- Verify the API endpoint is accessible

### Voice Recognition Problems
- Check browser compatibility (Chrome/Edge recommended)
- Ensure microphone permissions are granted
- Test in a quiet environment

### Self-Improvement Not Working
- Verify the code analysis dependencies are installed
- Check browser console for JavaScript errors
- Ensure file system access permissions

## Security Considerations

- The self-improvement system only analyzes and modifies its own code
- All AI processing happens locally through Ollama
- No data is sent to external services without explicit configuration
- Voice data is processed locally by the browser

## Contributing

This is a demonstration project showcasing advanced AI assistant capabilities. Feel free to extend and modify it for your specific needs.

## License

This project is provided as-is for educational and demonstration purposes.