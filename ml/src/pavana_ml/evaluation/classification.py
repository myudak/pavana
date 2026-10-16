"""Probabilistic classification metrics for the served models (holdout only)."""

from __future__ import annotations

import numpy as np
from numpy.typing import ArrayLike


def _clean(y: ArrayLike, p: ArrayLike) -> tuple[np.ndarray, np.ndarray]:
    t, q = np.asarray(y, dtype=float), np.asarray(p, dtype=float)
    ok = ~(np.isnan(t) | np.isnan(q))
    return t[ok], q[ok]


def roc_auc(y: ArrayLike, p: ArrayLike) -> float:
    """Rank-based ROC-AUC with tie handling (Mann–Whitney U)."""
    t, q = _clean(y, p)
    n_pos, n_neg = int(t.sum()), int((1 - t).sum())
    if n_pos == 0 or n_neg == 0:
        return float("nan")
    order = np.argsort(q, kind="mergesort")
    ranks = np.empty(len(q), dtype=float)
    sorted_q = q[order]
    i = 0
    while i < len(q):
        j = i
        while j + 1 < len(q) and sorted_q[j + 1] == sorted_q[i]:
            j += 1
        ranks[order[i : j + 1]] = (i + j) / 2.0 + 1.0
        i = j + 1
    return float((ranks[t == 1].sum() - n_pos * (n_pos + 1) / 2.0) / (n_pos * n_neg))


def average_precision(y: ArrayLike, p: ArrayLike) -> float:
    """PR-AUC as average precision (step-wise, ties grouped)."""
    t, q = _clean(y, p)
    n_pos = int(t.sum())
    if n_pos == 0:
        return float("nan")
    order = np.argsort(-q, kind="mergesort")
    t, q = t[order], q[order]
    tp = np.cumsum(t)
    # Evaluate only at the last index of each distinct score.
    last = np.r_[np.nonzero(np.diff(q))[0], len(q) - 1]
    precision = tp[last] / (last + 1)
    recall = tp[last] / n_pos
    prev = np.r_[0.0, recall[:-1]]
    return float(np.sum((recall - prev) * precision))


def brier(y: ArrayLike, p: ArrayLike) -> float:
    t, q = _clean(y, p)
    return float(np.mean((q - t) ** 2)) if t.size else float("nan")


def log_loss(y: ArrayLike, p: ArrayLike, eps: float = 1e-12) -> float:
    t, q = _clean(y, p)
    q = np.clip(q, eps, 1 - eps)
    return float(-np.mean(t * np.log(q) + (1 - t) * np.log(1 - q))) if t.size else float("nan")


def binary_metrics(y: ArrayLike, p: ArrayLike) -> dict[str, float]:
    t, q = _clean(y, p)
    base = float(t.mean()) if t.size else float("nan")
    b = brier(t, q)
    ref = base * (1 - base)  # Brier of always predicting the base rate
    return {
        "n": int(t.size),
        "positives": int(t.sum()),
        "rocAuc": roc_auc(t, q),
        "prAuc": average_precision(t, q),
        "brier": b,
        "brierSkill": float(1 - b / ref) if ref > 0 else float("nan"),
        "logLoss": log_loss(t, q),
    }


def calibration_bins(y: ArrayLike, p: ArrayLike, n_bins: int = 10) -> list[dict[str, float]]:
    """Reliability table on fixed-width probability bins (empty bins omitted)."""
    t, q = _clean(y, p)
    edges = np.linspace(0, 1, n_bins + 1)
    idx = np.clip(np.digitize(q, edges[1:-1]), 0, n_bins - 1)
    out = []
    for b in range(n_bins):
        m = idx == b
        if m.any():
            out.append(
                {
                    "lo": float(edges[b]),
                    "hi": float(edges[b + 1]),
                    "meanPredicted": float(q[m].mean()),
                    "observedRate": float(t[m].mean()),
                    "n": int(m.sum()),
                }
            )
    return out
