import { PersistentMemory } from '../ai/PersistentMemory.js';
import { EmotionalState } from '../ai/EmotionalState.js';
import { MOMGovernance } from '../ai/MOMGovernance.js';
import { SiblingBus } from '../ai/SiblingBus.js';
import { DreamMode } from '../ai/DreamMode.js';

/**
 * createMomStack — shared factory for the MOM infrastructure.
 *
 * Both JARVIS and Finance call this to get their own in-memory stack.
 * They share persistent state through localStorage (same mom_memory key).
 */
export function createMomStack() {
    const memory   = new PersistentMemory();
    const emotions = new EmotionalState(memory);
    const mom      = new MOMGovernance();
    const bus      = new SiblingBus(mom);
    const dreams   = new DreamMode(memory, mom);
    return { memory, emotions, mom, bus, dreams };
}
