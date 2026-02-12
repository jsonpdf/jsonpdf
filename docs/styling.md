# Styling Reference

This document is the complete reference for the jsonpdf styling system. It covers how styles
are resolved, how to define and reference them, and every available style property.

## Style Resolution Order

Every element's final appearance is determined by merging multiple style layers. The most
specific layer wins. The resolution order is:

1. **Built-in defaults** -- hardcoded baseline values
2. **`defaultStyle`** -- template-level base style (must include `fontFamily`)
3. **Named style** -- from the `styles` map, referenced by the element's `style` property
4. **Style overrides** -- the element's `styleOverrides` merged on top
5. **Conditional styles** -- `conditionalStyles` entries whose conditions match, applied in order

Each layer is spread on top of the previous one, so later layers override earlier ones
property by property. Properties not specified in a layer are inherited from the layer below.

### Built-in Defaults

The renderer starts with these hardcoded values before any template styles are applied:

```json
{
  "fontSize": 12,
  "fontWeight": "normal",
  "fontStyle": "normal",
  "color": "#000000",
  "textAlign": "left",
  "lineHeight": 1.2
}
```

These ensure every element has a usable baseline even when the template defines nothing else.

### Merge Example

Consider a template with the following configuration and an element that references a named
style and adds overrides:

```json
{
  "defaultStyle": {
    "fontFamily": "Helvetica",
    "fontSize": 10,
    "color": "#333333"
  },
  "styles": {
    "heading": {
      "fontSize": 24,
      "fontWeight": "bold"
    }
  }
}
```

An element defined as:

```json
{
  "id": "title",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 30,
  "style": "heading",
  "styleOverrides": {
    "color": "#0000FF"
  },
  "properties": {
    "content": "Annual Report"
  }
}
```

The resolved style for this element is computed step by step:

```
Step 1 -- Built-in defaults:
  fontSize: 12, fontWeight: "normal", fontStyle: "normal",
  color: "#000000", textAlign: "left", lineHeight: 1.2

Step 2 -- Merge defaultStyle:
  fontFamily: "Helvetica", fontSize: 10, color: "#333333",
  fontWeight: "normal", fontStyle: "normal", textAlign: "left", lineHeight: 1.2

Step 3 -- Merge named style "heading":
  fontFamily: "Helvetica", fontSize: 24, fontWeight: "bold",
  color: "#333333", fontStyle: "normal", textAlign: "left", lineHeight: 1.2

Step 4 -- Merge styleOverrides:
  fontFamily: "Helvetica", fontSize: 24, fontWeight: "bold",
  color: "#0000FF", fontStyle: "normal", textAlign: "left", lineHeight: 1.2
```

The final element renders in 24pt bold Helvetica, blue text, left-aligned at 1.2x line height.

## defaultStyle

The `defaultStyle` is a required top-level property on every template. It sets the base
appearance for all elements in the document. The `fontFamily` property is mandatory -- every
template must declare which font to use as the baseline.

```json
{
  "defaultStyle": {
    "fontFamily": "Helvetica",
    "fontSize": 10,
    "color": "#333333",
    "lineHeight": 1.4
  }
}
```

Any style property set in `defaultStyle` applies to every element unless overridden by a named
style, `styleOverrides`, or conditional styles. Use it to establish your document's
typographic foundation: base font, size, color, and line height.

## Named Styles

Named styles are reusable style definitions stored in the template's `styles` record. Each
key is a style name, and the value is a partial `Style` object. Elements reference a named
style by setting their `style` property to the key name.

### Defining Named Styles

```json
{
  "styles": {
    "heading": {
      "fontSize": 20,
      "fontWeight": "bold",
      "color": "#1a1a1a"
    },
    "caption": {
      "fontSize": 8,
      "fontStyle": "italic",
      "color": "#666666"
    },
    "highlighted": {
      "backgroundColor": "#FFFFCC",
      "padding": 4
    }
  }
}
```

### Referencing a Named Style

```json
{
  "id": "section-title",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 24,
  "style": "heading",
  "properties": {
    "content": "{{ sectionTitle }}"
  }
}
```

The element inherits all properties from `"heading"` (merged on top of `defaultStyle` and
built-in defaults). Properties not defined in the named style fall through to the layers below.

## Style Overrides

The `styleOverrides` property on an element lets you tweak individual style properties without
creating a separate named style. Only specify the properties you want to change -- everything
else comes from the resolved style layers below.

```json
{
  "id": "total-label",
  "type": "text",
  "x": 300,
  "y": 0,
  "width": 200,
  "height": 20,
  "style": "heading",
  "styleOverrides": {
    "fontSize": 16,
    "textAlign": "right"
  },
  "properties": {
    "content": "Total: {{ total | money }}"
  }
}
```

