"""Aligns the video script to a transcribed voice-over and writes src/v2/vo-timing.json.

    python apps/video/scripts/align-vo.py <asr-words.json>

<asr-words.json> is a list of {"w": word, "s": start_s, "e": end_s} from any word-level ASR
(we used faster-whisper "medium", language "id"). The script text comes from src/v2/script.ts.
Script words keep their spelling (subtitles show the script); their times come from the matching
ASR words. Mismatched stretches (numbers spelled out, small misreadings) share the time span of
the ASR words they replace, so every script word gets a time.
"""

import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_TS = ROOT / "src" / "v2" / "script.ts"
OUT = ROOT / "src" / "v2" / "vo-timing.json"


def norm(w: str) -> str:
    return re.sub(r"[^0-9a-zà-ÿ]", "", w.lower())


def script_scenes():
    src = SCRIPT_TS.read_text(encoding="utf-8")
    ids = re.findall(r"id: '([\w-]+)'", src)
    vos = re.findall(r"vo: '((?:[^'\\]|\\.)*)'", src)
    assert len(ids) == len(vos), (ids, len(vos))
    return list(zip(ids, vos))


def main(asr_path: str) -> None:
    asr = [w for w in json.loads(Path(asr_path).read_text(encoding="utf-8")) if norm(w["w"])]
    scenes = script_scenes()
    words = [(sid, w) for sid, vo in scenes for w in vo.split()]
    a = [norm(w["w"]) for w in asr]
    b = [norm(w) for _, w in words]
    times: list[tuple[float, float] | None] = [None] * len(words)
    for tag, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(j2 - j1):
                times[j1 + k] = (asr[i1 + k]["s"], asr[i1 + k]["e"])
        elif tag == "replace":
            s, e = asr[i1]["s"], asr[i2 - 1]["e"]
            n = j2 - j1
            for k in range(n):
                times[j1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
    # Script words with no ASR counterpart: squeeze between neighbours.
    for j, t in enumerate(times):
        if t is None:
            prev = next((times[k][1] for k in range(j - 1, -1, -1) if times[k]), 0.0)
            nxt = next((times[k][0] for k in range(j + 1, len(times)) if times[k]), prev + 0.3)
            times[j] = (prev, max(prev + 0.05, min(nxt, prev + 0.35)))

    out_scenes = []
    for sid, _ in scenes:
        ws = [
            {"text": w, "start": round(times[k][0], 3), "end": round(times[k][1], 3)}
            for k, (s2, w) in enumerate(words)
            if s2 == sid
        ]
        out_scenes.append({"id": sid, "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
    OUT.write_text(
        json.dumps({"audio": "audio/vo.m4a", "scenes": out_scenes}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    for sc in out_scenes:
        print(f"{sc['id']:<11} {sc['start']:7.2f} – {sc['end']:7.2f}  ({sc['end'] - sc['start']:.1f} s)")


if __name__ == "__main__":
    main(sys.argv[1])
