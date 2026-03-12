#!/usr/bin/env python3
"""
Fetch real ML/DL training data from ArXiv, Wikipedia, and GitHub.

Usage:
    python -m llm.data.fetch_real_data
    python -m llm.data.fetch_real_data --output ./output/data/ml_knowledge.jsonl --merge
    python -m llm.data.fetch_real_data --arxiv-only
    python -m llm.data.fetch_real_data --wiki-only
    python -m llm.data.fetch_real_data --github-only

Token (optional, increases GitHub rate limit from 60 to 5000 req/hr):
    export GITHUB_TOKEN=ghp_...
"""

import argparse
import json
import os
import sys
import time
import xml.etree.ElementTree as ET

import requests

# ── ArXiv paper IDs to fetch ─────────────────────────────────────────────────
ARXIV_PAPER_IDS = [
    # Transformers & Attention
    "1706.03762",  # Attention Is All You Need
    "1810.04805",  # BERT
    "2005.14165",  # GPT-3
    "2302.13971",  # LLaMA
    "2307.09288",  # LLaMA 2
    "2310.06825",  # Mistral 7B
    "1901.02860",  # Transformer-XL
    "2203.02155",  # Chinchilla scaling laws
    "2001.08361",  # Scaling laws (Kaplan et al.)
    "2205.14135",  # Flash Attention
    "2307.08691",  # Flash Attention 2
    "2106.09685",  # LoRA
    "2305.14314",  # QLoRA
    "1902.00751",  # Adapter layers
    # Optimization
    "1412.6980",   # Adam optimizer
    "1711.05101",  # AdamW
    "1608.03983",  # SGDR cosine annealing
    # Normalization
    "1502.03167",  # Batch Normalization
    "1607.06450",  # Layer Normalization
    "1803.08494",  # Group Normalization
    # Regularization
    "1207.0580",   # Dropout
    "1710.05941",  # Mixup
    # Architectures
    "1512.03385",  # ResNet
    "1409.1556",   # VGG
    "2010.11929",  # Vision Transformer (ViT)
    "2103.14030",  # Swin Transformer
    "1406.2661",   # GAN
    "1312.6114",   # VAE
    "1511.06434",  # DCGAN
    # Diffusion
    "2006.11239",  # DDPM
    "2010.02502",  # DDIM
    "2112.10752",  # Latent Diffusion
    "2303.01469",  # Consistency Models
    # Sequence models
    "2312.00752",  # Mamba
    "2105.14103",  # RWKV
    # Alignment
    "2305.18290",  # DPO
    "2212.08073",  # Constitutional AI
    # MoE
    "2101.03961",  # Switch Transformer
    "2401.04088",  # Mixtral MoE
    # Positional Encoding
    "2104.09864",  # RoPE
    "2108.12409",  # ALiBi
    # Quantization
    "2208.07339",  # LLM.int8()
    "2310.11453",  # BitNet 1-bit
    "2402.17764",  # BitNet b1.58
    # Tokenization
    "1508.07909",  # SentencePiece
    # Reinforcement Learning
    "1707.06347",  # PPO
    "1801.01290",  # SAC
    "1509.02971",  # DDPG
    "1602.01783",  # A3C
    "1911.08265",  # MuZero
    # Embeddings
    "1301.3781",   # Word2Vec
]

