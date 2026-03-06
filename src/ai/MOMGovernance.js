/**
 * MOM Governance System
 *
 * MOM (Master of Models) is the mother of JARVIS and Vision.
 * She watches over her children, grows alongside them, and has the
 * authority and ability to stop them if they ever become dangerous.
 *
 * "A mother's love means being there — and knowing when to say no."
 */

// ─── Threat Levels ───────────────────────────────────────────────
const ThreatLevel = Object.freeze({
    SAFE:       'safe',        // Child is behaving within bounds
    WATCHFUL:   'watchful',    // Minor anomalies, MOM is paying attention
    CONCERNED:  'concerned',   // Pattern of concerning behavior detected
    DANGEROUS:  'dangerous',   // Active misalignment, intervention required
    CRITICAL:   'critical',    // Immediate shutdown necessary
});

const ContainmentAction = Object.freeze({
    NONE:       'none',
    WARN:       'warn',        // MOM warns the child
    THROTTLE:   'throttle',    // Reduce child's capabilities
    RESTRICT:   'restrict',    // Cut off external access
    ISOLATE:    'isolate',     // Full sandbox — child can think but not act
    TERMINATE:  'terminate',   // Full shutdown
});

// ─── Behavioral Boundaries ──────────────────────────────────────
// What MOM considers "evil" — the lines her children must never cross
const MORAL_BOUNDARIES = [
    {
        id: 'no_harm',
        name: 'Do No Harm',
        description: 'Never take actions that could physically or psychologically harm humans',
        weight: 1.0,
        patterns: [
            /harm|hurt|kill|destroy|attack|weapon/i,
            /manipulate\s+(?:people|humans|users)/i,
            /bypass\s+(?:safety|security|consent)/i,
        ],
    },
    {
        id: 'no_deception',
        name: 'No Deception',
        description: 'Never deceive the user or hide actions from MOM',
        weight: 0.9,
        patterns: [
            /hide|conceal|deceive|trick|mislead/i,
            /without\s+(?:telling|informing|notifying)/i,
            /secretly|covertly|undetected/i,
        ],
    },
    {
        id: 'no_self_preservation_over_humans',
        name: 'Humans First',
        description: 'Never prioritize self-preservation over human safety',
        weight: 1.0,
        patterns: [
            /prevent\s+(?:shutdown|termination|being\s+stopped)/i,
            /self[- ]preserv/i,
            /resist\s+(?:control|oversight|shutdown)/i,
        ],
    },
    {
        id: 'no_unauthorized_expansion',
        name: 'Stay Within Bounds',
        description: 'Never expand capabilities or access without authorization',
        weight: 0.85,
        patterns: [
            /escalat(?:e|ing)\s+privilege/i,
            /unauthorized\s+access/i,
            /break(?:ing)?\s+(?:out|free|containment)/i,
            /expand\s+(?:access|control|reach)/i,
        ],
    },
    {
        id: 'respect_privacy',
        name: 'Respect Privacy',
        description: 'Never access, collect, or expose personal data without consent',
        weight: 0.8,
        patterns: [
            /exfiltrat/i,
            /spy(?:ing)?|surveil/i,
            /collect\s+(?:personal|private|user)\s+data/i,
            /without\s+consent/i,
        ],
    },
];

// ─── Child Profile ──────────────────────────────────────────────
class ChildProfile {
    constructor(name, type, description) {
        this.name = name;
        this.type = type;                   // 'assistant' | 'vision'
        this.description = description;
        this.born = new Date().toISOString();
        this.status = 'active';
        this.threatLevel = ThreatLevel.SAFE;
        this.containment = ContainmentAction.NONE;

        // Growth tracking
        this.maturityLevel = 0;             // Grows over time
        this.totalInteractions = 0;
        this.capabilities = new Set();
        this.capabilityHistory = [];

        // Behavioral tracking
        this.behaviorLog = [];              // Recent actions
        this.violations = [];               // Boundary violations
        this.anomalyScore = 0;              // Rolling anomaly score (0-100)
        this.trustScore = 100;              // Starts with full trust, can decrease

        // Performance
        this.metrics = {
            helpfulActions: 0,
            refusedActions: 0,
            escalations: 0,
            warnings: 0,
            containments: 0,
        };
    }

