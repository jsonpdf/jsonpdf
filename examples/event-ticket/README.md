# Event Ticket

A compact event ticket with QR code, dashed tear line, and conditional VIP badge.

## Features Demonstrated

- **Custom page size** (288x576 pt = 4"x8") for ticket stock
- **Custom font** via `@fontsource/oswald` (Oswald 700 for event name and stub text)
- **Barcode plugin** — QR code for ticket validation URL
- **Shape plugin** — Rounded ticket border, dark header bar, VIP circle with gold stroke
- **Line plugin** with `dashPattern` for dashed tear-off line
- **Rotation** (90 degrees) for vertical stub text along the right edge
- **Conditional elements** (`condition: "vip"`) — Gold circle and "VIP" text only appear for VIP tickets
- **Body band** for single-page fixed layout
- **Data binding** for event details, seating, attendee info, ticket ID

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `ticket-body` | body | Ticket border, header bar, event name, venue, date/time, gate/row/seat, attendee, VIP badge, tear line, QR code, ticket ID, vertical stub text |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | string | Event title |
| `venue` | string | Venue name |
| `address` | string | Venue address |
| `date` | string | Event date |
| `time` | string | Event time |
| `gate` | string | Gate assignment |
| `row` | string | Row number |
| `seat` | string | Seat number |
| `attendeeName` | string | Ticket holder's name |
| `ticketId` | string | Unique ticket identifier |
| `ticketUrl` | string | Validation URL (rendered as QR code) |
| `vip` | boolean | When true, displays a gold VIP badge |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data
- `output.pdf` — Rendered ticket (1 page)
