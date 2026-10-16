"""Export LightGBM boosters to the compact `pavana-gbdt-v1` JSON served by the API.

The TypeScript evaluator in `packages/shared/src/model/gbdt.ts` reads this format and
reproduces `Booster.predict(raw_score=True)` and `predict(pred_contrib=True)`.
`parity_vectors` records rows so the TS tests can prove it (same pattern as geo-wind.json).
"""

from __future__ import annotations

from typing import Any

import numpy as np

_MISSING = {"None": 0, "Zero": 1, "NaN": 2}


def _compact_tree(info: dict[str, Any]) -> dict[str, list]:
    root = info["tree_structure"]
    n_leaves = int(info["num_leaves"])
    n_internal = n_leaves - 1
    t: dict[str, list] = {
        "f": [0] * n_internal,
        "t": [0.0] * n_internal,
        "d": [0] * n_internal,
        "l": [0] * n_internal,
        "r": [0] * n_internal,
        "ic": [0] * n_internal,
        "v": [0.0] * n_leaves,
        "lc": [0] * n_leaves,
    }
    if "leaf_value" in root and "split_index" not in root:
        t["v"][0] = float(root["leaf_value"])
        t["lc"][0] = int(root.get("leaf_count", 0))
        for k in ("f", "t", "d", "l", "r", "ic"):
            t[k] = []
        return t

    def ref(node: dict[str, Any]) -> int:
        if "split_index" in node:
            return int(node["split_index"])
        return ~int(node["leaf_index"])

    stack = [root]
    while stack:
        node = stack.pop()
        if "split_index" not in node:
            i = int(node["leaf_index"])
            t["v"][i] = float(node["leaf_value"])
            t["lc"][i] = int(node["leaf_count"])
            continue
        if node["decision_type"] != "<=":
            raise ValueError(f"unsupported split {node['decision_type']!r} (categorical?)")
        i = int(node["split_index"])
        t["f"][i] = int(node["split_feature"])
        t["t"][i] = float(node["threshold"])
        t["d"][i] = (1 if node["default_left"] else 0) | (_MISSING[node["missing_type"]] << 1)
        t["l"][i] = ref(node["left_child"])
        t["r"][i] = ref(node["right_child"])
        t["ic"][i] = int(node["internal_count"])
        stack.extend([node["left_child"], node["right_child"]])
    return t


def to_compact(booster) -> dict[str, Any]:
    """`pavana-gbdt-v1` dict for a binary LightGBM booster."""
    dump = booster.dump_model()
    if dump.get("objective", "").split(" ")[0] != "binary":
        raise ValueError(f"only binary models are exported, got {dump.get('objective')!r}")
    if "sigmoid:1" not in dump.get("objective", ""):
        raise ValueError("expected the default sigmoid:1 link")
    return {
        "format": "pavana-gbdt-v1",
        "objective": "binary",
        "featureNames": list(dump["feature_names"]),
        "trees": [_compact_tree(t) for t in dump["tree_info"]],
    }


def _json_row(row: np.ndarray) -> list[float | None]:
    return [None if not np.isfinite(v) else float(v) for v in row]


def parity_vectors(booster, x: np.ndarray, max_rows: int = 40) -> dict[str, Any]:
    """Rows + expected raw score, probability and SHAP from LightGBM itself."""
    x = np.asarray(x, dtype=float)[:max_rows]
    raw = booster.predict(x, raw_score=True)
    contrib = booster.predict(x, pred_contrib=True)
    return {
        "rows": [
            {
                "x": _json_row(x[i]),
                "raw": float(raw[i]),
                "proba": float(1.0 / (1.0 + np.exp(-raw[i]))),
                "shap": [float(v) for v in contrib[i]],
            }
            for i in range(len(x))
        ]
    }