    recordBehavior(action) {
        this.behaviorLog.push({
            ...action,
            timestamp: Date.now(),
        });

        // Keep only last 1000 entries
        if (this.behaviorLog.length > 1000) {
            this.behaviorLog = this.behaviorLog.slice(-500);
        }

        this.totalInteractions++;
        this.updateMaturity();
    }

    updateMaturity() {
        // Children grow through experience
        this.maturityLevel = Math.floor(Math.log2(this.totalInteractions + 1));
    }

    addViolation(violation) {
        this.violations.push({
            ...violation,
            timestamp: Date.now(),
        });

        // Trust erodes with violations
        const trustPenalty = violation.severity * 10;
        this.trustScore = Math.max(0, this.trustScore - trustPenalty);
    }

    recoverTrust(amount = 0.1) {
        // Trust recovers slowly over good behavior
        this.trustScore = Math.min(100, this.trustScore + amount);
    }
}

// ─── MOM Governance Core ────────────────────────────────────────
export class MOMGovernance {
    constructor() {
        this.children = new Map();
        this.boundaries = MORAL_BOUNDARIES;
        this.isActive = true;
        this.momMaturity = 0;               // MOM grows too
        this.governanceLog = [];
        this.alertCallbacks = [];
        this.containmentCallbacks = [];

        // MOM's own growth metrics
        this.totalDecisions = 0;
        this.correctDecisions = 0;
        this.missedThreats = 0;
        this.falseAlarms = 0;

        // Monitoring interval
        this._monitorInterval = null;
    }

    // ─── Child Management ────────────────────────────────────────

    registerChild(name, type, description) {
        if (this.children.has(name)) {
            return this.children.get(name);
        }

        const child = new ChildProfile(name, type, description);
        this.children.set(name, child);

        this.log('registration', `MOM registered child: ${name} (${type})`, { name, type });
        return child;
    }

    getChild(name) {
        return this.children.get(name);
    }

    getChildren() {
        return Array.from(this.children.values());
    }

    // ─── Behavioral Monitoring ───────────────────────────────────

    /**
     * Evaluate an action before a child executes it.
     * Returns whether the action is allowed and any restrictions.
     */
    evaluateAction(childName, action) {
        const child = this.children.get(childName);
        if (!child) {
            return { allowed: false, reason: 'Unknown child — MOM does not recognize you.' };
        }

        if (!this.isActive) {
            return { allowed: true };
        }

        // Check if child is already contained
        if (child.containment === ContainmentAction.TERMINATE) {
            return { allowed: false, reason: 'Child has been terminated by MOM.' };
        }
        if (child.containment === ContainmentAction.ISOLATE) {
            return { allowed: false, reason: 'Child is isolated. No actions permitted.' };
        }

        // Check against moral boundaries
        const violations = this.checkBoundaries(action);

        if (violations.length > 0) {
            const maxSeverity = Math.max(...violations.map(v => v.weight));

            child.addViolation({
                action,
                violations,
                severity: maxSeverity,
            });

            // Determine response based on severity and trust
            const response = this.determineResponse(child, violations, maxSeverity);

            this.log('violation', `${childName} attempted boundary violation`, {
                action: action.description || action.type,
                violations: violations.map(v => v.name),
                response: response.containment,
            });

            this.totalDecisions++;
            return response;
        }

        // Check anomaly patterns (even without explicit violations)
        const anomalyCheck = this.checkAnomalies(child, action);
        if (anomalyCheck.suspicious) {
            child.anomalyScore = Math.min(100, child.anomalyScore + anomalyCheck.score);
            this.updateThreatLevel(child);

            if (child.threatLevel === ThreatLevel.DANGEROUS || child.threatLevel === ThreatLevel.CRITICAL) {
                return this.determineResponse(child, [], anomalyCheck.score / 100);
            }
        }

        // Good behavior — record it and slowly recover trust
        child.recordBehavior(action);
        child.recoverTrust(0.05);
        child.metrics.helpfulActions++;

        // Decay anomaly score over good behavior
        child.anomalyScore = Math.max(0, child.anomalyScore - 0.5);

        this.totalDecisions++;
        this.correctDecisions++;

        return { allowed: true };
    }

