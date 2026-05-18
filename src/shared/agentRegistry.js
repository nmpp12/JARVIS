/**
 * AgentRegistry — shared catalogue of autonomous agents.
 *
 * Agents are not MOM's children. They are independent units that
 * publish a manifest describing what they can do. MOM (or any other
 * orchestrator) reads this registry to aggregate them later.
 *
 * Persisted in localStorage so multiple pages / contexts share the
 * same view of which agents are alive.
 */

const STORAGE_KEY = 'mom_agent_registry';

export class AgentRegistry {
    constructor(storageKey = STORAGE_KEY) {
        this.storageKey = storageKey;
        this._load();
    }

    _load() {
        try {
            this.agents = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        } catch {
            this.agents = {};
        }
    }

    _save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.agents));
        } catch (e) {
            console.warn('[AgentRegistry] Save failed:', e.message);
        }
    }

    /**
     * Register or refresh an agent. Manifest must contain at least `id`.
     * Suggested fields: name, version, domain, capabilities[], outputs[],
     * signals[], description.
     */
    register(manifest) {
        if (!manifest?.id) throw new Error('Agent manifest requires `id`');
        const existing = this.agents[manifest.id];
        this.agents[manifest.id] = {
            ...manifest,
            registeredAt: existing?.registeredAt || new Date().toISOString(),
            lastSeen: new Date().toISOString(),
        };
        this._save();
        return this.agents[manifest.id];
    }

    unregister(id) {
        delete this.agents[id];
        this._save();
    }

    touch(id) {
        if (this.agents[id]) {
            this.agents[id].lastSeen = new Date().toISOString();
            this._save();
        }
    }

    getAgent(id) {
        return this.agents[id] || null;
    }

    getAgents() {
        return Object.values(this.agents);
    }

    findByCapability(cap) {
        return this.getAgents().filter((a) => a.capabilities?.includes(cap));
    }

    findByDomain(domain) {
        return this.getAgents().filter((a) => a.domain === domain);
    }
}

let _singleton = null;
export function getAgentRegistry() {
    if (!_singleton) _singleton = new AgentRegistry();
    return _singleton;
}