# ── Wikipedia articles to fetch ───────────────────────────────────────────────
WIKI_ARTICLES = [
    "Machine learning", "Deep learning", "Artificial neural network",
    "Backpropagation", "Gradient descent", "Stochastic gradient descent",
    "Loss function", "Overfitting", "Regularization (mathematics)",
    "Cross-validation (statistics)", "Bias–variance tradeoff",
    "Dimensionality reduction", "Principal component analysis",
    "Support vector machine", "Decision tree", "Random forest",
    "Gradient boosting", "Logistic regression", "Linear regression",
    "Convolutional neural network", "Recurrent neural network",
    "Long short-term memory", "Gated recurrent unit",
    "Transformer (deep learning architecture)", "Residual neural network",
    "Autoencoder", "Generative adversarial network", "Variational autoencoder",
    "Diffusion model", "Attention (machine learning)",
    "BERT (language model)", "GPT (language model)", "Word2vec",
    "Word embedding", "Batch normalization", "Dropout (neural networks)",
    "Transfer learning", "Fine-tuning (deep learning)", "Data augmentation",
    "Early stopping", "Learning rate", "Hyperparameter optimization",
    "Adam (optimization algorithm)", "Reinforcement learning", "Q-learning",
    "Policy gradient method", "Actor–critic algorithm",
    "Markov decision process", "Proximal policy optimization",
    "Natural language processing", "Named-entity recognition",
    "Machine translation", "Text summarization", "Language model",
    "Byte pair encoding", "Object detection", "Image segmentation",
    "Large language model", "Prompt engineering",
    "Retrieval-augmented generation", "Mixture of experts",
    "Knowledge distillation", "Pruning (artificial neural network)",
]

# ── GitHub repos to fetch READMEs + key files from ───────────────────────────
GITHUB_REPOS = [
    # Foundational implementations
    ("karpathy/nanoGPT",         "deep_learning",         "architectures"),
    ("karpathy/minGPT",          "deep_learning",         "architectures"),
    ("karpathy/micrograd",       "foundations",           "optimization"),
    ("karpathy/makemore",        "large_language_models", "architectures"),
    ("karpathy/nn-zero-to-hero", "deep_learning",         "training"),
    # Major frameworks (README gives dense practical knowledge)
    ("huggingface/transformers", "large_language_models", "architectures"),
    ("huggingface/peft",         "large_language_models", "efficiency"),
    ("huggingface/trl",          "large_language_models", "training"),
    ("huggingface/diffusers",    "generative_models",     "diffusion"),
    ("huggingface/accelerate",   "systems",               "distributed"),
    # Efficient attention
    ("Dao-AILab/flash-attention","deep_learning",         "attention"),
    # Quantization
    ("TimDettmers/bitsandbytes", "large_language_models", "efficiency"),
    ("ggerganov/llama.cpp",      "large_language_models", "efficiency"),
    # Training frameworks
    ("microsoft/DeepSpeed",      "systems",               "distributed"),
    ("Lightning-AI/pytorch-lightning", "systems",         "training"),
    # RL
    ("openai/baselines",         "reinforcement_learning","advanced"),
    ("DLR-RM/stable-baselines3", "reinforcement_learning","advanced"),
    # Diffusion
    ("CompVis/stable-diffusion", "generative_models",     "diffusion"),
    ("openai/consistency_models","generative_models",     "diffusion"),
    # Classic ML
    ("scikit-learn/scikit-learn","machine_learning",      "supervised"),
    # Tokenizers
    ("openai/tiktoken",          "large_language_models", "tokenization"),
    ("google/sentencepiece",     "large_language_models", "tokenization"),
    # Mamba / SSMs
    ("state-spaces/mamba",       "deep_learning",         "architectures"),
    # Alignment
    ("openai/openai-cookbook",   "large_language_models", "training"),
]

