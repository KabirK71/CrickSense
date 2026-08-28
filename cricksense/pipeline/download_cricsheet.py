"""
Download Pakistan men's match data from Cricsheet.

Cricsheet doesn't offer a "Pakistan Tests only" zip, so we pull the combined
"pakistan_male_json.zip" (all formats, all opponents) and let parse_matches.py
filter down to Test matches from 2021 onwards.
"""
import io
import urllib.request
import zipfile
from pathlib import Path

SOURCE_URL = "https://cricsheet.org/downloads/pakistan_male_json.zip"
RAW_DIR = Path(__file__).parent / "data" / "raw"


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {SOURCE_URL} ...")
    with urllib.request.urlopen(SOURCE_URL) as resp:
        payload = resp.read()
    print(f"Downloaded {len(payload):,} bytes. Extracting to {RAW_DIR} ...")
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        zf.extractall(RAW_DIR)
    match_files = list(RAW_DIR.glob("*.json"))
    print(f"Done. {len(match_files)} match files in {RAW_DIR}")


if __name__ == "__main__":
    main()
