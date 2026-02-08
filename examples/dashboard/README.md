# Dashboard

An operations dashboard showcasing container grid layout, multiple Vega-Lite charts, shape plugin, table plugin, and conditionalStyles.

## Features Demonstrated

- **Container grid layout** — 4-column grid for KPI cards, each card is a nested absolute container
- **Shape plugin** — Rounded rectangles with colored fills/strokes as KPI card backgrounds
- **conditionalStyles** — KPI change values styled green (positive) or red (negative) based on data
- **Chart plugin (area)** — Monthly revenue trend using Vega-Lite area chart with data binding
- **Chart plugin (donut)** — Revenue by segment using Vega-Lite arc chart with custom color scale
- **Table plugin** — Recent transactions with headers, alternating rows, right-aligned amounts
- **Data binding** — All content driven by `data.json` via `{{ }}` expressions

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `header` | title | Dashboard title, date range, generation date |
| `kpi-section` | body | 4-column grid of KPI cards (shape backgrounds + text + conditionalStyles) |
| `charts-section` | body | Side-by-side area chart (revenue trend) and donut chart (segments) |
| `table-section` | body | "Recent Transactions" table (8 rows, 5 columns) |
| `page-ftr` | pageFooter | Dashboard title + date range + generated date |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `dashboardTitle` | string | Dashboard title |
| `dateRange` | string | Reporting period |
| `generatedDate` | string | Generation date |
| `kpis` | array | KPI cards (label, value, change, positive boolean) |
| `monthlySales` | array | Monthly revenue data for area chart (month, revenue) |
| `categoryBreakdown` | array | Segment data for donut chart (category, amount) |
| `recentTransactions` | array | Transaction rows (id, customer, amount, status, date) |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (4 KPIs, 6 months, 4 segments, 8 transactions)
- `output.pdf` — Rendered dashboard (1 page)
