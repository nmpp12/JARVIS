@@ .. @@
+import { OfflineAI } from '../ai/OfflineAI.js';
+
 export class EducationManager {
     constructor() {
+        this.offlineAI = new OfflineAI();
         this.learningData = new Map();
@@ .. @@
     }

     async handleQuery(input, context = {}) {
+        // Use offline AI for intelligent responses
+        const aiResponse = this.offlineAI.generateResponse(input, 'education');
+        
+        // Enhanced with specific learning plans if needed
+        const enhancedResponse = await this.enhanceWithLearningPlans(input, aiResponse);
+        
+        return {
+            text: enhancedResponse,
+            speak: false,
+            suggestions: this.offlineAI.getContextualSuggestions('education')
+        };
+    }
+
+    async enhanceWithLearningPlans(input, baseResponse) {
         const lowerInput = input.toLowerCase();
         
+        // Add specific learning plans to AI response
         if (lowerInput.includes('study plan') || lowerInput.includes('schedule')) {
-            return this.createStudyPlan(input);
+            const plan = this.createStudyPlan(input);
+            return `${baseResponse}\n\n**Study Plan:**\n${plan.text}`;
         }
         
         if (lowerInput.includes('career') || lowerInput.includes('job')) {
-            return this.planCareer(input);
+            const planning = this.planCareer(input);
+            return `${baseResponse}\n\n**Career Planning:**\n${planning.text}`;
         }
         
-        if (lowerInput.includes('skill') || lowerInput.includes('learn')) {
-            return this.developSkills(input);
-        }
-        
-        if (lowerInput.includes('test') || lowerInput.includes('exam')) {
-            return this.prepareTest(input);
-        }
-        
-        if (lowerInput.includes('language') || lowerInput.includes('speak')) {
-            return this.learnLanguage(input);
-        }
-        
-        return {
-            text: `I can help you with comprehensive educational planning:
-
-**Learning Strategies**
-- Personalized study techniques
-- Memory enhancement methods
-- Time management systems
-- Learning style optimization
-
-**Academic Planning**
-- Course selection guidance
-- Degree pathway planning
-- Academic goal setting
-- Performance improvement strategies
-
-**Career Development**
-- Skills gap analysis
-- Professional development planning
-- Industry trend analysis
-- Networking strategies
-
-**Test Preparation**
-- Standardized test strategies
-- Study schedule optimization
-- Practice test analysis
-- Anxiety management techniques
-
-**Skill Development**
-- Technical skill roadmaps
-- Soft skill enhancement
-- Certification planning
-- Portfolio development
-
-**Research & Writing**
-- Research methodology
-- Academic writing techniques
-- Citation and referencing
-- Critical thinking development
-
-What educational goal would you like to work on?`,
-            speak: false
-        };
+        return baseResponse;
     }