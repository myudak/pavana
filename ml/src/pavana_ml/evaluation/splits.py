"""Temporal splits. NEVER shuffle adjacent hours across train/test — that leaks."""

from collections.abc import Iterator

import pandas as pd


def temporal_split(
    df: pd.DataFrame, time_col: str, test_start: str | pd.Timestamp, gap_hours: int = 0
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Train = strictly before (test_start - gap), test = at/after test_start."""
    t0 = pd.Timestamp(test_start)
    if t0.tzinfo is None:
        t0 = t0.tz_localize("UTC")
    train = df[df[time_col] < t0 - pd.Timedelta(hours=gap_hours)]
    test = df[df[time_col] >= t0]
    return train, test


def rolling_origin_folds(
    df: pd.DataFrame, time_col: str, n_folds: int, test_hours: int, gap_hours: int = 0
) -> Iterator[tuple[pd.DataFrame, pd.DataFrame]]:
    """Expanding-window folds: each test block follows all of its training data in time."""
    end = df[time_col].max()
    for k in range(n_folds, 0, -1):
        test_start = end - pd.Timedelta(hours=k * test_hours) + pd.Timedelta(hours=1)
        test_end = test_start + pd.Timedelta(hours=test_hours)
        train = df[df[time_col] < test_start - pd.Timedelta(hours=gap_hours)]
        test = df[(df[time_col] >= test_start) & (df[time_col] < test_end)]
        if len(train) and len(test):
            yield train, test