This element uses the `"heading"` named style but reduces the font size to 16pt and
right-aligns the text. All other heading properties (font weight, color) remain unchanged.

## Conditional Styles

The `conditionalStyles` array on an element applies style changes based on runtime data
conditions. Each entry has a `condition` (a raw Liquid expression without `{{ }}`), and
optionally a `style` (named style reference) and/or `styleOverrides` (inline overrides).

All matching conditions apply in order. Later matches override earlier ones. This means if
two conditions both match and set the same property, the last one wins.

```json
{
  "id": "amount",
  "type": "text",
  "x": 400,
  "y": 0,
  "width": 100,
  "height": 20,
  "properties": {
    "content": "{{ item.amount | money }}"
  },
  "conditionalStyles": [
    {
      "condition": "item.amount > 1000",
      "styleOverrides": {
        "color": "#CC0000",
        "fontWeight": "bold"
      }
    },
    {
      "condition": "item.amount < 0",
      "styleOverrides": {
        "color": "#FF0000"
      }
    }
  ]
}
```

In this example, when `item.amount` exceeds 1000, the text turns dark red and bold. When
`item.amount` is negative, the text turns bright red (but does not become bold unless
the first condition also matches).

A conditional style entry can also reference a named style:

```json
{
  "conditionalStyles": [
    {
      "condition": "item.status == 'overdue'",
      "style": "warning",
      "styleOverrides": {
        "textDecoration": "underline"
      }
    }
  ]
}
```

When the condition matches, the named style `"warning"` replaces the element's base named
style, and the `styleOverrides` are merged on top of the element's existing overrides.

## Style Properties Reference

The full list of style properties available in `defaultStyle`, named styles, `styleOverrides`,
and `conditionalStyles`:

| Property          | Type                                                                        | Default     | Description                                                                   |
| ----------------- | --------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `fontFamily`      | `string`                                                                    | --          | Font family name (e.g. "Helvetica"). Required in `defaultStyle`.              |
| `fontSize`        | `number`                                                                    | `12`        | Font size in points. Must be greater than 0.                                  |
| `fontWeight`      | `"normal"` \| `"bold"`                                                      | `"normal"`  | Font weight.                                                                  |
| `fontStyle`       | `"normal"` \| `"italic"`                                                    | `"normal"`  | Font style.                                                                   |
| `textDecoration`  | `"none"` \| `"underline"` \| `"line-through"` \| `"underline line-through"` | `"none"`    | Text decoration. Combine underline and line-through with a space.             |
| `color`           | `string`                                                                    | `"#000000"` | Text color as a hex string.                                                   |
| `backgroundColor` | `string` \| `Gradient`                                                      | --          | Background fill. Hex string for solid, or a gradient object.                  |
| `textAlign`       | `"left"` \| `"center"` \| `"right"` \| `"justify"`                          | `"left"`    | Horizontal text alignment.                                                    |
| `lineHeight`      | `number`                                                                    | `1.2`       | Line height as a multiplier of font size.                                     |
| `letterSpacing`   | `number`                                                                    | `0`         | Extra spacing between characters in points.                                   |
| `borderWidth`     | `number`                                                                    | --          | Uniform border width in points. Applies to all four sides.                    |
| `borderColor`     | `string`                                                                    | `"#000000"` | Uniform border color as hex string. Used when individual borders are not set. |
| `borderTop`       | `{ width, color? }`                                                         | --          | Top border. Overrides `borderWidth`/`borderColor` for the top side.           |
| `borderRight`     | `{ width, color? }`                                                         | --          | Right border. Overrides `borderWidth`/`borderColor` for the right side.       |
| `borderBottom`    | `{ width, color? }`                                                         | --          | Bottom border. Overrides `borderWidth`/`borderColor` for the bottom side.     |
| `borderLeft`      | `{ width, color? }`                                                         | --          | Left border. Overrides `borderWidth`/`borderColor` for the left side.         |
| `borderRadius`    | `number`                                                                    | --          | Corner radius in points. When set, individual side borders are ignored.       |
| `padding`         | `number` \| `{ top, right, bottom, left }`                                  | `0`         | Inner padding in points. Uniform number or per-side object.                   |
| `opacity`         | `number`                                                                    | `1`         | Element opacity. 0 = fully transparent, 1 = fully opaque.                     |
| `widows`          | `number`                                                                    | --          | Minimum lines to keep at the top of a page after a break.                     |
| `orphans`         | `number`                                                                    | --          | Minimum lines to keep at the bottom of a page before a break.                 |

### Border Behavior

Borders follow these rules:

- When `borderWidth` is set and no individual borders (`borderTop`, `borderRight`, etc.) are
  defined, a uniform border is drawn on all four sides.
