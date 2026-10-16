# Pavana — observed-target training kernel (hotspot risk + airport haze).
# Input: the output of the `pavana-observed-data` kernel. Output: /kaggle/working/models.
# Generated from ml/kaggle/observed-train/entry.py by ml/kaggle/build.py; do not edit run.py.
import json
from pathlib import Path

from pavana_ml.pipelines import haze_nowcast, hotspot_risk

snap = next(Path("/kaggle/input").rglob("snapshot.json"))
DATA = snap.parent
OUT = Path("/kaggle/working/models")
print("data:", DATA, json.loads(snap.read_text())["files"])
a = hotspot_risk.run(DATA, OUT, code_sha256=CODE_INFO["sha256"])  # noqa: F821
b = haze_nowcast.run(DATA, OUT, code_sha256=CODE_INFO["sha256"])  # noqa: F821
(OUT / "run.json").write_text(json.dumps({"code": CODE_INFO, "hotspot": a["version"], "haze": b["version"]}, indent=2))  # noqa: F821
