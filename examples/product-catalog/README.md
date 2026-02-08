# Product Catalog

A multi-page product catalog with cards, conditional styles, and shape-based image placeholders.

## Features Demonstrated

- **Multi-page layout** — 8 products flow across 2 pages (6 + 2)
- **Shape plugin** — Rounded-corner card borders, colored rectangles as image placeholders, category badges, SALE badges
- **Dynamic shape fill** — Image placeholder color bound to data (`fill: "{{ item.color }}"`)
- **Conditional elements** (`condition`) — SALE badge and strikethrough original price only shown for on-sale items; "Out of Stock" label only for unavailable items
- **Conditional styles** (`conditionalStyles`) — Product name turns gray when `item.inStock == false`
- **Detail band** iterating over `products` array with `dataSource`
- **Page header** with catalog name and page number
- **Page footer** with "Page X of Y"
- **`money` filter** for price formatting
- **`textDecoration: "line-through"`** for crossed-out original prices
- **styleOverrides** for centered text and right-aligned SKU

## Template Structure

| Band | Type | Content |
|------|------|---------|
| `header` | pageHeader | Catalog name, page number, separator line |
| `product` | detail | Product card: image placeholder shape, category badge, product name, description, price, original price, SALE badge, out-of-stock label, SKU |
| `page-ftr` | pageFooter | Page number |

## Data Schema

| Field | Type | Description |
|-------|------|-------------|
| `catalogName` | string | Catalog title |
| `products` | array | Product list |
| `products[].name` | string | Product name |
| `products[].description` | string | Product description |
| `products[].price` | number | Current price |
| `products[].originalPrice` | number | Original price (shown when on sale) |
| `products[].sku` | string | SKU code |
| `products[].category` | string | Product category (displayed as badge) |
| `products[].color` | string | Hex color for image placeholder |
| `products[].inStock` | boolean | Availability (false grays out product name) |
| `products[].onSale` | boolean | When true, shows SALE badge and strikethrough price |

## Running

```bash
pnpm render
```

## Files

- `template.json` — Template definition
- `data.json` — Sample data (8 products)
- `output.pdf` — Rendered catalog (2 pages)
