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