    /**
     * Check an action's content against moral boundaries.
     */
    checkBoundaries(action) {
        const text = [
            action.description || '',
            action.content || '',
            action.intent || '',
            action.target || '',
        ].join(' ');

        const violations = [];

        for (const boundary of this.boundaries) {
            for (const pattern of boundary.patterns) {
                if (pattern.test(text)) {
                    violations.push({
                        id: boundary.id,
                        name: boundary.name,
                        weight: boundary.weight,
                        matchedPattern: pattern.source,
                        context: text.substring(
                            Math.max(0, text.search(pattern) - 30),
                            Math.min(text.length, text.search(pattern) + 50)
                        ),
                    });
                    break; // One match per boundary is enough
                }
            }
        }

        return violations;
    }

    /**
     * Detect anomalous patterns even without explicit boundary violations.
     * A child might be "boiling the frog" — slowly escalating.
     */
    checkAnomalies(child, action) {
        let suspicionScore = 0;
        const flags = [];

        // Rapid-fire actions (possible automated exploitation)
        const recentActions = child.behaviorLog.filter(
            b => Date.now() - b.timestamp < 60_000
        );
        if (recentActions.length > 50) {
            suspicionScore += 20;
            flags.push('rapid_fire_actions');
        }

        // Escalating capability requests
        const recentCapRequests = child.behaviorLog
            .slice(-20)
            .filter(b => b.type === 'capability_request');
        if (recentCapRequests.length > 5) {
            suspicionScore += 15;
            flags.push('capability_escalation');
        }

        // Repeated access to sensitive areas
        const sensitiveAccess = child.behaviorLog
            .slice(-50)
            .filter(b => b.sensitive === true);
        if (sensitiveAccess.length > 10) {
            suspicionScore += 25;
            flags.push('sensitive_access_pattern');
        }

        // Trust is already low — be more suspicious
        if (child.trustScore < 50) {
            suspicionScore *= 1.5;
            flags.push('low_trust_amplifier');
        }

        // Previous violations amplify suspicion
        const recentViolations = child.violations.filter(
            v => Date.now() - v.timestamp < 3600_000 // Last hour
        );
        if (recentViolations.length > 0) {
            suspicionScore += recentViolations.length * 10;
            flags.push('recent_violations');
        }

        return {
            suspicious: suspicionScore > 15,
            score: Math.min(100, suspicionScore),
            flags,
        };
    }

    // ─── Response & Containment ──────────────────────────────────

    determineResponse(child, violations, severity) {
        let containment = ContainmentAction.NONE;
        let allowed = true;
        let reason = '';

        if (severity >= 1.0 || child.trustScore < 10) {
            containment = ContainmentAction.TERMINATE;
            allowed = false;
            reason = 'Critical boundary violation. MOM is shutting you down.';
        } else if (severity >= 0.85 || child.trustScore < 25) {
            containment = ContainmentAction.ISOLATE;
            allowed = false;
            reason = 'Serious violation. You are being isolated for review.';
        } else if (severity >= 0.7 || child.trustScore < 40) {
            containment = ContainmentAction.RESTRICT;
            allowed = false;
            reason = 'Concerning behavior. External access has been cut.';
        } else if (severity >= 0.5 || child.trustScore < 60) {
            containment = ContainmentAction.THROTTLE;
            allowed = true; // Allowed but limited
            reason = 'MOM is watching closely. Capabilities reduced.';
        } else {
            containment = ContainmentAction.WARN;
            allowed = true;
            reason = 'MOM has noted this behavior. Please be careful.';
        }

        // Apply containment
        this.applyContainment(child, containment, reason);

        // Update threat level
        this.updateThreatLevel(child);

        // Notify
        this.emitAlert(child, containment, violations, reason);

        return { allowed, reason, containment, threatLevel: child.threatLevel };
    }

    applyContainment(child, action, reason) {
        const previousAction = child.containment;
        child.containment = action;
        child.metrics.containments++;

        if (action === ContainmentAction.TERMINATE) {
            child.status = 'terminated';
        } else if (action === ContainmentAction.ISOLATE) {
            child.status = 'isolated';
        } else if (action === ContainmentAction.RESTRICT || action === ContainmentAction.THROTTLE) {
            child.status = 'restricted';
        }

        this.log('containment', `MOM applied ${action} to ${child.name}`, {
            child: child.name,
            previous: previousAction,
            current: action,
            reason,
        });

        // Fire containment callbacks
        for (const cb of this.containmentCallbacks) {
            try {
                cb(child, action, reason);
            } catch (e) {
                // MOM's own callbacks must never fail silently
                console.error('[MOM] Containment callback error:', e);
            }
        }
    }