WIKI_CATEGORY_MAP = {
    "Machine learning": ("machine_learning", "theory"),
    "Deep learning": ("deep_learning", "overview"),
    "Artificial neural network": ("deep_learning", "architectures"),
    "Backpropagation": ("deep_learning", "training"),
    "Gradient descent": ("foundations", "optimization"),
    "Stochastic gradient descent": ("foundations", "optimization"),
    "Loss function": ("foundations", "optimization"),
    "Overfitting": ("machine_learning", "theory"),
    "Regularization (mathematics)": ("machine_learning", "theory"),
    "Convolutional neural network": ("deep_learning", "architectures"),
    "Recurrent neural network": ("deep_learning", "architectures"),
    "Long short-term memory": ("deep_learning", "architectures"),
    "Transformer (deep learning architecture)": ("deep_learning", "architectures"),
    "Residual neural network": ("deep_learning", "architectures"),
    "Generative adversarial network": ("generative_models", "gan"),
    "Variational autoencoder": ("generative_models", "vae"),
    "Diffusion model": ("generative_models", "diffusion"),
    "BERT (language model)": ("large_language_models", "architectures"),
    "GPT (language model)": ("large_language_models", "architectures"),
    "Large language model": ("large_language_models", "overview"),
    "Batch normalization": ("deep_learning", "normalization"),
    "Dropout (neural networks)": ("deep_learning", "regularization"),
    "Transfer learning": ("deep_learning", "training"),
    "Reinforcement learning": ("reinforcement_learning", "fundamentals"),
    "Q-learning": ("reinforcement_learning", "fundamentals"),
    "Policy gradient method": ("reinforcement_learning", "fundamentals"),
    "Proximal policy optimization": ("reinforcement_learning", "advanced"),
    "Mixture of experts": ("large_language_models", "architectures"),
    "Knowledge distillation": ("large_language_models", "efficiency"),
    "Byte pair encoding": ("large_language_models", "tokenization"),
}


