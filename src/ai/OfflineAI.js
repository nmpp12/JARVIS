// Offline AI Engine for JARVIS Skills
export class OfflineAI {
    constructor() {
        this.knowledgeBase = new Map();
        this.patterns = new Map();
        this.decisionTrees = new Map();
        this.contextMemory = [];
        this.initializeKnowledgeBase();
    }

    initializeKnowledgeBase() {
        // Finance Knowledge Base
        this.knowledgeBase.set('finance', {
            concepts: {
                'compound_interest': {
                    formula: 'A = P(1 + r/n)^(nt)',
                    explanation: 'Money grows exponentially over time',
                    examples: ['$1000 at 7% for 10 years = $1967']
                },
                'diversification': {
                    rule: '60/40 stocks/bonds for moderate risk',
                    explanation: 'Spread risk across asset classes',
                    examples: ['S&P 500 index funds, bond ETFs']
                },
                'emergency_fund': {
                    rule: '3-6 months of expenses in savings',
                    explanation: 'Financial safety net for unexpected events',
                    priority: 'high'
                }
            },
            strategies: {
                'retirement': ['401k max contribution', 'IRA contributions', 'target date funds'],
                'debt_payoff': ['avalanche method', 'snowball method', 'consolidation'],
                'budgeting': ['50/30/20 rule', 'zero-based budgeting', 'envelope method']
            }
        });

        // Health Knowledge Base
        this.knowledgeBase.set('health', {
            concepts: {
                'nutrition': {
                    macros: 'Protein: 0.8g/kg body weight, Carbs: 45-65% calories, Fat: 20-35%',
                    hydration: '8 glasses water daily, more if active',
                    timing: 'Eat every 3-4 hours, stop 3 hours before bed'
                },
                'exercise': {
                    cardio: '150 min moderate or 75 min vigorous weekly',
                    strength: '2-3 sessions per week, all major muscle groups',
                    recovery: '48 hours between training same muscle groups'
                },
                'sleep': {
                    duration: '7-9 hours for adults',
                    schedule: 'Consistent bedtime and wake time',
                    environment: 'Cool, dark, quiet room'
                }
            },
            assessments: {
                'bmi': (weight, height) => weight / (height * height),
                'target_heart_rate': (age) => ({ min: (220 - age) * 0.5, max: (220 - age) * 0.85 }),
                'daily_calories': (weight, height, age, gender, activity) => {
                    const bmr = gender === 'male' ? 
                        88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age) :
                        447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
                    return bmr * activity;
                }
            }
        });

        // Education Knowledge Base
        this.knowledgeBase.set('education', {
            concepts: {
                'learning_styles': {
                    visual: 'Charts, diagrams, mind maps, color coding',
                    auditory: 'Lectures, discussions, music, repetition',
                    kinesthetic: 'Hands-on activities, movement, practice'
                },
                'memory_techniques': {
                    spaced_repetition: 'Review at increasing intervals',
                    mnemonics: 'Memory aids and acronyms',
                    chunking: 'Break information into smaller pieces'
                },
                'study_methods': {
                    pomodoro: '25 min focused work, 5 min break',
                    active_recall: 'Test yourself without looking at notes',
                    feynman: 'Explain concepts in simple terms'
                }
            },
            frameworks: {
                'bloom_taxonomy': ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
                'learning_pyramid': ['Lecture: 5%', 'Reading: 10%', 'Practice: 75%', 'Teaching: 90%']
            }
        });

        // Business Knowledge Base
        this.knowledgeBase.set('business', {
            concepts: {
                'lean_startup': {
                    cycle: 'Build → Measure → Learn',
                    mvp: 'Minimum Viable Product with core features',
                    pivot: 'Change direction based on feedback'
                },
                'marketing_mix': {
                    product: 'What you sell',
                    price: 'What you charge',
                    place: 'Where you sell',
                    promotion: 'How you advertise'
                },
                'swot_analysis': {
                    internal: ['Strengths', 'Weaknesses'],
                    external: ['Opportunities', 'Threats']
                }
            },
            metrics: {
                'customer_acquisition_cost': 'Marketing spend / New customers',
                'lifetime_value': 'Average revenue per customer * Retention period',
                'churn_rate': 'Customers lost / Total customers'
            }
        });

