# Sales Report

A quarterly sales report with a Vega-Lite chart, employees grouped by department, bookmarks, and summary statistics.

## Features Demonstrated

- **Chart plugin** — Vega-Lite bar chart showing revenue by department, with `dataSource` bound to `data.json`
- **GroupBy** — Employees grouped by `department` field, with separate group header for each department
- **Group header** with dark background and white text, plus **bookmarks** for PDF outline navigation
- **Section-level bookmark** ("Sales Report") for PDF document outline
- **Detail band** iterating over `employees` array with `dataSource` and `groupBy`
- **Summary band** with grand total, team size, and average deal size
- **Multi-page layout** — Groups flow across pages automatically
- **Page footer** with "Page X of Y"
- **`money` filter** for currency formatting
- **Title band** with report name, date range, chart label, and embedded chart

## Template Structure

| Band             | Type        | Content                                                                     |
| ---------------- | ----------- | --------------------------------------------------------------------------- |
| `report-title`   | title       | Report name, date range, "Revenue by Department" label, Vega-Lite bar chart |
| `group-hdr`      | groupHeader | Department name (white on dark background) with PDF bookmark                |
| `employee`       | detail      | Employee name, role, deal count, sales amount                               |
| `group-ftr`      | groupFooter | Separator line between departments                                          |
| `report-summary` | summary     | Grand total, team size, avg deal size                                       |
| `page-ftr`       | pageFooter  | Page number                                                                 |

## Data Schema

| Field               | Type   | Description                                          |
| ------------------- | ------ | ---------------------------------------------------- |
| `reportTitle`       | string | Report heading                                       |
| `dateRange`         | string | Reporting period                                     |
| `departmentSummary` | array  | Chart data (department, revenue)                     |
| `employees`         | array  | Employee list (name, department, role, sales, deals) |
| `grandTotal`        | number | Total revenue                                        |
| `employeeCount`     | number | Number of employees                                  |
| `avgDealSize`       | number | Average revenue per deal                             |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (4 departments, 14 employees)
- `output.pdf` — Rendered report (2 pages)
