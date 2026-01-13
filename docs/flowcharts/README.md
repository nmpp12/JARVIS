# JARVIS Flowcharts and Diagrams

This directory contains comprehensive flowcharts and diagrams documenting the JARVIS system architecture and workflows.

## 📊 Available Diagrams

### 1. [System Architecture](01-system-architecture.md)
Overview of the entire JARVIS system including:
- Layer structure (UI, Application, Core, Skills, Plugins)
- Component relationships
- Data flow between layers
- External service integration

### 2. [User Query Flow](02-user-query-flow.md)
Detailed sequence of processing user queries:
- Input handling
- Context retrieval
- AI communication
- Response generation
- Learning integration

### 3. [Plugin System](03-plugin-system-flow.md)
Plugin lifecycle and management:
- Discovery and loading
- Validation
- Registration
- Initialization
- Event-based communication

### 4. [Memory System](04-memory-system-flow.md)
Memory management and context building:
- Short-term memory (20 items)
- Long-term memory (500 items)
- Entity storage
- Importance scoring
- Context retrieval

### 5. [Automation System](05-automation-system-flow.md)
Automation workflows and scheduling:
- Routines (recurring)
- Workflows (sequential)
- Scheduled actions (one-time)
- Triggers (conditional)
- Scheduler operation

### 6. [Initialization Flow](06-initialization-flow.md)
System startup sequence:
- Bootstrap phase
- Core initialization
- Plugin loading
- Skills initialization
- UI setup
- Service checks

## 🎨 Diagram Format

All diagrams use **Mermaid** syntax for easy rendering in:
- GitHub
- GitLab
- VS Code (with Mermaid extension)
- Documentation sites

## 🔍 How to View

### On GitHub
Simply open any `.md` file - GitHub renders Mermaid diagrams automatically.

### In VS Code
1. Install "Markdown Preview Mermaid Support" extension
2. Open any diagram file
3. Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac)

### Export as Images
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Convert to PNG
mmdc -i 01-system-architecture.md -o architecture.png

# Convert to SVG
mmdc -i 02-user-query-flow.md -o query-flow.svg
```

### Online Editor
Use [Mermaid Live Editor](https://mermaid.live/) to:
- View and edit diagrams
- Export as PNG/SVG/PDF
- Share diagrams

## 📐 Diagram Types Used

- **Graph TB/LR**: Top-to-bottom or left-to-right flowcharts
- **Sequence Diagrams**: Time-based interaction flows
- **State Diagrams**: State transitions
- **Gantt Charts**: Timeline visualizations
- **Class Diagrams**: Object relationships (coming soon)

## 🎯 Quick Reference

### System Layers
```
User Interface → Application → Core → Skills → Plugins → External Services
```

### Query Processing
```
User Input → Memory Context → AI Processing → Response → Learning
```

### Plugin Lifecycle
```
Discover → Validate → Register → Initialize → Subscribe → Ready
```

### Memory Types
```
Short-term (20) → Recent conversations
Long-term (500) → Important information
Entities (∞) → Named facts
```

### Automation Types
```
Routines → Recurring (daily, weekly)
Workflows → Sequential steps
Scheduled → One-time actions
Triggers → Conditional execution
```

## 🔄 Updating Diagrams

1. Edit the `.md` file
2. Update Mermaid syntax
3. Verify rendering in preview
4. Commit changes

## 🤝 Contributing

To add new diagrams:
1. Create a new `.md` file with number prefix
2. Use Mermaid syntax
3. Add description and examples
4. Update this README
5. Submit PR

## 📚 Resources

- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Syntax](https://mermaid.js.org/intro/syntax-reference.html)
- [Mermaid Live Editor](https://mermaid.live/)
- [GitHub Mermaid Support](https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/)

## 🎓 Learning Path

1. Start with **System Architecture** for overview
2. Read **User Query Flow** to understand interactions
3. Study **Plugin System** to add features
4. Review **Memory System** for context management
5. Explore **Automation System** for scheduling
6. Check **Initialization Flow** for startup process

## ⚡ Quick Start Example

View the query flow:
```bash
cat docs/flowcharts/02-user-query-flow.md
```

Or open in browser:
```
https://github.com/nmpp12/JARVIS/blob/rebuild/docs/flowcharts/02-user-query-flow.md
```