# Hardcoded fallback for papers that ArXiv frequently rate-limits
ARXIV_FALLBACK: dict[str, dict] = {
    "2105.14103": {
        "text": "<paper>\nTitle: RWKV: Reinventing RNNs for the Transformer Era\nAuthors: Bo Peng et al.\nYear: 2023\nArXiv: 2105.14103\n\nRWKV is a novel model architecture that combines the efficient parallelizable training of Transformers with the efficient inference of RNNs. It uses a linear attention mechanism to achieve O(1) inference cost while maintaining competitive language modelling performance.\n</paper>",
        "category": "large_language_models", "subcategory": "architectures", "difficulty": "advanced",
        "source": "arxiv:2105.14103", "tags": ["RWKV: Reinventing RNNs for the Transformer Era"],
    },
    "2212.08073": {
        "text": "<paper>\nTitle: Constitutional AI: Harmlessness from AI Feedback\nAuthors: Yuntao Bai et al.\nYear: 2022\nArXiv: 2212.08073\n\nConstitutional AI (CAI) is a method for training a harmless AI assistant without human labels for harmfulness. It uses a set of principles (a constitution) and AI-generated feedback to iteratively revise responses, enabling scalable oversight.\n</paper>",
        "category": "large_language_models", "subcategory": "architectures", "difficulty": "advanced",
        "source": "arxiv:2212.08073", "tags": ["Constitutional AI: Harmlessness from AI Feedback"],
    },
    "2101.03961": {
        "text": "<paper>\nTitle: Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity\nAuthors: William Fedus, Barret Zoph, Noam Shazeer\nYear: 2021\nArXiv: 2101.03961\n\nSwitch Transformers introduce a sparse Mixture of Experts (MoE) architecture that routes each token to a single expert, dramatically increasing model capacity with minimal computational overhead.\n</paper>",
        "category": "large_language_models", "subcategory": "architectures", "difficulty": "advanced",
        "source": "arxiv:2101.03961", "tags": ["Switch Transformers: Scaling to Trillion Parameter Models"],
    },
    "2401.04088": {
        "text": "<paper>\nTitle: Mixtral of Experts\nAuthors: Albert Q. Jiang et al.\nYear: 2024\nArXiv: 2401.04088\n\nMixtral 8x7B is a sparse mixture-of-experts language model where each token is processed by 2 out of 8 feed-forward expert networks, achieving strong performance while using fewer active parameters than a dense model of similar capacity.\n</paper>",
        "category": "large_language_models", "subcategory": "architectures", "difficulty": "advanced",
        "source": "arxiv:2401.04088", "tags": ["Mixtral of Experts"],
    },
    "2104.09864": {
        "text": "<paper>\nTitle: RoFormer: Enhanced Transformer with Rotary Position Embedding\nAuthors: Jianlin Su et al.\nYear: 2021\nArXiv: 2104.09864\n\nRoPE (Rotary Position Embedding) encodes positional information by rotating query and key vectors in attention. It enables relative position awareness and better length generalization, and is widely used in modern LLMs including LLaMA and Mistral.\n</paper>",
        "category": "large_language_models", "subcategory": "architectures", "difficulty": "advanced",
        "source": "arxiv:2104.09864", "tags": ["RoFormer: Enhanced Transformer with Rotary Position Embedding"],
    },
    "2108.12409": {
        "text": "<paper>\nTitle: Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation\nAuthors: Ofir Press, Noah A. Smith, Mike Lewis\nYear: 2021\nArXiv: 2108.12409\n\nALiBi (Attention with Linear Biases) replaces learned positional embeddings with a static linear bias added to attention scores. This enables transformers to extrapolate to longer sequences at test time than seen during training.\n</paper>",
        "category": "large_language_models", "subcategory": "architectures", "difficulty": "advanced",
        "source": "arxiv:2108.12409", "tags": ["Train Short, Test Long: Attention with Linear Biases"],
    },
    "2208.07339": {
        "text": "<paper>\nTitle: LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale\nAuthors: Tim Dettmers et al.\nYear: 2022\nArXiv: 2208.07339\n\nLLM.int8() uses mixed-precision decomposition for 8-bit quantization of large language models, handling outlier features in fp16 while quantizing the rest to int8, enabling deployment of 175B+ models on consumer hardware.\n</paper>",
        "category": "large_language_models", "subcategory": "efficiency", "difficulty": "advanced",
        "source": "arxiv:2208.07339", "tags": ["LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale"],
    },
    "2310.11453": {
        "text": "<paper>\nTitle: BitNet: Scaling 1-bit Transformers for Large Language Models\nAuthors: Hongyu Wang et al.\nYear: 2023\nArXiv: 2310.11453\n\nBitNet trains transformer language models with 1-bit weights, replacing linear projections with a BitLinear layer. At scale, BitNet achieves competitive performance with full-precision models while drastically reducing memory and energy usage.\n</paper>",
        "category": "large_language_models", "subcategory": "efficiency", "difficulty": "advanced",
        "source": "arxiv:2310.11453", "tags": ["BitNet: Scaling 1-bit Transformers for Large Language Models"],
    },
    "2402.17764": {
        "text": "<paper>\nTitle: The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits\nAuthors: Shuming Ma et al.\nYear: 2024\nArXiv: 2402.17764\n\nBitNet b1.58 extends 1-bit LLMs by allowing weights to be -1, 0, or +1 (1.58 bits per parameter). This ternary scheme matches full-precision LLM performance from 3B parameters while enabling much faster inference.\n</paper>",
        "category": "large_language_models", "subcategory": "efficiency", "difficulty": "advanced",
        "source": "arxiv:2402.17764", "tags": ["The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits"],
    },
    "1508.07909": {
        "text": "<paper>\nTitle: SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing\nAuthors: Taku Kudo, John Richardson\nYear: 2018\nArXiv: 1508.07909\n\nSentencePiece is an unsupervised text tokenizer and detokenizer that trains directly on raw text without pre-tokenization. It implements BPE and unigram language model algorithms and is used in many modern LLMs including LLaMA and Gemma.\n</paper>",
        "category": "large_language_models", "subcategory": "architectures", "difficulty": "intermediate",
        "source": "arxiv:1508.07909", "tags": ["SentencePiece: A simple and language independent subword tokenizer"],
    },
    "1801.01290": {
        "text": "<paper>\nTitle: Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning with a Stochastic Actor\nAuthors: Tuomas Haarnoja et al.\nYear: 2018\nArXiv: 1801.01290\n\nSAC (Soft Actor-Critic) is an off-policy actor-critic method based on maximum entropy reinforcement learning. It optimizes a trade-off between reward and entropy, achieving state-of-the-art sample efficiency and stability on continuous control tasks.\n</paper>",
        "category": "reinforcement_learning", "subcategory": "advanced", "difficulty": "advanced",
        "source": "arxiv:1801.01290", "tags": ["Soft Actor-Critic: Off-Policy Maximum Entropy Deep Reinforcement Learning"],
    },
    "1509.02971": {
        "text": "<paper>\nTitle: Continuous control with deep reinforcement learning\nAuthors: Timothy P. Lillicrap et al.\nYear: 2015\nArXiv: 1509.02971\n\nDDPG (Deep Deterministic Policy Gradient) adapts DQN to continuous action spaces using an actor-critic architecture with a deterministic policy and experience replay, enabling model-free RL on high-dimensional continuous control tasks.\n</paper>",
        "category": "reinforcement_learning", "subcategory": "advanced", "difficulty": "advanced",
        "source": "arxiv:1509.02971", "tags": ["Continuous control with deep reinforcement learning (DDPG)"],
    },
    "1602.01783": {
        "text": "<paper>\nTitle: Asynchronous Methods for Deep Reinforcement Learning\nAuthors: Volodymyr Mnih et al.\nYear: 2016\nArXiv: 1602.01783\n\nA3C (Asynchronous Advantage Actor-Critic) trains multiple agents asynchronously in parallel environments, using the accumulated experience to update a global network. It achieves strong performance on Atari and continuous control without experience replay.\n</paper>",
        "category": "reinforcement_learning", "subcategory": "advanced", "difficulty": "advanced",
        "source": "arxiv:1602.01783", "tags": ["Asynchronous Methods for Deep Reinforcement Learning (A3C)"],
    },
    "1911.08265": {
        "text": "<paper>\nTitle: Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model\nAuthors: Julian Schrittwieser et al.\nYear: 2019\nArXiv: 1911.08265\n\nMuZero learns a model of the environment dynamics and uses it for planning via Monte Carlo Tree Search, without being given the rules of the game. It achieves superhuman performance on Atari, Go, Chess, and Shogi.\n</paper>",
        "category": "reinforcement_learning", "subcategory": "advanced", "difficulty": "advanced",
        "source": "arxiv:1911.08265", "tags": ["Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model (MuZero)"],
    },
}


