"""Baselines every model must beat before anyone claims an improvement."""

import pandas as pd


def persistence(df: pd.DataFrame, col: str) -> pd.Series:
    """Baseline A: predict y(t+h) = y(t)."""
    return df[col].copy()


def cams_issue_time(df: pd.DataFrame, forecast_col: str) -> pd.Series:
    """Baseline B: CAMS/Open-Meteo forecast for t+h AS ISSUED before t (prepared upstream)."""
    return df[forecast_col].copy()
