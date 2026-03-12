---
archetypes: [meridian]
skills: [visualization, data-memory]
training_cluster: 06-visualization-compiler
domain: visualization
difficulty: intermediate
version: 1.0
---
# Vega-Lite Specification

> Training reference for the JARVIS Visualization Compiler agent.
> Source: Vega-Lite official documentation (vega.github.io/vega-lite)

---

## 1. What Is Vega-Lite?

Vega-Lite is a **high-level grammar of interactive graphics**. It provides a concise, declarative JSON syntax for rapidly creating visualizations for data analysis and presentation. A Vega-Lite specification describes a visualization as a set of mappings from data to properties of graphical marks (e.g., points, bars, lines). The Vega-Lite compiler automatically produces complete Vega specifications, which are then rendered to SVG or Canvas.

### Key Design Principles

- **Declarative**: You describe *what* you want to see, not *how* to render it. The compiler handles layout, scales, axes, legends, and rendering.
- **Concise**: A single visualization can be specified in just a few lines of JSON. Sensible defaults reduce boilerplate.
- **Composable**: Simple charts can be combined through layering, concatenation, faceting, and repetition to create complex multi-view displays.
- **Interactive**: Selections provide a declarative abstraction for adding interactions (brushing, panning, zooming, filtering).

### Relationship to Vega

Vega-Lite compiles down to full **Vega** specifications. Vega is the lower-level visualization grammar that handles the rendering pipeline. Vega-Lite is the ergonomic layer on top, analogous to how SQL relates to relational algebra.

### Specification Structure

