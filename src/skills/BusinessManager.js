import { OfflineAI } from '../ai/OfflineAI.js';

export class BusinessManager {
    constructor() {
        this.offlineAI = new OfflineAI();
        this.businessData = new Map();
    }

    async handleQuery(input, context = {}) {
        // Use offline AI for intelligent responses
        const aiResponse = this.offlineAI.generateResponse(input, 'business');
        
        // Enhanced with specific business analysis if needed
        const enhancedResponse = await this.enhanceWithBusinessAnalysis(input, aiResponse);
        
        return {
            text: enhancedResponse,
            speak: false,
            suggestions: this.offlineAI.getContextualSuggestions('business')
        };
    }

    async enhanceWithBusinessAnalysis(input, baseResponse) {
        const lowerInput = input.toLowerCase();
        
        // Add specific business analysis to AI response
        if (lowerInput.includes('business plan') || lowerInput.includes('startup')) {
            const plan = this.createBusinessPlan(input);
            return `${baseResponse}\n\n**Business Plan Framework:**\n${plan.text}`;
        }
        
        if (lowerInput.includes('market') || lowerInput.includes('competition')) {
            const analysis = this.analyzeMarket(input);
            return `${baseResponse}\n\n**Market Analysis:**\n${analysis.text}`;
        }
        
        return baseResponse;
    }
}