@@ .. @@
+import { OfflineAI } from '../ai/OfflineAI.js';
+
 export class LegalManager {
     constructor() {
+        this.offlineAI = new OfflineAI();
         this.legalData = new Map();
@@ .. @@
     }

     async handleQuery(input, context = {}) {
+        // Use offline AI for intelligent responses
+        const aiResponse = this.offlineAI.generateResponse(input, 'legal');
+        
+        // Enhanced with specific legal guidance if needed
+        const enhancedResponse = await this.enhanceWithLegalGuidance(input, aiResponse);
+        
+        return {
+            text: enhancedResponse,
+            speak: false,
+            suggestions: this.offlineAI.getContextualSuggestions('legal')
+        };
+    }
+
+    async enhanceWithLegalGuidance(input, baseResponse) {
         const lowerInput = input.toLowerCase();
         
+        // Add specific legal guidance to AI response
         if (lowerInput.includes('contract') || lowerInput.includes('agreement')) {
-            return this.analyzeContract(input);
+            const analysis = this.analyzeContract(input);
+            return `${baseResponse}\n\n**Contract Analysis:**\n${analysis.text}`;
         }
         
         if (lowerInput.includes('business formation') || lowerInput.includes('llc')) {
-            return this.guideBusinessFormation(input);
+            const guidance = this.guideBusinessFormation(input);
+            return `${baseResponse}\n\n**Formation Guidance:**\n${guidance.text}`;
         }
         
-        if (lowerInput.includes('intellectual property') || lowerInput.includes('copyright')) {
-            return this.protectIP(input);
-        }
-        
-        if (lowerInput.includes('employment') || lowerInput.includes('workplace')) {
-            return this.handleEmployment(input);
-        }
-        
-        if (lowerInput.includes('compliance') || lowerInput.includes('regulation')) {
-            return this.ensureCompliance(input);
-        }
-        
-        return {
-            text: `I can help you with legal guidance and compliance:
-
-**Contract Law**
-- Contract analysis and review
-- Terms and conditions development
-- Agreement negotiation strategies
-- Breach of contract remedies
-
-**Business Formation**
-- Entity selection (LLC, Corp, Partnership)
-- Registration and filing requirements
-- Operating agreements
-- Corporate governance
-
-**Intellectual Property**
-- Copyright protection strategies
-- Trademark registration process
-- Patent application guidance
-- Trade secret protection
-
-**Employment Law**
-- Hiring best practices
-- Employee handbook development
-- Workplace policy creation
-- Termination procedures
-
-**Compliance & Risk Management**
-- Regulatory compliance assessment
-- Privacy law compliance (GDPR, CCPA)
-- Risk mitigation strategies
-- Legal audit procedures
-
-**Dispute Resolution**
-- Negotiation strategies
-- Mediation and arbitration
-- Litigation preparation
-- Settlement negotiations
-
-⚠️ **Important Disclaimer**: This information is for educational purposes only and does not constitute legal advice. Always consult with a qualified attorney for specific legal matters.
-
-What legal matter can I help you understand?`,
-            speak: false
-        };
+        return baseResponse;
     }