- When individual border properties are defined, they take precedence over `borderWidth` and
  `borderColor`. Each side is drawn independently.
- When `borderRadius` is set, individual side borders are ignored. Only `borderWidth` and
  `borderColor` apply, drawn as a rounded rectangle.
- Individual border sides inherit `borderColor` as their default color if their own `color`
  is not specified.

### Padding Behavior

Padding can be specified as a single number (applied uniformly to all four sides) or as an
object with `top`, `right`, `bottom`, and `left` properties. Negative values are clamped
to 0.

```json
{
  "padding": 8
}
```

```json
{
  "padding": {
    "top": 12,
    "right": 8,
    "bottom": 12,
    "left": 8
  }
}
```

## Rich Text (Styled Runs)

A text element's `content` property can be a plain string or an array of `StyledRun` objects.
Styled runs let you apply mixed formatting within a single text element -- bold a word, color
a phrase, add a hyperlink, or insert a footnote.

### StyledRun Properties

| Property         | Type                      | Required | Description                                           |
| ---------------- | ------------------------- | -------- | ----------------------------------------------------- |
| `text`           | `string`                  | Yes      | The text content of this run.                         |
| `style`          | `string`                  | No       | Named style reference from the `styles` map.          |
| `styleOverrides` | `Partial<Style>`          | No       | Inline style overrides for this run.                  |
| `link`           | `string`                  | No       | External URL or internal anchor (e.g. `"#anchorId"`). |
| `footnote`       | `string` \| `StyledRun[]` | No       | Footnote content rendered at page bottom.             |

Each run inherits the element's fully resolved style, then applies its own `style` and
`styleOverrides` on top. This means you only need to specify what changes within the run.

### Links

The `link` property creates a clickable hyperlink. Use a full URL for external links or a
`#`-prefixed anchor ID for internal cross-references:

- `"https://example.com"` -- opens an external URL
- `"#section-2"` -- jumps to the element or band with `anchor: "section-2"`

### Footnotes

The `footnote` property adds a superscript marker (1, 2, 3...) in the text and renders the
footnote content at the bottom of the page, separated by a horizontal rule.

### Example

```json
{
  "id": "rich-paragraph",
  "type": "text",
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 60,
  "properties": {
    "content": [
      {
        "text": "This report covers "
      },
      {
        "text": "Q4 financial results",
        "styleOverrides": {
          "fontWeight": "bold"
        }
      },
      {
        "text": " with "
      },
      {
        "text": "significant growth",
        "styleOverrides": {
          "color": "#008800"
        }
      },
      {
        "text": " across all divisions. See the "
      },
      {
        "text": "full methodology",
        "link": "#methodology",
        "styleOverrides": {
          "color": "#0066CC",
          "textDecoration": "underline"
        }
      },
      {
        "text": " section for details."
      },
      {
        "text": "1",
        "footnote": "Based on preliminary figures subject to audit review."
      }
    ]
  }
}
```

This renders a single paragraph where "Q4 financial results" is bold, "significant growth"
is green, "full methodology" is a blue underlined internal link, and a superscript footnote
marker appears at the end with its content at the page bottom.

## Fonts

Fonts are declared in the template's top-level `fonts` array. Each entry is a
`FontDeclaration` that maps a family name, weight, and style to embedded font data.

### FontDeclaration Properties

| Property | Type                     | Default    | Description                                                     |
| -------- | ------------------------ | ---------- | --------------------------------------------------------------- |
| `family` | `string`                 | --         | Font family name. Must match `fontFamily` references in styles. |
| `weight` | `number`                 | `400`      | Numeric font weight. 400 = normal, 700 = bold.                  |
| `style`  | `"normal"` \| `"italic"` | `"normal"` | Font style variant.                                             |
| `data`   | `string`                 | --         | Base64-encoded font file data (TTF, OTF, or WOFF).              |

### Font Matching

When the renderer needs a font for a given `fontFamily` + `fontWeight` + `fontStyle`
combination, it looks for an exact match in the `fonts` array. The numeric weight is mapped
to `"normal"` (weight <= 500) or `"bold"` (weight > 500) for matching purposes.

If no exact match is found, the renderer falls back to any declaration with the same family
name. This means you can declare a single font variant and it will be used for all weight/style
combinations of that family, though the visual result may not match the intended style.

### Font Subsetting

Fonts are automatically subsetted when embedded in the PDF. Only the glyphs actually used in
the document are included, keeping file sizes small. This is handled automatically by fontkit
during the embedding process -- no configuration is needed.

### Embedding Fonts

To use a custom font, convert a TTF, OTF, or WOFF file to a base64 string and place it in
the `data` field. For example, using a command line tool:

