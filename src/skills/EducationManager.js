import { OfflineAI } from '../ai/OfflineAI.js';

export class EducationManager {
    constructor() {
        this.offlineAI = new OfflineAI();
        this.learningData = new Map();
    }

    async handleQuery(input, context = {}) {
        // Use offline AI for intelligent responses
        const aiResponse = this.offlineAI.generateResponse(input, 'education');
        
        // Enhanced with specific learning plans if needed
        const enhancedResponse = await this.enhanceWithLearningPlans(input, aiResponse);
        
        return {
            text: enhancedResponse,
            speak: false,
            suggestions: this.offlineAI.getContextualSuggestions('education')
        };
    }

    async enhanceWithLearningPlans(input, baseResponse) {
        const lowerInput = input.toLowerCase();
        
        // Add specific learning plans to AI response
        if (lowerInput.includes('study plan') || lowerInput.includes('schedule')) {
            const plan = this.createStudyPlan(input);
            return `${baseResponse}\n\n**Study Plan:**\n${plan.text}`;
        }
        
        if (lowerInput.includes('career') || lowerInput.includes('job')) {
            const planning = this.planCareer(input);
            return `${baseResponse}\n\n**Career Planning:**\n${planning.text}`;
        }
        
        return baseResponse;
    }
}