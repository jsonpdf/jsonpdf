# Technical Report

A multi-page technical report showcasing cross-references, table of contents, pageBreakBefore, images, numbered lists, and tables.

## Features Demonstrated

- **Cross-references** — `anchor` on bands + `{{ "id" | ref }}` filter resolves to page numbers
- **Internal links** — TOC entries use `link: "#ch1"` to create clickable GoTo links that navigate to anchor pages
- **Table of Contents** — Clickable TOC with cross-reference page numbers that auto-update across two-pass rendering
- **pageBreakBefore** — Each chapter starts on a new page
- **Image plugin** — SVG data URI bar chart as a figure with caption
- **Numbered list** — Methodology steps using `listType: "numbered"` with data-bound items
- **Table plugin** — Appendix inventory table with headers, right-aligned amounts, alternating row styles
- **Bookmarks** — PDF outline entries for each chapter and appendix
- **Data binding** — All content driven by `data.json` via `{{ }}` expressions

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `title-page` | title | Report title, subtitle, author, department, date, document ID |
| `toc` | body | Table of Contents with `{{ "ch1" \| ref }}` page references |
| `ch1-band` | body | Chapter 1: Introduction (pageBreakBefore, anchor: "ch1") |
| `ch2-band` | body | Chapter 2: Methodology — numbered list + cross-refs to ch3/appendix |
| `ch3-band` | body | Chapter 3: Results — body text, SVG figure, caption, cross-refs |
| `ch4-band` | body | Chapter 4: Conclusion (pageBreakBefore, anchor: "ch4") |
| `appendix-header` | body | Appendix A heading (pageBreakBefore, anchor: "appendix") |
| `app-table` | body | Application inventory table (8 rows, 5 columns) |
| `page-ftr` | pageFooter | Report title + document ID + page number |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `reportTitle` | string | Report title |
| `subtitle` | string | Report subtitle |
| `author` | string | Author name |
| `department` | string | Department name |
| `date` | string | Publication date |
| `documentId` | string | Document identifier |
| `introText` | string | Introduction paragraph |
| `methodologySteps` | array | Numbered methodology steps (strings) |
| `resultsText` | string | Results paragraph |
| `conclusionText` | string | Conclusion paragraph |
| `appendixItems` | array | Application inventory rows (id, application, category, complexity, savings) |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (6 methodology steps, 8 appendix items)
- `output.pdf` — Rendered report (6 pages)
