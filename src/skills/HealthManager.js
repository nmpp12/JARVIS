import { OfflineAI } from '../ai/OfflineAI.js';

export class HealthManager {
    constructor() {
        this.offlineAI = new OfflineAI();
        this.healthData = new Map();
    }

    async handleQuery(input, context = {}) {
        // Use offline AI for intelligent responses
        const aiResponse = this.offlineAI.generateResponse(input, 'health');
        
        // Enhanced with specific calculations if needed
        const enhancedResponse = await this.enhanceWithCalculations(input, aiResponse);
        
        return {
            text: enhancedResponse,
            speak: false,
            suggestions: this.offlineAI.getContextualSuggestions('health')
        };
    }

    async enhanceWithCalculations(input, baseResponse) {
        const lowerInput = input.toLowerCase();
        
        // Add specific calculations to AI response
        if (lowerInput.includes('bmi') || lowerInput.includes('weight')) {
            const calculation = this.calculateBMI(input);
            return `${baseResponse}\n\n**BMI Calculation:**\n${calculation.text}`;
        }
        
        if (lowerInput.includes('calories') || lowerInput.includes('nutrition')) {
            const calculation = this.calculateCalories(input);
            return `${baseResponse}\n\n**Calorie Calculation:**\n${calculation.text}`;
        }
        
        return baseResponse;
    }
}