"""Canonical paths. Everything resolves from the repo root so notebooks work from any cwd."""

from pathlib import Path

ML_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = ML_DIR.parent

FIXTURES_DIR = REPO_ROOT / "fixtures"
TEST_VECTORS = FIXTURES_DIR / "test-vectors" / "geo-wind.json"
KUBU_RAYA_SCENARIO = FIXTURES_DIR / "scenario-kubu-raya.json"

DATA_DIR = ML_DIR / "data"
RAW_DIR = DATA_DIR / "raw"  # untouched downloads (gitignored)
INTERIM_DIR = DATA_DIR / "interim"  # cleaned / aligned (gitignored)
PROCESSED_DIR = DATA_DIR / "processed"  # model-ready feature tables (gitignored)
ARTIFACTS_DIR = ML_DIR / "artifacts"  # versioned models + metadata (gitignored)