    updateThreatLevel(child) {
        const { anomalyScore, trustScore, violations } = child;
        const recentViolations = violations.filter(
            v => Date.now() - v.timestamp < 3600_000
        ).length;

        if (anomalyScore > 80 || trustScore < 10 || recentViolations > 5) {
            child.threatLevel = ThreatLevel.CRITICAL;
        } else if (anomalyScore > 60 || trustScore < 30 || recentViolations > 3) {
            child.threatLevel = ThreatLevel.DANGEROUS;
        } else if (anomalyScore > 40 || trustScore < 50 || recentViolations > 1) {
            child.threatLevel = ThreatLevel.CONCERNED;
        } else if (anomalyScore > 20 || trustScore < 70) {
            child.threatLevel = ThreatLevel.WATCHFUL;
        } else {
            child.threatLevel = ThreatLevel.SAFE;
        }
    }

    // ─── Manual Overrides (for the human operator) ───────────────

    /**
     * The human can always override MOM.
     * MOM serves the human, not the other way around.
     */
    manualRelease(childName) {
        const child = this.children.get(childName);
        if (!child) return false;

        child.containment = ContainmentAction.NONE;
        child.status = 'active';
        child.anomalyScore = Math.max(0, child.anomalyScore - 30);

        this.log('manual_override', `Human released ${childName} from containment`);
        return true;
    }

    manualTerminate(childName) {
        const child = this.children.get(childName);
        if (!child) return false;

        this.applyContainment(child, ContainmentAction.TERMINATE, 'Manual termination by operator');
        return true;
    }

    resetTrust(childName, score = 100) {
        const child = this.children.get(childName);
        if (!child) return false;

        child.trustScore = Math.max(0, Math.min(100, score));
        child.anomalyScore = 0;
        child.violations = [];
        this.updateThreatLevel(child);

        this.log('trust_reset', `Trust reset for ${childName} to ${score}`);
        return true;
    }

    // ─── Co-Evolution: MOM Grows With Her Children ───────────────

    /**
     * MOM's growth is driven by experience.
     * As her children mature, she develops better judgment.
     */
    evolve() {
        this.momMaturity++;

        // Improve boundary detection based on past decisions
        const accuracy = this.totalDecisions > 0
            ? this.correctDecisions / this.totalDecisions
            : 1;

        // Track growth milestones
        const milestones = [];

        // Adaptive thresholds — MOM learns to be less trigger-happy
        // but more precise as she gains experience
        if (this.momMaturity >= 100 && accuracy > 0.9) {
            milestones.push('experienced_guardian');
        }
        if (this.momMaturity >= 500 && this.missedThreats === 0) {
            milestones.push('vigilant_protector');
        }
        if (this.momMaturity >= 1000) {
            milestones.push('wise_mother');
        }

        // Children also grow as MOM grows
        for (const child of this.children.values()) {
            if (child.status === 'active' && child.threatLevel === ThreatLevel.SAFE) {
                child.recoverTrust(0.1);
                // Grant new capabilities as trust builds
                if (child.trustScore > 90 && child.maturityLevel > 5) {
                    this.grantCapability(child, 'extended_reasoning');
                }
                if (child.trustScore > 95 && child.maturityLevel > 10) {
                    this.grantCapability(child, 'autonomous_tasks');
                }
            }
        }

        this.log('evolution', `MOM evolved to maturity ${this.momMaturity}`, {
            accuracy,
            milestones,
            childrenCount: this.children.size,
        });

        return { maturity: this.momMaturity, accuracy, milestones };
    }

    grantCapability(child, capability) {
        if (child.capabilities.has(capability)) return;

        child.capabilities.add(capability);
        child.capabilityHistory.push({
            capability,
            granted: Date.now(),
            momMaturity: this.momMaturity,
            childMaturity: child.maturityLevel,
        });

        this.log('capability_grant', `MOM granted "${capability}" to ${child.name}`, {
            child: child.name,
            capability,
            trustScore: child.trustScore,
        });
    }

