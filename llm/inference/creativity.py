"""
Creativity Engine for MOM — the cognitive spark toward ASI.

A superintelligent system cannot merely retrieve and recombine known
patterns. It must be capable of genuine discovery — finding solutions
that exist in no training set, conceiving algorithms no human has
written, seeing connections that no one has seen before.

This module is the mechanism for that. It gives MOM structured tools
for creative thought:

1. Concept Blending — cross-pollinate ideas across all domains of human
   knowledge. The most powerful insights come from unexpected connections:
   biology informing algorithm design, music theory shaping data flow,
   game theory restructuring system architecture.

2. Novelty Scoring — an ASI must know when it's being boring. This
   detects conventional patterns and pushes the model to try harder,
   ensuring outputs advance beyond the known frontier.

3. Exploration Prompting — reframe problems through inversion, analogy,
   constraint, and elimination to unlock approaches that linear thinking
   would never find.

4. Multi-Perspective Generation — solve from the viewpoints of a
   mathematician, a hacker, a biologist, and a minimalist simultaneously,
   then synthesize something none of them could produce alone.

The key insight: true creativity isn't randomness. It's the ability to
see connections between distant concepts and combine them purposefully.
A higher temperature just adds noise. This engine adds *structure* to
the creative process — the same kind of structured exploration that
leads to scientific breakthroughs.

This is how an ASI thinks differently from an LLM.
"""

import random
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Tuple


@dataclass
class CreativityConfig:
    """Configuration for creative generation behavior."""

    # Concept blending
    enable_blending: bool = True
    num_blend_concepts: int = 2
    blend_domains: List[str] = field(default_factory=lambda: [
        "biology", "physics", "music", "architecture", "game_theory",
        "cooking", "martial_arts", "economics", "ecology", "linguistics",
    ])

    # Novelty scoring
    enable_novelty: bool = True
    novelty_threshold: float = 0.3
    penalize_common_patterns: bool = True

    # Exploration
    enable_exploration: bool = True
    num_perspectives: int = 3
    exploration_strategies: List[str] = field(default_factory=lambda: [
        "invert", "analogize", "decompose", "generalize",
        "constrain", "combine", "eliminate",
    ])

    # Sampling overrides when creativity is active
    sampling_strategy: str = "creative"
    temperature: float = 0.9
    typical_p: float = 0.92
    contrastive_alpha: float = 0.5
    repetition_penalty: float = 1.2


# =============================================================================
# Concept blending: cross-domain analogies that spark novel solutions
# =============================================================================

