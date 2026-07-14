import typer
from pathlib import Path

app = typer.Typer(help="AI-powered order importer")

dataset = typer.Typer(help="Dataset operations")
app.add_typer(dataset, name="dataset")

@app.command()
def extract(email: Path):
    from order_ai.email.parse import parse_email
    from order_ai.llm.extract_email import extract_order

    parsed = parse_email(email)
    result = extract_order(parsed)

    print(result.model_dump_json(indent=2))

    @dataset.command("inspect")
    def inspect(path: Path):
        """Inspect attachments in an email."""

        from rich import print

        from order_ai.email.parse import parse_email
        from order_ai.workbook.inspect import inspect_attachment

        email = parse_email(path)

        print(f"\n[bold]{email.subject}[/bold]")

        if not email.attachments:
            print("[yellow]No attachments.[/yellow]")
            return

        for attachment in email.attachments:
            inspection = inspect_attachment(attachment)
            print(inspection.model_dump())

@dataset.command("analyze")
def analyze():
    from order_ai.pipeline.analyze_dataset import analyze_dataset

    analyze_dataset()

@dataset.command("inspect")
def inspect(email: Path):
    """Inspect a single email."""

    from rich import print

    from order_ai.documents.router import build_documents
    from order_ai.email.parse import parse_email

    parsed = parse_email(email)
    documents = build_documents(parsed)

    print(f"[bold]{parsed.subject}[/bold]\n")

    for i, document in enumerate(documents, start=1):
        print(f"[cyan]Document {i}[/cyan]")
        print(document.model_dump(exclude={"binary"}))
        print()

@dataset.command("workbook")
def workbook(email: Path):
    """
    Dump every spreadsheet attachment as Workbook.
    """

    from rich import print

    from order_ai.documents.router import build_documents
    from order_ai.workbook.extract import load_workbook
    from order_ai.email.parse import parse_email
    from order_ai.models import AttachmentKind

    parsed = parse_email(email)

    for document in build_documents(parsed):
        if document.kind != AttachmentKind.SPREADSHEET:
            continue

        wb = load_workbook(document)

        print(wb.model_dump())

@dataset.command("analyze-workbook")
def analyze_workbook_cli(email: Path):
    from rich import print

    from order_ai.email.parse import parse_email
    from order_ai.documents.router import build_documents
    from order_ai.workbook.extract import load_workbook
    from order_ai.llm.analyze_workbook import analyze_workbook

    parsed = parse_email(email)

    documents = build_documents(parsed)

    workbook_doc = next(
        d for d in documents
        if d.kind == "spreadsheet"
    )

    workbook = load_workbook(workbook_doc)

    analysis = analyze_workbook(workbook)

    print(analysis.model_dump())

@dataset.command("slice")
def slice(email: Path):
    """Analyze and slice a workbook into normalized rows."""

    from rich import print

    from order_ai.email.parse import parse_email
    from order_ai.documents.router import build_documents
    from order_ai.workbook.extract import load_workbook
    from order_ai.workbook.slice import slice_workbook
    from order_ai.llm.analyze_workbook import analyze_workbook

    parsed = parse_email(email)

    documents = build_documents(parsed)

    workbook_doc = next(
        doc
        for doc in documents
        if doc.kind.name == "SPREADSHEET"
    )

    workbook = load_workbook(workbook_doc)

    analysis = analyze_workbook(workbook)

    sliced = slice_workbook(
        workbook,
        analysis,
    )

    print(sliced)


def main():
    app()


if __name__ == "__main__":
    main()
