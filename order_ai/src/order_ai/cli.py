import typer
from pathlib import Path

app = typer.Typer(help="AI-powered order importer")

dataset = typer.Typer(help="Dataset operations")
app.add_typer(dataset, name="dataset")

@app.command()
def extract(email: Path):
    from order_ai.pipeline.parse_email import parse_email
    from order_ai.pipeline.extract_order import extract_order

    parsed = parse_email(email)
    result = extract_order(parsed)

    print(result.model_dump_json(indent=2))

@dataset.command("analyze")
def analyze():
    from order_ai.pipeline.analyze_dataset import analyze_dataset

    analyze_dataset()

@dataset.command("inspect")
def inspect(email: Path):
    """Inspect a single email."""
    from order_ai.pipeline.parse_email import parse_email

    parsed = parse_email(email)

    print(parsed.model_dump_json(indent=2))

def main():
    app()


if __name__ == "__main__":
    main()
