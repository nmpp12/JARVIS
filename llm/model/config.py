    @classmethod
    def laptop(cls) -> "ModelConfig":
        """CPU-friendly model for laptops (~42M params).

        Tuned for low power draw on machines without a GPU:
        - Fewer layers and smaller hidden dim than 'small'
        - BitNet enabled (ternary weights → no FP matmuls, pure add/sub)
        - Flash attention OFF (no CUDA), Triton kernels OFF
        - Early exit OFF (kept off to avoid CPU memory overhead)
        - Sliding window ON to cap memory on long prompts
        - Short max_seq_len to limit RAM
        """
        return cls(
            hidden_dim=512,
            num_layers=8,
            num_heads=8,
            num_kv_heads=2,
            intermediate_dim=1376,
            max_seq_len=1024,
            use_bitnet=True,
            use_flash_attention=False,
            use_triton_kernels=False,
            use_early_exit=False,   # logits tensor too large with 100k vocab on CPU
            use_sliding_window=True,
            sliding_window_size=512,
            use_token_pruning=False,
            kv_cache_quantize_bits=8,
        )
