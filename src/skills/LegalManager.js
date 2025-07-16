import { OfflineAI } from '../ai/OfflineAI.js';

export class LegalManager {
    constructor() {
        this.offlineAI = new OfflineAI();
        this.legalData = new Map();
    }

    async handleQuery(input, context = {}) {
        // Use offline AI for intelligent responses
        const aiResponse = this.offlineAI.generateResponse(input, 'legal');
        
        // Enhanced with specific legal guidance if needed
        const enhancedResponse = await this.enhanceWithLegalGuidance(input, aiResponse);
        
        return {
            text: enhancedResponse,
            speak: false,
            suggestions: this.offlineAI.getContextualSuggestions('legal')
        };
    }

    async enhanceWithLegalGuidance(input, baseResponse) {
        const lowerInput = input.toLowerCase();
        
        // Add specific legal guidance to AI response
        if (lowerInput.includes('contract') || lowerInput.includes('agreement')) {
            const analysis = this.analyzeContract(input);
            return `${baseResponse}\n\n**Contract Analysis:**\n${analysis.text}`;
        }
        
        if (lowerInput.includes('business formation') || lowerInput.includes('llc')) {
            const guidance = this.guideBusinessFormation(input);
            return `${baseResponse}\n\n**Formation Guidance:**\n${guidance.text}`;
        }
        
        if (lowerInput.includes('intellectual property') || lowerInput.includes('copyright')) {
            return this.protectIP(input);
        }
        
        if (lowerInput.includes('employment') || lowerInput.includes('workplace')) {
            return this.handleEmployment(input);
        }
        
        if (lowerInput.includes('compliance') || lowerInput.includes('regulation')) {
            return this.ensureCompliance(input);
        }
        
        return baseResponse;
    }
}