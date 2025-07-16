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

    analyzeContract(input) {
        return {
            text: `**Contract Analysis Framework:**

**Essential Elements Check:**
1. **Offer & Acceptance** - Clear terms and mutual agreement
2. **Consideration** - Exchange of value between parties
3. **Legal Capacity** - Parties must be legally able to contract
4. **Legal Purpose** - Contract must be for lawful activities

**Key Clauses to Review:**
- **Performance Terms** - What each party must do
- **Payment Terms** - When and how payment is made
- **Termination Clauses** - How the contract can end
- **Dispute Resolution** - How conflicts will be handled
- **Force Majeure** - Protection against unforeseeable events

**Red Flags to Watch:**
- Vague or ambiguous language
- One-sided terms heavily favoring one party
- Missing essential details (dates, amounts, deliverables)
- Unreasonable penalties or damages
- Automatic renewal clauses

**Recommendation:** Have any significant contract reviewed by a qualified attorney before signing.`
        };
    }

    guideBusinessFormation(input) {
        return {
            text: `**Business Formation Guide:**

**Entity Type Comparison:**

**LLC (Limited Liability Company):**
- ✅ Personal asset protection
- ✅ Tax flexibility (pass-through or corporate)
- ✅ Simple management structure
- ✅ Fewer compliance requirements

**Corporation:**
- ✅ Strong liability protection
- ✅ Easier to raise capital
- ✅ Perpetual existence
- ❌ Double taxation (C-Corp)
- ❌ More complex compliance

**Partnership:**
- ✅ Simple formation
- ✅ Pass-through taxation
- ❌ Personal liability exposure
- ❌ Potential partner disputes

**Formation Steps:**
1. **Choose Business Name** - Check availability and reserve
2. **File Formation Documents** - Articles of Incorporation/Organization
3. **Obtain EIN** - Federal tax identification number
4. **Create Operating Agreement** - Internal governance rules
5. **Register for State Taxes** - Sales tax, employment tax
6. **Obtain Business Licenses** - Industry-specific permits

**Ongoing Compliance:**
- Annual reports and fees
- Tax filings and payments
- Maintaining corporate records
- Following operating agreement terms`
        };
    }

    protectIP(input) {
        return `**Intellectual Property Protection Guide:**

**Types of IP Protection:**

**Copyright:**
- **Protects:** Original creative works (writing, art, software)
- **Duration:** Life of author + 70 years
- **Requirements:** Automatic upon creation, registration strengthens rights
- **Cost:** $45-$125 for registration

**Trademark:**
- **Protects:** Brand names, logos, slogans
- **Duration:** Indefinite with proper maintenance
- **Requirements:** Use in commerce, distinctiveness
- **Cost:** $250-$350 per class

**Patent:**
- **Protects:** Inventions, processes, designs
- **Duration:** 20 years from filing
- **Requirements:** Novel, non-obvious, useful
- **Cost:** $1,600-$8,000+ with attorney fees

**Trade Secret:**
- **Protects:** Confidential business information
- **Duration:** As long as kept secret
- **Requirements:** Economic value, reasonable secrecy measures
- **Cost:** Minimal (confidentiality agreements, security measures)

**Protection Strategy:**
1. **Identify Your IP Assets** - Audit all intellectual property
2. **Choose Appropriate Protection** - Match protection type to asset
3. **File Applications Promptly** - Don't delay on time-sensitive protections
4. **Maintain Registrations** - Pay renewal fees and file required documents
5. **Monitor for Infringement** - Watch for unauthorized use
6. **Enforce Your Rights** - Take action against infringers

**International Considerations:**
- IP rights are generally territorial
- Consider Madrid Protocol for trademarks
- PCT system for patents
- Berne Convention for copyrights`;
    }

    handleEmployment(input) {
        return `**Employment Law Guidance:**

**Key Employment Laws:**

**Fair Labor Standards Act (FLSA):**
- Minimum wage requirements
- Overtime pay (1.5x for 40+ hours)
- Child labor restrictions
- Record-keeping requirements

**Title VII (Civil Rights):**
- Prohibits discrimination based on race, color, religion, sex, national origin
- Applies to employers with 15+ employees
- Covers hiring, firing, promotion, compensation

**Americans with Disabilities Act (ADA):**
- Reasonable accommodations for qualified disabled employees
- Prohibition of disability discrimination
- Accessibility requirements

**Family and Medical Leave Act (FMLA):**
- Up to 12 weeks unpaid leave for qualified reasons
- Job protection during leave
- Continuation of health benefits

**Employment Best Practices:**

**Hiring:**
- Use consistent, job-related interview questions
- Avoid questions about protected characteristics
- Conduct background checks legally and consistently
- Provide clear job descriptions and expectations

**Workplace Policies:**
- Anti-discrimination and harassment policies
- Clear disciplinary procedures
- Social media and technology use guidelines
- Safety and security protocols

**Termination:**
- Document performance issues thoroughly
- Follow progressive discipline when appropriate
- Ensure consistent application of policies
- Consider severance agreements for sensitive situations

**Compliance Requirements:**
- I-9 employment eligibility verification
- Workers' compensation insurance
- Unemployment insurance contributions
- Payroll tax withholding and reporting

**Warning Signs Requiring Legal Review:**
- Discrimination or harassment complaints
- Wage and hour disputes
- Safety incidents or OSHA issues
- Union organizing activities`;
    }

    ensureCompliance(input) {
        return `**Compliance Management Framework:**

**Regulatory Compliance Areas:**

**Data Privacy:**
- **GDPR** (EU residents) - Consent, data rights, breach notification
- **CCPA** (California residents) - Consumer privacy rights
- **HIPAA** (Healthcare) - Protected health information security
- **SOX** (Public companies) - Financial reporting controls

**Industry-Specific:**
- **Financial Services** - SEC, FINRA, banking regulations
- **Healthcare** - FDA, CMS, state licensing boards
- **Food & Beverage** - FDA, USDA, state health departments
- **Technology** - FTC, state data breach laws

**Employment Compliance:**
- Equal opportunity employment practices
- Wage and hour law compliance
- Workplace safety (OSHA) requirements
- Benefits administration (ERISA)

**Compliance Program Elements:**

**1. Risk Assessment:**
- Identify applicable regulations
- Assess compliance risks and gaps
- Prioritize high-risk areas
- Document findings and action plans

**2. Policies and Procedures:**
- Written compliance policies
- Clear procedures and workflows
- Regular policy updates
- Employee acknowledgment and training

**3. Monitoring and Auditing:**
- Regular compliance audits
- Key performance indicators
- Exception reporting systems
- Third-party assessments

**4. Training and Communication:**
- Role-specific compliance training
- Regular updates on regulatory changes
- Clear reporting channels
- Whistleblower protections

**5. Response and Remediation:**
- Incident response procedures
- Corrective action protocols
- Regulatory reporting requirements
- Continuous improvement processes

**Implementation Steps:**
1. **Conduct Compliance Audit** - Identify current state
2. **Develop Compliance Plan** - Address gaps and risks
3. **Implement Controls** - Policies, procedures, systems
4. **Train Personnel** - Ensure understanding and compliance
5. **Monitor and Test** - Ongoing compliance verification
6. **Update and Improve** - Adapt to regulatory changes

**Red Flags Requiring Immediate Attention:**
- Regulatory inquiries or investigations
- Customer complaints about compliance issues
- Internal audit findings
- Changes in applicable regulations
- Significant business changes affecting compliance`;
    }
}