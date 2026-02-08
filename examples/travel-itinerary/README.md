# Travel Itinerary

A travel itinerary showcasing image plugin, container grid layout, bookmarks, and ordered lists.

## Features Demonstrated

- **Image plugin** — SVG data URI placeholders with `fit: "cover"` for day photos and gallery
- **Container grid layout** — 2-column grid (`gridColumns: 2`) for photo gallery with gap spacing
- **Bookmarks** — PDF outline entries for each day and the gallery section
- **Numbered lists** — Activity schedules using `listType: "numbered"` with data-bound items
- **Data binding** — All content driven by `data.json` via `{{ }}` expressions
- **Multi-page** — Content flows across 2 pages (days on page 1, gallery on page 2)

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `header` | title | Trip name, dates, traveler, separator line |
| `day1` | body | Day 1 heading + bookmark, image, description, numbered activity list |
| `day2` | body | Day 2 heading + bookmark, image, description, numbered activity list |
| `day3` | body | Day 3 heading + bookmark, image, description, numbered activity list |
| `gallery` | body | "Photo Highlights" + bookmark, 2x2 image grid via container |
| `page-ftr` | pageFooter | Trip name + page number |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `tripName` | string | Trip title |
| `dates` | string | Date range |
| `traveler` | string | Traveler name |
| `days` | array | Day entries (label, title, image, description, activities) |
| `gallery` | array | Gallery image URLs (4 items) |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (3 days, 4 gallery images using SVG data URIs)
- `output.pdf` — Rendered itinerary (2 pages)
