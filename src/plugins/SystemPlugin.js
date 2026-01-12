/**
 * System Plugin
 * Provides system information and controls
 */

import BasePlugin from './BasePlugin.js';

export class SystemPlugin extends BasePlugin {
    constructor() {
        super('system', 'Provides system information and controls');
    }

    async initialize() {
        await super.initialize();
        this.log('System plugin ready');
        return true;
    }

    /**
     * Validate parameters
     */
    validate(params) {
        return params.action !== undefined;
    }

    /**
     * Execute system operation
     */
    async execute(params) {
        try {
            const action = params.action;

            switch (action) {
                case 'info':
                    return this.getSystemInfo();
                case 'status':
                    return this.getStatus();
                case 'performance':
                    return this.getPerformance();
                case 'storage':
                    return this.getStorageInfo();
                case 'network':
                    return this.getNetworkInfo();
                case 'battery':
                    return this.getBatteryInfo();
                default:
                    return this.getSystemInfo();
            }
        } catch (error) {
            return this.handleError(error, 'executing system operation');
        }
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        const info = [
            '💻 System Information:\n',
            `Platform: ${navigator.platform}`,
            `User Agent: ${navigator.userAgent}`,
            `Language: ${navigator.language}`,
            `Online: ${navigator.onLine ? 'Yes' : 'No'}`,
            `Cookies Enabled: ${navigator.cookieEnabled ? 'Yes' : 'No'}`,
            `Screen Resolution: ${window.screen.width}x${window.screen.height}`,
            `Color Depth: ${window.screen.colorDepth}-bit`,
            `Time Zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
        ];

        return info.join('\n');
    }

    /**
     * Get system status
     */
    getStatus() {
        const status = [
            '🟢 System Status:\n',
            `✅ JARVIS: Running`,
            `✅ Browser: ${this.getBrowserName()}`,
            `${navigator.onLine ? '✅' : '❌'} Network: ${navigator.onLine ? 'Connected' : 'Offline'}`,
            `✅ LocalStorage: ${this.checkLocalStorage() ? 'Available' : 'Unavailable'}`,
            `✅ WebSpeech API: ${this.checkWebSpeech() ? 'Available' : 'Unavailable'}`
        ];

        return status.join('\n');
    }

    /**
     * Get performance metrics
     */
    getPerformance() {
        if (!window.performance) {
            return '❌ Performance API not available.';
        }

        const perf = window.performance;
        const memory = (perf as any).memory;

        const metrics = [
            '⚡ Performance Metrics:\n',
            `Page Load Time: ${Math.round(perf.timing.loadEventEnd - perf.timing.navigationStart)}ms`
        ];

        if (memory) {
            metrics.push(
                `\nMemory Usage:`,
                `  Used: ${this.formatBytes(memory.usedJSHeapSize)}`,
                `  Total: ${this.formatBytes(memory.totalJSHeapSize)}`,
                `  Limit: ${this.formatBytes(memory.jsHeapSizeLimit)}`
            );
        }

        return metrics.join('\n');
    }

    /**
     * Get storage information
     */
    async getStorageInfo() {
        const info = ['💾 Storage Information:\n'];

        try {
            // LocalStorage
            const used = new Blob(Object.values(localStorage)).size;
            info.push(
                `LocalStorage:`,
                `  Used: ${this.formatBytes(used)}`,
                `  Available: ~5-10 MB (browser dependent)`
            );

            // Storage API (if available)
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                info.push(
                    `\nStorage Quota:`,
                    `  Used: ${this.formatBytes(estimate.usage || 0)}`,
                    `  Available: ${this.formatBytes(estimate.quota || 0)}`
                );
            }
        } catch (error) {
            info.push('Unable to retrieve storage information');
        }

        return info.join('\n');
    }

    /**
     * Get network information
     */
    getNetworkInfo() {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        
        const info = [
            '🌐 Network Information:\n',
            `Status: ${navigator.onLine ? 'Online' : 'Offline'}`
        ];

        if (connection) {
            info.push(
                `Type: ${connection.effectiveType || 'Unknown'}`,
                `Downlink: ${connection.downlink || 'N/A'} Mbps`,
                `RTT: ${connection.rtt || 'N/A'} ms`,
                `Data Saver: ${connection.saveData ? 'Enabled' : 'Disabled'}`
            );
        } else {
            info.push('Detailed network information not available');
        }

        return info.join('\n');
    }

    /**
     * Get battery information
     */
    async getBatteryInfo() {
        try {
            if ('getBattery' in navigator) {
                const battery = await (navigator as any).getBattery();
                
                return [
                    '🔋 Battery Information:\n',
                    `Level: ${Math.round(battery.level * 100)}%`,
                    `Charging: ${battery.charging ? 'Yes' : 'No'}`,
                    battery.chargingTime !== Infinity ? `Time to Full: ${Math.round(battery.chargingTime / 60)} minutes` : '',
                    battery.dischargingTime !== Infinity ? `Time Remaining: ${Math.round(battery.dischargingTime / 60)} minutes` : ''
                ].filter(Boolean).join('\n');
            }
        } catch (error) {
            return '❌ Battery API not available.';
        }

        return '❌ Battery information not available.';
    }

    /**
     * Get browser name
     */
    getBrowserName() {
        const ua = navigator.userAgent;
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('Opera')) return 'Opera';
        return 'Unknown';
    }

    /**
     * Check LocalStorage availability
     */
    checkLocalStorage() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check WebSpeech API availability
     */
    checkWebSpeech() {
        return 'speechSynthesis' in window && 'SpeechRecognition' in window;
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

export default SystemPlugin;