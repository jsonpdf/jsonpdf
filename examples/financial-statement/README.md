# Financial Statement

An annual financial statement with income statement and balance sheet, showcasing the table plugin.

## Features Demonstrated

- **Table plugin** — Full feature showcase: header row, alternating row striping, right-aligned columns, fixed + flex column widths, cell padding, border customization
- **Data-bound table rows** — `rows` property uses `"{{ incomeRows }}"` expression to pass raw arrays from data.json
- **`pageBreakBefore`** — Balance sheet forced to start on page 2
- **`pad` filter** — Document number formatted as "FS-000047" using `{{ documentId | pad: 6, "0" }}`
- **`headerStyle`** with `backgroundColor` — Dark header row with white bold text
- **`alternateRowStyle`** — Light gray striping for alternating rows
- **Column alignment** — Account codes left-aligned, dollar amounts right-aligned

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `header` | title | Company name, report title, period, separator line |
| `income-stmt` | body | "INCOME STATEMENT" heading, 4-column table (Code, Account, FY 2024, FY 2023) |
| `balance-sheet` | body | "BALANCE SHEET" heading + subtitle, 3-column table (Code, Account, Amount), `pageBreakBefore: true` |
| `page-ftr` | pageFooter | Document number (pad filter), page number |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `company` | string | Company name |
| `period` | string | Reporting period |
| `documentId` | number | Document identifier (formatted with pad filter) |
| `incomeRows` | array | Income statement line items (code, account, fy2024, fy2023) |
| `balanceRows` | array | Balance sheet line items (code, account, amount) |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (14 income rows, 25 balance sheet rows)
- `output.pdf` — Rendered statement (2 pages)
