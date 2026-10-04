"""AURA Memory Monitor — Lightweight RSS and Heap logging for low-memory cloud environments."""

import os
import gc

def get_memory_usage_mb() -> float:
    """Return the current resident set size (RSS) in megabytes."""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 * 1024), 2)
    except Exception:
        try:
            import resource
            return round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 2)
        except Exception:
            return 0.0

def log_memory(stage: str):
    """Log memory usage with a clear stage tag."""
    rss = get_memory_usage_mb()
    print(f"[MEMORY] [{stage}] RSS: {rss:.2f} MB")

def force_cleanup():
    """Trigger Python garbage collection to free unreferenced memory."""
    gc.collect()
