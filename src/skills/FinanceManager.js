@@ .. @@
+import { OfflineAI } from '../ai/OfflineAI.js';
+
 export class FinanceManager {
     constructor() {
+        this.offlineAI = new OfflineAI();
         this.portfolioData = new Map();
@@ .. @@
     }

     async handleQuery(input, context = {}) {
+        // Use offline AI for intelligent responses
+        const aiResponse = this.offlineAI.generateResponse(input, 'finance');
+        
+        // Enhanced with specific calculations if needed
+        const enhancedResponse = await this.enhanceWithCalculations(input, aiResponse);
+        
+        return {
+            text: enhancedResponse,
+            speak: false,
+            suggestions: this.offlineAI.getContextualSuggestions('finance')
+        };
+    }
+
+    async enhanceWithCalculations(input, baseResponse) {
         const lowerInput = input.toLowerCase();
         
+        // Add specific calculations to AI response
         if (lowerInput.includes('compound interest') || lowerInput.includes('investment growth')) {
-            return this.calculateCompoundInterest(input);
+            const calculation = this.calculateCompoundInterest(input);
+            return `${baseResponse}\n\n**Calculation Example:**\n${calculation.text}`;
         }
         
         if (lowerInput.includes('retirement') || lowerInput.includes('401k')) {
-            return this.planRetirement(input);
+            const planning = this.planRetirement(input);
+            return `${baseResponse}\n\n**Retirement Calculation:**\n${planning.text}`;
         }
         
-        if (lowerInput.includes('budget') || lowerInput.includes('expense')) {
-            return this.createBudget(input);
-        }
-        
-        if (lowerInput.includes('debt') || lowerInput.includes('payoff')) {
-            return this.analyzeDebt(input);
-        }
-        
-        if (lowerInput.includes('invest') || lowerInput.includes('portfolio')) {
-            return this.analyzeInvestment(input);
-        }
-        
-        return {
-            text: `I can help you with comprehensive financial planning:
-
-**Investment Analysis**
-- Portfolio optimization and diversification
-- Risk assessment and asset allocation
-- Market analysis and timing strategies
-- Tax-efficient investing
-
-**Financial Planning**
-- Retirement planning and 401(k) optimization
-- Emergency fund strategies
-- Insurance needs analysis
-- Estate planning basics
-
-**Budgeting & Debt Management**
-- Personal budgeting systems
-- Debt consolidation strategies
-- Credit score improvement
-- Cash flow optimization
-
-**Advanced Strategies**
-- Tax planning and optimization
-- Real estate investment analysis
-- Business financial planning
-- Wealth preservation techniques
-
-What specific financial goal would you like to work on?`,
-            speak: false
-        };
+        return baseResponse;
     }