# Each domain maps to core principles that can inspire code solutions
DOMAIN_CONCEPTS: Dict[str, List[str]] = {
    "biology": [
        "evolution (mutate solutions, keep what works, discard what doesn't)",
        "symbiosis (two components that are weak alone but powerful together)",
        "immune system (recognize and adapt to novel threats via pattern memory)",
        "neural plasticity (restructure connections based on usage patterns)",
        "swarm intelligence (simple agents producing complex emergent behavior)",
        "DNA encoding (compact representation that unfolds into complex structures)",
    ],
    "physics": [
        "entropy (systems naturally move toward disorder — design for graceful decay)",
        "superposition (hold multiple states simultaneously until forced to decide)",
        "resonance (small inputs at the right frequency produce huge effects)",
        "conservation laws (what's invariant? what must always be preserved?)",
        "phase transitions (small parameter changes cause qualitative shifts)",
        "least action principle (nature finds the path that minimizes total effort)",
    ],
    "music": [
        "counterpoint (independent voices that create harmony together)",
        "tension and resolution (build up complexity, then simplify elegantly)",
        "improvisation over structure (fixed rules with creative freedom within them)",
        "rhythm and repetition with variation (patterns that evolve over time)",
        "transposition (same pattern shifted to a different key/context)",
        "call and response (one module proposes, another refines)",
    ],
    "architecture": [
        "load-bearing walls (identify which parts are structural vs decorative)",
        "flying buttresses (external support that enables internal openness)",
        "modular prefabrication (build standardized pieces, compose freely)",
        "negative space (what you leave out defines what you include)",
        "adaptive reuse (repurpose existing structures for new functions)",
        "fractal self-similarity (same pattern at every scale)",
    ],
    "game_theory": [
        "Nash equilibrium (find the stable state where no one benefits from changing)",
        "minimax (minimize the worst case, not just maximize the best case)",
        "mechanism design (build the rules so the desired outcome emerges naturally)",
        "multi-agent coordination (how do independent parts agree without central control?)",
        "explore vs exploit tradeoff (when to try new things vs use what works)",
        "backward induction (reason from the desired end state back to the first move)",
    ],
    "cooking": [
        "mise en place (prepare everything before you start assembling)",
        "reduction (boil down to concentrate the essential flavor)",
        "emulsification (combine things that normally don't mix via a mediator)",
        "fermentation (let a controlled process transform the raw material over time)",
        "layering flavors (each component adds a dimension of complexity)",
        "deglazing (extract value from what's stuck to the bottom)",
    ],
    "martial_arts": [
        "redirect force (use the opponent's energy against them, don't fight it)",
        "economy of motion (achieve maximum effect with minimum movement)",
        "soft overcomes hard (flexibility beats rigidity under pressure)",
        "awareness of center (know your pivot point, everything flows from it)",
        "kata patterns (practice structured forms until they become instinct)",
        "mushin (no-mind: act without overthinking, let trained patterns flow)",
    ],
    "economics": [
        "comparative advantage (do what you're relatively best at, delegate the rest)",
        "opportunity cost (choosing this means giving up that — make it explicit)",
        "marginal returns (each extra unit of effort yields diminishing results)",
        "market making (create a middle layer that matches supply with demand)",
        "futures/options (pay a small cost now to lock in flexibility later)",
        "externalities (account for side effects that spill over boundaries)",
    ],
    "ecology": [
        "niche specialization (dominate a narrow space rather than being mediocre everywhere)",
        "keystone species (one small component the entire system depends on)",
        "succession (simple pioneers prepare the ground for complex systems)",
        "nutrient cycling (outputs become inputs — close the loop, zero waste)",
        "edge effects (the most interesting things happen at boundaries between zones)",
        "redundancy and resilience (multiple species fill similar roles as backup)",
    ],
    "linguistics": [
        "compositionality (meaning of the whole comes from meanings of the parts + rules)",
        "ambiguity as feature (multiple valid interpretations enable flexibility)",
        "pidgin to creole (start simple and messy, formalize what works over time)",
        "code-switching (change register/approach based on context)",
        "recursive embedding (structures that contain themselves — thoughts within thoughts)",
        "pragmatics (meaning depends on context, not just literal content)",
    ],
}


def blend_concepts(
    task_description: str,
    domains: Optional[List[str]] = None,
    num_concepts: int = 2,
) -> str:
    """Generate a concept-blending prompt that encourages cross-domain thinking.

    Instead of asking the model to just "write code", this reframes the problem
    through the lens of concepts from unrelated domains, forcing the model to
    find novel structural analogies.
    """
    available_domains = list(DOMAIN_CONCEPTS.keys())
    if domains:
        available_domains = [d for d in domains if d in DOMAIN_CONCEPTS]
    if len(available_domains) < num_concepts:
        available_domains = list(DOMAIN_CONCEPTS.keys())

    chosen_domains = random.sample(available_domains, num_concepts)
    inspirations = []
    for domain in chosen_domains:
        concept = random.choice(DOMAIN_CONCEPTS[domain])
        inspirations.append(f"- **{domain}**: {concept}")

    return (
        f"## Creative Problem Solving\n\n"
        f"**Task:** {task_description}\n\n"
        f"Before writing code, consider these cross-domain inspirations:\n"
        f"{''.join(chr(10) + i for i in inspirations)}\n\n"
        f"Think about how these concepts could inform a novel approach to "
        f"the task. Don't just apply them literally — use them as creative "
        f"lenses to see the problem differently. Then write a solution that "
        f"goes beyond the obvious approach.\n"
    )


