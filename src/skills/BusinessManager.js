@@ .. @@
+import { OfflineAI } from '../ai/OfflineAI.js';
+
 export class BusinessManager {
     constructor() {
+        this.offlineAI = new OfflineAI();
         this.businessData = new Map();
@@ .. @@
     }

     async handleQuery(input, context = {}) {
+        // Use offline AI for intelligent responses
+        const aiResponse = this.offlineAI.generateResponse(input, 'business');
+        
+        // Enhanced with specific business analysis if needed
+        const enhancedResponse = await this.enhanceWithBusinessAnalysis(input, aiResponse);
+        
+        return {
+            text: enhancedResponse,
+            speak: false,
+            suggestions: this.offlineAI.getContextualSuggestions('business')
+        };
+    }
+
+    async enhanceWithBusinessAnalysis(input, baseResponse) {
         const lowerInput = input.toLowerCase();
         
+        // Add specific business analysis to AI response
         if (lowerInput.includes('business plan') || lowerInput.includes('startup')) {
-            return this.createBusinessPlan(input);
+            const plan = this.createBusinessPlan(input);
+            return `${baseResponse}\n\n**Business Plan Framework:**\n${plan.text}`;
         }
         
         if (lowerInput.includes('market') || lowerInput.includes('competition')) {
-            return this.analyzeMarket(input);
+            const analysis = this.analyzeMarket(input);
+            return `${baseResponse}\n\n**Market Analysis:**\n${analysis.text}`;
         }
         
-        if (lowerInput.includes('marketing') || lowerInput.includes('promotion')) {
-            return this.developMarketing(input);
-        }
-        
-        if (lowerInput.includes('team') || lowerInput.includes('hire')) {
-            return this.buildTeam(input);
-        }
-        
-        if (lowerInput.includes('finance') || lowerInput.includes('funding')) {
-            return this.planFinance(input);
-        }
-        
-        return {
-            text: `I can help you with comprehensive business development:
-
-**Business Strategy**
-- Business model development
-- Competitive analysis
-- Market positioning
-- Growth strategy planning
-
-**Marketing & Sales**
-- Marketing strategy development
-- Customer acquisition planning
-- Sales funnel optimization
-- Brand development
-
-**Operations Management**
-- Process optimization
-- Supply chain management
-- Quality control systems
-- Performance metrics
-
-**Financial Management**
-- Financial planning and analysis
-- Funding strategy
-- Cash flow management
-- Investment analysis
-
-**Human Resources**
-- Team building strategies
-- Hiring and recruitment
-- Performance management
-- Organizational development
-
-**Digital Transformation**
-- Technology integration
-- Digital marketing strategies
-- E-commerce development
-- Data analytics implementation
-
-What aspect of your business would you like to develop?`,
-            speak: false
-        };
+        return baseResponse;
     }