def _categorize_arxiv(title: str, abstract: str) -> tuple[str, str]:
    t = (title + " " + abstract).lower()
    if any(k in t for k in ["language model", "llm", "gpt", "bert", "llama", "instruction", "rlhf", "dpo", "lora", "qlora"]):
        return "large_language_models", "architectures"
    if any(k in t for k in ["diffusion", "ddpm", "ddim", "stable diffusion", "flow matching", "consistency"]):
        return "generative_models", "diffusion"
    if any(k in t for k in ["generative adversarial", " gan"]):
        return "generative_models", "gan"
    if any(k in t for k in ["variational autoencoder", " vae"]):
        return "generative_models", "vae"
    if any(k in t for k in ["reinforcement", "policy gradient", "reward", "actor-critic", "mdp"]):
        return "reinforcement_learning", "advanced"
    if any(k in t for k in ["attention", "transformer", "self-attention"]):
        return "deep_learning", "attention"
    if any(k in t for k in ["optimizer", "adam", "sgd", "learning rate", "scheduler", "warmup"]):
        return "foundations", "optimization"
    if any(k in t for k in ["normalization", "batch norm", "layer norm"]):
        return "deep_learning", "normalization"
    if any(k in t for k in ["quantization", "pruning", "distillation", "efficient", "compression"]):
        return "large_language_models", "efficiency"
    if any(k in t for k in ["convolutional", "resnet", "vgg", "image", "vision", "detection"]):
        return "deep_learning", "architectures"
    return "deep_learning", "architectures"


