"""Settings from the repo-root `.env` (same file the API uses). Keys stay out of notebooks."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

from .paths import REPO_ROOT

load_dotenv(REPO_ROOT / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    firms_map_key: str | None
    openaq_api_key: str | None


def get_settings() -> Settings:
    return Settings(
        firms_map_key=os.getenv("FIRMS_MAP_KEY") or None,
        openaq_api_key=os.getenv("OPENAQ_API_KEY") or None,
    )
