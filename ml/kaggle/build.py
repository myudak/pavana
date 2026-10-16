"""Bundle `pavana_ml` into a Kaggle script kernel and (optionally) push it.

    uv run --project ml python ml/kaggle/build.py observed-data [--push]
    uv run --project ml python ml/kaggle/build.py observed-train [--push]

Script kernels take one file, so `run.py` = a base64 zip of `ml/src/pavana_ml` + the kernel's
`entry.py`. `CODE_INFO` (sha256 of the bundle, git commit, dirty flag) is written into every
output so a result can be traced back to code. `run.py` is generated and gitignored.
Pull results with: kaggle kernels output myudak/pavana-observed-train -p <dir>
"""

import base64
import hashlib
import io
import json
import subprocess
import sys
import zipfile
from pathlib import Path

ML = Path(__file__).resolve().parents[1]
SRC = ML / "src" / "pavana_ml"

LOADER = '''import base64, io, sys, zipfile
from pathlib import Path
_dst = Path("/kaggle/tmp/pavana_src")
_dst.mkdir(parents=True, exist_ok=True)
zipfile.ZipFile(io.BytesIO(base64.b64decode(BUNDLE))).extractall(_dst)
sys.path.insert(0, str(_dst))
'''


def bundle() -> tuple[str, str]:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(SRC.rglob("*.py")):
            info = zipfile.ZipInfo(str(p.relative_to(SRC.parent)).replace("\\", "/"))
            info.date_time = (2026, 1, 1, 0, 0, 0)  # reproducible bytes
            z.writestr(info, p.read_bytes())
    raw = buf.getvalue()
    return base64.b64encode(raw).decode(), hashlib.sha256(raw).hexdigest()


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ML, text=True).strip()


def main() -> None:
    name = sys.argv[1]
    kdir = ML / "kaggle" / name
    b64, digest = bundle()
    info = {
        "sha256": digest,
        "git_commit": git("rev-parse", "HEAD"),
        "git_dirty": bool(git("status", "--porcelain", "--", "src")),
    }
    entry = (kdir / "entry.py").read_text(encoding="utf-8")
    run = f"BUNDLE = {b64!r}\nCODE_INFO = {info!r}\n{LOADER}\n{entry}"
    (kdir / "run.py").write_text(run, encoding="utf-8")
    print(f"{kdir / 'run.py'}: code sha256 {digest} commit {info['git_commit'][:10]}"
          f"{' (dirty)' if info['git_dirty'] else ''}")
    if "--push" in sys.argv:
        subprocess.run(["kaggle", "kernels", "push", "-p", str(kdir)], check=True)


if __name__ == "__main__":
    main()
