# Invoice

A multi-page invoice with line items, page headers/footers, summary totals, and hyperlinks.

## Features Demonstrated

- **Multi-page layout** — 33 line items automatically flow across 2 pages
- **Page header** repeating on every page (company name, website, address, invoice number, dates)
- **Column header** with dark background for the line item table
- **Detail band** iterating over `items` array with `dataSource`
- **Summary band** with subtotal, tax calculation, and grand total
- **Page footer** with "Page X of Y" on every page
- **Last page footer** with "Thank you for your business!" message on the final page only
- **noData band** — Fallback message when no line items exist
- **Hyperlinks** — Company website and customer email as clickable links using `StyledRun.link`
- **Rich text** (`StyledRun[]`) for hyperlink content
- **`money` filter** for currency formatting (`$12,000.00`)
- **styleOverrides** for one-off adjustments (bold customer name, smaller address text)
- **Data binding** with nested objects (`company.name`, `customer.email`, `item.description`)

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `page-header` | pageHeader | Company info, invoice number, dates, separator line |
| `bill-to` | title | "Bill To" label, customer name, address, email hyperlink |
| `col-header` | columnHeader | Description / Qty / Unit Price / Total column headers |
| `line-item` | detail | Line item row (description, qty, unit price, total) with separator |
| `no-items` | noData | "No line items" fallback |
| `subtotals` | summary | Subtotal, tax, grand total |
| `page-footer` | pageFooter | Page number |
| `last-footer` | lastPageFooter | "Thank you" message + page number |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `invoiceNumber` | string | Invoice identifier |
| `date` | string | Invoice date |
| `dueDate` | string | Payment due date |
| `company` | object | Company name, address, website |
| `customer` | object | Customer name, address, email |
| `items` | array | Line items (description, qty, unitPrice, total) |
| `subtotal` | number | Sum of all line item totals |
| `taxRate` | number | Tax rate percentage |
| `taxAmount` | number | Calculated tax amount |
| `grandTotal` | number | Final total including tax |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (33 line items)
- `output.pdf` — Rendered invoice (2 pages)