A minimal Vega-Lite spec contains:

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": { "url": "data/cars.json" },
  "mark": "point",
  "encoding": {
    "x": { "field": "Horsepower", "type": "quantitative" },
    "y": { "field": "Miles_per_Gallon", "type": "quantitative" }
  }
}
```

---

## 2. Grammar of Graphics

Vega-Lite implements a layered grammar of graphics inspired by Leland Wilkinson's *The Grammar of Graphics* and Hadley Wickham's ggplot2. The core idea is that any statistical graphic can be decomposed into independent, composable components:

### Components of the Grammar

| Component | Purpose | Vega-Lite Property |
|---|---|---|
| **Data** | The dataset to visualize | `data` |
| **Transforms** | Filter, aggregate, compute new fields | `transform` |
| **Mark** | The geometric primitive to draw | `mark` |
| **Encoding** | Map data fields to visual channels | `encoding` |
| **Scale** | Map data domain to visual range | `encoding.*.scale` |
| **Guide** | Axes and legends for readability | Auto-generated or customized |
| **Selection** | Interactive parameters | `params` / `selection` |
| **Composition** | Combine multiple views | `layer`, `hconcat`, `vconcat`, `facet`, `repeat` |

### Data Types

Vega-Lite recognizes four fundamental data types that determine default scale and axis behavior:

- **`quantitative`** -- Continuous numerical values (e.g., temperature, price). Maps to linear scales.
- **`ordinal`** -- Ordered categorical values (e.g., "small", "medium", "large"). Maps to ordinal/point scales.
- **`nominal`** -- Unordered categorical values (e.g., country names, product categories). Maps to categorical color schemes.
- **`temporal`** -- Date/time values (e.g., timestamps, dates). Maps to time scales with appropriate formatting.

---

## 3. Mark Types

Marks are the fundamental visual elements. Each mark type is suited for different data relationships.

### Primitive Marks

| Mark | Description | Typical Use |
|---|---|---|
| `point` | Scatter dots | Scatter plots, bubble charts, strip plots |
| `bar` | Rectangular bars | Bar charts, histograms, stacked bars |
| `line` | Connected line segments | Time series, trend lines |
| `area` | Filled area under a line | Area charts, stacked areas, stream graphs |
| `rect` | Rectangles positioned by x/y | Heatmaps, 2D histograms, calendar views |
| `circle` | Circle marks (alias for point with circle shape) | Bubble charts, proportional symbol maps |
| `square` | Square marks | Symbol maps, matrix displays |
| `tick` | Short line marks | Strip plots, Wilkinson dot plots |
| `rule` | Full-spanning lines | Reference lines, error bars, range indicators |
| `text` | Text labels | Annotations, label layers, text-based charts |
| `image` | Image marks | Custom icons on charts |
| `trail` | Variable-width lines | Trails with size encoding |
| `geoshape` | Geographic shapes | Choropleth maps, cartographic projections |
| `arc` | Pie/donut arcs | Pie charts, donut charts, radial visualizations |
| `boxplot` | Composite: box-and-whisker | Distribution summaries (composite mark) |
| `errorband` | Composite: confidence band | Uncertainty visualization (composite mark) |
| `errorbar` | Composite: error bars | Statistical error ranges (composite mark) |

### Mark Properties

Marks accept properties that control appearance:

```json
{
  "mark": {
    "type": "bar",
    "color": "#4c78a8",
    "opacity": 0.8,
    "cornerRadiusTopLeft": 4,
    "cornerRadiusTopRight": 4,
    "tooltip": true,
    "clip": true
  }
}
```

Common properties: `color`, `fill`, `stroke`, `strokeWidth`, `opacity`, `size`, `shape`, `cornerRadius`, `cursor`, `href`, `tooltip`, `clip`, `interpolate` (for line/area), `orient`, `align`, `baseline`, `font`, `fontSize`.

---

## 4. Encoding Channels

Encodings map data fields to visual properties of marks. Each encoding channel specifies a field, its data type, and optional scale/axis/legend configuration.

### Position Channels

| Channel | Description |
|---|---|
| `x` | Horizontal position |
| `y` | Vertical position |
| `x2` | Secondary horizontal position (for ranged marks like rect, rule, area) |
| `y2` | Secondary vertical position |
| `xOffset` | Horizontal offset (for jittering or grouped bar offsets) |
| `yOffset` | Vertical offset |
| `theta` | Angle for polar/arc marks |
| `radius` | Radius for polar/arc marks |

### Mark Property Channels

| Channel | Description |
|---|---|
| `color` | Fill color (and stroke color for point) |
| `fill` | Fill color explicitly |
| `stroke` | Stroke/outline color |
| `opacity` | Mark opacity (0-1) |
| `size` | Mark size (point diameter, bar thickness, line width) |
| `shape` | Point shape (`circle`, `square`, `cross`, `diamond`, `triangle-up`, etc.) |
| `strokeWidth` | Width of mark stroke |
| `strokeDash` | Dash pattern for strokes |
| `angle` | Rotation angle for marks |

### Text and Tooltip Channels

| Channel | Description |
|---|---|
| `text` | Text content for text marks |
| `tooltip` | Tooltip content on hover |

### Facet Channels

| Channel | Description |
|---|---|
| `row` | Facet into rows |
| `column` | Facet into columns |
| `facet` | General faceting (with `facet` composition) |

### Order and Detail Channels

| Channel | Description |
|---|---|
| `order` | Stack order or line point order |
| `detail` | Group data without mapping to a visual property |

### Encoding Field Definition

```json
{
  "encoding": {
    "x": {
      "field": "date",
      "type": "temporal",
      "timeUnit": "yearmonth",
      "axis": { "title": "Date", "format": "%b %Y", "labelAngle": -45 },
      "scale": { "domain": ["2020-01-01", "2023-12-31"] }
    },
    "y": {
      "field": "price",
      "type": "quantitative",
      "aggregate": "mean",
      "axis": { "title": "Average Price ($)" },
      "scale": { "zero": true }
    },
    "color": {
      "field": "category",
      "type": "nominal",
      "scale": { "scheme": "category10" },
      "legend": { "title": "Product Category", "orient": "bottom" }
    }
  }
}
```

### Value Definitions

Encode a constant value instead of a data field:

```json
{ "color": { "value": "#ff6347" } }
```

### Datum Definitions

Encode a single datum value (useful for reference lines):

```json
{ "y": { "datum": 50 } }
```

---

## 5. Data Transforms

Transforms pre-process data before it reaches the encoding. They are specified as an array of transform operations applied sequentially.

### Available Transforms

| Transform | Purpose | Example Use |
|---|---|---|
| `filter` | Remove rows not matching a predicate | Filter to a date range or category |
| `calculate` | Create new fields via expressions | Compute ratios, derived values |
| `aggregate` | Group-by aggregation | Sum, mean, count, median by group |
| `bin` | Discretize continuous values into bins | Histograms |
| `timeUnit` | Extract time components | Group by month, quarter, year |
| `sort` | Sort data | Order categories |
| `window` | Windowed aggregation | Running averages, cumulative sums, ranking |
| `joinaggregate` | Add aggregate values as new columns | Add group means alongside raw data |
| `fold` | Unpivot/melt columns into rows | Convert wide to long format |
| `flatten` | Flatten array fields | Expand nested arrays |
| `pivot` | Pivot long to wide format | Reshape for layered encoding |
| `sample` | Random sample of rows | Downsample large datasets |
| `stack` | Compute stacked positions | Stacked bar/area layout |
| `impute` | Fill missing values | Interpolate time series gaps |
| `density` | Kernel density estimation | Smooth distribution curves |
| `regression` | Linear/polynomial regression | Trend lines |
| `loess` | Local regression smoothing | Smoothed trend lines |
| `quantile` | Compute quantile values | Statistical summaries |
| `lookup` | Join data from another source | Enrich with external data |

### Transform Examples

```json
{
  "transform": [
    { "filter": "datum.year >= 2020" },
    { "calculate": "datum.revenue / datum.employees", "as": "revenuePerEmployee" },
    {
      "aggregate": [{ "op": "mean", "field": "salary", "as": "avgSalary" }],
      "groupby": ["department"]
    },
    {
      "window": [{ "op": "rank", "as": "rank" }],
      "sort": [{ "field": "score", "order": "descending" }],
      "groupby": ["category"]
    },
    { "filter": "datum.rank <= 10" }
  ]
}
```

---

## 6. Interactions and Selections

Vega-Lite provides a declarative mechanism for specifying interactive behaviors through **parameters** (formerly `selection` in older versions).

### Parameter Types

#### Point Selection (formerly `single`/`multi`)

Select individual data points by clicking:

```json
{
  "params": [{
    "name": "highlight",
    "select": { "type": "point", "fields": ["category"] }
  }],
  "encoding": {
    "opacity": {
      "condition": { "param": "highlight", "value": 1 },
      "value": 0.2
    }
  }
}
```

#### Interval Selection

Select a continuous range by brushing/dragging:

```json
{
  "params": [{
    "name": "brush",
    "select": { "type": "interval", "encodings": ["x"] }
  }]
}
```

### Selection Properties

| Property | Description |
|---|---|
| `type` | `"point"` or `"interval"` |
| `fields` | Limit selection to specific fields |
| `encodings` | Limit selection to specific encoding channels |
| `on` | DOM event to trigger (e.g., `"mouseover"`, `"click"`) |
| `clear` | Event to clear selection (e.g., `"dblclick"`) |
| `toggle` | Toggle multi-selection (e.g., `"event.shiftKey"`) |
| `nearest` | Snap to nearest point |
| `resolve` | How selections resolve across views: `"global"`, `"union"`, `"intersect"` |

### Selection-Driven Behaviors

- **Conditional encoding**: Change visual properties based on selection state
- **Filter transform**: Use selection as a dynamic data filter
- **Scale binding**: Bind selection to scale domains (pan/zoom)
- **Input binding**: Bind selection to HTML input widgets (sliders, dropdowns)
- **Legend binding**: Click legend entries to filter

### Interaction Patterns

**Brushing and linking** (coordinated views):

```json
{
  "params": [{ "name": "brush", "select": "interval" }],
  "mark": "point",
  "encoding": {
    "color": {
      "condition": { "param": "brush", "field": "Origin", "type": "nominal" },
      "value": "grey"
    }
  }
}
```

**Pan and zoom**:

```json
{
  "params": [{
    "name": "grid",
    "select": "interval",
    "bind": "scales"
  }]
}
```

**Dropdown/slider binding**:

```json
{
  "params": [{
    "name": "yearFilter",
    "value": 2020,
    "bind": { "input": "range", "min": 2000, "max": 2025, "step": 1 }
  }],
  "transform": [{ "filter": "datum.year == yearFilter" }]
}
```

---

## 7. Layering and Composition

Vega-Lite provides four composition operators to build complex multi-view visualizations from simple unit specifications.

### Layer

Superimpose multiple marks on the same axes. All layers share the same scales and coordinate system.

```json
{
  "layer": [
    {
      "mark": "line",
      "encoding": {
        "x": { "field": "date", "type": "temporal" },
        "y": { "field": "price", "type": "quantitative" }
      }
    },
    {
      "mark": "point",
      "encoding": {
        "x": { "field": "date", "type": "temporal" },
        "y": { "field": "price", "type": "quantitative" }
      }
    },
    {
      "mark": "rule",
      "encoding": { "y": { "datum": 100 } }
    }
  ]
}
```

Common use cases: line + point overlay, adding reference lines, annotation layers, dual-axis (via `resolve`).

### Horizontal Concatenation (`hconcat`)

Place views side by side:

```json
{
  "hconcat": [
    { "mark": "bar", "encoding": { ... } },
    { "mark": "point", "encoding": { ... } }
  ]
}
```

### Vertical Concatenation (`vconcat`)

Stack views vertically:

```json
{
  "vconcat": [
    { "mark": "area", "encoding": { ... } },
    { "mark": "bar", "encoding": { ... } }
  ]
}
```

### Facet

Create small multiples -- a grid of identical charts, one per partition of the data:

```json
{
  "facet": { "field": "Origin", "type": "nominal", "columns": 3 },
  "spec": {
    "mark": "point",
    "encoding": {
      "x": { "field": "Horsepower", "type": "quantitative" },
      "y": { "field": "MPG", "type": "quantitative" }
    }
  }
}
```

### Repeat

Repeat a spec across multiple fields (useful for scatter plot matrices):

```json
{
  "repeat": {
    "row": ["Horsepower", "Acceleration", "Miles_per_Gallon"],
    "column": ["Miles_per_Gallon", "Acceleration", "Horsepower"]
  },
  "spec": {
    "mark": "point",
    "encoding": {
      "x": { "field": { "repeat": "column" }, "type": "quantitative" },
      "y": { "field": { "repeat": "row" }, "type": "quantitative" }
    }
  }
}
```

### Resolve

Control whether composed views share or use independent scales, axes, and legends:

```json
{
  "resolve": {
    "scale": { "y": "independent" },
    "axis": { "y": "independent" },
    "legend": { "color": "independent" }
  }
}
```

---

## 8. Scales and Color Schemes

### Built-in Color Schemes

Vega-Lite supports all D3 and Vega color schemes:

- **Categorical**: `category10`, `category20`, `accent`, `dark2`, `paired`, `pastel1`, `pastel2`, `set1`, `set2`, `set3`, `tableau10`, `tableau20`
- **Sequential (single-hue)**: `blues`, `greens`, `oranges`, `reds`, `purples`, `greys`
- **Sequential (multi-hue)**: `viridis`, `magma`, `inferno`, `plasma`, `turbo`, `warm`, `cool`, `cividis`
- **Diverging**: `blueorange`, `redblue`, `redyellowblue`, `spectral`, `brownbluegreen`

### Scale Types

- `linear`, `log`, `pow`, `sqrt`, `symlog` (quantitative)
- `time`, `utc` (temporal)
- `ordinal`, `band`, `point` (discrete)
- `quantile`, `quantize`, `threshold` (discretizing)

---

## 9. Configuration and Theming

Global configuration controls default styles:

```json
{
  "config": {
    "view": { "stroke": "transparent", "continuousWidth": 400, "continuousHeight": 300 },
    "axis": { "labelFontSize": 12, "titleFontSize": 14, "grid": true, "gridOpacity": 0.3 },
    "mark": { "tooltip": true },
    "bar": { "cornerRadiusTopLeft": 3, "cornerRadiusTopRight": 3 },
    "title": { "fontSize": 18, "anchor": "start" },
    "legend": { "orient": "right", "titleFontSize": 13 },
    "range": { "category": ["#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b"] }
  }
}
```

---

## 10. Key Considerations for the Visualization Compiler

- **Safety**: Vega-Lite specs are pure JSON data -- no executable code. This makes them inherently safe to generate and transmit.
- **Deterministic rendering**: The same spec always produces the same visualization, enabling reproducibility.
- **Progressive complexity**: Start with simple mark + encoding, then add layers, transforms, and interactions incrementally.
- **Emotional adaptation**: Color schemes, opacity, mark size, information density, and animation timing can all be controlled declaratively to adapt to emotional state.
- **Responsive design**: `autosize`, `width: "container"`, and `height: "container"` enable responsive layouts.
- **Accessibility**: Vega-Lite supports `description` fields for ARIA labels and alternative text.
