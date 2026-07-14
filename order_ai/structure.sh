#!/usr/bin/env bash
set -euo pipefail

ROOT="src/order_ai"

echo "== Creating directories =="

mkdir -p "$ROOT/llm/prompts"
mkdir -p "$ROOT/email"
mkdir -p "$ROOT/workbook"
mkdir -p "$ROOT/documents"
mkdir -p "$ROOT/matching"

touch "$ROOT/email/__init__.py"
touch "$ROOT/workbook/__init__.py"
touch "$ROOT/documents/__init__.py"
touch "$ROOT/matching/__init__.py"

echo "== Moving prompts =="

if [ -f "$ROOT/prompts/extract_order.md" ]; then
    mv "$ROOT/prompts/extract_order.md" \
       "$ROOT/llm/prompts/extract_email.md"
fi

rmdir "$ROOT/prompts" 2>/dev/null || true

echo "== Moving pipeline files =="

if [ -f "$ROOT/pipeline/parse_email.py" ]; then
    mv "$ROOT/pipeline/parse_email.py" \
       "$ROOT/email/parse.py"
fi

if [ -f "$ROOT/pipeline/inspect_attachment.py" ]; then
    mv "$ROOT/pipeline/inspect_attachment.py" \
       "$ROOT/workbook/inspect.py"
fi

if [ -f "$ROOT/pipeline/normalize_workbook.py" ]; then
    rm "$ROOT/pipeline/normalize_workbook.py"
fi

if [ -f "$ROOT/pipeline/slice_workbook.py" ]; then
    mv "$ROOT/pipeline/slice_workbook.py" \
       "$ROOT/workbook/slice.py"
fi

if [ -f "$ROOT/pipeline/extract_spreadsheet.py" ]; then
    mv "$ROOT/pipeline/extract_spreadsheet.py" \
       "$ROOT/workbook/extract.py"
fi

if [ -f "$ROOT/pipeline/document_router.py" ]; then
    mv "$ROOT/pipeline/document_router.py" \
       "$ROOT/documents/router.py"
fi

echo "== Moving LLM files =="

if [ -f "$ROOT/pipeline/extract_order.py" ]; then
    mv "$ROOT/pipeline/extract_order.py" \
       "$ROOT/llm/extract_email.py"
fi

touch "$ROOT/llm/extract_workbook.py"
touch "$ROOT/llm/analyze_workbook.py"

touch "$ROOT/llm/prompts/analyze_workbook.md"
touch "$ROOT/llm/prompts/extract_workbook.md"

echo "== Creating matching package =="

touch "$ROOT/matching/products.py"
touch "$ROOT/matching/clients.py"

echo "== Creating document handlers =="

touch "$ROOT/documents/pdf.py"
touch "$ROOT/documents/image.py"
touch "$ROOT/documents/word.py"

echo "== Creating import pipeline =="

touch "$ROOT/pipeline/import_order.py"

echo
echo "✅ Folder structure updated."
echo
echo "⚠️ Imports have NOT been updated yet."
echo "Run:"
echo
echo "    rg 'pipeline\\.' src"
echo
echo "to find broken imports."