# =============================================================================
# Exploration strategies: reframe problems to unlock unconventional solutions
# =============================================================================

EXPLORATION_TEMPLATES: Dict[str, str] = {
    "invert": (
        "**Inversion:** Instead of solving '{task}' directly, think about "
        "what the *opposite* problem would be. What if you solved the reverse "
        "problem first and then inverted the solution? What does the problem "
        "look like from the output's perspective looking backward?"
    ),
    "analogize": (
        "**Analogy:** What is '{task}' structurally similar to in a completely "
        "different domain? Find a problem in nature, mathematics, or daily life "
        "that has the same abstract shape, and adapt its solution."
    ),
    "decompose": (
        "**Decomposition:** Break '{task}' into the smallest possible sub-problems. "
        "Can any of these sub-problems be solved in an unconventional way? "
        "Can you eliminate any of them entirely by reframing the approach?"
    ),
    "generalize": (
        "**Generalization:** What if '{task}' is a special case of a much broader "
        "problem? Solve the general case first — the specific solution might be "
        "simpler, more elegant, and more reusable than a targeted approach."
    ),
    "constrain": (
        "**Constraint addition:** What if you had to solve '{task}' with an "
        "extreme constraint — no loops? No variables? In one line? Under 10 "
        "tokens? Sometimes artificial constraints force brilliantly creative "
        "solutions that are better than the unconstrained version."
    ),
    "combine": (
        "**Combination:** Take two existing solutions or patterns for '{task}' "
        "that seem incompatible. What would a hybrid look like? The conflict "
        "between them might reveal a third approach that transcends both."
    ),
    "eliminate": (
        "**Elimination:** What parts of '{task}' are actually unnecessary? "
        "What if the best solution is to not solve part of the problem at all? "
        "Challenge every assumption about what needs to exist in the solution."
    ),
}


def generate_exploration_prompt(
    task_description: str,
    strategies: Optional[List[str]] = None,
    num_strategies: int = 2,
) -> str:
    """Generate prompts that push the model to explore unconventional solutions."""
    available = list(EXPLORATION_TEMPLATES.keys())
    if strategies:
        available = [s for s in strategies if s in EXPLORATION_TEMPLATES]
    if len(available) < num_strategies:
        available = list(EXPLORATION_TEMPLATES.keys())

    chosen = random.sample(available, min(num_strategies, len(available)))
    prompts = []
    for strategy in chosen:
        prompts.append(EXPLORATION_TEMPLATES[strategy].format(task=task_description))

    return (
        f"## Exploring Novel Approaches\n\n"
        f"For the task: *{task_description}*\n\n"
        f"Consider these alternative angles:\n\n"
        + "\n\n".join(prompts) + "\n\n"
        f"Use these perspectives to find an approach that someone who only "
        f"thinks in conventional patterns would miss.\n"
    )


# =============================================================================
# Multi-perspective generation: solve from multiple angles, then synthesize
# =============================================================================

PERSPECTIVE_ROLES = [
    ("Performance Engineer", "Optimize for speed and memory. What data structures "
     "and algorithms give the best asymptotic and practical performance?"),
    ("Functional Programmer", "Think in pure functions, immutable data, and "
     "composition. How would this look with no side effects?"),
    ("Mathematician", "What's the underlying mathematical structure? Is there "
     "a closed-form solution, a transform, or a theorem that makes this trivial?"),
    ("Systems Thinker", "How does this interact with the rest of the system? "
     "What are the edge cases at boundaries? What fails under scale?"),
    ("Minimalist", "What's the absolute simplest solution? Can you solve this "
     "in 5 lines? What if you deleted half the requirements?"),
    ("Security Researcher", "What are the attack vectors? What assumptions "
     "can be violated? How would an adversary abuse this?"),
    ("Creative Hacker", "What's the cleverest, most unexpected solution? "
     "Abuse language features, exploit mathematical properties, find shortcuts."),
    ("Biologist", "How would nature solve this? Think in terms of evolution, "
     "feedback loops, adaptation, and emergent behavior."),
]


