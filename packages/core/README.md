# @jsonpdf/core

Shared foundation for the jsonpdf monorepo — TypeScript types, JSON Schema validation, and utility functions.

## What's inside

- **Types** — `Template`, `Section`, `Band`, `Element`, `Style`, `FontDeclaration`, `PageConfig`, and all related interfaces that define the jsonpdf content model.
- **Schema validation** — JSON Schema definitions and validation powered by [ajv](https://ajv.js.org/). Includes expression-aware schema building for LiquidJS template expressions.
- **Utilities** — Color parsing/conversion (`parseColor`, `toHex`, `isGradient`), unit conversion (`mmToPoints`, `inchesToPoints`, `pointsToMm`), and ID generation (`generateId`).

## Usage

```ts
import { type Template, validateTemplateSchema, parseColor, mmToPoints } from '@jsonpdf/core';
```

## Exports

| Category   | Exports                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------- |
| Types      | `Template`, `Section`, `Band`, `BandType`, `Element`, `Style`, `FontDeclaration`, `PageConfig`, ... |
| Schema     | `templateSchema`, `validateTemplateSchema`, `validateWithSchema`, `applySchemaDefaults`             |
| Expression | `makeExpressionAware`, `buildPluginAwareTemplateSchema`                                             |
| Colors     | `parseColor`, `toHex`, `isGradient`                                                                 |
| Units      | `mmToPoints`, `inchesToPoints`, `pointsToMm`, `pointsToInches`                                      |
| IDs        | `generateId`                                                                                        |
