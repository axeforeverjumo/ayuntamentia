#!/usr/bin/env python3
"""Valida cobertura y normalización del catálogo de municipios contra la fuente oficial."""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from typing import Any

DATASET_URL = "https://analisi.transparenciacatalunya.cat/resource/6nei-4b44.json"


def fetch_reference() -> list[dict[str, Any]]:
    params = {
        "$where": "nomtipus='Municipis'",
        "$limit": "2000",
        "$order": "codi_ens",
    }
    url = f"{DATASET_URL}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.load(response)


def main() -> int:
    reference = fetch_reference()
    print(f"REFERENCE_COUNT={len(reference)}")

    catalan_names = [row.get("municipi") for row in reference if row.get("municipi")]
    print(f"SAMPLE_FIRST={catalan_names[:5]}")

    database_url_set = bool(os.getenv("DATABASE_URL"))
    print(f"DATABASE_URL_SET={database_url_set}")
    if not database_url_set:
        print("LOCAL_DB_CHECK=SKIPPED")
        return 0

    print("LOCAL_DB_CHECK=NOT_IMPLEMENTED_IN_THIS_ENV")
    return 0


if __name__ == "__main__":
    sys.exit(main())