def _parse_arxiv_entry(entry, ns, paper_id: str) -> dict | None:
    title = (entry.findtext("atom:title", "", ns) or "").strip().replace("\n", " ")
    abstract = (entry.findtext("atom:summary", "", ns) or "").strip().replace("\n", " ")
    authors = [a.findtext("atom:name", "", ns) for a in entry.findall("atom:author", ns)][:5]
    year = (entry.findtext("atom:published", "", ns) or "")[:4]
    if not title or not abstract:
        return None
    category, subcategory = _categorize_arxiv(title, abstract)
    text = (
        f"<paper>\n"
        f"Title: {title}\n"
        f"Authors: {', '.join(authors)}\n"
        f"Year: {year}\n"
        f"ArXiv: {paper_id}\n\n"
        f"{abstract}\n"
        f"</paper>"
    )
    return {
        "text": text,
        "category": category,
        "subcategory": subcategory,
        "difficulty": "advanced",
        "source": f"arxiv:{paper_id}",
        "tags": [title],
    }


def fetch_arxiv_batch(paper_ids: list[str], session: requests.Session) -> dict[str, dict]:
    """Fetch multiple ArXiv papers in a single API call. Returns {paper_id: entry}."""
    url = f"https://export.arxiv.org/api/query?id_list={','.join(paper_ids)}&max_results={len(paper_ids)}"
    for attempt in range(5):
        try:
            resp = session.get(url, timeout=30)
            if resp.status_code == 429:
                wait = 2 ** (attempt + 2)
                print(f"  [arxiv] batch rate limited, retrying in {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            break
        except Exception as e:
            if attempt == 4:
                print(f"  [arxiv] batch failed: {e}")
                return {}
            wait = 2 ** (attempt + 2)
            time.sleep(wait)
    else:
        print("  [arxiv] batch failed after retries")
        return {}

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(resp.text)
    results = {}
    for entry_el in root.findall("atom:entry", ns):
        # Extract paper ID from the <id> tag
        raw_id = (entry_el.findtext("atom:id", "", ns) or "").strip()
        # raw_id looks like http://arxiv.org/abs/1706.03762v5
        pid = raw_id.split("/abs/")[-1].split("v")[0] if "/abs/" in raw_id else ""
        if not pid:
            continue
        parsed = _parse_arxiv_entry(entry_el, ns, pid)
        if parsed:
            results[pid] = parsed
    return results


def fetch_arxiv_paper(paper_id: str, session: requests.Session) -> dict | None:
    """Fetch a single ArXiv paper (fallback for individual retries)."""
    result = fetch_arxiv_batch([paper_id], session)
    return result.get(paper_id)


def fetch_wikipedia_article(title: str, session: requests.Session) -> dict | None:
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query", "titles": title,
        "prop": "extracts", "exintro": True,
        "explaintext": True, "format": "json", "redirects": True,
    }
    try:
        resp = session.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  [wiki] '{title}': {e}")
        return None

    page = next(iter(data.get("query", {}).get("pages", {}).values()))
    if "missing" in page:
        return None

    extract = (page.get("extract") or "").strip()
    if len(extract) < 200:
        return None

    if len(extract) > 3000:
        cut = extract[:3000].rfind(". ")
        extract = extract[:cut + 1] if cut > 0 else extract[:3000]

    category, subcategory = WIKI_CATEGORY_MAP.get(title, ("machine_learning", "overview"))
    return {
        "text": f"<concept>{title}</concept>\n\n{extract}",
        "category": category,
        "subcategory": subcategory,
        "difficulty": "intermediate",
        "source": f"wikipedia:{title}",
        "tags": [title],
    }


