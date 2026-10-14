"""Lag features and supervised targets on an hourly, time-sorted frame."""

import pandas as pd


def add_lags(df: pd.DataFrame, col: str, lags: tuple[int, ...] = (1, 3, 6)) -> pd.DataFrame:
    """Past values only (shift > 0). Requires a regular hourly index without gaps."""
    out = df.copy()
    for k in lags:
        out[f"{col}_lag{k}h"] = out[col].shift(k)
    return out


def add_target(df: pd.DataFrame, col: str, horizon_hours: int = 6) -> pd.DataFrame:
    """Target = OBSERVED value at t + h.

    Rows without a future value get NaN — drop them before training.
    """
    out = df.copy()
    out[f"target_{col}_t+{horizon_hours}h"] = out[col].shift(-horizon_hours)
    return out
