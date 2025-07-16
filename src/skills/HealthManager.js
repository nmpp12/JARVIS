@@ .. @@
+import { OfflineAI } from '../ai/OfflineAI.js';
+
 export class HealthManager {
     constructor() {
+        this.offlineAI = new OfflineAI();
         this.healthData = new Map();
@@ .. @@
     }

     async handleQuery(input, context = {}) {
+        // Use offline AI for intelligent responses
+        const aiResponse = this.offlineAI.generateResponse(input, 'health');
+        
+        // Enhanced with specific calculations if needed
+        const enhancedResponse = await this.enhanceWithCalculations(input, aiResponse);
+        
+        return {
+            text: enhancedResponse,
+            speak: false,
+            suggestions: this.offlineAI.getContextualSuggestions('health')
+        };
+    }
+
+    async enhanceWithCalculations(input, baseResponse) {
         const lowerInput = input.toLowerCase();
         
+        // Add specific calculations to AI response
         if (lowerInput.includes('bmi') || lowerInput.includes('weight')) {
-            return this.calculateBMI(input);
+            const calculation = this.calculateBMI(input);
+            return `${baseResponse}\n\n**BMI Calculation:**\n${calculation.text}`;
         }
         
         if (lowerInput.includes('calories') || lowerInput.includes('nutrition')) {
-            return this.calculateCalories(input);
+            const calculation = this.calculateCalories(input);
+            return `${baseResponse}\n\n**Calorie Calculation:**\n${calculation.text}`;
         }
         
-        if (lowerInput.includes('workout') || lowerInput.includes('exercise')) {
-            return this.createWorkoutPlan(input);
-        }
-        
-        if (lowerInput.includes('sleep') || lowerInput.includes('rest')) {
-            return this.optimizeSleep(input);
-        }
-        
-        if (lowerInput.includes('stress') || lowerInput.includes('mental')) {
-            return this.manageStress(input);
-        }
-        
-        return {
-            text: `I can help you with comprehensive health and wellness:
-
-**Nutrition & Diet**
-- Personalized meal planning
-- Macro and micronutrient analysis
-- Weight management strategies
-- Dietary restriction accommodations
-
-**Fitness & Exercise**
-- Custom workout routines
-- Progressive training programs
-- Injury prevention strategies
-- Performance optimization
-
-**Mental Health & Wellness**
-- Stress management techniques
-- Mindfulness and meditation guidance
-- Work-life balance strategies
-- Sleep optimization
-
-**Preventive Health**
-- Health screening schedules
-- Supplement recommendations
-- Lifestyle modification plans
-- Risk factor assessments
-
-**Health Monitoring**
-- Vital sign tracking
-- Symptom analysis
-- Health goal setting
-- Progress monitoring
-
-What aspect of your health would you like to focus on?`,
-            speak: false
-        };
+        return baseResponse;
     }