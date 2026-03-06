"""
MOM (Master of Models) - A transformer-based language model specialized in
Deep Learning and Machine Learning knowledge.

Architecture: GPT-style decoder-only transformer with:
- Rotary Positional Embeddings (RoPE)
- Grouped Query Attention (GQA)
- RMSNorm
- SwiGLU activation
- Flash Attention support
- Code generation and sandboxed execution
- Tool-use / function-calling interface

Designed for training on curated ML/DL research, textbooks, and documentation.
"""

__version__ = "0.2.0"
__model_name__ = "MOM"
