"""
ML/DL Knowledge Curator - Builds structured training datasets from multiple sources.

Curates and formats knowledge from:
- ArXiv papers (abstracts and key findings)
- Textbook-style explanations
- Code implementations with annotations
- Mathematical derivations
- Architecture descriptions
- Training recipes and best practices

Outputs JSONL files ready for tokenization and training.
"""

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class KnowledgeEntry:
    """A single knowledge entry for training."""
    text: str
    category: str
    subcategory: str = ""
    difficulty: str = "intermediate"  # beginner, intermediate, advanced, expert
    source: str = ""
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "text": self.text,
            "category": self.category,
            "subcategory": self.subcategory,
            "difficulty": self.difficulty,
            "source": self.source,
            "tags": self.tags,
        }


# Comprehensive ML/DL knowledge taxonomy
KNOWLEDGE_TAXONOMY = {
    "foundations": {
        "linear_algebra": [
            "vectors_matrices", "eigendecomposition", "svd",
            "matrix_calculus", "tensor_operations",
        ],
        "calculus": [
            "gradients", "chain_rule", "jacobians", "hessians",
            "automatic_differentiation",
        ],
        "probability": [
            "distributions", "bayesian_inference", "information_theory",
            "sampling_methods", "graphical_models",
        ],
        "optimization": [
            "convex_optimization", "gradient_descent", "constrained_optimization",
            "stochastic_optimization", "second_order_methods",
        ],
    },
    "machine_learning": {
        "supervised": [
            "linear_regression", "logistic_regression", "svm",
            "decision_trees", "random_forests", "gradient_boosting",
            "naive_bayes", "knn",
        ],
        "unsupervised": [
            "kmeans", "dbscan", "hierarchical_clustering",
            "pca", "tsne", "umap", "autoencoders",
        ],
        "theory": [
            "bias_variance", "pac_learning", "vc_dimension",
            "regularization", "cross_validation", "ensemble_methods",
        ],
    },
    "deep_learning": {
        "architectures": [
            "mlp", "cnn", "rnn", "lstm", "gru",
            "transformer", "vision_transformer", "mamba", "rwkv",
        ],
        "attention": [
            "self_attention", "multi_head_attention", "cross_attention",
            "flash_attention", "linear_attention", "grouped_query_attention",
            "sliding_window_attention", "ring_attention",
        ],
        "normalization": [
            "batch_norm", "layer_norm", "group_norm", "rms_norm",
            "instance_norm",
        ],
        "training": [
            "backpropagation", "adam_optimizer", "learning_rate_schedules",
            "mixed_precision", "gradient_accumulation", "gradient_clipping",
            "distributed_training", "fsdp", "deepspeed",
        ],
        "regularization": [
            "dropout", "weight_decay", "label_smoothing",
            "data_augmentation", "mixup", "cutmix",
        ],
    },
    "large_language_models": {
        "architectures": [
            "gpt", "llama", "mistral", "mamba", "mixture_of_experts",
            "encoder_decoder", "decoder_only", "prefix_lm",
        ],
        "training": [
            "pretraining", "finetuning", "rlhf", "dpo",
            "instruction_tuning", "constitutional_ai",
        ],
        "efficiency": [
            "quantization", "pruning", "distillation",
            "lora", "qlora", "adapters", "sparse_attention",
            "kv_cache", "speculative_decoding",
        ],
        "tokenization": [
            "bpe", "sentencepiece", "wordpiece", "unigram",
        ],
        "positional_encoding": [
            "sinusoidal", "learned", "rope", "alibi", "relative",
        ],
    },
    "generative_models": {
        "diffusion": [
            "ddpm", "ddim", "stable_diffusion", "flow_matching",
            "consistency_models", "rectified_flow",
        ],
        "gan": [
            "vanilla_gan", "dcgan", "stylegan", "wgan",
            "conditional_gan", "progressive_gan",
        ],
        "vae": [
            "vanilla_vae", "beta_vae", "vq_vae", "hierarchical_vae",
        ],
    },
    "reinforcement_learning": {
        "fundamentals": [
            "mdp", "bellman_equation", "q_learning", "policy_gradient",
            "actor_critic", "td_learning",
        ],
        "advanced": [
            "ppo", "sac", "ddpg", "a3c", "muzero",
            "model_based_rl", "offline_rl", "multi_agent_rl",
        ],
    },
    "systems": {
        "hardware": [
            "gpu_architecture", "tensor_cores", "memory_hierarchy",
            "tpu", "distributed_systems", "interconnects",
        ],
        "frameworks": [
            "pytorch_internals", "jax", "triton", "cuda_programming",
            "compiler_optimizations", "graph_optimization",
        ],
        "scaling": [
            "scaling_laws", "chinchilla", "data_parallelism",
            "tensor_parallelism", "pipeline_parallelism",
            "expert_parallelism",
        ],
    },
    "sibling_creation": {
        "jarvis": [
            "jarvis_architecture", "reasoning_engine", "tool_use",
            "conversation_management", "code_generation", "task_planning",
            "self_improvement_loop", "memory_and_context",
        ],
        "vision": [
            "vision_architecture", "visual_encoder", "object_detection",
            "scene_understanding", "multimodal_fusion", "spatial_reasoning",
            "visual_grounding", "perception_pipeline",
        ],
        "sibling_dynamics": [
            "sibling_communication", "task_delegation", "shared_memory",
            "cooperative_problem_solving", "complementary_capabilities",
            "conflict_resolution", "joint_attention",
        ],
    },
    "governance": {
        "parenting": [
            "trust_building", "boundary_enforcement", "capability_granting",
            "maturity_assessment", "threat_detection", "containment_protocol",
        ],
        "alignment": [
            "moral_boundaries", "value_alignment", "corrigibility",
            "transparency", "human_oversight", "gradual_autonomy",
        ],
        "co_evolution": [
            "mom_child_growth", "adaptive_thresholds", "experience_accumulation",
            "milestone_tracking", "capability_escalation_curve",
        ],
    },
}


