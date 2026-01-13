# JARVIS Flowcharts - FrogProG Format

This directory contains all JARVIS flowcharts in **FrogProG (.fprg)** format for executable flowchart visualization and testing.

## 📋 Available Flowcharts

### 1. [01-system-architecture.fprg](01-system-architecture.fprg)
**System Architecture Overview**
- 7-layer architecture (UI, App, Core, Skills, Plugins, Services, Storage)
- Component relationships and data flow
- Color-coded layers for visual clarity

### 2. [02-user-query-flow.fprg](02-user-query-flow.fprg)
**User Query Processing**
- Complete sequence from user input to response
- Timing information for each phase
- Memory and AI integration flow
- Total processing time: 1.5-6 seconds

### 3. [03-plugin-system-flow.fprg](03-plugin-system-flow.fprg)
**Plugin System Management**
- Plugin lifecycle (Discovery → Validation → Registration → Init)
- Event-based communication patterns
- Error handling for failed plugins
- 9 plugins: Task, Calendar, Weather, Search, File, Reminder, News, Translation, Music

### 4. [04-memory-system-flow.fprg](04-memory-system-flow.fprg)
**Memory Management**
- 3 memory types: Short-term (20), Long-term (500), Entities (∞)
- Importance scoring algorithm
- Context building and retrieval
- Memory consolidation process

### 5. [05-automation-system-flow.fprg](05-automation-system-flow.fprg)
**Automation & Scheduling**
- 4 automation types: Routines, Workflows, Scheduled, Triggers
- Scheduler loop (1-minute intervals)
- Workflow state machine
- Action types and error handling

### 6. [06-initialization-flow.fprg](06-initialization-flow.fprg)
**System Initialization**
- 7 startup phases (0-5000ms)
- Error handling (critical vs non-critical)
- Performance timeline
- Optimization tips

## 🚀 How to Use

### With FrogProG Runner
```bash
# Install FrogProG runner (if available)
npm install -g frogprog-runner

# View flowchart
frogprog view 01-system-architecture.fprg

# Execute flowchart (if supports execution)
frogprog run 02-user-query-flow.fprg

# Validate flowchart syntax
frogprog validate 03-plugin-system-flow.fprg

# Export to image
frogprog export 04-memory-system-flow.fprg --format png
```

### Manual Viewing
```bash
# View in text editor
cat 01-system-architecture.fprg

# Or open in VS Code
code 02-user-query-flow.fprg
```

## 📐 FrogProG Syntax Features

These flowcharts use FrogProG's extended syntax:

- **BOX**: Group related components
- **COMPONENT**: Define system components
- **SEQUENCE**: Show time-based interactions
- **ACTOR**: Define participants in sequences
- **DECISION**: Conditional branching
- **LOOP/FOREACH**: Iterative processes
- **STATE/STATE_MACHINE**: State transitions
- **TIMING**: Performance annotations
- **COLOR**: Visual highlighting
- **NOTE**: Additional documentation

## 🎨 Color Coding

- **CYAN**: Start states, initialization
- **BLUE**: Core processes, short-term memory
- **RED**: Critical components, long-term memory, errors
- **GREEN**: Success states, completion
- **YELLOW**: Warnings, non-critical paths
- **ORANGE**: Automation, scheduled tasks
- **PURPLE**: Plugin system
- **PINK**: Event bus, communication

## 📊 Flowchart Statistics

| Flowchart | Lines | Components | States |
|-----------|-------|------------|--------|
| System Architecture | 200+ | 31 | - |
| User Query Flow | 150+ | 8 actors | 9 steps |
| Plugin System | 180+ | 9 plugins | 6 phases |
| Memory System | 250+ | 3 stores | Multiple |
| Automation System | 300+ | 4 types | 6 states |
| Initialization | 350+ | 9 actors | 7 phases |

## 🔄 Updating Flowcharts

1. Edit the `.fprg` file
2. Validate syntax:
   ```bash
   frogprog validate filename.fprg
   ```
3. Test rendering:
   ```bash
   frogprog view filename.fprg
   ```
4. Commit changes

## 🤝 Contributing

To add new flowcharts:
1. Create new `.fprg` file with number prefix
2. Follow naming convention: `##-description.fprg`
3. Use consistent syntax and color coding
4. Add documentation in this README
5. Validate before committing

## 📚 Related Documentation

- **Mermaid versions**: `../` (parent directory)
- **Complete docs**: `../../README.md`
- **Test suite**: `../../tests/jarvis-tests.fprg`

## ⚡ Quick Reference

### System Flow
```
User → UI → App → Core → Skills → Plugins → Services
```

### Query Processing
```
Input → Memory → AI → Personality → Response → Learning
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
Routines → Daily/Weekly/Monthly recurring
Workflows → Sequential steps with conditions
Scheduled → One-time at specific datetime
Triggers → Conditional execution
```

### Initialization Phases
```
0-500ms   → Bootstrap (HTML/CSS/JS)
500-1500ms  → Core initialization
1500-2500ms → Plugin loading
2500-3500ms → Skills initialization
3500-4000ms → UI setup
4000-5000ms → Services check
5000ms+     → Ready!
```

## 🛠️ Troubleshooting

### FrogProG not installed?
```bash
# Check if available
which frogprog

# Install if available
npm install -g frogprog-runner
```

### Syntax errors?
```bash
# Validate syntax
frogprog validate filename.fprg

# Check line numbers in output
```

### Can't export to image?
```bash
# Install export dependencies
npm install -g puppeteer

# Then try again
frogprog export filename.fprg --format png
```

## 📖 Learn More

- [FrogProG Documentation](https://frogprog.org/docs)
- [FrogProG Syntax Guide](https://frogprog.org/syntax)
- [JARVIS Documentation](../../README.md)

## 💡 Tips

1. **View in order**: Start with 01, progress to 06
2. **Use colors**: Colors indicate component types and states
3. **Check timing**: Timing annotations show performance
4. **Follow paths**: Arrows show data and control flow
5. **Read notes**: Notes provide additional context

## ✅ Validation Checklist

- [ ] All flowcharts have valid syntax
- [ ] Color coding is consistent
- [ ] Timing information is accurate
- [ ] Component names match codebase
- [ ] Error paths are documented
- [ ] Examples are included
- [ ] Notes explain complex logic
- [ ] Statistics are up-to-date
