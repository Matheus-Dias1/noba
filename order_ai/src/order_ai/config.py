from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_DIR = PROJECT_ROOT / "dataset"

RAW_EMAILS = DATASET_DIR / "raw"
PARSED_EMAILS = DATASET_DIR / "parsed"
EXPECTED_RESULTS = DATASET_DIR / "expected"

PRODUCTS_JSON = DATASET_DIR / "products.json"
CLIENTS_JSON = DATASET_DIR / "clients.json"

LLM_BASE_URL = "http://127.0.0.1:1234/v1"
LLM_MODEL = "qwen/qwen3.6-27b"
LLM_TIMEOUT = 120
