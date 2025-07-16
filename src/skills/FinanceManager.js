import { OfflineAI } from '../ai/OfflineAI.js';

export class FinanceManager {
    constructor() {
        this.offlineAI = new OfflineAI();
        this.portfolioData = new Map();
    }

    async handleQuery(input, context = {}) {
        // Use offline AI for intelligent responses
        const aiResponse = this.offlineAI.generateResponse(input, 'finance');
        
        // Enhanced with specific calculations if needed
        const enhancedResponse = await this.enhanceWithCalculations(input, aiResponse);
        
        return {
            text: enhancedResponse,
            speak: false,
            suggestions: this.offlineAI.getContextualSuggestions('finance')
        };
    }

    async enhanceWithCalculations(input, baseResponse) {
        const lowerInput = input.toLowerCase();
        
        // Add specific calculations to AI response
        if (lowerInput.includes('compound interest') || lowerInput.includes('investment growth')) {
            const calculation = this.calculateCompoundInterest(input);
            return `${baseResponse}\n\n**Calculation Example:**\n${calculation.text}`;
        }
        
        if (lowerInput.includes('retirement') || lowerInput.includes('401k')) {
            const planning = this.planRetirement(input);
            return `${baseResponse}\n\n**Retirement Calculation:**\n${planning.text}`;
        }
        
        return baseResponse;
    }
}