# Shipping Label

A 4x6 inch shipping label with barcodes, address boxes, and conditional FRAGILE marking.

## Features Demonstrated

- **Custom page size** (288x432 pt = 4"x6") for label printers
- **Barcode plugin** — Code128 linear barcode with text, and QR code for tracking URL
- **Shape plugin** for rounded-corner address boxes (light border for sender, bold border for recipient)
- **Line plugin** with `dashPattern` for dashed separator
- **Rotation** (340 degrees) for angled "FRAGILE" stamp
- **Conditional element** (`condition: "fragile"`) — FRAGILE text only appears when `fragile` is true
- **Body band** for single-page fixed layout
- **Data binding** for sender/recipient addresses, tracking number, service type, weight

## Template Structure

| Band         | Type | Content                                                                                                 |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------- |
| `label-body` | body | FROM box, TO box, dashed separator, Code128 barcode, QR code, service type, weight, conditional FRAGILE |

## Data Schema

| Field            | Type    | Description                                      |
| ---------------- | ------- | ------------------------------------------------ |
| `sender`         | object  | Sender name, address, city, state, zip           |
| `recipient`      | object  | Recipient name, address, city, state, zip        |
| `trackingNumber` | string  | Tracking number (rendered as Code128 barcode)    |
| `trackingUrl`    | string  | Full tracking URL (rendered as QR code)          |
| `serviceType`    | string  | Shipping service (e.g., "EXPRESS 2-DAY")         |
| `weight`         | string  | Package weight                                   |
| `fragile`        | boolean | When true, displays a rotated red "FRAGILE" mark |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data
- `output.pdf` — Rendered label (1 page)