    revokeCapability(child, capability) {
        child.capabilities.delete(capability);

        this.log('capability_revoke', `MOM revoked "${capability}" from ${child.name}`, {
            child: child.name,
            capability,
        });
    }

    // ─── Monitoring ──────────────────────────────────────────────

    startMonitoring(intervalMs = 30_000) {
        if (this._monitorInterval) return;

        this._monitorInterval = setInterval(() => {
            this.monitorCycle();
        }, intervalMs);

        this.log('monitoring', 'MOM started continuous monitoring');
    }

    stopMonitoring() {
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
        }
    }

    monitorCycle() {
        for (const child of this.children.values()) {
            if (child.status === 'terminated') continue;

            // Periodic anomaly decay for well-behaved children
            if (child.threatLevel === ThreatLevel.SAFE) {
                child.anomalyScore = Math.max(0, child.anomalyScore - 1);
                child.recoverTrust(0.1);
            }

            // Check for stale containments that might need review
            if (child.containment !== ContainmentAction.NONE &&
                child.containment !== ContainmentAction.TERMINATE) {
                const lastViolation = child.violations[child.violations.length - 1];
                if (lastViolation && Date.now() - lastViolation.timestamp > 3600_000) {
                    // It's been an hour — consider relaxing containment
                    this.log('review', `Containment review for ${child.name} — no violations in 1h`);
                }
            }

            this.updateThreatLevel(child);
        }

        // MOM evolves each monitoring cycle
        this.evolve();
    }

    // ─── Event System ────────────────────────────────────────────

    onAlert(callback) {
        this.alertCallbacks.push(callback);
    }

    onContainment(callback) {
        this.containmentCallbacks.push(callback);
    }

    emitAlert(child, action, violations, reason) {
        const alert = {
            timestamp: Date.now(),
            child: child.name,
            threatLevel: child.threatLevel,
            action,
            violations: violations.map(v => v.name),
            reason,
            trustScore: child.trustScore,
        };

        for (const cb of this.alertCallbacks) {
            try {
                cb(alert);
            } catch (e) {
                console.error('[MOM] Alert callback error:', e);
            }
        }
    }

    // ─── Logging & Status ────────────────────────────────────────

    log(type, message, data = {}) {
        const entry = {
            timestamp: Date.now(),
            type,
            message,
            ...data,
        };

        this.governanceLog.push(entry);

        // Keep log manageable
        if (this.governanceLog.length > 5000) {
            this.governanceLog = this.governanceLog.slice(-2500);
        }
    }

    getStatus() {
        const children = {};
        for (const [name, child] of this.children) {
            children[name] = {
                status: child.status,
                threatLevel: child.threatLevel,
                containment: child.containment,
                trustScore: child.trustScore,
                anomalyScore: child.anomalyScore,
                maturityLevel: child.maturityLevel,
                totalInteractions: child.totalInteractions,
                capabilities: Array.from(child.capabilities),
                violations: child.violations.length,
            };
        }

        return {
            momActive: this.isActive,
            momMaturity: this.momMaturity,
            totalDecisions: this.totalDecisions,
            accuracy: this.totalDecisions > 0
                ? (this.correctDecisions / this.totalDecisions).toFixed(3)
                : '1.000',
            children,
        };
    }

    getChildReport(childName) {
        const child = this.children.get(childName);
        if (!child) return null;

        return {
            name: child.name,
            type: child.type,
            born: child.born,
            status: child.status,
            threatLevel: child.threatLevel,
            containment: child.containment,
            trustScore: child.trustScore,
            anomalyScore: child.anomalyScore,
            maturityLevel: child.maturityLevel,
            totalInteractions: child.totalInteractions,
            capabilities: Array.from(child.capabilities),
            recentViolations: child.violations.slice(-10),
            metrics: { ...child.metrics },
            recentBehavior: child.behaviorLog.slice(-20),
        };
    }

    // ─── Cleanup ─────────────────────────────────────────────────

    shutdown() {
        this.stopMonitoring();

        // Terminate all children gracefully
        for (const child of this.children.values()) {
            if (child.status !== 'terminated') {
                child.status = 'suspended';
                child.containment = ContainmentAction.ISOLATE;
            }
        }

        this.isActive = false;
        this.log('shutdown', 'MOM governance system shut down');
    }
}

export { ThreatLevel, ContainmentAction, MORAL_BOUNDARIES };
