"""Geodesy helpers (numpy-vectorized). Mirrors packages/shared/src/math/geo.ts."""

import numpy as np
from numpy.typing import ArrayLike

EARTH_RADIUS_KM = 6371.0088


def haversine_km(lat1: ArrayLike, lon1: ArrayLike, lat2: ArrayLike, lon2: ArrayLike) -> np.ndarray:
    lat1, lon1, lat2, lon2 = (
        np.radians(np.asarray(x, dtype=float)) for x in (lat1, lon1, lat2, lon2)
    )
    h = (
        np.sin((lat2 - lat1) / 2) ** 2
        + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * np.arcsin(np.minimum(1.0, np.sqrt(h)))


def initial_bearing_deg(
    lat1: ArrayLike, lon1: ArrayLike, lat2: ArrayLike, lon2: ArrayLike
) -> np.ndarray:
    """Bearing from point 1 to point 2, degrees clockwise from north in [0, 360)."""
    p1, p2 = np.radians(np.asarray(lat1, dtype=float)), np.radians(np.asarray(lat2, dtype=float))
    dl = np.radians(np.asarray(lon2, dtype=float) - np.asarray(lon1, dtype=float))
    y = np.sin(dl) * np.cos(p2)
    x = np.cos(p1) * np.sin(p2) - np.sin(p1) * np.cos(p2) * np.cos(dl)
    return np.mod(np.degrees(np.arctan2(y, x)), 360.0)


def bearing_to_unit(bearing_deg: ArrayLike) -> tuple[np.ndarray, np.ndarray]:
    """(east, north) unit vector along a compass bearing."""
    t = np.radians(np.asarray(bearing_deg, dtype=float))
    return np.sin(t), np.cos(t)
