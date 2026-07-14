from order_ai.models import (
    Workbook,
    WorkbookAnalysis,
    WorkbookLayout,
    WorkbookRow,
    Worksheet,
)


def slice_workbook(
    workbook: Workbook,
    analysis: WorkbookAnalysis,
) -> list[Worksheet]:
    """
    Slice one or more order tables from a workbook using the layout
    returned by the workbook analyzer.
    """

    worksheets: list[Worksheet] = []

    for layout in analysis.layouts:

        sheet = next(
            sheet
            for sheet in workbook.sheets
            if sheet.name == layout.sheet
        )

        rows: list[WorkbookRow] = []

        for row in sheet.rows[layout.first_data_row:]:

            if not _keep_row(
                row,
                layout.quantity_column,
                layout.quantity_filter,
            ):
                continue

            rows.append(
                WorkbookRow(
                    product=_cell(row, layout.product_column),
                    quantity=_cell(row, layout.quantity_column),
                    unit=_cell(row, layout.unit_column),
                    unit_price=_cell(row, layout.unit_price_column),
                    line_total=_cell(row, layout.line_total_column),
                )
            )

        worksheets.append(
            Worksheet(
                name=sheet.name,
                rows=rows,
            )
        )

    return worksheets


def _cell(
    row: list,
    column: int | None,
):
    if column is None:
        return None

    if column >= len(row):
        return None

    return row[column]


def _keep_row(
    row: list,
    quantity_column: int,
    quantity_filter: str,
) -> bool:

    value = _cell(
        row,
        quantity_column,
    )

    if quantity_filter == "all":
        return True

    if quantity_filter == "non_empty":
        return value not in (None, "")

    if quantity_filter == "greater_than_zero":

        if value in (None, ""):
            return False

        try:
            return float(value) > 0
        except Exception:
            return False

    return False