```
base64 -i MyFont-Regular.ttf
```

### Example

```json
{
  "fonts": [
    {
      "family": "Inter",
      "weight": 400,
      "style": "normal",
      "data": "AAEAAAARAQAABAAQR0RFR..."
    },
    {
      "family": "Inter",
      "weight": 700,
      "style": "normal",
      "data": "AAEAAAARAQAABAAQR0RFR..."
    },
    {
      "family": "Inter",
      "weight": 400,
      "style": "italic",
      "data": "AAEAAAARAQAABAAQR0RFR..."
    }
  ]
}
```

This declares three variants of the Inter font family: regular, bold, and italic. With these
declarations, you can use `fontFamily: "Inter"` in styles and switch between variants with
`fontWeight` and `fontStyle`.

## Gradients

The `backgroundColor` property in styles (and on bands) accepts either a hex color string or
a gradient object. Two gradient types are supported: linear and radial.

### Linear Gradient

A linear gradient interpolates colors along a straight line at a given angle.

```json
{
  "type": "linear",
  "angle": 90,
  "stops": [
    { "color": "#ff0000", "position": 0 },
    { "color": "#0000ff", "position": 1 }
  ]
}
```

**Properties:**

| Property | Type             | Description                                              |
| -------- | ---------------- | -------------------------------------------------------- |
| `type`   | `"linear"`       | Discriminator.                                           |
| `angle`  | `number`         | Angle in degrees. 0 = left-to-right, 90 = top-to-bottom. |
| `stops`  | `GradientStop[]` | Color stops. Minimum 2 required.                         |

Each stop has a `color` (hex string) and a `position` (0 to 1, where 0 is the start of the
gradient axis and 1 is the end).

### Radial Gradient

A radial gradient interpolates colors radiating outward from a center point.

```json
{
  "type": "radial",
  "cx": 0.5,
  "cy": 0.5,
  "radius": 0.5,
  "stops": [
    { "color": "#ffffff", "position": 0 },
    { "color": "#000000", "position": 1 }
  ]
}
```

**Properties:**

| Property | Type             | Default | Description                                             |
| -------- | ---------------- | ------- | ------------------------------------------------------- |
| `type`   | `"radial"`       | --      | Discriminator.                                          |
| `cx`     | `number`         | `0.5`   | Center X as a fraction of width (0 to 1).               |
| `cy`     | `number`         | `0.5`   | Center Y as a fraction of height (0 to 1).              |
| `radius` | `number`         | `0.5`   | Radius as a fraction of the shorter dimension (0 to 1). |
| `stops`  | `GradientStop[]` | --      | Color stops. Minimum 2 required.                        |

### Multi-Stop Gradients

Both linear and radial gradients support more than two stops. The renderer uses stitching
functions to interpolate smoothly between each adjacent pair of stops.

```json
{
  "type": "linear",
  "angle": 0,
  "stops": [
    { "color": "#ff0000", "position": 0 },
    { "color": "#ffff00", "position": 0.5 },
    { "color": "#00ff00", "position": 1 }
  ]
}
```

### Using Gradients in Styles

Gradients work anywhere `backgroundColor` is accepted:

```json
{
  "styles": {
    "gradient-box": {
      "backgroundColor": {
        "type": "linear",
        "angle": 45,
        "stops": [
          { "color": "#667eea", "position": 0 },
          { "color": "#764ba2", "position": 1 }
        ]
      },
      "padding": 16,
      "borderRadius": 8
    }
  }
}
```

## Band Backgrounds

Bands support a `backgroundColor` property that fills the entire band area. Like style
backgrounds, it accepts a hex color string or a gradient object.

### Solid Color

```json
{
  "id": "header-band",
  "type": "pageHeader",
  "height": 50,
  "backgroundColor": "#f0f0f0",
  "elements": []
}
```

### Gradient Background

```json
{
  "id": "hero-band",
  "type": "title",
  "height": 120,
  "backgroundColor": {
    "type": "linear",
    "angle": 90,
    "stops": [
      { "color": "#1a237e", "position": 0 },
      { "color": "#283593", "position": 0.5 },
      { "color": "#3949ab", "position": 1 }
    ]
  },
  "elements": [
    {
      "id": "hero-title",
      "type": "text",
      "x": 20,
      "y": 40,
      "width": 400,
      "height": 40,
      "styleOverrides": {
        "fontSize": 28,
        "fontWeight": "bold",
        "color": "#ffffff"
      },
      "properties": {
        "content": "{{ reportTitle }}"
      }
    }
  ]
}
```

The band background is drawn behind all elements, so white text on a dark gradient works as
expected. Band backgrounds span the full content width of the band within the page margins
(or column width when using multi-column layouts).
