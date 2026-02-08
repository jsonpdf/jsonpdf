# Certificate of Achievement

An elegant certificate showcasing custom fonts, decorative borders, rotation, and landscape orientation.

## Features Demonstrated

- **Landscape page** (792x612 pt) with custom margins
- **Custom font** via `@fontsource/playfair-display` (Playfair Display 700 for title and recipient name)
- **Background band** with double gold border (outer 3pt stroke, inner 1pt stroke) using shape elements
- **Rotation** for diagonal "CERTIFIED" watermark text (335 degrees)
- **Style opacity** (0.08) for subtle watermark effect
- **Shape plugin** for decorative rectangular borders
- **Line plugin** for gold horizontal rules
- **styleOverrides** for one-off bold/size adjustments on body text
- **Data binding** for recipient name, course name, date, issuer, and certificate ID

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `bg` | background | Double gold rectangular border (outer + inner shapes) |
| `cert-body` | body | Watermark, title, recipient, course, date, issuer, cert ID |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `recipientName` | string | Name displayed on the certificate |
| `courseName` | string | Course or achievement title |
| `date` | string | Award date |
| `certificateId` | string | Unique certificate identifier |
| `issuerName` | string | Name and title of the issuing authority |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data
- `output.pdf` — Rendered certificate (1 page)