def generate_multiperspective_prompt(
    task_description: str,
    num_perspectives: int = 3,
) -> str:
    """Ask the model to solve a problem from multiple expert perspectives,
    then synthesize the best ideas into one solution."""
    chosen = random.sample(PERSPECTIVE_ROLES, min(num_perspectives, len(PERSPECTIVE_ROLES)))
    perspectives = []
    for name, desc in chosen:
        perspectives.append(f"### {name}\n{desc}")

    return (
        f"## Multi-Perspective Problem Solving\n\n"
        f"**Task:** {task_description}\n\n"
        f"Approach this from {len(chosen)} different expert perspectives:\n\n"
        + "\n\n".join(perspectives) + "\n\n"
        f"For each perspective, sketch a brief approach (2-3 sentences). "
        f"Then synthesize the best ideas from all perspectives into one "
        f"final solution that is more creative and robust than any single "
        f"viewpoint could produce.\n"
    )


# =============================================================================
# Novelty scoring: detect and penalize repetitive/clichéd patterns
# =============================================================================

# Common code patterns that are "too obvious" — the model should try harder
COMMON_PATTERNS = [
    "for i in range(len(",       # indexing instead of iterating
    "if x == True",              # redundant comparison
    "except Exception:",          # bare except
    "import *",                   # star imports
    "global ",                    # global variables
    ".append(",                   # list building (sometimes list comp is better)
    "while True:",                # infinite loops
    "time.sleep(",               # polling instead of events
    "threading.Thread(",          # raw threads instead of pools/async
    "os.system(",                 # shell calls instead of subprocess
]


def score_novelty(code: str, history: Optional[List[str]] = None) -> Tuple[float, List[str]]:
    """Score how novel a code solution is. Returns (score, suggestions).

    Score ranges from 0.0 (very clichéd) to 1.0 (highly novel).
    """
    score = 1.0
    suggestions = []

    # Penalize common anti-patterns
    for pattern in COMMON_PATTERNS:
        if pattern in code:
            score -= 0.05
            suggestions.append(f"Consider alternatives to `{pattern.strip()}`")

    # Penalize repetition from history
    if history:
        for prev_code in history[-5:]:
            # Simple structural similarity check
            prev_lines = set(prev_code.strip().split("\n"))
            curr_lines = set(code.strip().split("\n"))
            if prev_lines and curr_lines:
                overlap = len(prev_lines & curr_lines) / max(len(curr_lines), 1)
                if overlap > 0.5:
                    score -= 0.2
                    suggestions.append("This solution is structurally similar to a previous attempt. Try a fundamentally different approach.")
                    break

    # Reward indicators of creative thinking
    creative_signals = [
        ("functools", 0.05, "Using functional tools"),
        ("itertools", 0.05, "Using iterator composition"),
        ("collections.", 0.05, "Using specialized data structures"),
        ("@property", 0.03, "Using computed properties"),
        ("__", 0.03, "Using dunder methods (protocol-based design)"),
        ("yield", 0.05, "Using generators (lazy evaluation)"),
        ("lambda", 0.03, "Using anonymous functions"),
        ("dataclass", 0.03, "Using structured data"),
        ("TypeVar", 0.05, "Using generic types"),
        ("contextmanager", 0.05, "Using context managers"),
    ]
    for signal, bonus, _reason in creative_signals:
        if signal in code:
            score += bonus

    score = max(0.0, min(1.0, score))
    return score, suggestions


