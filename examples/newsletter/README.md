# Newsletter

A developer newsletter showcasing multiple custom fonts, two-column layout, bullet lists, and rich text.

## Features Demonstrated

- **Multiple custom fonts** (3 families, 4 variants):
  - **Oswald 700** — Section titles and article headings (condensed display sans-serif)
  - **Merriweather 400** — Article body text (readable serif)
  - **Merriweather 700** — Bold emphasis
  - **Merriweather 400 italic** — Bylines
- **Container plugin** — Horizontal layout for two-column article section with vertical divider line
- **List plugin** — Bullet list with custom bullet character for "Quick Highlights" section
- **Shape plugin** — Dark masthead background bar
- **Line plugin** — Section dividers and accent underlines
- **Multiple body bands** — Distinct sections (featured article, two-column articles, highlights)
- **Title band** for masthead with issue info
- **Page footer** with newsletter name, issue number, and date
- **Data binding** with nested object properties (`featured.title`, `leftArticle.body`, etc.)
- **Array index access** (`highlights[0]`, `highlights[1]`, etc.) for list items

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `masthead` | title | Dark background bar, newsletter name (white), issue info |
| `featured` | body | Featured article: title, byline, body text, separator line |
| `two-col` | body | Container with two article columns separated by a vertical divider |
| `highlights` | body | "Quick Highlights" section title, bullet list (5 items) |
| `footer-band` | pageFooter | Separator line, newsletter/issue/date info |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `newsletterName` | string | Newsletter title |
| `issueNumber` | number | Issue number |
| `issueDate` | string | Publication date |
| `featured` | object | Featured article (title, author, body) |
| `leftArticle` | object | Left column article (title, author, body) |
| `rightArticle` | object | Right column article (title, author, body) |
| `highlights` | string[] | Array of 5 highlight bullet points |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data
- `output.pdf` — Rendered newsletter (1 page)