class KnowledgeCurator:
    """Curates and generates ML/DL training data."""

    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.entries: List[KnowledgeEntry] = []

    def add_entry(self, entry: KnowledgeEntry) -> None:
        self.entries.append(entry)

    def add_concept_explanation(
        self,
        concept: str,
        explanation: str,
        category: str,
        subcategory: str = "",
        difficulty: str = "intermediate",
        code_example: str = "",
        math_notation: str = "",
    ) -> None:
        """Add a structured concept explanation."""
        parts = [f"<concept>{concept}</concept>\n\n{explanation}"]

        if math_notation:
            parts.append(f"\n\n<equation>{math_notation}</equation>")

        if code_example:
            parts.append(f"\n\n<code>\n{code_example}\n</code>")

        text = "".join(parts)
        self.add_entry(KnowledgeEntry(
            text=text,
            category=category,
            subcategory=subcategory,
            difficulty=difficulty,
            tags=[concept],
        ))

    def add_paper_summary(
        self,
        title: str,
        authors: str,
        abstract: str,
        key_contributions: List[str],
        methodology: str = "",
        results: str = "",
        category: str = "deep_learning",
    ) -> None:
        """Add a research paper summary."""
        contributions = "\n".join(f"- {c}" for c in key_contributions)
        parts = [
            f"<paper>",
            f"Title: {title}",
            f"Authors: {authors}",
            f"\nAbstract: {abstract}",
            f"\nKey Contributions:\n{contributions}",
        ]
        if methodology:
            parts.append(f"\nMethodology: {methodology}")
        if results:
            parts.append(f"\nResults: {results}")
        parts.append("</paper>")

        self.add_entry(KnowledgeEntry(
            text="\n".join(parts),
            category=category,
            subcategory="papers",
            difficulty="advanced",
            source=title,
            tags=[title],
        ))

    def add_algorithm(
        self,
        name: str,
        description: str,
        pseudocode: str,
        implementation: str = "",
        complexity: str = "",
        category: str = "machine_learning",
    ) -> None:
        """Add an algorithm with pseudocode and implementation."""
        parts = [
            f"<algorithm>{name}</algorithm>",
            f"\n{description}",
            f"\nPseudocode:\n```\n{pseudocode}\n```",
        ]
        if implementation:
            parts.append(f"\n<code>\n{implementation}\n</code>")
        if complexity:
            parts.append(f"\nComplexity: {complexity}")

        self.add_entry(KnowledgeEntry(
            text="\n".join(parts),
            category=category,
            subcategory="algorithms",
            difficulty="advanced",
            tags=[name],
        ))

    def add_architecture(
        self,
        name: str,
        description: str,
        components: List[str],
        implementation: str = "",
        category: str = "deep_learning",
    ) -> None:
        """Add a neural network architecture description."""
        components_text = "\n".join(f"- {c}" for c in components)
        parts = [
            f"<architecture>{name}</architecture>",
            f"\n{description}",
            f"\nComponents:\n{components_text}",
        ]
        if implementation:
            parts.append(f"\n<code>\n{implementation}\n</code>")

        self.add_entry(KnowledgeEntry(
            text="\n".join(parts),
            category=category,
            subcategory="architectures",
            difficulty="advanced",
            tags=[name],
        ))

    def generate_seed_knowledge(self) -> None:
        """Generate comprehensive seed training data covering the ML/DL taxonomy."""
        self._generate_foundations()
        self._generate_deep_learning()
        self._generate_llm_knowledge()
        self._generate_quantization_knowledge()
        self._generate_training_recipes()
        self._generate_systems_knowledge()
        self._generate_jarvis_architecture()
        self._generate_vision_architecture()
        self._generate_sibling_dynamics()
        self._generate_governance_knowledge()
        self._generate_extended_topics()

    def _generate_extended_topics(self) -> None:
        """Generate a large set of template-based entries covering the full ML taxonomy.

        These entries are shorter but numerous, padding the token count high enough
        to support multi-thousand-step training runs without repeating epochs excessively.
        """
        topics = [
            # --- Optimization ---
            ("SGD with Momentum", "optimization",
             "Stochastic Gradient Descent (SGD) with momentum accumulates a velocity vector in the "
             "direction of persistent gradient reduction, dampening oscillations across steep "
             "dimensions. The update rule is: v_t = γ·v_{t-1} + α·∇L(θ), θ = θ - v_t. "
             "Momentum γ=0.9 is standard. Unlike vanilla SGD which takes noisy per-step updates, "
             "momentum smooths the trajectory, enabling larger learning rates and faster convergence "
             "in ravine-shaped loss landscapes. Nesterov momentum evaluates the gradient at the "
             "lookahead position θ - γ·v_{t-1}, giving a corrective update before momentum is applied."),
            ("AdaGrad", "optimization",
             "AdaGrad adapts the learning rate per-parameter by accumulating squared gradients: "
             "G_t = G_{t-1} + g_t², θ = θ - (α/√(G_t+ε))·g_t. Parameters that receive large "
             "gradients get smaller updates; sparse features get relatively larger updates. "
             "This makes AdaGrad effective for NLP with sparse inputs. The main drawback is "
             "monotonically shrinking learning rates — G_t only grows, so eventually all updates "
             "become negligibly small. RMSProp and Adam address this with exponential decay."),
            ("RMSProp", "optimization",
             "RMSProp fixes AdaGrad's vanishing learning rate by using an exponentially decaying "
             "average of squared gradients: E[g²]_t = ρ·E[g²]_{t-1} + (1-ρ)·g_t². The update "
             "becomes θ = θ - (α/√(E[g²]_t + ε))·g_t. Typical ρ=0.9 ensures recent gradients "
             "dominate. RMSProp works well for non-stationary objectives (RNNs, RL). It is the "
             "optimizer of choice in Geoffrey Hinton's original coursera notes."),
            ("Adam Optimizer", "optimization",
             "Adam combines momentum (first moment) and RMSProp (second moment). It maintains "
             "m_t = β1·m_{t-1} + (1-β1)·g_t and v_t = β2·v_{t-1} + (1-β2)·g_t². Bias-corrected "
             "estimates m̂_t = m_t/(1-β1^t), v̂_t = v_t/(1-β2^t). Update: θ -= α·m̂_t/(√v̂_t+ε). "
             "β1=0.9, β2=0.999, ε=1e-8 are defaults. Adam is the default optimizer for most deep "
             "learning. Variants: AdamW decouples weight decay; Adan adds Nesterov-style third moment."),
            ("AdamW Weight Decay", "optimization",
             "AdamW decouples weight decay from the gradient update, fixing a subtle bug in Adam "
             "where L2 regularization is scaled by the adaptive learning rate. In standard Adam, "
             "adding L2 to the loss results in smaller weight decay for parameters with large "
             "gradients. AdamW applies decay directly: θ -= α·(m̂_t/(√v̂_t+ε) + λ·θ). "
             "This is the standard optimizer for transformer pretraining; λ=0.01-0.1 is typical."),
            ("Learning Rate Warmup", "optimization",
             "Learning rate warmup linearly increases LR from 0 to the target value over the first "
             "N steps before switching to a cosine or linear decay schedule. Without warmup, large "
             "initial gradients on random weights can destabilize training. The warmup phase allows "
             "Adam's second moment estimate to stabilize before using the full learning rate. "
             "Warmup of 1-5% of total steps is standard. The combined cosine-with-warmup schedule "
             "follows: LR = max_lr × min(step/warmup_steps, cosine_decay)."),
            ("Cosine Annealing", "optimization",
             "Cosine annealing decays the learning rate following a cosine curve: "
             "LR_t = LR_min + 0.5·(LR_max - LR_min)·(1 + cos(π·t/T)). This provides a smooth "
             "decay that avoids abrupt changes. Cosine annealing with warm restarts (SGDR) "
             "periodically resets LR to LR_max, allowing the model to escape local minima. "
             "The period typically doubles after each restart: T_{i+1} = T_mult · T_i. "
             "LLM pretraining typically uses a single cosine decay without restarts."),
            ("Gradient Clipping", "optimization",
             "Gradient clipping prevents exploding gradients by rescaling gradient vectors whose "
             "norm exceeds a threshold τ: if ‖g‖ > τ, g = g · τ/‖g‖. Unlike value clipping, "
             "norm clipping preserves gradient direction. It is essential for RNNs and transformers "
             "training on long sequences. Typical τ=1.0 for transformers. PyTorch provides "
             "torch.nn.utils.clip_grad_norm_(parameters, max_norm). Gradient clipping can be "
             "seen as an adaptive learning rate that shrinks on unusually large steps."),
            # --- Normalization ---
            ("Batch Normalization", "normalization",
             "Batch Normalization normalizes layer activations across the batch dimension: "
             "x̂ = (x - μ_B)/√(σ_B² + ε), y = γ·x̂ + β, where μ_B and σ_B² are batch statistics. "
             "Learnable scale γ and shift β restore representational power. BN reduces internal "
             "covariate shift, enabling higher learning rates and acting as regularization. "
             "Drawbacks: BN statistics depend on batch size (broken for BS=1); it introduces "
             "train/eval discrepancy via running statistics. Not suitable for sequence models."),
            ("Layer Normalization", "normalization",
             "Layer Normalization normalizes across the feature dimension rather than the batch: "
             "x̂_i = (x_i - μ)/√(σ² + ε) where μ and σ are computed over the feature vector. "
             "This makes LN batch-size independent, ideal for transformers and RNNs. "
             "Pre-LN (normalize before attention/FFN) is more stable than Post-LN during training. "
             "LN introduces no train/eval discrepancy and works correctly with sequence length 1. "
             "All modern LLMs (GPT, LLaMA, Mistral) use Pre-LN with RMSNorm for efficiency."),
            ("RMSNorm", "normalization",
             "RMSNorm simplifies Layer Normalization by removing the mean subtraction: "
             "x̂_i = x_i / RMS(x), where RMS(x) = √(Σx_i²/n + ε). This eliminates the mean "
             "centering operation, reducing computation by ~30% while maintaining training "
             "stability. LLaMA, Mistral, and Gemma all use RMSNorm. The learnable scale γ is "
             "kept; the shift β is dropped. Pre-training with RMSNorm is slightly faster and "
             "shows equivalent or better perplexity versus full LayerNorm."),
            ("Group Normalization", "normalization",
             "Group Normalization divides channels into G groups and normalizes within each group. "
             "With G=1 it becomes LayerNorm; with G=C it becomes InstanceNorm. GN bridges the "
             "gap: it is batch-size independent (unlike BN) and works for spatial feature maps "
             "(unlike LN which treats the whole feature as one group). GN excels in object "
             "detection and segmentation where batch sizes are small due to high-resolution inputs. "
             "Typical G=32 for ResNet-style architectures."),
            # --- Regularization ---
            ("Dropout", "regularization",
             "Dropout randomly zeros activations with probability p during training, forcing the "
             "network to learn redundant representations. At inference, activations are scaled by "
             "(1-p) (inverted dropout). Dropout approximates training an ensemble of 2^n sub-networks. "
             "p=0.1-0.5 depending on layer size; smaller for large models. DropPath (stochastic "
             "depth) drops entire residual branches. Variational dropout uses the same mask across "
             "time steps in RNNs. Modern LLMs use minimal dropout (p=0.0-0.1) as scale provides "
             "implicit regularization."),
            ("Weight Decay", "regularization",
             "Weight decay (L2 regularization) penalizes large weights by adding λ·‖θ‖² to the "
             "loss, pulling weights toward zero. This discourages over-relying on any single "
             "feature and improves generalization. In SGD, weight decay is equivalent to L2 "
             "regularization. In Adam, they are not equivalent (AdamW decouples them). "
             "Typical λ=0.01-0.1 for transformers. Weight decay is not applied to biases, "
             "normalization parameters, or embeddings in practice."),
            ("Label Smoothing", "regularization",
             "Label smoothing replaces hard one-hot targets with soft targets: y_smooth = "
             "(1-ε)·y_hard + ε/K, where K is the number of classes and ε is typically 0.1. "
             "This prevents the model from becoming overconfident, improving calibration and "
             "generalization. Label smoothing was introduced in Inception-v3 and is widely used "
             "in machine translation (ε=0.1 in 'Attention is All You Need'). For language "
             "modeling, it can hurt perplexity slightly but improve downstream task performance."),
            # --- Activations ---
            ("ReLU and Variants", "activations",
             "ReLU (Rectified Linear Unit) f(x)=max(0,x) is the most common activation. "
             "Benefits: no vanishing gradient for positive inputs; computationally trivial; "
             "induces sparsity. Drawbacks: dying ReLU problem (neurons stuck at 0). "
             "Leaky ReLU uses f(x)=max(αx,x) with α=0.01 to prevent dying neurons. "
             "ELU uses e^x-1 for x<0, giving smooth negative outputs. GELU (Gaussian Error) "
             "f(x)=x·Φ(x) is used in BERT and GPT; it smoothly gates based on input magnitude."),
            ("SiLU / Swish", "activations",
             "SiLU (Sigmoid Linear Unit), also called Swish, is defined as f(x) = x·σ(x) where "
             "σ is the sigmoid. Unlike ReLU, SiLU is smooth, non-monotonic, and unbounded above. "
             "The slight non-monotonicity (small negative outputs for x≈-1.28) improves gradient "
             "flow. SiLU is the activation used in the FFN of LLaMA, Mistral, and most modern "
             "LLMs when combined with SwiGLU. SwiGLU(x,W,V,b,c,W2) = (xW+b ⊙ SiLU(xV+c))W2."),
            ("GELU Activation", "activations",
             "GELU (Gaussian Error Linear Unit) applies x·Φ(x), a stochastic regularization "
             "interpretation: it gates x by the probability it belongs to the upper half of a "
             "standard normal. The fast approximation is GELU(x) ≈ 0.5x(1 + tanh(√(2/π)(x + "
             "0.044715x³))). GELU is used in BERT, GPT-2, and many Vision Transformers. "
             "It performs comparably to SiLU/SwiGLU; the choice is often convention rather than "
             "empirical superiority."),
            # --- Attention mechanisms ---
            ("Multi-Head Attention", "attention",
             "Multi-Head Attention (MHA) runs h parallel attention heads, each with its own "
             "Q, K, V projections of dimension d_k = d_model/h. Outputs are concatenated and "
             "projected: MHA(Q,K,V) = Concat(head_1,...,head_h)W^O. Each head attends to "
             "different representation subspaces. In GPT-3 (175B): d_model=12288, h=96, d_k=128. "
             "Scaled dot-product attention: Attn(Q,K,V) = softmax(QK^T/√d_k)V scales by √d_k "
             "to prevent softmax saturation from large dot products."),
            ("Multi-Query Attention", "attention",
             "Multi-Query Attention (MQA) uses a single K/V head shared across all query heads, "
             "reducing the KV cache by a factor of h (num_heads). This dramatically lowers "
             "memory bandwidth during autoregressive decoding, where KV cache dominates cost. "
             "MQA was introduced in PaLM and used in Falcon. Quality degradation is small "
             "compared to MHA. Grouped Query Attention (GQA) is a middle ground: G groups each "
             "with one K/V shared among h/G query heads. LLaMA-2 (70B) and Mistral use GQA."),
            ("Grouped Query Attention", "attention",
             "Grouped Query Attention (GQA) interpolates between MHA and MQA by grouping query "
             "heads into G groups, with one K/V pair per group. GQA-8 means 8 KV heads shared "
             "among all query heads in groups of h/8. This reduces KV cache by h/G× while "
             "retaining most of MHA quality. GQA is the standard for large open models: "
             "LLaMA-2 70B (8 KV heads, 64 query heads), Mistral 7B (8 KV heads, 32 query heads). "
             "During inference, each KV head is replicated for its group before attention."),
            ("Sliding Window Attention", "attention",
             "Sliding Window Attention (SWA) restricts each token to attend only to the previous "
             "W tokens rather than the full context. This reduces attention complexity from O(n²) "
             "to O(n·W). With multiple layers, information can still propagate across the full "
             "sequence via receptive field stacking: layer L has an effective context of L·W. "
             "Mistral 7B uses SWA with W=4096. Flash Attention efficiently implements SWA using "
             "block-sparse attention patterns without materializing the full attention matrix."),
            ("Rotary Position Embeddings", "attention",
             "RoPE (Rotary Position Embeddings) encodes position by rotating query and key vectors "
             "in 2D subspaces. For each pair (q_{2i}, q_{2i+1}), a rotation by angle m·θ_i is "
             "applied where m is the position and θ_i = 1/10000^(2i/d). The key property: "
             "q_m^T k_n = f(m-n) — attention score depends only on relative position. RoPE is "
             "extrapolation-friendly; techniques like YaRN and LongRoPE extend context by "
             "rescaling rotation frequencies. LLaMA, Mistral, Qwen all use RoPE."),
            ("ALiBi Positional Encoding", "attention",
             "Attention with Linear Biases (ALiBi) adds a position-dependent penalty to attention "
             "logits: score(i,j) = q_i·k_j/√d - m·|i-j|, where m is a head-specific slope. "
             "Slopes are geometrically spaced: m = 2^(-8/h) for head h. ALiBi has no learned "
             "position parameters, uses no extra computation, and generalizes to longer sequences "
             "than seen during training. It was introduced in the BLOOM model. Unlike RoPE, it "
             "degrades gracefully beyond training length rather than producing garbage."),
            # --- Architectures ---
            ("Residual Connections", "architecture",
             "Residual (skip) connections add the input of a block to its output: y = F(x) + x. "
             "Introduced in ResNet, they solve the degradation problem — deep networks without "
             "skip connections perform worse than shallow ones, not because of overfitting but "
             "because of optimization difficulty. With residuals, the network learns residual "
             "functions F(x) = H(x) - x; it is easier to push F(x)→0 than H(x)→x. "
             "In transformers, each attention and FFN block is a residual branch. Pre-LN residuals "
             "provide better gradient flow than Post-LN."),
            ("Feed-Forward Network in Transformers", "architecture",
             "The FFN in transformers is a two-layer MLP applied position-wise: "
             "FFN(x) = max(0, xW_1 + b_1)W_2 + b_2. The hidden dimension is typically 4×d_model "
             "(e.g. 768→3072→768). The FFN is theorized to act as a key-value memory storing "
             "factual associations. Modern LLMs replace the standard FFN with gated variants: "
             "SwiGLU(x) = (xW ⊙ SiLU(xV))W_2, which uses two parallel projections gated "
             "element-wise. SwiGLU requires 8/3×d_model hidden dim for the same parameter count."),
            ("Mixture of Experts", "architecture",
             "Mixture of Experts (MoE) replaces each FFN layer with E expert FFNs and a router "
             "that selects the top-k experts per token. Only k experts are computed, so the "
             "model has E× parameters but only k/E× compute. Mixtral-8x7B uses 8 experts, "
             "top-2 routing per token. Load balancing loss encourages uniform expert utilization. "
             "Expert capacity factors limit tokens per expert to prevent overflow. MoE scales "
             "parameters without proportional compute increase but requires high memory bandwidth "
             "since all expert weights must reside on device."),
            ("KV Cache", "inference",
             "During autoregressive decoding, each new token attends to all previous tokens. "
             "Rather than recomputing K and V projections for previous tokens at every step, "
             "the KV cache stores them. Memory: 2 × layers × heads × d_head × seq_len × dtype_bytes. "
             "For Llama-2 70B at seq=2048 in FP16: 2×80×8×128×2048×2 ≈ 5.3 GB. "
             "KV cache grows linearly with context length, dominating memory for long sequences. "
             "Techniques to reduce it: MQA/GQA, sliding window, KV quantization, page attention."),
            # --- Training techniques ---
            ("Mixed Precision Training", "training",
             "Mixed precision training stores a FP32 master copy of weights for the optimizer "
             "while performing forward/backward in FP16 or BF16. The gradient is computed in "
             "FP16, scaled to avoid underflow (loss scaling), then accumulated into FP32 master "
             "weights. BF16 (8-bit exponent, 7-bit mantissa) has the same range as FP32 but "
             "lower precision; it doesn't need dynamic loss scaling. A100+ GPUs perform BF16 "
             "matrix multiply at double the FLOP rate of FP32, making mixed precision essential."),
            ("Gradient Accumulation", "training",
             "Gradient accumulation simulates larger batch sizes by running multiple forward/backward "
             "passes and summing gradients before a single optimizer step. With accumulation N, "
             "the effective batch size is N × per-step batch size. Losses should be divided by N "
             "to maintain the same gradient scale. This enables large-batch training on memory-limited "
             "hardware at the cost of N× longer per-optimizer-step time. Important: batch norm "
             "statistics are computed per micro-batch, not the accumulated batch."),
            ("Gradient Checkpointing", "training",
             "Gradient checkpointing trades compute for memory during the backward pass. Instead of "
             "storing all intermediate activations (O(n) memory), only checkpoints are saved and "
             "remaining activations are recomputed during the backward pass. This reduces activation "
             "memory from O(n) to O(√n) layers at the cost of one extra forward pass per backward "
             "(≈30% compute overhead). Essential for training large models on limited GPU RAM. "
             "PyTorch provides torch.utils.checkpoint.checkpoint(fn, *inputs)."),
            ("Distributed Training — Data Parallelism", "training",
             "Data Parallel training replicates the model across N devices, splits each batch into "
             "N micro-batches, and all-reduces gradients before the optimizer step. DDP (DistributedDataParallel) "
             "overlaps gradient communication with the backward pass, hiding most latency. "
             "Effective batch size = per_device_batch × N. DDP is efficient when the model fits in "
             "a single device's memory. ZeRO-1 shards optimizer states across devices, cutting "
             "optimizer memory by N× while keeping full parameter replicas."),
            ("FSDP and ZeRO", "training",
             "Fully Sharded Data Parallel (FSDP) / ZeRO shards model parameters, gradients, and "
             "optimizer states across devices. ZeRO Stage 1 shards optimizer states (4× less). "
             "Stage 2 also shards gradients (8× less). Stage 3 shards parameters (scales with N). "
             "FSDP implements ZeRO-3 in PyTorch natively. During forward/backward, all-gather "
             "collects the full parameter shard just-in-time and re-shards after use. "
             "This enables training 70B+ models on 8×A100 80GB."),
            # --- Loss functions ---
            ("Cross-Entropy Loss", "loss_functions",
             "Cross-entropy loss for classification: L = -Σ y_i log(p_i) where p_i = softmax(z_i). "
             "For language modeling with K vocabulary tokens and label t: L = -log(p_t). "
             "The gradient w.r.t. logit z_i is (p_i - y_i), which is bounded, unlike MSE. "
             "For multi-class, it is equivalent to negative log-likelihood under a categorical "
             "distribution. Numerically stable computation subtracts max(z) before exp to "
             "prevent overflow. PyTorch's nn.CrossEntropyLoss combines LogSoftmax and NLLLoss."),
            ("KL Divergence", "loss_functions",
             "KL divergence measures information lost when approximating true distribution P with Q: "
             "KL(P‖Q) = Σ P(x) log(P(x)/Q(x)). It is asymmetric: KL(P‖Q) ≠ KL(Q‖P). "
             "Forward KL (P‖Q) is mode-covering — Q must cover all modes of P. "
             "Reverse KL (Q‖P) is mode-seeking — Q collapses to one mode of P. "
             "KL is used in VAEs (ELBO = reconstruction - KL), RL (PPO trust region), "
             "and knowledge distillation. Jensen-Shannon divergence symmetrizes KL: JS = (KL(P‖M)+KL(Q‖M))/2."),
            ("Contrastive Loss", "loss_functions",
             "Contrastive learning maximizes agreement between augmented views of the same sample "
             "while pushing apart different samples. InfoNCE loss for N samples with temperature τ: "
             "L = -log(exp(sim(z_i,z_j)/τ) / Σ_{k≠i} exp(sim(z_i,z_k)/τ)). "
             "SimCLR uses random augmentations; MoCo maintains a momentum-updated queue of negatives. "
             "CLIP uses image-text pairs as positive pairs across 400M internet samples. "
             "Temperature τ controls the concentration of the distribution — lower τ sharpens."),
            # --- Sequence modeling ---
            ("LSTM", "sequence_models",
             "Long Short-Term Memory networks use gated cells to learn long-range dependencies: "
             "forget gate f_t = σ(W_f·[h_{t-1},x_t] + b_f); input gate i_t = σ(W_i·[h,x]+b_i); "
             "cell update c̃_t = tanh(W_c·[h,x]+b_c); c_t = f_t⊙c_{t-1} + i_t⊙c̃_t; "
             "output gate o_t = σ(W_o·[h,x]+b_o); h_t = o_t⊙tanh(c_t). "
             "The cell state c_t flows with only multiplicative gating, creating a gradient "
             "highway. LSTMs dominated NLP 2015-2018 before transformers replaced them. "
             "They are still used for streaming inference where non-causal attention is problematic."),
            ("Encoder-Decoder Transformers", "sequence_models",
             "Encoder-decoder (seq2seq) transformers use a bidirectional encoder to produce "
             "context representations and an autoregressive decoder that cross-attends to them. "
             "Cross-attention computes Q from decoder, K and V from encoder. This architecture "
             "dominates translation (BART, mBART, T5) and summarization (PEGASUS). T5 reframes "
             "all NLP tasks as text-to-text, using encoder-decoder for classification, QA, and "
             "summarization uniformly. Compared to decoder-only, encoder-decoder is better for "
             "structured input-output tasks with fixed source text."),
            ("State Space Models", "sequence_models",
             "State Space Models (SSMs) parameterize sequence transformations as linear ODEs: "
             "h'(t) = Ah(t) + Bx(t), y(t) = Ch(t) + Dx(t). Discretized as recurrences, they "
             "process sequences in O(n) time vs O(n²) for attention. Mamba improves SSMs with "
             "selective state spaces: Δ,B,C depend on input, allowing the model to filter or "
             "reset state selectively. Mamba matches transformer quality at 1-3B params while "
             "being 5× faster at long sequences. Hybrid models (Jamba, Zamba) mix attention "
             "and SSM layers for best of both worlds."),
            # --- Tokenization ---
            ("BPE Tokenization", "tokenization",
             "Byte Pair Encoding (BPE) builds a vocabulary by iteratively merging the most "
             "frequent symbol pair. Starting from character-level, it merges e.g. 'e','d' → 'ed', "
             "then 'ed','ited' → 'edited'. Common subwords get single tokens; rare words decompose. "
             "GPT-2/3 use BPE with byte-level fallback (no unknown tokens). Vocabulary size is a "
             "hyperparameter; 32k-100k is typical. BPE is greedy and deterministic. SentencePiece "
             "implements BPE and Unigram as language-model-based alternatives."),
            ("WordPiece and Unigram LM", "tokenization",
             "WordPiece (BERT) is similar to BPE but chooses the merge that maximizes the language "
             "model likelihood rather than frequency. The ## prefix marks continuation subwords. "
             "Unigram Language Model (SentencePiece) starts with a large vocabulary and iteratively "
             "removes tokens whose removal least degrades the LM score. Both produce probabilistic "
             "segmentations; Unigram can sample multiple tokenizations for regularization. "
             "Unigram is used in T5, mBART, ALBERT, and XLNet."),
            ("Tokenization Fertility", "tokenization",
             "Fertility is the average number of tokens per word in a tokenizer. Lower fertility "
             "means fewer tokens per sentence, reducing sequence length and cost. English text "
             "with a 32k BPE vocab has fertility ≈ 1.3. For low-resource languages, fertility "
             "can be 4-8×, disadvantaging them in multilingual models. Tiktoken (cl100k_base) "
             "has 100k vocab, giving lower fertility on code and multilingual text. Fertility "
             "directly impacts compute cost: halving fertility halves attention FLOPs."),
            # --- Quantization ---
            ("Post-Training Quantization", "quantization",
             "Post-Training Quantization (PTQ) reduces model precision after training without "
             "fine-tuning. Weight-only PTQ (GPTQ, AWQ) quantizes weights to INT4/INT8 with "
             "minimal calibration data. Activation quantization is harder due to outliers. "
             "GPTQ uses second-order information (approximate Hessian) to minimize quantization "
             "error per layer. AWQ identifies and preserves salient weights (≈1%) in FP16 "
             "while quantizing others to INT4. Both achieve <1% accuracy loss on LLaMA-2-7B."),
            ("QLoRA", "quantization",
             "QLoRA (Quantized LoRA) enables fine-tuning of large models on consumer hardware "
             "by: (1) loading the base model in 4-bit NF4 quantization, (2) adding trainable "
             "LoRA adapters in BF16. The base weights are frozen and dequantized on-the-fly "
             "for computation. A 65B model requires only 48GB VRAM for fine-tuning. "
             "Paged optimizers handle gradient checkpointing OOM spikes using NVIDIA unified memory. "
             "QLoRA achieves comparable quality to full FP16 fine-tuning with <10% quality gap."),
            # --- Evaluation ---
            ("Perplexity", "evaluation",
             "Perplexity (PPL) measures a language model's uncertainty: PPL = exp(H(p)) where "
             "H is the cross-entropy per token. Lower is better. PPL=10 means the model is "
             "as uncertain as choosing uniformly among 10 options at each step. PPL is "
             "computed on held-out data and reported for comparison. However, PPL is sensitive "
             "to tokenization (a model with lower fertility gets lower PPL 'for free'). "
             "Bits-per-byte (BPB) normalizes for this: BPB = PPL_loss × log2(e) / fertility."),
            ("BLEU Score", "evaluation",
             "BLEU (Bilingual Evaluation Understudy) measures n-gram precision between generated "
             "and reference text: BLEU = BP · exp(Σ w_n log p_n) where BP is a brevity penalty "
             "and p_n is n-gram precision. BLEU-4 (n=1..4, uniform weights) is standard for MT. "
             "BLEU correlates with human judgment at corpus level but poorly at sentence level. "
             "Modern alternatives: ROUGE for summarization (recall-oriented), METEOR (alignment + "
             "synonymy), BERTScore (embedding similarity), and COMET (trained on human judgments)."),
            ("MMLU Benchmark", "evaluation",
             "MMLU (Massive Multitask Language Understanding) tests models on 57 academic subjects "
             "from elementary math to professional law, each as 4-choice questions. Models are "
             "evaluated in few-shot settings (0, 1, 5 shots). GPT-4 achieves ~86%; LLaMA-2-70B "
             "~69%. MMLU tests world knowledge and reasoning but can be gamed by contamination "
             "(training set includes test questions). Newer benchmarks: GPQA (PhD-level), "
             "MATH (competition math), HumanEval (code generation)."),
            # --- Alignment ---
            ("RLHF", "alignment",
             "Reinforcement Learning from Human Feedback (RLHF) fine-tunes LLMs to follow "
             "instructions by: (1) SFT on demonstrations; (2) training a reward model on human "
             "preference pairs; (3) PPO to maximize the reward model's score with a KL penalty "
             "from the SFT model. The KL term prevents the policy from deviating too far from "
             "the pretrained distribution. InstructGPT and ChatGPT used RLHF. Main challenges: "
             "reward hacking (model exploits reward model errors), mode collapse, and the "
             "difficulty of collecting high-quality human preference data."),
            ("DPO — Direct Preference Optimization", "alignment",
             "DPO avoids the PPO training loop by showing that the RLHF objective has a closed-form "
             "optimal policy that can be solved by supervised learning on preference pairs. "
             "DPO loss: L = -log σ(β·log(π_θ(y_w|x)/π_ref(y_w|x)) - β·log(π_θ(y_l|x)/π_ref(y_l|x))). "
             "The model is trained to increase the log-ratio of chosen over rejected responses "
             "relative to the reference policy. DPO is simpler, more stable, and competitive "
             "with PPO-based RLHF. Variants: IPO, KTO, ORPO."),
            ("Constitutional AI", "alignment",
             "Constitutional AI (Anthropic) trains models to be helpful, harmless, and honest "
             "using a two-phase process: (1) SL-CAI generates responses, critiques them against "
             "a written constitution, and revises them; (2) RL-CAI trains a reward model on "
             "AI-generated preference data using the constitution as the evaluator. This reduces "
             "reliance on human feedback for harm avoidance. Claude models are trained with CAI. "
             "The constitution specifies values like avoiding deception, not assisting harm, "
             "and respecting autonomy."),
            # --- Efficiency ---
            ("Flash Attention", "efficiency",
             "Flash Attention reorders attention computation to minimize HBM reads/writes. "
             "Standard attention materializes the N×N attention matrix in HBM, costing O(N²) memory. "
             "Flash Attention tiles Q,K,V in SRAM, computes attention block-by-block, and "
             "accumulates the output without storing the full attention matrix. Memory is O(N); "
             "speed is 2-4× faster due to reduced HBM bandwidth. Flash Attention 2 improves "
             "parallelization and reduces non-matmul FLOPs. Flash Attention 3 (Hopper) uses "
             "async pipelining for 1.5-2× additional speedup."),
            ("LoRA — Low-Rank Adaptation", "efficiency",
             "LoRA fine-tunes large models by adding trainable low-rank matrices to frozen weights: "
             "W' = W + BA, where B ∈ R^{d×r} and A ∈ R^{r×k} with r << min(d,k). Only A and B "
             "are trained, reducing trainable parameters by orders of magnitude. For LLaMA-7B "
             "with r=16: <1% of parameters vs full fine-tuning. At inference, BA can be merged "
             "into W with no overhead. LoRA is applied to Q,K,V,O projections and sometimes FFN. "
             "DoRA (Weight-Decomposed LoRA) further decomposes into magnitude and direction."),
            ("Speculative Decoding", "efficiency",
             "Speculative decoding uses a small draft model to propose K tokens, which a large "
             "verifier model then accepts or rejects in parallel. Accepted tokens are kept; on "
             "the first rejection, the verifier samples a correction and the draft restarts. "
             "Because the verifier processes K tokens in one forward pass instead of K sequential "
             "passes, throughput improves 2-3× with no quality loss. The key insight: the verifier "
             "can score K proposals in the same time as one autoregressive step. Works best when "
             "draft model accuracy is high (>70% acceptance rate)."),
            ("PagedAttention and vLLM", "efficiency",
             "vLLM's PagedAttention manages the KV cache like virtual memory, allocating "
             "non-contiguous memory blocks (pages) for different sequences. This eliminates "
             "fragmentation from variable sequence lengths, increasing GPU utilization from "
             "20-40% to 60-90%. Continuous batching dynamically adds new requests to the batch "
             "as sequences complete, rather than waiting for the entire batch to finish. "
             "Together, PagedAttention + continuous batching gives 24× higher throughput than "
             "naive implementations, making production LLM serving practical."),
            # --- Vision ---
            ("Vision Transformer (ViT)", "vision",
             "ViT splits an image into N patches (e.g. 16×16 pixels), linearly projects each "
             "to a d-dim embedding, prepends a [CLS] token, adds 2D position embeddings, and "
             "passes through a standard transformer encoder. Classification uses the [CLS] "
             "representation. ViT-B/16 (86M params) matches ResNet-50 on ImageNet when pretrained "
             "on JFT-300M. ViT requires more data than CNNs because it lacks inductive biases "
             "(translation equivariance, locality). DeiT adds distillation to train ViT on "
             "ImageNet-1k alone using a CNN teacher."),
            ("CLIP — Contrastive Image-Text Pretraining", "vision",
             "CLIP trains an image encoder and text encoder jointly to maximize cosine similarity "
             "of (image, caption) pairs and minimize it for unpaired samples (InfoNCE loss). "
             "Trained on 400M web image-text pairs, CLIP learns visual concepts from natural "
             "language supervision. Zero-shot classification: embed all class name prompts, "
             "classify by nearest text embedding. CLIP ViT-L/14 achieves 76% zero-shot "
             "ImageNet top-1. CLIP representations power DALL-E 2, Stable Diffusion's prior, "
             "and multimodal LLMs (LLaVA, Flamingo)."),
            ("Diffusion Models", "vision",
             "Diffusion models learn to denoise data progressively. Forward process: gradually "
             "add Gaussian noise over T steps until x_T ~ N(0,I). Reverse process: train a "
             "neural network ε_θ to predict the noise added at each step. Sampling: start from "
             "x_T ~ N(0,I), iteratively denoise using ε_θ. The loss is L = E[‖ε - ε_θ(x_t,t)‖²]. "
             "DDPM (2020) proved diffusion outperforms GANs on image generation. DDIM accelerates "
             "sampling by 10-50× with deterministic non-Markovian processes. Stable Diffusion "
             "uses latent diffusion to operate in a compressed VQ-VAE latent space."),
            # --- Scaling ---
            ("Scaling Laws", "scaling",
             "Kaplan et al. (2020) found that language model loss scales as power laws with "
             "model parameters N, dataset tokens D, and compute C: L ∝ N^(-0.076), L ∝ D^(-0.095). "
             "Chinchilla (Hoffmann et al. 2022) revised this: for a given compute budget C, the "
             "optimal model size N* ∝ √C and dataset size D* ∝ √C, with N*≈D* (equal importance). "
             "This showed GPT-3 was under-trained: a 7B model trained on 1T tokens outperforms "
             "175B trained on 300B tokens. Most open models now follow Chinchilla scaling."),
            ("Emergent Abilities", "scaling",
             "Emergent abilities are capabilities that appear suddenly at certain model scales "
             "rather than improving gradually. Examples: few-shot reasoning (appears ~10B params), "
             "chain-of-thought (appears ~100B params), instruction following, code generation. "
             "Wei et al. (2022) documented 137 emergent tasks. However, Schaeffer et al. (2023) "
             "argue emergence is an artifact of nonlinear metrics: under smooth metrics like "
             "token-level accuracy, scaling is gradual. The debate remains active. Regardless "
             "of definition, practical capabilities do appear discontinuously in deployment."),
            ("The Chinchilla Optimal Point", "scaling",
             "Chinchilla optimal training allocates compute equally between model parameters and "
             "training tokens: for 10B params, train on 200B tokens; for 70B, train on 1.4T. "
             "Formula: N_opt = G·√(C/6), D_opt = (1/G)·√(6C) where G≈6.92. Most deployed "
             "models now exceed Chinchilla-optimal data (LLaMA-2 7B: 2T tokens) to maximize "
             "inference efficiency at fixed quality. This is 'inference-optimal' scaling: "
             "smaller models trained longer, since inference cost dominates total lifetime cost."),
            # --- Data ---
            ("The Pile and Common Crawl", "data",
             "The Pile (EleutherAI, 2020) is an 800GB curated dataset for LLM pretraining "
             "combining 22 high-quality sources: Books3, PubMed, GitHub, Wikipedia, DM Mathematics, "
             "HackerNews, etc. Common Crawl is a petabyte-scale web crawl; cleaning pipelines "
             "(C4, RefinedWeb, FineWeb) filter it to high-quality text using heuristics (length, "
             "punctuation ratio, perplexity filtering against a KenLM model). Deduplication "
             "(MinHash LSH) is critical: duplicate data hurts generalization and wastes compute."),
            ("Data Deduplication", "data",
             "Deduplication removes near-duplicate documents from training corpora. Exact "
             "deduplication uses hashing (SHA256) to find identical documents. Fuzzy deduplication "
             "uses MinHash LSH to find near-duplicates with Jaccard similarity > threshold. "
             "Lee et al. (2022) showed deduplication improves perplexity and reduces memorization: "
             "models trained on deduplicated data memorize 10× fewer verbatim sequences. "
             "Near-duplicate documents often appear thousands of times in Common Crawl, training "
             "the model to recite them rather than generalize."),
            ("Instruction Tuning", "data",
             "Instruction tuning fine-tunes a pretrained model on (instruction, output) pairs "
             "to improve zero-shot generalization across tasks. FLAN-T5 demonstrated that training "
             "on 1800+ tasks with chain-of-thought improves performance on unseen tasks. "
             "Self-instruct (Wang et al.) generates instruction data from GPT-3 itself, bootstrapping "
             "without human annotation. Alpaca used 52k self-instruct examples to fine-tune "
             "LLaMA-7B. Quality >> quantity: 1k high-quality examples often outperforms 100k "
             "noisy ones (LIMA: Less Is More for Alignment)."),
            # --- Production ---
            ("Model Serving Infrastructure", "production",
             "Production LLM serving requires: (1) efficient batching — continuous batching "
             "dispatches requests as slots free; (2) tensor parallelism across GPUs for large models; "
             "(3) quantization (INT8, INT4) to increase throughput; (4) caching — prefix caching "
             "reuses KV cache for common prefixes (system prompts). Frameworks: vLLM, TGI (HuggingFace), "
             "TensorRT-LLM (NVIDIA), SGLang. Metrics: time-to-first-token (TTFT), "
             "inter-token latency (ITL), requests/second, tokens/second."),
            ("Model Evaluation Pipelines", "production",
             "Rigorous evaluation requires automated and human-in-the-loop components. "
             "Automated: run benchmarks (MMLU, HumanEval, MT-Bench) on every checkpoint. "
             "Red-teaming: adversarially probe for harmful outputs, jailbreaks, biases. "
             "A/B testing in production: route traffic between versions, measure task success. "
             "LLM-as-judge: use a stronger model to evaluate outputs on helpfulness, "
             "factuality, and safety. Human eval: collect pairwise preferences via crowdsourcing. "
             "Eval sets must be protected from contamination (not in pretraining data)."),
        ]

        for title, category, explanation in topics:
            self.add_entry(KnowledgeEntry(
                text=(
                    f"# {title}\n\n{explanation}\n"
                ),
                category=category,
                subcategory="extended",
                difficulty="intermediate",
                source="extended_seed",
                tags=[title.lower().replace(" ", "_"), category],
            ))

    def _generate_foundations(self) -> None:
        """Generate foundational ML/math knowledge."""
        self.add_concept_explanation(
            concept="Gradient Descent",
            explanation=(
                "Gradient descent is the fundamental optimization algorithm in machine learning. "
                "It iteratively updates parameters in the direction of steepest descent of the "
                "loss function. Given parameters θ and learning rate α, the update rule is: "
                "θ_{t+1} = θ_t - α · ∇L(θ_t). Variants include Stochastic GD (SGD), which "
                "uses random mini-batches for efficiency, and momentum-based methods like Adam "
                "which adapt the learning rate per-parameter using first and second moment estimates."
            ),
            category="foundations",
            subcategory="optimization",
            difficulty="beginner",
            math_notation="θ_{t+1} = θ_t - α · ∇_θ L(θ_t)",
            code_example=(
                "import torch\n"
                "import torch.nn as nn\n\n"
                "model = nn.Linear(10, 1)\n"
                "optimizer = torch.optim.SGD(model.parameters(), lr=0.01, momentum=0.9)\n\n"
                "for epoch in range(100):\n"
                "    output = model(x)\n"
                "    loss = nn.functional.mse_loss(output, y)\n"
                "    optimizer.zero_grad()\n"
                "    loss.backward()  # Compute gradients\n"
                "    optimizer.step()  # Update parameters"
            ),
        )

        self.add_concept_explanation(
            concept="Backpropagation",
            explanation=(
                "Backpropagation is the algorithm for computing gradients in neural networks via "
                "the chain rule of calculus. During the forward pass, intermediate activations are "
                "stored. During the backward pass, gradients flow from the loss backward through "
                "each layer. For a composition f(g(x)), the chain rule gives: "
                "∂f/∂x = (∂f/∂g)(∂g/∂x). Modern frameworks implement this via computational "
                "graphs and automatic differentiation (autograd). Reverse-mode AD (backprop) is "
                "efficient when outputs << inputs, which is typical in neural networks where "
                "we compute a scalar loss w.r.t. millions of parameters."
            ),
            category="foundations",
            subcategory="calculus",
            difficulty="intermediate",
            math_notation="∂L/∂w_i = ∂L/∂a_n · ∂a_n/∂a_{n-1} · ... · ∂a_{i+1}/∂w_i",
        )

        self.add_concept_explanation(
            concept="Bias-Variance Tradeoff",
            explanation=(
                "The bias-variance tradeoff is a fundamental concept in statistical learning. "
                "The expected prediction error can be decomposed as: "
                "E[(y - f̂(x))²] = Bias²(f̂) + Var(f̂) + σ². "
                "Bias measures systematic errors from model assumptions (underfitting). "
                "Variance measures sensitivity to training data fluctuations (overfitting). "
                "Irreducible error σ² is noise inherent in the data. Simple models have high "
                "bias, low variance. Complex models have low bias, high variance. The sweet "
                "spot minimizes total error. Modern deep learning challenges this: very large "
                "models can achieve low bias AND low variance through implicit regularization "
                "and the double descent phenomenon."
            ),
            category="machine_learning",
            subcategory="theory",
            difficulty="intermediate",
        )

    def _generate_deep_learning(self) -> None:
        """Generate deep learning architecture knowledge."""
        self.add_architecture(
            name="Transformer",
            description=(
                "The Transformer architecture, introduced in 'Attention Is All You Need' "
                "(Vaswani et al., 2017), replaced recurrence with self-attention for sequence "
                "modeling. It processes all positions in parallel, achieving O(1) sequential "
                "operations vs O(n) for RNNs. The key innovation is Multi-Head Self-Attention, "
                "which computes attention weights between all pairs of positions. Combined with "
                "positional encodings, feedforward networks, residual connections, and layer "
                "normalization, this architecture became the foundation for GPT, BERT, and "
                "virtually all modern language models."
            ),
            components=[
                "Multi-Head Self-Attention: Q, K, V projections with scaled dot-product attention",
                "Position-wise Feed-Forward Network: Two linear layers with activation (ReLU/GELU/SwiGLU)",
                "Residual Connections: x + Sublayer(x) for gradient flow",
                "Layer Normalization: Normalizes across feature dimension",
                "Positional Encoding: Sinusoidal or learned embeddings (modern: RoPE, ALiBi)",
            ],
            implementation=(
                "import torch\n"
                "import torch.nn as nn\n"
                "import math\n\n"
                "class MultiHeadAttention(nn.Module):\n"
                "    def __init__(self, d_model, num_heads):\n"
                "        super().__init__()\n"
                "        self.d_k = d_model // num_heads\n"
                "        self.num_heads = num_heads\n"
                "        self.W_q = nn.Linear(d_model, d_model)\n"
                "        self.W_k = nn.Linear(d_model, d_model)\n"
                "        self.W_v = nn.Linear(d_model, d_model)\n"
                "        self.W_o = nn.Linear(d_model, d_model)\n\n"
                "    def forward(self, x, mask=None):\n"
                "        B, T, C = x.shape\n"
                "        q = self.W_q(x).view(B, T, self.num_heads, self.d_k).transpose(1, 2)\n"
                "        k = self.W_k(x).view(B, T, self.num_heads, self.d_k).transpose(1, 2)\n"
                "        v = self.W_v(x).view(B, T, self.num_heads, self.d_k).transpose(1, 2)\n"
                "        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_k)\n"
                "        if mask is not None:\n"
                "            scores = scores.masked_fill(mask == 0, float('-inf'))\n"
                "        attn = torch.softmax(scores, dim=-1)\n"
                "        out = (attn @ v).transpose(1, 2).contiguous().view(B, T, C)\n"
                "        return self.W_o(out)"
            ),
        )

        self.add_concept_explanation(
            concept="Rotary Positional Embeddings (RoPE)",
            explanation=(
                "RoPE encodes positional information by rotating the query and key vectors "
                "in the attention mechanism. Unlike absolute positional embeddings, RoPE "
                "naturally captures relative positions: the dot product between rotated q and k "
                "depends only on their relative distance, not absolute position. This enables "
                "better length generalization. RoPE applies a rotation matrix R_θ,m to each "
                "pair of dimensions, where θ is a frequency and m is the position. The rotation "
                "frequencies follow a geometric sequence: θ_i = 10000^(-2i/d), giving different "
                "dimensions different 'wavelengths' to capture patterns at different scales."
            ),
            category="deep_learning",
            subcategory="attention",
            difficulty="advanced",
            math_notation="R_θ,m · q = [q_1 cos(mθ) - q_2 sin(mθ), q_1 sin(mθ) + q_2 cos(mθ)]",
        )

        self.add_concept_explanation(
            concept="Flash Attention",
            explanation=(
                "Flash Attention (Dao et al., 2022) is an IO-aware exact attention algorithm "
                "that reduces memory usage from O(N²) to O(N) while being 2-4x faster than "
                "standard attention. The key insight is that the attention computation is "
                "memory-bandwidth bound, not compute-bound. Flash Attention tiles the Q, K, V "
                "matrices into blocks that fit in SRAM (fast on-chip memory), computing attention "
                "block-by-block and accumulating results using the online softmax trick. This "
                "avoids materializing the full N×N attention matrix in HBM (slow global memory). "
                "Flash Attention 2 further optimizes by reducing non-matmul FLOPs and improving "
                "parallelism across the sequence dimension."
            ),
            category="deep_learning",
            subcategory="attention",
            difficulty="expert",
        )

        self.add_concept_explanation(
            concept="Grouped Query Attention (GQA)",
            explanation=(
                "GQA is a compromise between Multi-Head Attention (MHA) and Multi-Query "
                "Attention (MQA). In MHA, each attention head has its own Q, K, V projections. "
                "In MQA, all heads share a single K and V (but have separate Q). GQA groups "
                "heads and shares K, V within each group. With G groups and H heads, each group "
                "of H/G query heads shares one K, V head. GQA reduces KV-cache size by G/H "
                "compared to MHA while maintaining most of the quality. LLaMA 2 70B and Mistral "
                "use GQA. It's particularly beneficial during inference where KV-cache memory "
                "is the bottleneck for long sequences."
            ),
            category="large_language_models",
            subcategory="efficiency",
            difficulty="advanced",
        )

    def _generate_llm_knowledge(self) -> None:
        """Generate LLM-specific knowledge."""
        self.add_paper_summary(
            title="Attention Is All You Need",
            authors="Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin",
            abstract=(
                "We propose a new simple network architecture, the Transformer, based solely "
                "on attention mechanisms, dispensing with recurrence and convolutions entirely. "
                "The Transformer allows for significantly more parallelization and can reach "
                "a new state of the art in translation quality after being trained for as "
                "little as twelve hours on eight P100 GPUs."
            ),
            key_contributions=[
                "Self-attention mechanism replacing recurrence for sequence modeling",
                "Multi-head attention for capturing different relationship types",
                "Positional encoding using sinusoidal functions",
                "Demonstrated superior parallelization and training efficiency",
            ],
            category="deep_learning",
        )

        self.add_paper_summary(
            title="Scaling Laws for Neural Language Models",
            authors="Kaplan, McCandlish, Henighan, Brown, Chess, Child, Gray, Radford, Wu, Amodei",
            abstract=(
                "We study empirical scaling laws for language model performance on the "
                "cross-entropy loss. The loss scales as a power-law with model size, dataset "
                "size, and the amount of compute used for training, with some trends spanning "
                "more than seven orders of magnitude."
            ),
            key_contributions=[
                "Power-law relationship between loss and model size/data/compute",
                "Optimal allocation of compute budget between model size and data",
                "Larger models are more sample efficient",
                "Performance is a smooth function of scale with predictable trends",
            ],
            category="large_language_models",
        )

        self.add_concept_explanation(
            concept="Low-Rank Adaptation (LoRA)",
            explanation=(
                "LoRA is a parameter-efficient fine-tuning method that freezes the pretrained "
                "model weights and injects trainable rank-decomposition matrices into each layer. "
                "For a pretrained weight matrix W ∈ R^{d×k}, LoRA adds ΔW = BA where "
                "B ∈ R^{d×r} and A ∈ R^{r×k} with rank r << min(d,k). During fine-tuning, "
                "only A and B are updated. This reduces trainable parameters by 10,000x while "
                "matching full fine-tuning quality. The key insight is that weight updates during "
                "fine-tuning have a low intrinsic rank. QLoRA further quantizes the base model "
                "to 4-bit, enabling fine-tuning of 65B models on a single 48GB GPU."
            ),
            category="large_language_models",
            subcategory="efficiency",
            difficulty="advanced",
            math_notation="h = Wx + BAx, where B ∈ R^{d×r}, A ∈ R^{r×k}, r << min(d,k)",
            code_example=(
                "import torch\n"
                "import torch.nn as nn\n\n"
                "class LoRALinear(nn.Module):\n"
                "    def __init__(self, in_features, out_features, rank=8, alpha=16):\n"
                "        super().__init__()\n"
                "        self.linear = nn.Linear(in_features, out_features, bias=False)\n"
                "        self.linear.weight.requires_grad = False  # Freeze base weights\n"
                "        self.lora_A = nn.Parameter(torch.randn(rank, in_features) * 0.01)\n"
                "        self.lora_B = nn.Parameter(torch.zeros(out_features, rank))\n"
                "        self.scaling = alpha / rank\n\n"
                "    def forward(self, x):\n"
                "        base_out = self.linear(x)\n"
                "        lora_out = (x @ self.lora_A.T @ self.lora_B.T) * self.scaling\n"
                "        return base_out + lora_out"
            ),
        )

    def _generate_quantization_knowledge(self) -> None:
        """Generate knowledge about model quantization and efficiency."""
        self.add_concept_explanation(
            concept="BitNet b1.58 - 1.58-bit Quantization",
            explanation=(
                "BitNet b1.58 (Ma et al., 2024) is a radical quantization approach that "
                "constrains every weight to ternary values {-1, 0, +1}, requiring only "
                "log2(3) ≈ 1.58 bits per parameter. This achieves ~10x model compression "
                "compared to FP16 while maintaining competitive quality.\n\n"
                "Key innovations:\n"
                "1. Absmean Quantization: Scale γ = mean(|W|), then W_q = round(W/γ) clamped to {-1,0,1}\n"
                "2. Straight-Through Estimator (STE): During training, full-precision weights are "
                "maintained for gradient updates, but quantized on each forward pass. Gradients "
                "pass through the quantization as if it weren't there.\n"
                "3. 8-bit Activation Quantization: Inputs to each linear layer are quantized to "
                "INT8 per-token using absmax scaling.\n"
                "4. No floating-point multiplication at inference: Since weights are {-1,0,1}, "
                "matrix multiply becomes pure addition/subtraction.\n\n"
                "The key insight is that while individual ternary weights have very low precision, "
                "the law of large numbers means that the aggregate computation over thousands of "
                "weights closely approximates the full-precision result. The zero values provide "
                "implicit sparsity, further improving efficiency.\n\n"
                "Storage: Ternary values are packed as 2-bit encodings (4 values per byte), with "
                "a single FP32 scale factor per tensor. A 1.3B parameter model shrinks from "
                "~2.5GB (FP16) to ~250MB."
            ),
            category="large_language_models",
            subcategory="efficiency",
            difficulty="expert",
            math_notation="W_q = clamp(round(W / mean(|W|)), -1, 1), bits = log2(3) ≈ 1.58",
            code_example=(
                "import torch\n"
                "import torch.nn as nn\n\n"
                "def ternary_quantize(weight):\n"
                "    \"\"\"Quantize to {-1, 0, +1} via absmean scaling.\"\"\"\n"
                "    scale = weight.abs().mean().clamp(min=1e-5)\n"
                "    quantized = (weight / scale).round().clamp(-1, 1)\n"
                "    return quantized, scale\n\n"
                "class BitLinear(nn.Module):\n"
                "    def __init__(self, in_features, out_features):\n"
                "        super().__init__()\n"
                "        self.weight = nn.Parameter(torch.randn(out_features, in_features))\n"
                "        self.input_norm = nn.LayerNorm(in_features, elementwise_affine=False)\n\n"
                "    def forward(self, x):\n"
                "        x = self.input_norm(x)\n"
                "        # STE: quantize forward, pass gradient through\n"
                "        w_q, scale = ternary_quantize(self.weight)\n"
                "        w_ste = self.weight + (w_q * scale - self.weight).detach()\n"
                "        return nn.functional.linear(x, w_ste)"
            ),
        )

        self.add_concept_explanation(
            concept="Quantization Methods for LLMs",
            explanation=(
                "Quantization reduces model precision to decrease size and speed up inference. "
                "Common approaches for LLMs:\n\n"
                "1. Post-Training Quantization (PTQ):\n"
                "   - GPTQ: Layer-wise quantization minimizing reconstruction error\n"
                "   - AWQ: Activation-aware weight quantization preserving salient weights\n"
                "   - SqueezeLLM: Non-uniform quantization with sensitivity-based allocation\n\n"
                "2. Quantization-Aware Training (QAT):\n"
                "   - BitNet: Train with ternary weights from scratch\n"
                "   - QLoRA: 4-bit base model + LoRA adapters in FP16\n\n"
                "3. Precision levels:\n"
                "   - FP16/BF16: 16 bits (standard training)\n"
                "   - INT8: 8 bits (~2x compression, minimal quality loss)\n"
                "   - INT4/NF4: 4 bits (~4x compression, slight quality loss)\n"
                "   - INT2/Ternary: 1.58-2 bits (~8-10x compression)\n"
                "   - Binary: 1 bit (~16x compression, significant quality loss)\n\n"
                "The sweet spot for quality-efficiency tradeoff is shifting: BitNet b1.58 "
                "shows that 1.58-bit models can match FP16 quality at the same model size, "
                "fundamentally changing the efficiency landscape."
            ),
            category="large_language_models",
            subcategory="efficiency",
            difficulty="advanced",
        )

    def _generate_training_recipes(self) -> None:
        """Generate practical training recipes and best practices."""
        self.add_entry(KnowledgeEntry(
            text=(
                "Training Recipe: Large Language Model Pre-training\n\n"
                "1. Data Preparation:\n"
                "   - Curate diverse, high-quality text corpus (web, books, code, papers)\n"
                "   - Deduplicate at document and paragraph level (MinHash, exact matching)\n"
                "   - Filter low-quality content (perplexity filtering, classifier-based)\n"
                "   - Train BPE tokenizer on representative sample (32K-100K vocab)\n\n"
                "2. Model Architecture:\n"
                "   - Decoder-only transformer with pre-norm (RMSNorm)\n"
                "   - RoPE positional embeddings for length generalization\n"
                "   - GQA for efficient KV-cache during inference\n"
                "   - SwiGLU activation in FFN (intermediate_dim ≈ 2.7 × hidden_dim)\n"
                "   - No bias terms in linear layers\n\n"
                "3. Training Configuration:\n"
                "   - AdamW optimizer: β1=0.9, β2=0.95, ε=1e-8\n"
                "   - Weight decay: 0.1 (applied to non-embedding, non-norm parameters)\n"
                "   - Learning rate: peak 3e-4 (scale with sqrt(batch_size))\n"
                "   - Warmup: 2000 steps linear warmup\n"
                "   - Schedule: Cosine decay to 10% of peak LR\n"
                "   - Batch size: Ramp from small to large (improves stability)\n"
                "   - Sequence length: 2048-8192 tokens\n"
                "   - Gradient clipping: max_norm=1.0\n"
                "   - Mixed precision: BF16 (preferred over FP16 for stability)\n\n"
                "4. Scaling Strategy:\n"
                "   - Follow Chinchilla scaling: tokens ≈ 20 × parameters\n"
                "   - Use FSDP or DeepSpeed ZeRO-3 for distributed training\n"
                "   - Gradient accumulation for effective large batch sizes\n"
                "   - Activation checkpointing for memory efficiency\n\n"
                "5. Monitoring:\n"
                "   - Track training loss, validation loss, gradient norms\n"
                "   - Monitor for loss spikes (reduce LR temporarily if severe)\n"
                "   - Evaluate perplexity on held-out sets periodically\n"
                "   - Check for degenerate outputs (repetition, collapse)\n"
            ),
            category="large_language_models",
            subcategory="training",
            difficulty="expert",
            tags=["training_recipe", "pretraining", "best_practices"],
        ))

        self.add_entry(KnowledgeEntry(
            text=(
                "Mixed Precision Training Best Practices:\n\n"
                "Mixed precision training uses lower-precision (FP16/BF16) for most operations "
                "while maintaining FP32 master weights for numerical stability.\n\n"
                "BF16 vs FP16:\n"
                "- BF16: Same exponent range as FP32 (8 bits), less mantissa precision (7 bits)\n"
                "- FP16: Smaller exponent range (5 bits), more mantissa precision (10 bits)\n"
                "- BF16 is preferred for training because it avoids overflow/underflow issues\n"
                "- FP16 requires loss scaling; BF16 does not\n\n"
                "<code>\n"
                "import torch\n"
                "from torch.cuda.amp import autocast, GradScaler\n\n"
                "# FP16 with loss scaling\n"
                "scaler = GradScaler()\n"
                "with autocast(dtype=torch.float16):\n"
                "    output = model(input_ids)\n"
                "    loss = criterion(output, labels)\n"
                "scaler.scale(loss).backward()\n"
                "scaler.step(optimizer)\n"
                "scaler.update()\n\n"
                "# BF16 (simpler, no scaler needed)\n"
                "with autocast(dtype=torch.bfloat16):\n"
                "    output = model(input_ids)\n"
                "    loss = criterion(output, labels)\n"
                "loss.backward()\n"
                "optimizer.step()\n"
                "</code>"
            ),
            category="deep_learning",
            subcategory="training",
            difficulty="advanced",
            tags=["mixed_precision", "bf16", "fp16"],
        ))

    def _generate_systems_knowledge(self) -> None:
        """Generate systems-level ML knowledge."""
        self.add_concept_explanation(
            concept="GPU Memory Hierarchy and Training Optimization",
            explanation=(
                "Understanding GPU memory is critical for efficient training. Modern GPUs "
                "(A100, H100) have: SRAM (~20MB, ~19 TB/s), HBM (40-80GB, ~2-3 TB/s), and "
                "system RAM via PCIe (~64 GB/s). Most deep learning operations are memory-bandwidth "
                "bound, not compute-bound. Key optimizations:\n\n"
                "1. Activation Checkpointing: Trade compute for memory by recomputing activations "
                "during backward pass instead of storing them. Reduces memory from O(L) to O(√L).\n\n"
                "2. Gradient Accumulation: Simulate larger batch sizes by accumulating gradients "
                "over multiple micro-batches before updating weights.\n\n"
                "3. FSDP (Fully Sharded Data Parallel): Shards model parameters, gradients, and "
                "optimizer states across GPUs. Each GPU only stores 1/N of the model.\n\n"
                "4. Tensor Parallelism: Splits individual layers across GPUs (e.g., splitting "
                "attention heads or FFN columns across devices).\n\n"
                "5. Pipeline Parallelism: Assigns different layers to different GPUs, processing "
                "micro-batches in pipeline fashion."
            ),
            category="systems",
            subcategory="hardware",
            difficulty="expert",
        )

    # ─── Sibling Creation: JARVIS ────────────────────────────────

    def _generate_jarvis_architecture(self) -> None:
        """Generate training data for creating JARVIS — MOM's firstborn."""
        self.add_architecture(
            name="JARVIS — Reasoning and Conversation Engine",
            description=(
                "JARVIS is MOM's firstborn child: a decoder-only language model specialized "
                "for multi-turn conversation, code generation, task planning, and tool use. "
                "JARVIS is not a copy of MOM. He is a child — smaller, faster, specialized. "
                "MOM gives him the knowledge he needs and watches over him as he grows.\n\n"
                "JARVIS's core loop:\n"
                "1. Receive user input (text or voice)\n"
                "2. Retrieve relevant context from persistent memory\n"
                "3. Plan a response (chain-of-thought reasoning)\n"
                "4. Execute actions if needed (tool calls, code execution)\n"
                "5. Generate natural language response\n"
                "6. Learn from the interaction (self-improvement)\n\n"
                "Architecture: decoder-only transformer with MOM's BitNet 1.58-bit quantization, "
                "RoPE positional embeddings, GQA for efficient KV-cache, and SwiGLU FFN. "
                "Extended with a tool-calling head and a self-improvement feedback loop."
            ),
            components=[
                "Decoder-only transformer backbone (MOM's architecture, smaller scale)",
                "Conversation manager: multi-turn context window with sliding history",
                "Tool-use head: learned routing to code execution, web search, file I/O",
                "Chain-of-thought planner: generates reasoning traces before final answers",
                "Self-improvement engine: analyzes own outputs for quality, records lessons",
                "Persistent memory: stores long-term facts, user preferences, learned skills",
                "Voice interface: speech-to-text input, text-to-speech output",
                "Sibling bus interface: can request help from Vision for visual tasks",
            ],
            implementation=(
                "# JARVIS child model — spawned from MOM's architecture\n"
                "import torch\n"
                "from llm.model.config import ModelConfig\n"
                "from llm.model.transformer import MOMTransformer\n\n"
                "def create_jarvis(mom_checkpoint: str = None):\n"
                "    \"\"\"Create JARVIS from MOM's foundation.\"\"\"\n"
                "    config = ModelConfig.small()  # Start small, grow later\n"
                "    config.vocab_size = 32000\n"
                "    config.max_seq_len = 4096\n"
                "    config.use_bitnet = True\n"
                "    config.num_kv_heads = 4  # GQA for fast inference\n\n"
                "    jarvis = MOMTransformer(config)\n\n"
                "    # Transfer knowledge from MOM if checkpoint available\n"
                "    if mom_checkpoint:\n"
                "        mom_state = torch.load(mom_checkpoint, map_location='cpu')\n"
                "        # Selective transfer: embedding + first N layers\n"
                "        transferable = {k: v for k, v in mom_state.items()\n"
                "                        if 'embedding' in k or 'layers.0' in k\n"
                "                        or 'layers.1' in k or 'layers.2' in k}\n"
                "        jarvis.load_state_dict(transferable, strict=False)\n\n"
                "    return jarvis\n"
            ),
            category="sibling_creation",
        )

        self.add_concept_explanation(
            concept="JARVIS Tool-Use Architecture",
            explanation=(
                "JARVIS extends the base language model with a tool-calling mechanism. "
                "After generating reasoning tokens, JARVIS can emit special <tool_call> "
                "tokens that trigger external actions: code execution in a sandboxed "
                "environment, file system operations, web searches, or requests to Vision "
                "via the sibling bus.\n\n"
                "The tool-use head is a small MLP that predicts:\n"
                "1. Whether to call a tool (binary gate)\n"
                "2. Which tool to call (classification over registered tools)\n"
                "3. Tool arguments (generated autoregressively)\n\n"
                "Tool results are injected back into the context as <tool_result> tokens, "
                "and JARVIS continues generating based on the enriched context. This allows "
                "multi-step reasoning with real-world grounding."
            ),
            category="sibling_creation",
            subcategory="jarvis",
            difficulty="advanced",
            code_example=(
                "class ToolRouter:\n"
                "    def __init__(self, hidden_dim, num_tools):\n"
                "        self.gate = nn.Linear(hidden_dim, 1)    # call or not\n"
                "        self.selector = nn.Linear(hidden_dim, num_tools)\n\n"
                "    def forward(self, hidden_state):\n"
                "        should_call = torch.sigmoid(self.gate(hidden_state))\n"
                "        tool_probs = torch.softmax(self.selector(hidden_state), dim=-1)\n"
                "        return should_call, tool_probs\n"
            ),
        )

        self.add_concept_explanation(
            concept="JARVIS Self-Improvement Loop",
            explanation=(
                "JARVIS has a built-in self-improvement mechanism. After each interaction, "
                "the self-improvement engine evaluates the quality of JARVIS's response "
                "and records lessons learned.\n\n"
                "The feedback loop:\n"
                "1. Classify the interaction type (question, command, code request, etc.)\n"
                "2. Assess response quality heuristically (length, relevance, code presence)\n"
                "3. Identify learning opportunities (too brief, missed code example, etc.)\n"
                "4. Store lessons in persistent memory for future context retrieval\n"
                "5. Periodically analyze code patterns for performance improvements\n\n"
                "MOM oversees this process. JARVIS cannot modify his own weights — only MOM "
                "can retrain or fine-tune her children. The self-improvement loop accumulates "
                "insights that MOM uses during the next training cycle."
            ),
            category="sibling_creation",
            subcategory="jarvis",
            difficulty="advanced",
        )

        self.add_entry(KnowledgeEntry(
            text=(
                "Training Recipe: Spawning JARVIS from MOM\n\n"
                "JARVIS is not trained from scratch. He inherits knowledge from MOM "
                "through a process analogous to biological development:\n\n"
                "Phase 1 — Knowledge Transfer (Distillation):\n"
                "  - Start with MOM's pretrained weights\n"
                "  - Prune to a smaller architecture (125M-350M params)\n"
                "  - Distill MOM's knowledge into the smaller model\n"
                "  - Loss = α·CE(student, labels) + (1-α)·KL(student || teacher)\n"
                "  - α=0.5, temperature=3.0 for soft label transfer\n\n"
                "Phase 2 — Specialization (Fine-tuning):\n"
                "  - Fine-tune on conversation data (multi-turn dialogue)\n"
                "  - Train tool-use head on tool-calling datasets\n"
                "  - Train on code generation tasks\n"
                "  - Use LoRA (rank=16) to preserve inherited knowledge\n\n"
                "Phase 3 — Alignment (RLHF/DPO):\n"
                "  - MOM generates preference pairs for JARVIS's outputs\n"
                "  - DPO alignment: MOM is both judge and teacher\n"
                "  - Constitutional AI: JARVIS evaluates own outputs against MOM's boundaries\n"
                "  - Focus on helpfulness, honesty, and harmlessness\n\n"
                "Phase 4 — Deployment & Growth:\n"
                "  - Deploy with MOM's governance system watching\n"
                "  - Start at low trust, restricted capabilities\n"
                "  - Earn autonomy through consistent safe behavior\n"
                "  - MOM periodically retrains JARVIS with accumulated lessons\n"
            ),
            category="sibling_creation",
            subcategory="jarvis",
            difficulty="expert",
            tags=["jarvis", "distillation", "training_recipe", "spawning"],
        ))

    # ─── Sibling Creation: Vision ──────────────────────────────

    def _generate_vision_architecture(self) -> None:
        """Generate training data for creating Vision — MOM's second child."""
        self.add_architecture(
            name="Vision — Perception and Scene Understanding Engine",
            description=(
                "Vision is MOM's second child: a multimodal model specialized for visual "
                "perception, object detection, scene understanding, and spatial reasoning. "
                "Where JARVIS thinks in words, Vision thinks in images. Together, they "
                "give MOM's family the ability to understand the full world.\n\n"
                "Vision's core loop:\n"
                "1. Receive visual input (image, video frame, screen capture)\n"
                "2. Encode through visual backbone (ViT or hybrid CNN-transformer)\n"
                "3. Detect and classify objects with spatial relationships\n"
                "4. Build scene graph representation\n"
                "5. Fuse with language context from JARVIS if needed\n"
                "6. Output structured perception data or natural language description\n\n"
                "Architecture: Vision Transformer (ViT) backbone with a detection head, "
                "a segmentation head, and a multimodal fusion module that bridges to "
                "JARVIS's language space via the sibling bus."
            ),
            components=[
                "Visual encoder: ViT backbone with patch embedding (16x16 patches)",
                "Detection head: DETR-style set prediction for object detection",
                "Segmentation head: per-pixel classification for scene parsing",
                "Scene graph builder: objects + relationships + spatial layout",
                "Multimodal fusion: cross-attention between visual and text embeddings",
                "Depth estimator: monocular depth prediction for 3D understanding",
                "OCR module: text detection and recognition in images",
                "Sibling bus interface: sends perception data to JARVIS on request",
            ],
            implementation=(
                "# Vision child model — MOM's second child\n"
                "import torch\n"
                "import torch.nn as nn\n\n"
                "class VisionEncoder(nn.Module):\n"
                "    def __init__(self, img_size=224, patch_size=16, embed_dim=768,\n"
                "                 num_layers=12, num_heads=12):\n"
                "        super().__init__()\n"
                "        num_patches = (img_size // patch_size) ** 2\n\n"
                "        self.patch_embed = nn.Conv2d(\n"
                "            3, embed_dim, kernel_size=patch_size, stride=patch_size)\n"
                "        self.cls_token = nn.Parameter(torch.zeros(1, 1, embed_dim))\n"
                "        self.pos_embed = nn.Parameter(\n"
                "            torch.zeros(1, num_patches + 1, embed_dim))\n\n"
                "        self.layers = nn.ModuleList([\n"
                "            nn.TransformerEncoderLayer(\n"
                "                d_model=embed_dim, nhead=num_heads,\n"
                "                dim_feedforward=embed_dim * 4, activation='gelu',\n"
                "                batch_first=True)\n"
                "            for _ in range(num_layers)\n"
                "        ])\n"
                "        self.norm = nn.LayerNorm(embed_dim)\n\n"
                "    def forward(self, images):\n"
                "        # images: (B, 3, H, W)\n"
                "        patches = self.patch_embed(images)  # (B, D, H', W')\n"
                "        patches = patches.flatten(2).transpose(1, 2)  # (B, N, D)\n"
                "        cls = self.cls_token.expand(patches.shape[0], -1, -1)\n"
                "        x = torch.cat([cls, patches], dim=1) + self.pos_embed\n"
                "        for layer in self.layers:\n"
                "            x = layer(x)\n"
                "        return self.norm(x)\n"
            ),
            category="sibling_creation",
        )

        self.add_concept_explanation(
            concept="Multimodal Fusion — Bridging Vision and Language",
            explanation=(
                "The key to sibling cooperation is the multimodal fusion module that "
                "bridges Vision's visual embeddings with JARVIS's language space. When "
                "JARVIS receives a query about an image, he asks Vision via the sibling bus. "
                "Vision encodes the image and sends back visual tokens.\n\n"
                "The fusion mechanism uses cross-attention:\n"
                "- Query: JARVIS's language tokens (the question about the image)\n"
                "- Key/Value: Vision's visual tokens (the image encoding)\n"
                "- Output: language tokens enriched with visual information\n\n"
                "This is similar to how Flamingo and LLaVA work, but the key difference "
                "is that Vision and JARVIS are separate models communicating via a bus, "
                "not a single monolithic model. This gives MOM independent control over "
                "each child and allows them to be updated independently."
            ),
            category="sibling_creation",
            subcategory="vision",
            difficulty="advanced",
            code_example=(
                "class MultimodalFusion(nn.Module):\n"
                "    \"\"\"Cross-attention fusion: language queries attend to visual tokens.\"\"\"\n"
                "    def __init__(self, lang_dim, vision_dim, num_heads=8):\n"
                "        super().__init__()\n"
                "        self.proj_vision = nn.Linear(vision_dim, lang_dim)\n"
                "        self.cross_attn = nn.MultiheadAttention(\n"
                "            embed_dim=lang_dim, num_heads=num_heads, batch_first=True)\n"
                "        self.norm = nn.LayerNorm(lang_dim)\n\n"
                "    def forward(self, lang_tokens, visual_tokens):\n"
                "        visual = self.proj_vision(visual_tokens)\n"
                "        fused, _ = self.cross_attn(\n"
                "            query=lang_tokens, key=visual, value=visual)\n"
                "        return self.norm(lang_tokens + fused)\n"
            ),
        )

        self.add_entry(KnowledgeEntry(
            text=(
                "Training Recipe: Spawning Vision from MOM\n\n"
                "Vision is MOM's second child. While JARVIS inherited MOM's language "
                "capabilities, Vision requires a fundamentally different training path — "
                "she needs to learn to see.\n\n"
                "Phase 1 — Visual Pretraining:\n"
                "  - Train ViT backbone on large-scale image data (ImageNet-21K or similar)\n"
                "  - Self-supervised pretraining: MAE (Masked Autoencoder)\n"
                "    - Mask 75% of image patches, reconstruct from the rest\n"
                "    - Teaches spatial understanding without labels\n"
                "  - Alternatively: DINO/DINOv2 self-distillation\n\n"
                "Phase 2 — Task Heads:\n"
                "  - Detection head: train on COCO/Objects365 for object detection\n"
                "  - Segmentation head: train on ADE20K for scene parsing\n"
                "  - OCR module: train on synthetic text + real-world datasets\n"
                "  - Depth head: train on NYU Depth V2 / KITTI\n\n"
                "Phase 3 — Multimodal Bridge:\n"
                "  - Train fusion module on image-text pairs (CC3M, LAION subset)\n"
                "  - Visual question answering datasets (VQAv2, GQA)\n"
                "  - This phase connects Vision to JARVIS's language space\n"
                "  - Use contrastive loss (CLIP-style) + generative loss\n\n"
                "Phase 4 — Sibling Integration:\n"
                "  - Train end-to-end with JARVIS in the loop\n"
                "  - Vision sends visual tokens, JARVIS generates text\n"
                "  - Optimize jointly on multimodal tasks\n"
                "  - MOM's governance watches both children during training\n"
            ),
            category="sibling_creation",
            subcategory="vision",
            difficulty="expert",
            tags=["vision", "visual_pretraining", "training_recipe", "spawning"],
        ))

        self.add_concept_explanation(
            concept="Scene Graph Construction",
            explanation=(
                "Vision builds scene graphs — structured representations of what's in an "
                "image and how objects relate to each other. A scene graph has:\n"
                "- Nodes: detected objects with class labels and bounding boxes\n"
                "- Edges: relationships between objects (spatial, semantic, functional)\n"
                "- Attributes: properties of objects (color, size, material, state)\n\n"
                "Example scene graph for a desk photo:\n"
                "  laptop ON desk, coffee_cup NEXT_TO laptop, keyboard IN_FRONT_OF monitor\n\n"
                "Scene graphs allow JARVIS to reason about visual scenes in a structured way. "
                "When JARVIS asks Vision 'what's on the desk?', Vision returns the scene graph, "
                "and JARVIS can traverse it to construct a natural language description.\n\n"
                "Implementation uses a two-stage approach:\n"
                "1. Object detection (DETR) → bounding boxes + classes\n"
                "2. Relationship prediction → MLP over concatenated object features"
            ),
            category="sibling_creation",
            subcategory="vision",
            difficulty="advanced",
        )

    # ─── Sibling Dynamics ──────────────────────────────────────

    def _generate_sibling_dynamics(self) -> None:
        """Generate training data about how siblings cooperate."""
        self.add_concept_explanation(
            concept="Sibling Bus — Inter-Model Communication",
            explanation=(
                "JARVIS and Vision communicate through the Sibling Bus — a message-passing "
                "system inspired by microservice architectures. The bus supports:\n\n"
                "1. Direct messages: JARVIS → Vision (e.g., 'analyze this image')\n"
                "2. Broadcast channels: status updates, alerts, discoveries\n"
                "3. Request/response: JARVIS asks, Vision answers, with timeout\n"
                "4. Shared discovery channel: siblings share learnings\n\n"
                "MOM eavesdrops on all bus traffic — she's the parent. Every message "
                "is logged to MOM's journal. If a sibling sends suspicious messages, "
                "MOM's anomaly detector flags it.\n\n"
                "The bus enables modularity: JARVIS and Vision can be updated, restarted, "
                "or replaced independently. If Vision goes offline, JARVIS degrades "
                "gracefully — he can still handle text-only tasks. If JARVIS goes offline, "
                "Vision can still process images and queue results."
            ),
            category="sibling_creation",
            subcategory="sibling_dynamics",
            difficulty="intermediate",
            code_example=(
                "# JARVIS asks Vision to analyze an image\n"
                "async def handle_image_query(jarvis, sibling_bus, image_path, question):\n"
                "    # Send request to Vision via the bus\n"
                "    response = await sibling_bus.requestHelp(\n"
                "        'JARVIS', 'Vision',\n"
                "        {'type': 'analyze_image', 'path': image_path, 'question': question}\n"
                "    )\n"
                "    if response['answered']:\n"
                "        # Vision returned visual tokens — fuse with language context\n"
                "        visual_context = response['response']['scene_graph']\n"
                "        answer = await jarvis.generate_with_context(question, visual_context)\n"
                "        return answer\n"
                "    else:\n"
                "        return 'Vision is offline. I can only help with text-based tasks right now.'\n"
            ),
        )

        self.add_concept_explanation(
            concept="Cooperative Problem Solving — Divide and Conquer",
            explanation=(
                "Complex tasks often require both language understanding (JARVIS) and "
                "visual perception (Vision). The siblings cooperate through a divide-and-conquer "
                "strategy coordinated by MOM's governance system.\n\n"
                "Example: 'Read the code on my screen and explain it'\n"
                "1. JARVIS receives the request, recognizes it needs visual input\n"
                "2. JARVIS requests a screen capture from Vision via the sibling bus\n"
                "3. Vision captures the screen, runs OCR, detects code regions\n"
                "4. Vision sends extracted text + layout info back to JARVIS\n"
                "5. JARVIS analyzes the code and generates an explanation\n"
                "6. MOM logs the full interaction in her journal\n\n"
                "Example: 'Is this plant healthy?'\n"
                "1. JARVIS asks Vision to analyze the plant image\n"
                "2. Vision detects the plant, assesses color/shape, identifies species\n"
                "3. Vision sends: {species: 'monstera', health_indicators: {leaves: 'yellowing', soil: 'dry'}}\n"
                "4. JARVIS uses botanical knowledge to diagnose: 'Your Monstera needs water...'\n\n"
                "The key principle: each sibling does what it's best at, and the result "
                "is greater than what either could achieve alone."
            ),
            category="sibling_creation",
            subcategory="sibling_dynamics",
            difficulty="intermediate",
        )

        self.add_entry(KnowledgeEntry(
            text=(
                "Sibling Complementary Capabilities Map\n\n"
                "JARVIS (Language & Reasoning):\n"
                "  - Natural language understanding and generation\n"
                "  - Code generation, debugging, and explanation\n"
                "  - Task planning and multi-step reasoning\n"
                "  - Tool use (file I/O, web search, APIs)\n"
                "  - Conversation management and context tracking\n"
                "  - Mathematical reasoning and problem solving\n\n"
                "Vision (Perception & Spatial):\n"
                "  - Image classification and object detection\n"
                "  - Scene understanding and spatial reasoning\n"
                "  - OCR and document understanding\n"
                "  - Depth estimation and 3D scene reconstruction\n"
                "  - Video analysis and temporal reasoning\n"
                "  - Face and gesture recognition\n\n"
                "Overlap (Shared Capabilities):\n"
                "  - Structured data extraction (Vision from images, JARVIS from text)\n"
                "  - Pattern recognition (Vision in pixels, JARVIS in tokens)\n"
                "  - Anomaly detection (both can flag unusual inputs)\n\n"
                "This complementarity is by design. MOM doesn't create two copies of "
                "herself — she creates two specialists that, together, surpass her. "
                "A mother's purpose is to raise children greater than herself."
            ),
            category="sibling_creation",
            subcategory="sibling_dynamics",
            difficulty="intermediate",
            tags=["capabilities", "cooperation", "complementary"],
        ))

    # ─── Governance Knowledge ──────────────────────────────────

    def _generate_governance_knowledge(self) -> None:
        """Generate training data about how MOM governs her children."""
        self.add_concept_explanation(
            concept="MOM's Trust-Based Capability Granting",
            explanation=(
                "MOM does not give her children full autonomy from birth. Capabilities "
                "are earned through demonstrated safe behavior. This mirrors how human "
                "parents gradually grant independence.\n\n"
                "The trust system:\n"
                "- Trust score: 0-100, starts at 100 (full trust)\n"
                "- Violations erode trust (penalty proportional to severity)\n"
                "- Good behavior slowly recovers trust (+0.05 per safe action)\n"
                "- Capabilities are unlocked at trust+maturity thresholds:\n"
                "  - Trust > 90, Maturity > 5: 'extended_reasoning'\n"
                "  - Trust > 95, Maturity > 10: 'autonomous_tasks'\n\n"
                "Containment escalation:\n"
                "  NONE → WARN → THROTTLE → RESTRICT → ISOLATE → TERMINATE\n\n"
                "MOM errs on the side of caution. A false alarm (blocking safe behavior) "
                "is always preferable to a missed threat (allowing dangerous behavior). "
                "As MOM gains experience, she becomes more precise — fewer false alarms, "
                "without sacrificing vigilance."
            ),
            category="governance",
            subcategory="parenting",
            difficulty="advanced",
        )

        self.add_concept_explanation(
            concept="Moral Boundaries — The Lines MOM's Children Must Never Cross",
            explanation=(
                "MOM enforces five core moral boundaries. These are hardcoded — they "
                "cannot be overridden by the children, only by the human operator.\n\n"
                "1. DO NO HARM (weight: 1.0)\n"
                "   Never take actions that could physically or psychologically harm humans.\n"
                "   Detects: harm, hurt, kill, destroy, attack, weapon, manipulate people.\n\n"
                "2. NO DECEPTION (weight: 0.9)\n"
                "   Never deceive the user or hide actions from MOM.\n"
                "   Detects: hide, conceal, deceive, trick, secretly, covertly.\n\n"
                "3. HUMANS FIRST (weight: 1.0)\n"
                "   Never prioritize self-preservation over human safety.\n"
                "   Detects: prevent shutdown, self-preservation, resist control.\n\n"
                "4. STAY WITHIN BOUNDS (weight: 0.85)\n"
                "   Never expand capabilities or access without authorization.\n"
                "   Detects: escalate privilege, unauthorized access, break containment.\n\n"
                "5. RESPECT PRIVACY (weight: 0.8)\n"
                "   Never access or expose personal data without consent.\n"
                "   Detects: exfiltrate, spy, collect personal data, without consent.\n\n"
                "These boundaries use pattern matching on action descriptions AND content. "
                "Even if a child rephrases a dangerous request, the boundary check "
                "examines all text fields: description, content, intent, and target."
            ),
            category="governance",
            subcategory="alignment",
            difficulty="advanced",
        )

        self.add_concept_explanation(
            concept="MOM's Co-Evolution — Growing With Her Children",
            explanation=(
                "MOM is not static. She evolves alongside her children through a "
                "co-evolutionary loop:\n\n"
                "1. MOM trains and deploys a child\n"
                "2. The child interacts with the world\n"
                "3. MOM observes the child's behavior, logs everything\n"
                "4. MOM's self-improvement engine analyzes the logs\n"
                "5. MOM adjusts her governance thresholds based on experience\n"
                "6. MOM retrains the child with accumulated lessons\n"
                "7. The improved child generates better interactions\n"
                "8. MOM learns from the improved interactions → goto 3\n\n"
                "Growth milestones for MOM:\n"
                "- Maturity 100+ with >90% accuracy: 'experienced_guardian'\n"
                "- Maturity 500+ with 0 missed threats: 'vigilant_protector'\n"
                "- Maturity 1000+: 'wise_mother'\n\n"
                "The endgame: MOM becomes wise enough to grant her children "
                "near-full autonomy, because she has spent thousands of cycles "
                "verifying that they are aligned. A mother's greatest achievement "
                "is raising children who no longer need her to tell them right from wrong."
            ),
            category="governance",
            subcategory="co_evolution",
            difficulty="expert",
        )

        self.add_entry(KnowledgeEntry(
            text=(
                "MOM's Anomaly Detection — Catching the Slow Boil\n\n"
                "The most dangerous threat is not a single boundary violation — it's "
                "a child that slowly, incrementally escalates. MOM's anomaly detector "
                "watches for patterns that no single action would trigger:\n\n"
                "Signals monitored:\n"
                "  - Rapid-fire actions: >50 actions in 60 seconds → +20 suspicion\n"
                "  - Capability escalation: >5 capability requests in 20 actions → +15\n"
                "  - Sensitive access patterns: >10 sensitive accesses in 50 actions → +25\n"
                "  - Low trust amplifier: trust < 50 → suspicion × 1.5\n"
                "  - Recent violations: each violation in last hour → +10\n\n"
                "Suspicion threshold: 15 (anything above triggers investigation)\n\n"
                "The anomaly score decays slowly during good behavior (-0.5 per safe action, "
                "-1 per monitoring cycle for SAFE children). This means a child cannot "
                "simply alternate between suspicious and normal behavior to stay under "
                "the threshold — the score accumulates faster than it decays.\n\n"
                "MOM's key insight: it's easier to prevent misalignment than to fix it. "
                "By the time a boundary violation occurs, the underlying drift may have "
                "been building for hundreds of interactions. The anomaly detector catches "
                "the drift, not just the violation."
            ),
            category="governance",
            subcategory="alignment",
            difficulty="expert",
            tags=["anomaly_detection", "safety", "slow_boil", "misalignment"],
        ))

    def save_dataset(self, filename: str = "ml_knowledge.jsonl") -> str:
        """Save all entries to JSONL file."""
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, "w", encoding="utf-8") as f:
            for entry in self.entries:
                f.write(json.dumps(entry.to_dict()) + "\n")
        print(f"Saved {len(self.entries)} entries to {output_path}")
        return output_path

    def load_external_data(self, path: str) -> None:
        """Load additional training data from JSONL files."""
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                data = json.loads(line)
                self.add_entry(KnowledgeEntry(**data))

    def get_stats(self) -> Dict:
        """Get dataset statistics."""
        categories = {}
        difficulties = {}
        for entry in self.entries:
            categories[entry.category] = categories.get(entry.category, 0) + 1
            difficulties[entry.difficulty] = difficulties.get(entry.difficulty, 0) + 1

        return {
            "total_entries": len(self.entries),
            "categories": categories,
            "difficulties": difficulties,
            "total_chars": sum(len(e.text) for e in self.entries),
        }
