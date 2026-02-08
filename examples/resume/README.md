# Resume

A professional single-page resume showcasing multiple list types, rich text with hyperlinks, and data-bound content.

## Features Demonstrated

- **Lettered list with nesting** — Technical skills use `listType: "lettered"` (a., b., c., d.) with nested children for sub-items
- **Numbered list** — Key achievements use `listType: "numbered"` (1., 2., 3., 4.)
- **Bullet list** — Job responsibilities use `listType: "bullet"` with custom bullet style
- **Rich text with hyperlinks** — Contact line uses `StyledRun[]` with `link` for email (`mailto:`) and website URL
- **Data-bound list items** — Skills and achievements arrays passed from data.json via `"items": "{{ skills }}"`
- **Multiple body bands** — 6 content sections (summary, experience, skills, achievements, education) as separate bands
- **Mixed text styles** — Bold job titles, italic company/dates, right-aligned dates via `styleOverrides`

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `header` | title | Name (centered), contact info with hyperlinks, separator line |
| `summary-section` | body | "PROFESSIONAL SUMMARY" + paragraph |
| `experience-section` | body | "EXPERIENCE" + 2 job entries with bullet point responsibilities |
| `skills-section` | body | "TECHNICAL SKILLS" + lettered list with nested children |
| `achievements-section` | body | "KEY ACHIEVEMENTS" + numbered list |
| `education-section` | body | "EDUCATION" + 2 degree entries |
| `page-ftr` | pageFooter | Name |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full name |
| `email` | string | Email address (used as hyperlink) |
| `phone` | string | Phone number |
| `location` | string | City, state |
| `website` | string | Personal website URL (used as hyperlink) |
| `summary` | string | Professional summary paragraph |
| `jobs` | array | Work experience (title, company, location, dates, responsibilities) |
| `skills` | array | Skill categories with nested items (`{ content, children }`) |
| `achievements` | array | Career highlights (strings) |
| `education` | array | Degrees (degree, school, year) |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (2 jobs, 4 skill categories, 4 achievements, 2 degrees)
- `output.pdf` — Rendered resume (1 page)
