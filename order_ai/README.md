# Order AI ingestion prototype

This package is the experimental AI-assisted order-ingestion feature for the Oba Green order-management application in the parent repository. It is not currently connected to the Next.js application, its APIs, or its Postgres database.

## Purpose

The prototype turns customer purchase orders received by email into structured order candidates. Its core rule is deterministic-first processing: Python parses, routes, slices, and normalizes everything it can; an LLM handles only ambiguous document layout and business context.

Current prototype capabilities include:

- parsing `.eml` messages and attachments;
- routing email bodies, spreadsheets, images, PDFs, and documents by type;
- loading `.xlsx` and `.xls` workbooks;
- LLM-assisted workbook layout analysis;
- deterministic slicing into product rows;
- LM Studio-compatible structured responses;
- early client and product matching modules.

The planned unified extraction API, production evaluation pipeline, and integration with Oba Green are not implemented yet.

## Development

Requirements:

- Python 3.13 or newer
- `uv`
- LM Studio or another OpenAI-compatible local endpoint when running LLM stages

```bash
uv sync
uv run order-ai --help
uv run order-ai dataset inspect dataset/raw/001.eml
```

The default local model endpoint and model name are currently configured in `src/order_ai/config.py`.

## Package map

```text
src/order_ai/email/       Email parsing
src/order_ai/documents/   Document routing and type handlers
src/order_ai/workbook/    Workbook loading, inspection, and slicing
src/order_ai/llm/         Model clients, prompts, and structured extraction
src/order_ai/matching/    Early deterministic entity matching
src/order_ai/pipeline/    Dataset and import experiments
dataset/                  Local private fixtures and matching datasets
```

Raw emails and production-derived client/product catalogs are intentionally ignored by Git. Keep synthetic, non-sensitive fixtures in a separately named test-fixture directory when automated tests are introduced.

## Relationship to Oba Green

Oba Green remains the source of truth for clients, client units, products, processing options, batches, and orders. The ingestion feature must produce a reviewable draft and must not silently create canonical entities when matching is ambiguous.

The runtime boundary—Python service/job, worker/subprocess, or TypeScript port—is deliberately undecided. See [ADR-003 in the Obsidian project vault](obsidian://open?vault=Documents&file=Projects%2FOrder%20AI%2FADRs%2FADR-003-ai-importer-boundary).

Do not treat this prototype's datasets or models as the active application's production data model.