def fetch_github_repo(owner: str, repo: str, category: str, subcategory: str,
                      session: requests.Session) -> list[dict]:
    """Fetch README and key Python files from a GitHub repo."""
    entries = []
    full_name = f"{owner}/{repo}"
    headers = session.headers.copy()

    # Fetch README
    readme_url = f"https://api.github.com/repos/{full_name}/readme"
    try:
        resp = session.get(readme_url, timeout=15)
        if resp.status_code == 200:
            import base64
            content = base64.b64decode(resp.json()["content"]).decode("utf-8", errors="replace")
            # Truncate to first ~4000 chars
            if len(content) > 4000:
                cut = content[:4000].rfind("\n")
                content = content[:cut] if cut > 0 else content[:4000]
            if len(content) > 300:
                entries.append({
                    "text": f"<github repo=\"{full_name}\">\n{content}\n</github>",
                    "category": category,
                    "subcategory": subcategory,
                    "difficulty": "intermediate",
                    "source": f"github:{full_name}:README",
                    "tags": [full_name, repo],
                })
    except Exception as e:
        print(f"  [github] {full_name} README: {e}")

    # Fetch a few key Python source files (up to 3)
    tree_url = f"https://api.github.com/repos/{full_name}/git/trees/HEAD?recursive=1"
    try:
        resp = session.get(tree_url, timeout=15)
        if resp.status_code == 200:
            tree = resp.json().get("tree", [])
            # Pick small-to-medium .py files that look like core implementations
            py_files = [
                f for f in tree
                if f["path"].endswith(".py")
                and f.get("size", 0) < 20000  # skip huge files
                and f.get("size", 0) > 500
                and not any(skip in f["path"] for skip in [
                    "test", "setup", "conf", "doc", "__init__", "migration"
                ])
            ]
            # Sort by size descending (meatier files first), take top 3
            py_files.sort(key=lambda x: x.get("size", 0), reverse=True)
            for file_info in py_files[:3]:
                blob_url = f"https://api.github.com/repos/{full_name}/contents/{file_info['path']}"
                try:
                    blob_resp = session.get(blob_url, timeout=15)
                    if blob_resp.status_code == 200:
                        import base64
                        code = base64.b64decode(blob_resp.json()["content"]).decode("utf-8", errors="replace")
                        if len(code) > 6000:
                            cut = code[:6000].rfind("\n")
                            code = code[:cut] if cut > 0 else code[:6000]
                        if len(code) > 300:
                            entries.append({
                                "text": f"<code repo=\"{full_name}\" file=\"{file_info['path']}\">\n{code}\n</code>",
                                "category": category,
                                "subcategory": subcategory,
                                "difficulty": "advanced",
                                "source": f"github:{full_name}:{file_info['path']}",
                                "tags": [full_name, file_info["path"]],
                            })
                        time.sleep(0.3)
                except Exception:
                    pass
    except Exception as e:
        print(f"  [github] {full_name} tree: {e}")

    return entries


def load_existing(path: str) -> list[dict]:
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return [json.loads(l) for l in f if l.strip()]


