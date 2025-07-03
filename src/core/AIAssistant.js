import { OSBuilder } from '../os/OSBuilder.js';

export class AIAssistant {
    constructor(ollamaClient, selfImprovement) {
        this.ollama = ollamaClient;
        this.selfImprovement = selfImprovement;
        this.osBuilder = new OSBuilder();
        this.conversationHistory = [];
        this.capabilities = [
            'general_conversation',
            'code_analysis',
            'code_generation',
            'self_improvement',
            'system_commands',
            'file_operations',
            'os_development',
            'kernel_development',
            'bootloader_creation',
            'driver_development',
            'package_management'
        ];
    }

    async processCommand(input, context = {}) {
        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: input,
            timestamp: context.timestamp || new Date().toISOString()
        });

        // Analyze command intent
        const intent = await this.analyzeIntent(input);
        
        let response;
        
        switch (intent.type) {
            case 'os_development':
                response = await this.handleOSDevelopment(input, intent);
                break;
            case 'self_improvement':
                response = await this.handleSelfImprovement(input, intent);
                break;
            case 'code_analysis':
                response = await this.handleCodeAnalysis(input, intent);
                break;
            case 'system_command':
                response = await this.handleSystemCommand(input, intent);
                break;
            default:
                response = await this.handleGeneralQuery(input, intent);
        }

        // Add response to history
        this.conversationHistory.push({
            role: 'assistant',
            content: response.text,
            timestamp: new Date().toISOString()
        });

        // Trigger self-improvement if enabled
        if (this.selfImprovement.isEnabled()) {
            await this.selfImprovement.analyzeInteraction(input, response);
        }

        return response;
    }

    async analyzeIntent(input) {
        const osKeywords = [
            'operating system', 'os', 'kernel', 'bootloader', 'filesystem',
            'device driver', 'memory management', 'scheduler', 'init system',
            'package manager', 'linux', 'ubuntu', 'custom os', 'build os',
            'create os', 'develop os', 'make os'
        ];

        const lowerInput = input.toLowerCase();
        
        if (osKeywords.some(keyword => lowerInput.includes(keyword))) {
            return { 
                type: 'os_development', 
                confidence: 0.9, 
                parameters: this.extractOSParameters(input) 
            };
        }

        // Fallback to Ollama for intent analysis if available
        if (this.ollama.isConnected) {
            const prompt = `Analyze the following user input and determine the intent. Respond with a JSON object containing:
            - type: one of [general, self_improvement, code_analysis, system_command, file_operation, os_development]
            - confidence: 0-1
            - parameters: relevant extracted parameters
            
            User input: "${input}"`;

            try {
                const result = await this.ollama.generate(prompt);
                return JSON.parse(result);
            } catch (error) {
                console.error('Intent analysis failed:', error);
            }
        }

        return { type: 'general', confidence: 0.5, parameters: {} };
    }

    extractOSParameters(input) {
        const params = {};
        const lowerInput = input.toLowerCase();

        // Extract OS type
        if (lowerInput.includes('from scratch') || lowerInput.includes('custom')) {
            params.type = 'custom';
        } else if (lowerInput.includes('linux')) {
            params.type = 'linux-based';
        } else if (lowerInput.includes('ubuntu')) {
            params.type = 'ubuntu-based';
        }

        // Extract architecture
        if (lowerInput.includes('x86_64') || lowerInput.includes('64-bit')) {
            params.architecture = 'x86_64';
        } else if (lowerInput.includes('arm64') || lowerInput.includes('aarch64')) {
            params.architecture = 'arm64';
        } else if (lowerInput.includes('i386') || lowerInput.includes('32-bit')) {
            params.architecture = 'i386';
        }

        // Extract OS name
        const nameMatch = input.match(/(?:call|name|called)\s+(?:it\s+)?([A-Za-z][A-Za-z0-9]*)/i);
        if (nameMatch) {
            params.name = nameMatch[1];
        }

        return params;
    }

    async handleOSDevelopment(input, intent) {
        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('create') || lowerInput.includes('build') || lowerInput.includes('make')) {
            return await this.createOperatingSystem(input, intent.parameters);
        }

        if (lowerInput.includes('kernel')) {
            return await this.handleKernelDevelopment(input, intent.parameters);
        }

        if (lowerInput.includes('bootloader')) {
            return await this.handleBootloaderDevelopment(input, intent.parameters);
        }

        if (lowerInput.includes('driver')) {
            return await this.handleDriverDevelopment(input, intent.parameters);
        }

        if (lowerInput.includes('filesystem')) {
            return await this.handleFilesystemDevelopment(input, intent.parameters);
        }

        // General OS development guidance
        return {
            text: `I can help you with operating system development! Here's what I can assist with:

**OS Creation Options:**
- **Custom OS from scratch**: Complete control, built from ground up
- **Linux-based OS**: Customize existing Linux kernel and userspace
- **Ubuntu-based OS**: Create custom Ubuntu derivative

**Development Areas:**
- Bootloader development (GRUB, custom bootloaders)
- Kernel development (memory management, scheduling, interrupts)
- Device driver development (PCI, USB, storage, network)
- Filesystem implementation (VFS, ext2/3/4, custom filesystems)
- Package management systems
- Init systems and service management
- GUI frameworks and desktop environments

**Architecture Support:**
- x86_64 (64-bit Intel/AMD)
- ARM64 (AArch64)
- i386 (32-bit x86)

What specific aspect of OS development would you like to explore?`,
            speak: true
        };
    }

    async createOperatingSystem(input, parameters) {
        try {
            const config = {
                name: parameters.name || 'CustomOS',
                type: parameters.type || 'custom',
                architecture: parameters.architecture || 'x86_64',
                features: this.extractFeatures(input)
            };

            const buildPlan = await this.osBuilder.createOS(config);

            return {
                text: `I'll help you create ${config.name}, a ${config.type} operating system for ${config.architecture} architecture.

**Build Plan Generated:**

**Project Structure:**
- Bootloader: ${config.type === 'custom' ? 'Custom GRUB-compatible bootloader' : 'Standard bootloader'}
- Kernel: ${config.type === 'custom' ? 'Custom kernel with modern features' : 'Customized Linux kernel'}
- Filesystem: Virtual filesystem with multiple format support
- Drivers: Modular driver framework
- Userspace: Shell, utilities, and package manager

**Build Steps:**
${buildPlan.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

**Key Features:**
- Memory management with paging
- Preemptive multitasking
- Device driver framework
- Package management system
- Security features

The complete source code, build system, and documentation have been generated. You can start building immediately with:

\`\`\`bash
make install-deps  # Install build dependencies
make all          # Build the kernel
make iso          # Create bootable ISO
make test         # Test in QEMU emulator
\`\`\`

Would you like me to explain any specific component or help you customize particular features?`,
                osProject: buildPlan,
                speak: true
            };
        } catch (error) {
            return {
                text: `Error creating OS project: ${error.message}. Please provide more specific requirements.`,
                speak: true
            };
        }
    }

    async handleKernelDevelopment(input, parameters) {
        return {
            text: `I'll help you with kernel development! Here are the key areas:

**Kernel Architecture:**
- **Boot Process**: Initialize hardware, set up memory management
- **Memory Management**: Virtual memory, paging, heap allocation
- **Process Management**: Scheduling, context switching, IPC
- **Interrupt Handling**: Hardware interrupts, system calls
- **Device Management**: Driver interface, device tree

**Core Components:**
- **Scheduler**: Preemptive, priority-based task scheduling
- **Memory Manager**: Page tables, virtual address spaces
- **VFS**: Virtual filesystem abstraction layer
- **Network Stack**: TCP/IP implementation
- **Security**: Access controls, capabilities

**Development Tools:**
- Cross-compiler toolchain (GCC)
- Debugger (GDB with QEMU)
- Emulator (QEMU, Bochs)
- Build system (Make, CMake)

**Testing Strategy:**
- Unit tests for kernel components
- Integration testing with QEMU
- Hardware testing on real machines
- Stress testing and benchmarks

What specific kernel component would you like to develop or learn about?`,
            speak: true
        };
    }

    async handleBootloaderDevelopment(input, parameters) {
        return {
            text: `I'll guide you through bootloader development:

**Bootloader Stages:**

**Stage 1 (Boot Sector):**
- 512 bytes in MBR
- Load Stage 2 from disk
- Switch to protected mode
- Basic hardware initialization

**Stage 2 (Extended Bootloader):**
- Load kernel from filesystem
- Set up memory map
- Initialize graphics mode
- Pass control to kernel

**Modern Bootloaders:**
- **GRUB**: Industry standard, multiboot support
- **UEFI**: Modern firmware interface
- **Custom**: Full control, specific requirements

**Key Features:**
- Filesystem support (FAT32, ext2/3/4)
- Multiboot compliance
- Configuration files
- Recovery options
- Secure boot support

**Development Process:**
1. Write assembly boot sector
2. Implement disk I/O routines
3. Add filesystem drivers
4. Create kernel loader
5. Test with emulators

The generated bootloader code includes:
- Real mode initialization
- Protected mode setup
- Kernel loading routines
- Error handling
- GRUB compatibility

Would you like me to explain any specific bootloader component?`,
            speak: true
        };
    }

    async handleDriverDevelopment(input, parameters) {
        return {
            text: `I'll help you with device driver development:

**Driver Framework:**
- **Registration**: Dynamic driver loading/unloading
- **Device Discovery**: PCI enumeration, device tree
- **Resource Management**: IRQ, DMA, memory mapping
- **Power Management**: Suspend/resume, power states

**Driver Types:**
- **Character Devices**: Serial ports, keyboards, mice
- **Block Devices**: Hard drives, SSDs, optical drives
- **Network Devices**: Ethernet, WiFi, Bluetooth
- **Graphics Devices**: GPU drivers, framebuffers
- **USB Devices**: Host controllers, device drivers

**Development Process:**
1. Study hardware specifications
2. Implement device detection
3. Create I/O routines
4. Add interrupt handlers
5. Implement power management
6. Test with real hardware

**Driver Interface:**
- Standard entry points (init, cleanup, read, write)
- Interrupt service routines
- DMA handling
- Error recovery

**Testing Tools:**
- Hardware emulation (QEMU)
- Logic analyzers
- Oscilloscopes
- Protocol analyzers

The generated driver framework provides:
- Device registration system
- Standard driver interface
- Resource management
- Example drivers (VGA, keyboard, ATA)

What type of device driver would you like to develop?`,
            speak: true
        };
    }

    async handleFilesystemDevelopment(input, parameters) {
        return {
            text: `I'll guide you through filesystem development:

**Filesystem Architecture:**
- **VFS Layer**: Virtual filesystem abstraction
- **Inode Management**: File metadata and indexing
- **Block Allocation**: Free space management
- **Directory Structure**: File organization
- **Journaling**: Crash recovery and consistency

**Filesystem Types:**
- **ext2/3/4**: Linux standard filesystems
- **FAT32**: Simple, widely compatible
- **NTFS**: Windows filesystem
- **Btrfs**: Modern copy-on-write filesystem
- **Custom**: Specialized requirements

**Key Components:**
- **Superblock**: Filesystem metadata
- **Inode Table**: File information storage
- **Block Groups**: Efficient space allocation
- **Directory Entries**: File name mapping
- **Journal**: Transaction logging

**Implementation Steps:**
1. Design on-disk format
2. Implement superblock operations
3. Create inode management
4. Add directory operations
5. Implement file I/O
6. Add journaling support

**Features to Consider:**
- Compression
- Encryption
- Snapshots
- Deduplication
- Extended attributes

The generated VFS provides:
- Filesystem registration
- Standard file operations
- Mount point management
- Cache management

Would you like to implement a specific filesystem or learn about VFS internals?`,
            speak: true
        };
    }

    extractFeatures(input) {
        const features = [];
        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('gui') || lowerInput.includes('desktop')) {
            features.push('gui');
        }
        if (lowerInput.includes('network')) {
            features.push('networking');
        }
        if (lowerInput.includes('security')) {
            features.push('security');
        }
        if (lowerInput.includes('real-time') || lowerInput.includes('realtime')) {
            features.push('realtime');
        }
        if (lowerInput.includes('embedded')) {
            features.push('embedded');
        }

        return features;
    }

    async handleSelfImprovement(input, intent) {
        if (input.toLowerCase().includes('improve yourself') || 
            input.toLowerCase().includes('analyze your code')) {
            
            const improvements = await this.selfImprovement.analyzeCurrentCode();
            
            return {
                text: `I've analyzed my code and found ${improvements.length} potential improvements. Would you like me to implement them?`,
                codeImprovement: improvements,
                speak: true
            };
        }

        if (input.toLowerCase().includes('implement improvements')) {
            const result = await this.selfImprovement.implementImprovements();
            
            return {
                text: `I've implemented ${result.implemented} improvements. ${result.summary}`,
                speak: true
            };
        }

        return await this.handleGeneralQuery(input, intent);
    }

    async handleCodeAnalysis(input, intent) {
        const prompt = `As an advanced AI assistant with OS development expertise, analyze this code-related request and provide a comprehensive response:

        User request: "${input}"
        
        Provide detailed analysis, suggestions, and if applicable, code examples. Focus on operating system development, kernel programming, device drivers, or system-level programming if relevant.`;

        if (this.ollama.isConnected) {
            const result = await this.ollama.generate(prompt);
            return {
                text: result,
                speak: false
            };
        } else {
            return {
                text: "I can help with code analysis, but I need the Ollama service to be running for detailed analysis. Please ensure Ollama is connected.",
                speak: true
            };
        }
    }

    async handleSystemCommand(input, intent) {
        // Handle system-level commands
        if (input.toLowerCase().includes('status')) {
            const status = await this.getSystemStatus();
            return {
                text: `System Status:\n${status}`,
                speak: true
            };
        }

        return await this.handleGeneralQuery(input, intent);
    }

    async handleGeneralQuery(input, intent) {
        if (!this.ollama.isConnected) {
            return {
                text: "I'm currently running in offline mode. To enable full AI capabilities, please ensure Ollama is running and connected. I can still help with OS development guidance and code generation.",
                speak: true
            };
        }

        const context = this.conversationHistory.slice(-5); // Last 5 messages for context
        
        const prompt = `You are JARVIS, an advanced AI assistant specializing in operating system development, kernel programming, and system-level software engineering. Respond to the user's query in a helpful and intelligent manner.

        Conversation context:
        ${context.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
        
        Current query: "${input}"
        
        Provide a comprehensive and helpful response. If the query relates to OS development, kernel programming, device drivers, or system programming, provide detailed technical guidance.`;

        const result = await this.ollama.generate(prompt);
        
        return {
            text: result,
            speak: intent.confidence > 0.7
        };
    }

    async getSystemStatus() {
        const modelInfo = this.ollama.isConnected ? await this.ollama.getCurrentModel() : { name: 'Offline' };
        const improvementStatus = this.selfImprovement.getStatus();
        
        return `Model: ${modelInfo.name}
Self-Improvement: ${improvementStatus.enabled ? 'Enabled' : 'Disabled'}
Conversation History: ${this.conversationHistory.length} messages
OS Development: Available
Capabilities: ${this.capabilities.join(', ')}`;
    }
}