        // Legal Knowledge Base
        this.knowledgeBase.set('legal', {
            concepts: {
                'contract_elements': {
                    offer: 'Proposal to enter agreement',
                    acceptance: 'Agreement to the offer',
                    consideration: 'Exchange of value',
                    capacity: 'Legal ability to contract'
                },
                'business_entities': {
                    llc: 'Limited liability, tax flexibility',
                    corporation: 'Separate legal entity, double taxation',
                    partnership: 'Shared ownership and liability'
                },
                'intellectual_property': {
                    copyright: 'Creative works, automatic protection',
                    trademark: 'Brand identifiers, requires registration',
                    patent: 'Inventions, 20-year protection'
                }
            },
            compliance: {
                'gdpr': 'EU data protection regulation',
                'ccpa': 'California consumer privacy act',
                'hipaa': 'Healthcare information privacy'
            }
        });

        this.initializePatterns();
        this.initializeDecisionTrees();
    }

    initializePatterns() {
        // Finance patterns
        this.patterns.set('finance', [
            { pattern: /budget|spending|expense/i, intent: 'budgeting' },
            { pattern: /invest|portfolio|stock|bond/i, intent: 'investing' },
            { pattern: /debt|loan|credit|pay.*off/i, intent: 'debt_management' },
            { pattern: /retire|401k|ira|pension/i, intent: 'retirement' },
            { pattern: /tax|deduction|write.*off/i, intent: 'tax_planning' },
            { pattern: /emergency.*fund|savings/i, intent: 'emergency_planning' }
        ]);

        // Health patterns
        this.patterns.set('health', [
            { pattern: /diet|nutrition|eat|food|meal/i, intent: 'nutrition' },
            { pattern: /exercise|workout|fitness|gym/i, intent: 'fitness' },
            { pattern: /sleep|tired|insomnia/i, intent: 'sleep' },
            { pattern: /stress|anxiety|mental.*health/i, intent: 'mental_health' },
            { pattern: /weight|lose|gain|bmi/i, intent: 'weight_management' },
            { pattern: /doctor|medical|symptom|health.*check/i, intent: 'medical' }
        ]);

        // Education patterns
        this.patterns.set('education', [
            { pattern: /study|learn|memorize|remember/i, intent: 'study_techniques' },
            { pattern: /test|exam|quiz|assessment/i, intent: 'test_preparation' },
            { pattern: /career|job|skill|professional/i, intent: 'career_development' },
            { pattern: /research|paper|thesis|academic/i, intent: 'research' },
            { pattern: /language|speak|fluent/i, intent: 'language_learning' },
            { pattern: /course|class|curriculum|syllabus/i, intent: 'course_planning' }
        ]);

        // Business patterns
        this.patterns.set('business', [
            { pattern: /startup|entrepreneur|business.*idea/i, intent: 'entrepreneurship' },
            { pattern: /market|customer|target.*audience/i, intent: 'marketing' },
            { pattern: /strategy|plan|goal|objective/i, intent: 'strategy' },
            { pattern: /team|hire|employee|staff/i, intent: 'human_resources' },
            { pattern: /finance|funding|investor|capital/i, intent: 'business_finance' },
            { pattern: /sale|sell|revenue|profit/i, intent: 'sales' }
        ]);

        // Legal patterns
        this.patterns.set('legal', [
            { pattern: /contract|agreement|terms/i, intent: 'contracts' },
            { pattern: /llc|corporation|business.*entity/i, intent: 'business_formation' },
            { pattern: /copyright|trademark|patent|ip/i, intent: 'intellectual_property' },
            { pattern: /employ|hire|fire|workplace/i, intent: 'employment_law' },
            { pattern: /privacy|data.*protection|gdpr/i, intent: 'privacy_law' },
            { pattern: /compliance|regulation|legal.*requirement/i, intent: 'compliance' }
        ]);
    }

    initializeDecisionTrees() {
        // Finance decision tree
        this.decisionTrees.set('finance', {
            budgeting: {
                question: 'What is your monthly income?',
                branches: {
                    low: { advice: 'Focus on essential expenses, use envelope method' },
                    medium: { advice: 'Try 50/30/20 rule: 50% needs, 30% wants, 20% savings' },
                    high: { advice: 'Consider zero-based budgeting for optimization' }
                }
            },
            investing: {
                question: 'What is your risk tolerance?',
                branches: {
                    conservative: { advice: 'Focus on bonds, CDs, and dividend stocks' },
                    moderate: { advice: '60/40 stock/bond portfolio with index funds' },
                    aggressive: { advice: 'Growth stocks, emerging markets, higher equity allocation' }
                }
            }
        });

        // Health decision tree
        this.decisionTrees.set('health', {
            fitness: {
                question: 'What is your current fitness level?',
                branches: {
                    beginner: { advice: 'Start with 20-30 min walks, bodyweight exercises' },
                    intermediate: { advice: 'Mix cardio and strength training, 4-5 days/week' },
                    advanced: { advice: 'Periodized training, sport-specific programs' }
                }
            },
            nutrition: {
                question: 'What is your primary goal?',
                branches: {
                    weight_loss: { advice: 'Caloric deficit, high protein, portion control' },
                    muscle_gain: { advice: 'Caloric surplus, 1.6-2.2g protein/kg body weight' },
                    maintenance: { advice: 'Balanced macros, consistent meal timing' }
                }
            }
        });
    }

    analyzeIntent(input, domain) {
        const patterns = this.patterns.get(domain) || [];
        
        for (const { pattern, intent } of patterns) {
            if (pattern.test(input)) {
                return { intent, confidence: 0.8 };
            }
        }
        
        return { intent: 'general', confidence: 0.3 };
    }

    generateResponse(input, domain) {
        const { intent } = this.analyzeIntent(input, domain);
        const knowledge = this.knowledgeBase.get(domain);
        
        if (!knowledge) {
            return this.generateGenericResponse(input, domain);
        }

        // Add to context memory
        this.contextMemory.push({ input, domain, intent, timestamp: Date.now() });
        if (this.contextMemory.length > 10) {
            this.contextMemory.shift();
        }

        return this.generateDomainResponse(input, domain, intent, knowledge);
    }

    generateDomainResponse(input, domain, intent, knowledge) {
        switch (domain) {
            case 'finance':
                return this.generateFinanceResponse(input, intent, knowledge);
            case 'health':
                return this.generateHealthResponse(input, intent, knowledge);
            case 'education':
                return this.generateEducationResponse(input, intent, knowledge);
            case 'business':
                return this.generateBusinessResponse(input, intent, knowledge);
            case 'legal':
                return this.generateLegalResponse(input, intent, knowledge);
            default:
                return this.generateGenericResponse(input, domain);
        }
    }

    generateFinanceResponse(input, intent, knowledge) {
        const responses = {
            budgeting: () => {
                const strategies = knowledge.strategies.budgeting;
                return `Here are proven budgeting strategies:

**50/30/20 Rule**: 50% needs, 30% wants, 20% savings/debt
**Zero-Based Budgeting**: Every dollar has a purpose
**Envelope Method**: Cash allocation for spending categories

**Emergency Fund Priority**: ${knowledge.concepts.emergency_fund.explanation}
Target: ${knowledge.concepts.emergency_fund.rule}

Would you like me to help you create a specific budget plan?`;
            },
            
            investing: () => {
                const diversification = knowledge.concepts.diversification;
                return `Investment fundamentals:

**Diversification**: ${diversification.explanation}
**Basic Allocation**: ${diversification.rule}
**Examples**: ${diversification.examples.join(', ')}

**Compound Interest**: ${knowledge.concepts.compound_interest.explanation}
**Formula**: ${knowledge.concepts.compound_interest.formula}
**Example**: ${knowledge.concepts.compound_interest.examples[0]}

Start with low-cost index funds for broad market exposure.`;
            },
            
            retirement: () => {
                const strategies = knowledge.strategies.retirement;
                return `Retirement planning essentials:

**Priority Order**:
1. ${strategies[0]} - Get employer match
2. ${strategies[1]} - Tax-advantaged growth
3. ${strategies[2]} - Automatic rebalancing

**Rule of Thumb**: Save 10-15% of income for retirement
**Time Advantage**: Starting early leverages compound growth

The earlier you start, the less you need to save monthly!`;
            },
            
            debt_management: () => {
                const methods = knowledge.strategies.debt_payoff;
                return `Debt payoff strategies:

**Avalanche Method**: Pay minimums on all debts, extra to highest interest rate
**Snowball Method**: Pay minimums on all debts, extra to smallest balance
**Consolidation**: Combine debts for lower interest rate

**Priority**: High-interest debt (credit cards) first
**Emergency Fund**: Build small emergency fund ($1000) before aggressive payoff

Which method appeals to you more - mathematical optimization or psychological wins?`;
            }
        };

        const responseFunc = responses[intent] || responses.budgeting;
        return responseFunc();
    }

    generateHealthResponse(input, intent, knowledge) {
        const responses = {
            nutrition: () => {
                const nutrition = knowledge.concepts.nutrition;
                return `Nutrition fundamentals:

**Macronutrient Balance**:
${nutrition.macros}

**Hydration**: ${nutrition.hydration}
**Meal Timing**: ${nutrition.timing}

**Practical Tips**:
- Fill half your plate with vegetables
- Choose lean proteins at each meal
- Include healthy fats (nuts, avocado, olive oil)
- Limit processed foods and added sugars

What specific nutrition goal are you working toward?`;
            },
            
            fitness: () => {
                const exercise = knowledge.concepts.exercise;
                return `Exercise guidelines:

**Cardiovascular**: ${exercise.cardio}
**Strength Training**: ${exercise.strength}
**Recovery**: ${exercise.recovery}

**Beginner Program**:
- Week 1-2: 20-30 min walks daily
- Week 3-4: Add bodyweight exercises
- Week 5+: Introduce weights or resistance bands

**Progressive Overload**: Gradually increase intensity, duration, or resistance

What's your current activity level?`;
            },
            
            sleep: () => {
                const sleep = knowledge.concepts.sleep;
                return `Sleep optimization:

**Duration**: ${sleep.duration}
**Consistency**: ${sleep.schedule}
**Environment**: ${sleep.environment}

**Sleep Hygiene Tips**:
- No screens 1 hour before bed
- Keep bedroom temperature 65-68°F
- Establish relaxing bedtime routine
- Avoid caffeine after 2 PM
- Get morning sunlight exposure

**Sleep Quality > Quantity**: Focus on deep, restorative sleep

Are you having trouble falling asleep or staying asleep?`;
            },
            
            weight_management: () => {
                return `Weight management principles:

**Caloric Balance**:
- Weight loss: Caloric deficit (eat less than you burn)
- Weight gain: Caloric surplus (eat more than you burn)
- Maintenance: Balance calories in vs. calories out

**Sustainable Rate**:
- Weight loss: 1-2 lbs per week
- Weight gain: 0.5-1 lb per week

**Key Factors**:
- Protein intake (preserves muscle)
- Strength training (maintains metabolism)
- Adequate sleep (hormone regulation)
- Stress management (cortisol control)

What's your specific weight goal?`;
            }
        };

        const responseFunc = responses[intent] || responses.nutrition;
        return responseFunc();
    }

    generateEducationResponse(input, intent, knowledge) {
        const responses = {
            study_techniques: () => {
                const methods = knowledge.concepts.study_methods;
                const memory = knowledge.concepts.memory_techniques;
                return `Effective study techniques:

**Active Learning Methods**:
- **Pomodoro Technique**: ${methods.pomodoro}
- **Active Recall**: ${methods.active_recall}
- **Feynman Technique**: ${methods.feynman}

**Memory Enhancement**:
- **Spaced Repetition**: ${memory.spaced_repetition}
- **Mnemonics**: ${memory.mnemonics}
- **Chunking**: ${memory.chunking}

**Study Schedule**: 
- Review within 24 hours
- Review after 1 week
- Review after 1 month

Which subject are you studying?`;
            },
            
            test_preparation: () => {
                const taxonomy = knowledge.frameworks.bloom_taxonomy;
                return `Test preparation strategy:

**Bloom's Taxonomy Levels**:
${taxonomy.map((level, i) => `${i + 1}. ${level}`).join('\n')}

**Preparation Timeline**:
- 4 weeks before: Content review and note organization
- 3 weeks before: Practice problems and active recall
- 2 weeks before: Mock exams and weak area focus
- 1 week before: Light review and stress management

**Test-Taking Tips**:
- Read all instructions carefully
- Answer easy questions first
- Manage time effectively
- Review answers if time permits

What type of test are you preparing for?`;
            },
            
            career_development: () => {
                return `Career development framework:

**Skill Assessment**:
- Technical skills (job-specific)
- Soft skills (communication, leadership)
- Industry knowledge
- Digital literacy

**Development Plan**:
1. Identify skill gaps
2. Set learning objectives
3. Choose learning methods
4. Practice and apply
5. Seek feedback

**Learning Methods**:
- Online courses (Coursera, Udemy)
- Professional certifications
- Mentorship programs
- Industry conferences
- Side projects

**Network Building**:
- LinkedIn optimization
- Industry events
- Professional associations
- Informational interviews

What career field interests you?`;
            }
        };

        const responseFunc = responses[intent] || responses.study_techniques;
        return responseFunc();
    }

    generateBusinessResponse(input, intent, knowledge) {
        const responses = {
            entrepreneurship: () => {
                const lean = knowledge.concepts.lean_startup;
                return `Entrepreneurship fundamentals:

**Lean Startup Method**:
- **Build**: ${lean.mvp}
- **Measure**: Collect user feedback and data
- **Learn**: ${lean.pivot}

**Validation Process**:
1. Problem identification
2. Solution hypothesis
3. MVP development
4. Customer feedback
5. Iterate or pivot

**Key Metrics**:
- Customer acquisition cost
- Lifetime value
- Product-market fit indicators
- Revenue growth rate

**Common Mistakes**:
- Building without customer validation
- Perfectionism over iteration
- Ignoring market feedback

What business idea are you considering?`;
            },
            
            marketing: () => {
                const mix = knowledge.concepts.marketing_mix;
                return `Marketing strategy framework:

**Marketing Mix (4 Ps)**:
- **Product**: ${mix.product}
- **Price**: ${mix.price}
- **Place**: ${mix.place}
- **Promotion**: ${mix.promotion}

**Digital Marketing Channels**:
- Content marketing (blogs, videos)
- Social media marketing
- Email marketing
- Search engine optimization (SEO)
- Pay-per-click advertising (PPC)

**Customer Journey**:
1. Awareness
2. Interest
3. Consideration
4. Purchase
5. Retention

**Metrics to Track**:
- Conversion rates
- Customer acquisition cost
- Return on ad spend (ROAS)
- Customer lifetime value

Who is your target audience?`;
            },
            
            strategy: () => {
                const swot = knowledge.concepts.swot_analysis;
                return `Business strategy development:

**SWOT Analysis**:
- **Internal Factors**: ${swot.internal.join(', ')}
- **External Factors**: ${swot.external.join(', ')}

**Strategic Planning Process**:
1. Vision and mission definition
2. Environmental analysis
3. Goal setting (SMART goals)
4. Strategy formulation
5. Implementation planning
6. Performance monitoring

**Competitive Advantage**:
- Cost leadership
- Differentiation
- Focus strategy
- Innovation

**Key Performance Indicators (KPIs)**:
- Revenue growth
- Market share
- Customer satisfaction
- Operational efficiency

What type of business strategy are you developing?`;
            }
        };

        const responseFunc = responses[intent] || responses.entrepreneurship;
        return responseFunc();
    }

    generateLegalResponse(input, intent, knowledge) {
        const responses = {
            contracts: () => {
                const elements = knowledge.concepts.contract_elements;
                return `Contract fundamentals:

**Essential Elements**:
- **Offer**: ${elements.offer}
- **Acceptance**: ${elements.acceptance}
- **Consideration**: ${elements.consideration}
- **Capacity**: ${elements.capacity}

**Contract Types**:
- Written vs. oral contracts
- Bilateral vs. unilateral
- Express vs. implied
- Executory vs. executed

**Key Clauses**:
- Payment terms
- Delivery/performance dates
- Termination conditions
- Dispute resolution
- Limitation of liability

**Best Practices**:
- Clear, specific language
- Define all terms
- Include governing law
- Review before signing

⚠️ **Disclaimer**: This is general information only. Consult a qualified attorney for legal advice.

What type of contract are you working with?`;
            },
            
            business_formation: () => {
                const entities = knowledge.concepts.business_entities;
                return `Business entity comparison:

**LLC (Limited Liability Company)**:
${entities.llc}
- Pass-through taxation
- Flexible management structure
- Personal asset protection

**Corporation**:
${entities.corporation}
- Formal structure required
- Easier to raise capital
- Perpetual existence

**Partnership**:
${entities.partnership}
- Simple formation
- Shared profits and losses
- Joint and several liability

**Factors to Consider**:
- Liability protection needs
- Tax implications
- Ownership structure
- Growth plans
- Regulatory requirements

⚠️ **Disclaimer**: Consult with a business attorney and accountant for personalized advice.

What type of business are you starting?`;
            },
            
            intellectual_property: () => {
                const ip = knowledge.concepts.intellectual_property;
                return `Intellectual Property protection:

**Copyright**: ${ip.copyright}
- Duration: Life + 70 years
- Covers: Books, music, software, art
- Protection: Automatic upon creation

**Trademark**: ${ip.trademark}
- Duration: Renewable indefinitely
- Covers: Brand names, logos, slogans
- Protection: Use in commerce + registration

**Patent**: ${ip.patent}
- Duration: ${ip.patent}
- Covers: Inventions, processes, designs
- Protection: USPTO application required

**Trade Secrets**:
- Duration: As long as kept secret
- Covers: Formulas, processes, customer lists
- Protection: Confidentiality agreements

**Action Steps**:
1. Identify your IP assets
2. Determine appropriate protection
3. File necessary applications
4. Monitor for infringement

⚠️ **Disclaimer**: IP law is complex. Consult an IP attorney for specific guidance.

What type of intellectual property do you need to protect?`;
            }
        };

        const responseFunc = responses[intent] || responses.contracts;
        return responseFunc();
    }

    generateGenericResponse(input, domain) {
        const domainInfo = {
            finance: 'financial planning, investing, budgeting, and wealth management',
            health: 'nutrition, fitness, mental health, and wellness',
            education: 'learning strategies, career development, and skill building',
            business: 'entrepreneurship, marketing, strategy, and operations',
            legal: 'contracts, business formation, and compliance',
            general: 'various topics and general assistance'
        };

        const suggestions = this.getContextualSuggestions(domain);
        const suggestionText = suggestions.length > 0 ? 
            `\n\n**Quick suggestions:**\n${suggestions.map(s => `• ${s}`).join('\n')}` : '';

        return `I can help you with ${domainInfo[domain] || 'various topics and general assistance'}. 

Some areas I specialize in:
- Strategic planning and analysis
- Best practices and frameworks
- Step-by-step guidance
- Risk assessment and mitigation

Could you be more specific about what you'd like to know? For example:
- What specific challenge are you facing?
- What outcome are you trying to achieve?
- What's your current situation or experience level?${suggestionText}

This will help me provide more targeted and useful guidance.

${domain === 'general' ? '**Available offline domains:** Finance, Health, Education, Business, Legal, OS Development' : ''}`;
    }

    getContextualSuggestions(domain) {
        const suggestions = {
            finance: [
                'Create a budget plan',
                'Investment strategy advice',
                'Debt payoff plan',
                'Retirement planning',
                'Emergency fund guidance'
            ],
            health: [
                'Nutrition plan',
                'Workout routine',
                'Sleep optimization',
                'Stress management',
                'Weight management'
            ],
            education: [
                'Study techniques',
                'Test preparation',
                'Career planning',
                'Skill development',
                'Learning strategies'
            ],
            business: [
                'Business plan',
                'Marketing strategy',
                'Competitive analysis',
                'Team building',
                'Growth planning'
            ],
            legal: [
                'Contract review',
                'Business formation',
                'IP protection',
                'Compliance guidance',
                'Risk assessment'
            ],
            general: [
                'Ask about finance, health, education, business, or legal topics',
                'OS development and kernel programming',
                'Code analysis and programming help',
                'System administration guidance'
            ]
        };

        return suggestions[domain] || [];
    }
}