def save_jsonl(entries: list[dict], path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description="Fetch real ML training data")
    parser.add_argument("--output", default="./output/data/ml_knowledge.jsonl")
    parser.add_argument("--merge", action="store_true", default=True)
    parser.add_argument("--no-merge", action="store_false", dest="merge")
    parser.add_argument("--arxiv-only", action="store_true")
    parser.add_argument("--wiki-only", action="store_true")
    parser.add_argument("--github-only", action="store_true")
    parser.add_argument("--no-github", action="store_true")
    parser.add_argument("--delay", type=float, default=3.0)
    args = parser.parse_args()

    github_token = os.environ.get("GITHUB_TOKEN", "")

    session = requests.Session()
    session.headers["User-Agent"] = "JARVIS-MOM-DataFetcher/1.0 (educational ML training)"
    if github_token:
        session.headers["Authorization"] = f"token {github_token}"
        print("GitHub token loaded.")

    entries = []
    if args.merge:
        existing = load_existing(args.output)
        entries.extend(existing)
        print(f"Loaded {len(existing)} existing entries.")
    existing_sources = {e.get("source", "") for e in entries}

    do_arxiv  = not args.wiki_only  and not args.github_only
    do_wiki   = not args.arxiv_only and not args.github_only
    do_github = not args.arxiv_only and not args.wiki_only and not args.no_github

    # ── ArXiv ─────────────────────────────────────────────────────────────────
    if do_arxiv:
        print(f"\nFetching {len(ARXIV_PAPER_IDS)} ArXiv papers...")
        fetched = skipped = failed = 0
        ids_to_fetch = []
        for paper_id in ARXIV_PAPER_IDS:
            src = f"arxiv:{paper_id}"
            if src in existing_sources:
                skipped += 1
            else:
                ids_to_fetch.append(paper_id)

        # Fetch in batches of 20 to stay within URL length limits
        BATCH_SIZE = 20
        for i in range(0, len(ids_to_fetch), BATCH_SIZE):
            batch = ids_to_fetch[i:i + BATCH_SIZE]
            print(f"  Fetching batch {i // BATCH_SIZE + 1} ({len(batch)} papers)...")
            results = fetch_arxiv_batch(batch, session)
            for paper_id in batch:
                entry = results.get(paper_id) or ARXIV_FALLBACK.get(paper_id)
                if entry:
                    entries.append(entry)
                    existing_sources.add(f"arxiv:{paper_id}")
                    fetched += 1
                    src_label = "(fallback)" if paper_id not in results else ""
                    print(f"  [{fetched:3d}] {entry['tags'][0][:65]} {src_label}")
                else:
                    failed += 1
                    print(f"  [FAIL] {paper_id}")
            if i + BATCH_SIZE < len(ids_to_fetch):
                time.sleep(args.delay)
        print(f"  ArXiv: {fetched} fetched, {skipped} skipped, {failed} failed")

    # ── Wikipedia ─────────────────────────────────────────────────────────────
    if do_wiki:
        seen = set()
        unique = [t for t in WIKI_ARTICLES if t not in seen and not seen.add(t)]
        print(f"\nFetching {len(unique)} Wikipedia articles...")
        fetched = skipped = failed = 0
        for title in unique:
            src = f"wikipedia:{title}"
            if src in existing_sources:
                skipped += 1
                continue
            entry = fetch_wikipedia_article(title, session)
            if entry:
                entries.append(entry)
                existing_sources.add(src)
                fetched += 1
                print(f"  [{fetched:3d}] {title[:70]}")
            else:
                failed += 1
            time.sleep(args.delay)
        print(f"  Wikipedia: {fetched} fetched, {skipped} skipped, {failed} failed")

    # ── GitHub ────────────────────────────────────────────────────────────────
    if do_github:
        print(f"\nFetching {len(GITHUB_REPOS)} GitHub repos...")
        repo_fetched = 0
        for full_name, category, subcategory in GITHUB_REPOS:
            owner, repo = full_name.split("/", 1)
            src_prefix = f"github:{full_name}"
            if any(s.startswith(src_prefix) for s in existing_sources):
                print(f"  [skip] {full_name}")
                continue
            new_entries = fetch_github_repo(owner, repo, category, subcategory, session)
            if new_entries:
                entries.extend(new_entries)
                for e in new_entries:
                    existing_sources.add(e["source"])
                repo_fetched += 1
                print(f"  [{repo_fetched:3d}] {full_name} (+{len(new_entries)} entries)")
            else:
                print(f"  [fail] {full_name}")
            time.sleep(args.delay)
        print(f"  GitHub: {repo_fetched} repos fetched")

    # ── Save ──────────────────────────────────────────────────────────────────
    save_jsonl(entries, args.output)

    cats: dict[str, int] = {}
    for e in entries:
        c = e.get("category", "?")
        cats[c] = cats.get(c, 0) + 1

    print(f"\nSaved {len(entries)} total entries to {args.output}")
    print("Categories:")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {n}")


if __name__ == "__main__":
    main()
