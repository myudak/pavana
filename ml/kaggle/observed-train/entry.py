# Pavana — observed-target training kernel (hotspot risk + airport haze).
# Input: the output of the `pavana-observed-data` kernel. Output: /kaggle/working/models.
# Generated from ml/kaggle/observed-train/entry.py by ml/kaggle/build.py; do not edit run.py.
import json
import platform
from pathlib import Path

import lightgbm
import numpy
import pandas

from pavana_ml.data.research import sha256
from pavana_ml.pipelines import haze_nowcast, hotspot_risk, regressions
from pavana_ml.pipelines.contract import verify_snapshot, write_json

snap = next(Path("/kaggle/input").rglob("snapshot.json"))
DATA = snap.parent
if sha256(snap) != INPUT_LOCK["dataKernel"]["sha256"]:  # noqa: F821
    raise RuntimeError("Data kernel version differs from input-lock.json")
OUT = Path("/kaggle/working/models")
print("data:", DATA, json.loads(snap.read_text())["files"])
verify_snapshot(DATA, {"firms", "metar", "cams", "weather", "land"})
a = hotspot_risk.run(DATA, OUT, code_sha256=CODE_INFO["sha256"])  # noqa: F821
b = haze_nowcast.run(DATA, OUT, code_sha256=CODE_INFO["sha256"])  # noqa: F821
c = regressions.run_pm25(DATA, OUT, code_sha256=CODE_INFO["sha256"])  # noqa: F821
d = regressions.run_wind(DATA, OUT, code_sha256=CODE_INFO["sha256"])  # noqa: F821
write_json(
    OUT / "run.json",
    {
        "code": CODE_INFO,  # noqa: F821
        "hotspot": a["version"],
        "haze": b["version"],
        "pm25": c["version"],
        "wind": d["version"],
        "status": "completed",
        "boosterCount": 6,
        "environment": {
            "python": platform.python_version(),
            "lightgbm": lightgbm.__version__,
            "numpy": numpy.__version__,
            "pandas": pandas.__version__,
        },
    },
)  # noqa: F821
