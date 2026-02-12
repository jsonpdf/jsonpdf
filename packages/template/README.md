# @jsonpdf/template

Immutable template factory and CRUD operations for jsonpdf templates.

All operations return **new objects** — templates are never mutated directly.

## What's inside

- **Factory** — `createTemplate()` builds a new template with sensible defaults.
- **Operations** — Add, update, remove, move, clone, and rename sections, bands, elements, styles, and fonts.
- **Queries** — Find sections/bands/elements/fonts by ID, list all IDs, or filter elements by type.
- **Data schema** — Add, update, remove, and rename JSON Schema properties that describe the template's expected data shape.
- **Sample data** — Generate sample data from the template's data schema for previewing.
- **Migration** — Migrate templates between schema versions.

## Usage

```ts
import {
  createTemplate,
  addSection,
  addBand,
  addElement,
  generateSampleData,
} from '@jsonpdf/template';

let template = createTemplate();
template = addSection(template, { page: { size: 'A4' } });
template = addBand(template, template.sections[0].id, { type: 'detail' });
```

## Exports

| Category    | Exports                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| Factory     | `createTemplate`                                                                                         |
| Add         | `addSection`, `addBand`, `addElement`, `addStyle`, `addFont`                                             |
| Update      | `updateSection`, `updateBand`, `updateElement`, `updateStyle`, `updateTemplate`                           |
| Remove      | `removeSection`, `removeBand`, `removeElement`, `removeStyle`, `removeFont`                               |
| Move        | `moveSection`, `moveBand`, `moveElement`, `reorderElement`                                                |
| Clone       | `cloneSection`, `cloneBand`, `cloneElement`, `deepCloneWithNewIds`                                        |
| Rename      | `renameStyle`                                                                                             |
| Queries     | `findSection`, `findBand`, `findElement`, `findFont`, `getElementsByType`, `getAllBandIds`, `getAllElementIds` |
| Validation  | `validateTemplate`, `migrateTemplate`                                                                     |
| Sample data | `generateSampleData`, `buildDefaultData`                                                                  |
| Schema ops  | `listSchemaProperties`, `getSchemaAtPath`, `addSchemaProperty`, `updateSchemaProperty`, `removeSchemaProperty`, `renameSchemaProperty`, `toggleSchemaRequired`, `createDefaultPropertySchema` |
| Constants   | `DEFAULT_FONTS`                                                                                           |