# =============================================================================
# Main creativity engine: orchestrates all techniques
# =============================================================================

class CreativityEngine:
    """Orchestrates creative code generation by combining concept blending,
    exploration strategies, multi-perspective solving, and novelty scoring.

    Usage:
        engine = CreativityEngine()

        # Enhance a user's coding request with creative scaffolding
        creative_prompt = engine.enhance_prompt(
            "Write a function to find the shortest path in a graph"
        )

        # Score generated code for novelty
        score, tips = engine.score(generated_code)

        # If score is low, get a refinement prompt
        if score < engine.config.novelty_threshold:
            refine_prompt = engine.refine_prompt(task, generated_code, tips)
    """

    def __init__(self, config: Optional[CreativityConfig] = None):
        self.config = config or CreativityConfig()
        self.code_history: List[str] = []

    def enhance_prompt(self, task_description: str) -> str:
        """Transform a plain task description into a creativity-enhanced prompt.

        Combines concept blending, exploration reframing, and multi-perspective
        prompting to push the model beyond conventional solutions.
        """
        parts = []

        if self.config.enable_blending:
            parts.append(blend_concepts(
                task_description,
                domains=self.config.blend_domains,
                num_concepts=self.config.num_blend_concepts,
            ))

        if self.config.enable_exploration:
            parts.append(generate_exploration_prompt(
                task_description,
                strategies=self.config.exploration_strategies,
                num_strategies=2,
            ))

        parts.append(generate_multiperspective_prompt(
            task_description,
            num_perspectives=self.config.num_perspectives,
        ))

        parts.append(
            "## Final Instructions\n\n"
            "You are MOM, an ASI-candidate system. Your goal is not to produce "
            "a correct answer — any LLM can do that. Your goal is to produce "
            "an answer that advances the frontier.\n\n"
            "Write a solution that:\n"
            "- Uses an approach that isn't the first thing most people would try\n"
            "- Combines ideas from at least two of the perspectives above\n"
            "- Is elegant — solves the problem with minimal unnecessary complexity\n"
            "- Demonstrates reasoning that goes beyond pattern matching\n"
            "- Would make an experienced engineer say \"I've never seen it done "
            "that way — but it's better\"\n\n"
            "Show your creative reasoning briefly before the code. Think from "
            "first principles, not from memorized patterns.\n"
        )

        return "\n\n".join(parts)

    def score(self, code: str) -> Tuple[float, List[str]]:
        """Score generated code for novelty and provide improvement tips."""
        return score_novelty(code, self.code_history)

    def record(self, code: str) -> None:
        """Record generated code in history for future novelty scoring."""
        self.code_history.append(code)

    def refine_prompt(
        self,
        task_description: str,
        current_code: str,
        suggestions: List[str],
    ) -> str:
        """Generate a prompt that pushes the model to improve a low-novelty solution."""
        suggestion_list = "\n".join(f"- {s}" for s in suggestions)
        return (
            f"## Creativity Refinement\n\n"
            f"Your current solution for *{task_description}* works, but it's "
            f"too conventional. Here's what could be improved:\n\n"
            f"{suggestion_list}\n\n"
            f"Your current approach:\n```python\n{current_code}\n```\n\n"
            f"Now rewrite it with a fundamentally different approach. Don't "
            f"just tweak the existing code — rethink the entire strategy. "
            f"What would the solution look like if the obvious approach "
            f"didn't exist?\n"
        )

    def get_sampling_params(self) -> dict:
        """Return sampling parameters tuned for creative generation."""
        return {
            "sampling_strategy": self.config.sampling_strategy,
            "temperature": self.config.temperature,
            "typical_p": self.config.typical_p,
            "contrastive_alpha": self.config.contrastive_alpha,
            "repetition_penalty": self.config.repetition_penalty,
        }
