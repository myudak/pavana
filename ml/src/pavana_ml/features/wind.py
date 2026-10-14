"""Wind conventions. Mirrors packages/shared/src/math/wind.ts.

Meteorological direction = where the wind comes FROM. A 270° (westerly) wind flows TOWARD 90°.
Always convert before computing alignment or drawing arrows.
"""

import numpy as np
from numpy.typing import ArrayLike

from .geo import bearing_to_unit


def wind_from_to_flow_bearing(wind_dir_from_deg: ArrayLike) -> np.ndarray:
    return np.mod(np.asarray(wind_dir_from_deg, dtype=float) + 180.0, 360.0)


def wind_from_to_flow_vector(
    wind_dir_from_deg: ArrayLike, speed_ms: ArrayLike
) -> tuple[np.ndarray, np.ndarray]:
    """(east, north) flow components in m/s — the u/v the air actually moves along."""
    e, n = bearing_to_unit(wind_from_to_flow_bearing(wind_dir_from_deg))
    s = np.asarray(speed_ms, dtype=float)
    return e * s, n * s
