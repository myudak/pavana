"""Common-cohort scalar and station wind-vector errors."""

import numpy as np


def scalar(y: np.ndarray, p: np.ndarray) -> dict:
    e = np.asarray(p) - np.asarray(y)
    return {"n": len(e), "mae": float(np.abs(e).mean()), "rmse": float(np.sqrt((e**2).mean()))}


def wind(y: np.ndarray, p: np.ndarray, direction_mask: np.ndarray | None = None) -> dict:
    sy, sp = np.linalg.norm(y, axis=1), np.linalg.norm(p, axis=1)
    directional = (sy >= 0.5) & (sp >= 0.5) if direction_mask is None else direction_mask
    ay, ap = np.arctan2(-y[:, 0], -y[:, 1]), np.arctan2(-p[:, 0], -p[:, 1])
    delta = np.abs((np.rad2deg(ap - ay) + 180) % 360 - 180)
    return {
        "n": len(y),
        "vectorRmse": float(np.sqrt(((p - y) ** 2).sum(axis=1).mean())),
        "vectorMae": float(np.linalg.norm(p - y, axis=1).mean()),
        "speedMae": float(np.abs(sp - sy).mean()),
        "speedRmse": float(np.sqrt(((sp - sy) ** 2).mean())),
        "directionMaeDeg": float(delta[directional].mean()) if directional.any() else None,
        "directionN": int(directional.sum()),
    }
