# JARVIS System Architecture Flowchart

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[Desktop UI - index.html]
        CSS[Styles & Components]
        JS[JavaScript App]
    end

    subgraph "Application Layer"
        APP[JarvisApp - app.js]
        CHAT[ChatUI]
        TASKS[TasksUI]
        CAL[CalendarUI]
        CODE[CodeUI]
        AUTO[AutomationsUI]
        MEM[MemoryUI]
        SET[SettingsUI]
    end

    subgraph "Core Layer"
        CORE[JarvisCore]
        PM[PluginManager]
        EB[EventBus]
        CM[ConfigManager]
    end

    subgraph "Skills Layer"
        VOICE[VoiceSkill]
        LEARN[LearningSkill]
        MEMORY[MemorySkill]
        PERSON[PersonalitySkill]
        AUTOMATION[AutomationSkill]
    end

    subgraph "Plugins Layer"
        TASK[TaskPlugin]
        CALENDAR[CalendarPlugin]
        WEATHER[WeatherPlugin]
        SEARCH[SearchPlugin]
        FILE[FilePlugin]
        REMINDER[ReminderPlugin]
        NEWS[NewsPlugin]
        TRANS[TranslationPlugin]
        MUSIC[MusicPlugin]
    end

    subgraph "External Services"
        PROXY[Proxy Server :3000]
        OLLAMA[Ollama AI :11434]
        APIS[External APIs]
    end

    subgraph "Storage"
        LS[LocalStorage]
        FS[FileSystem]
    end

    UI --> APP
    CSS --> UI
    JS --> APP
    
    APP --> CHAT
    APP --> TASKS
    APP --> CAL
    APP --> CODE
    APP --> AUTO
    APP --> MEM
    APP --> SET
    
    CHAT --> CORE
    TASKS --> CORE
    CAL --> CORE
    CODE --> CORE
    AUTO --> CORE
    MEM --> CORE
    SET --> CORE
    
    CORE --> PM
    CORE --> EB
    CORE --> CM
    
    CORE --> VOICE
    CORE --> LEARN
    CORE --> MEMORY
    CORE --> PERSON
    CORE --> AUTOMATION
    
    PM --> TASK
    PM --> CALENDAR
    PM --> WEATHER
    PM --> SEARCH
    PM --> FILE
    PM --> REMINDER
    PM --> NEWS
    PM --> TRANS
    PM --> MUSIC
    
    CORE --> PROXY
    PROXY --> OLLAMA
    
    TASK --> APIS
    WEATHER --> APIS
    SEARCH --> APIS
    NEWS --> APIS
    TRANS --> APIS
    MUSIC --> APIS
    
    MEMORY --> LS
    LEARN --> LS
    CM --> LS
    FILE --> FS
    
    style UI fill:#4a90e2,stroke:#2c5aa0,stroke-width:3px,color:#fff
    style CORE fill:#e85d75,stroke:#c7254e,stroke-width:3px,color:#fff
    style OLLAMA fill:#00d2d3,stroke:#00a8a9,stroke-width:3px,color:#fff
```

## Layer Descriptions

### 1. User Interface Layer
- **Desktop UI**: Modern web interface with sidebar navigation
- **Styles**: CSS with theme variables and animations
- **JavaScript**: Main application controller

### 2. Application Layer
- **JarvisApp**: Central application manager
- **UI Components**: Modular view controllers for each feature

### 3. Core Layer
- **JarvisCore**: Central brain coordinating all systems
- **PluginManager**: Dynamic plugin loading and management
- **EventBus**: Pub/sub event system for loose coupling
- **ConfigManager**: Centralized configuration management

### 4. Skills Layer
- **VoiceSkill**: Speech recognition and text-to-speech
- **LearningSkill**: Adaptive learning from interactions
- **MemorySkill**: Short/long-term memory management
- **PersonalitySkill**: Personality traits and mood
- **AutomationSkill**: Routines, workflows, and scheduling

### 5. Plugins Layer
- **9 Plugins**: Modular feature extensions
- Each plugin is independently loadable
- Plugins communicate via EventBus

### 6. External Services
- **Proxy Server**: CORS-enabled bridge to Ollama
- **Ollama**: Local AI model runner
- **APIs**: External service integrations

### 7. Storage
- **LocalStorage**: Browser-based persistence
- **FileSystem**: File operations and data storage
