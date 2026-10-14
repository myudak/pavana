"""Evaluation metrics. Report alongside baselines A/B, on untouched holdouts only."""

import numpy as np
from numpy.typing import ArrayLike


def _clean(y_true: ArrayLike, y_pred: ArrayLike) -> tuple[np.ndarray, np.ndarray]:
    t, p = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    ok = ~(np.isnan(t) | np.isnan(p))
    return t[ok], p[ok]


def mae(y_true: ArrayLike, y_pred: ArrayLike) -> float:
    t, p = _clean(y_true, y_pred)
    return float(np.mean(np.abs(t - p))) if t.size else float("nan")


def rmse(y_true: ArrayLike, y_pred: ArrayLike) -> float:
    t, p = _clean(y_true, y_pred)
    return float(np.sqrt(np.mean((t - p) ** 2))) if t.size else float("nan")


def event_precision_recall(
    y_true: ArrayLike, y_pred: ArrayLike, threshold_ug_m3: float
) -> dict[str, float]:
    """High-pollution events (≥ threshold). State the threshold's standard when reporting
    (e.g. 55.5 µg/m³ = US AQI 'Unhealthy' lower bound)."""
    t, p = _clean(y_true, y_pred)
    actual, predicted = t >= threshold_ug_m3, p >= threshold_ug_m3
    tp = int(np.sum(actual & predicted))
    precision = tp / int(predicted.sum()) if predicted.any() else float("nan")
    recall = tp / int(actual.sum()) if actual.any() else float("nan")
    return {"precision": precision, "recall": recall, "support": int(actual.sum())}
