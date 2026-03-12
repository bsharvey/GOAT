---
archetypes: [meridian]
skills: [visualization, data-memory]
training_cluster: 06-visualization-compiler
domain: visualization
difficulty: intermediate
version: 1.0
---
# D3.js Core Concepts

> Training reference for the JARVIS Visualization Compiler agent.
> Source: D3.js official documentation (d3js.org), D3 v7

---

## 1. What Is D3.js?

D3 (Data-Driven Documents) is a JavaScript library for producing dynamic, interactive data visualizations in web browsers. It uses HTML, SVG, and CSS standards. Unlike higher-level charting libraries, D3 provides low-level building blocks that give complete control over the visual output.

### Key Philosophy

- **Data-driven**: DOM elements are bound to data, and visual properties are derived from that data.
- **Web standards**: Uses SVG, HTML, and CSS rather than proprietary rendering. Outputs are inspectable, styleable, and accessible.
- **Modular**: D3 v7 is composed of ~30 independent modules (d3-selection, d3-scale, d3-shape, etc.) that can be used individually.
- **Functional**: Emphasizes method chaining and functional transformations over imperative state management.

### D3 v7 Module Architecture

D3 v7 is organized as a collection of ES modules:

| Module | Purpose |
|---|---|
| `d3-selection` | DOM manipulation and data binding |
| `d3-scale` | Data-to-visual mapping functions |
| `d3-axis` | Axis generators for scales |
| `d3-shape` | Shape generators (lines, areas, arcs, pies, curves) |
| `d3-transition` | Animated transitions |
| `d3-force` | Force-directed graph simulation |
| `d3-hierarchy` | Tree, treemap, pack, partition layouts |
| `d3-geo` | Geographic projections and path generators |
| `d3-array` | Array statistics and manipulation |
| `d3-format` | Number formatting |
| `d3-time-format` | Date/time formatting and parsing |
| `d3-color` | Color manipulation |
| `d3-interpolate` | Value interpolation for transitions |
| `d3-zoom` | Pan and zoom behavior |
| `d3-brush` | 1D and 2D brushing |
| `d3-drag` | Drag interaction |
| `d3-dispatch` | Event dispatching |
| `d3-fetch` | Data loading (CSV, JSON, TSV) |
| `d3-dsv` | Delimiter-separated value parsing |
| `d3-chord` | Chord diagram layout |
| `d3-contour` | Contour/density plots |
| `d3-delaunay` | Voronoi diagrams and Delaunay triangulation |
| `d3-quadtree` | Spatial indexing |

---

## 2. Selections

Selections are the core abstraction in D3. A selection is a set of DOM elements, potentially bound to data.

### Creating Selections

```javascript
// Select one element
const header = d3.select("h1");

// Select all matching elements
const circles = d3.selectAll("circle");

// Chained sub-selection
const rows = d3.select("table").selectAll("tr");

// Select by class, id, or any CSS selector
const points = d3.selectAll(".data-point");
```

### Manipulating Selections

```javascript
d3.selectAll("p")
  .attr("class", "highlight")        // Set attribute
  .style("color", "steelblue")       // Set CSS style
  .style("font-size", "14px")
  .text("Hello, D3!")                 // Set text content
  .html("<strong>Bold</strong>")      // Set inner HTML
  .classed("active", true)           // Add/remove CSS class
  .property("checked", true)         // Set DOM property
  .on("click", (event, d) => { })    // Add event listener
  .raise()                           // Move to front (re-order in DOM)
  .lower();                          // Move to back
```

### Dynamic Properties (Functions of Data)

Any attribute, style, or property can be set as a function of the bound datum:

```javascript
d3.selectAll("circle")
  .attr("cx", d => xScale(d.date))
  .attr("cy", d => yScale(d.value))
  .attr("r", d => sizeScale(d.population))
  .style("fill", d => colorScale(d.category));
```

The function receives `(datum, index, nodes)` as arguments.

---

## 3. Data Joins

The data join is D3's mechanism for synchronizing DOM elements with data arrays. It is the core pattern for bindings data to visuals.

### The Join Pattern (Modern API -- D3 v7)

```javascript
// Modern join API (recommended)
svg.selectAll("circle")
  .data(dataset, d => d.id)    // Bind data with key function
  .join(
    enter => enter.append("circle")   // New data points
      .attr("r", 0)
      .attr("fill", "steelblue")
      .call(enter => enter.transition()
        .attr("r", d => sizeScale(d.value))),
    update => update                   // Existing data points
      .call(update => update.transition()
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))),
    exit => exit                       // Removed data points
      .call(exit => exit.transition()
        .attr("r", 0)
        .remove())
  );
```

### The Classic Enter-Update-Exit Pattern

```javascript
// Bind data
const circles = svg.selectAll("circle").data(dataset, d => d.id);

// ENTER: Create new elements for new data
circles.enter()
  .append("circle")
  .attr("r", 5)
  .attr("fill", "green")
  .merge(circles)  // Merge enter + update for shared operations
  .attr("cx", d => xScale(d.x))
  .attr("cy", d => yScale(d.y));

// EXIT: Remove elements for removed data
circles.exit().remove();
```

### Key Function

The second argument to `.data()` is a key function that determines how data is matched to elements:

```javascript
.data(dataset, d => d.id)  // Match by id field
```

Without a key function, data is matched by index (position), which can cause incorrect animations when data is reordered.

### Understanding Enter, Update, Exit

| Selection | Contains | Action |
|---|---|---|
| **Enter** | Data without corresponding DOM elements | Create (append) new elements |
| **Update** | Data with existing DOM elements | Update attributes/styles |
| **Exit** | DOM elements without corresponding data | Remove elements |

---

## 4. Scales

Scales are functions that map from a data **domain** (input) to a visual **range** (output). They are the mathematical backbone of data visualization.

### Continuous Scales

```javascript
// Linear scale
const x = d3.scaleLinear()
  .domain([0, 100])          // Data extent
  .range([0, 800])           // Pixel extent
  .clamp(true)               // Clamp output to range
  .nice();                   // Round domain to nice values

// Logarithmic scale
const y = d3.scaleLog()
  .domain([1, 1000000])
  .range([600, 0]);

// Power scale
const area = d3.scalePow()
  .exponent(0.5)             // Square root scale (common for area)
  .domain([0, 100])
  .range([0, 500]);

// Symmetric log (handles zero and negatives)
const symlog = d3.scaleSymlog()
  .domain([-1000, 1000])
  .range([0, 800]);

// Time scale
const time = d3.scaleTime()
  .domain([new Date("2020-01-01"), new Date("2023-12-31")])
  .range([0, 800]);
```

### Ordinal / Categorical Scales

```javascript
// Ordinal scale (explicit mapping)
const color = d3.scaleOrdinal()
  .domain(["A", "B", "C"])
  .range(["#e41a1c", "#377eb8", "#4daf4a"]);

// Using a D3 color scheme
const color = d3.scaleOrdinal(d3.schemeCategory10);

// Band scale (for bar charts)
const x = d3.scaleBand()
  .domain(["Mon", "Tue", "Wed", "Thu", "Fri"])
  .range([0, 800])
  .padding(0.2)              // Gap between bars
  .paddingInner(0.1)         // Inner padding
  .paddingOuter(0.05);       // Outer padding

// Point scale (for dot plots)
const x = d3.scalePoint()
  .domain(["A", "B", "C", "D"])
  .range([0, 800])
  .padding(0.5);
```

### Color Scales

```javascript
// Sequential color scale
const heat = d3.scaleSequential()
  .domain([0, 100])
  .interpolator(d3.interpolateViridis);

// Diverging color scale
const diverging = d3.scaleDiverging()
  .domain([-1, 0, 1])
  .interpolator(d3.interpolateRdBu);

// Quantize (continuous -> discrete buckets)
const quantize = d3.scaleQuantize()
  .domain([0, 100])
  .range(["#f7fbff", "#c6dbef", "#6baed6", "#2171b5", "#08306b"]);

// Threshold scale (explicit breakpoints)
const threshold = d3.scaleThreshold()
  .domain([0, 25, 50, 75, 100])
  .range(["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9850"]);
```

### Scale Utilities

```javascript
x.invert(400);       // Reverse mapping: pixel -> data value
x.ticks(10);         // Generate ~10 evenly-spaced tick values
x.tickFormat(10, "$,.0f");  // Formatted tick labels
x.copy();            // Clone the scale
```

---

## 5. Axes

Axes are visual representations of scales, generating tick marks, labels, and grid lines.

### Creating Axes

```javascript
// Four axis orientations
const xAxis = d3.axisBottom(xScale);    // Ticks below the line
const yAxis = d3.axisLeft(yScale);      // Ticks to the left
const topAxis = d3.axisTop(xScale);     // Ticks above
const rightAxis = d3.axisRight(yScale); // Ticks to the right
```

### Rendering Axes

```javascript
// Append a <g> element and call the axis generator
svg.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${height})`)
  .call(xAxis);

svg.append("g")
  .attr("class", "y-axis")
  .call(yAxis);
```

### Customizing Axes

```javascript
const xAxis = d3.axisBottom(xScale)
  .ticks(10)                            // Approximate number of ticks
  .tickValues([0, 25, 50, 75, 100])     // Explicit tick values
  .tickFormat(d3.format("$,.0f"))       // Custom label format
  .tickSize(-height)                    // Extend ticks as grid lines
  .tickSizeOuter(0)                     // Remove outer ticks
  .tickPadding(8);                      // Space between tick and label
```

### Updating Axes with Transitions

```javascript
svg.select(".x-axis")
  .transition()
  .duration(750)
  .call(xAxis);
```

---

## 6. Transitions

Transitions smoothly interpolate between states over time, providing animated updates.

### Basic Transitions

```javascript
d3.selectAll("circle")
  .transition()
  .duration(750)                        // Duration in ms
  .delay((d, i) => i * 50)             // Stagger animation
  .ease(d3.easeCubicInOut)             // Easing function
  .attr("cx", d => xScale(d.x))
  .attr("cy", d => yScale(d.y))
  .attr("r", d => sizeScale(d.value))
  .style("fill", d => colorScale(d.category));
```

### Easing Functions

| Easing | Description |
|---|---|
| `d3.easeLinear` | Constant speed |
| `d3.easeCubic` | Default; smooth acceleration/deceleration |
| `d3.easeCubicInOut` | Symmetric cubic ease |
| `d3.easeBounce` | Bouncing effect |
| `d3.easeElastic` | Elastic spring effect |
| `d3.easeBack` | Overshoot and return |
| `d3.easeCircle` | Circular easing |
| `d3.easePoly.exponent(3)` | Polynomial easing with custom exponent |

### Chaining Transitions

```javascript
d3.select("circle")
  .transition()
  .duration(500)
  .attr("r", 20)
  .transition()              // Chains after previous completes
  .duration(500)
  .attr("r", 5)
  .style("fill", "red");
```

### Transition Events

```javascript
d3.selectAll("rect")
  .transition()
  .duration(1000)
  .attr("height", d => yScale(d.value))
  .on("start", function() { d3.select(this).style("stroke", "orange"); })
  .on("end", function() { d3.select(this).style("stroke", null); })
  .on("interrupt", function() { /* handle interruption */ });
```

### Custom Interpolators

```javascript
transition.attrTween("fill", function(d) {
  return d3.interpolateRgb("steelblue", "tomato");
});

transition.attrTween("d", function(d) {
  const previous = this.getAttribute("d");
  const next = arcGenerator(d);
  return d3.interpolate(previous, next);
});
```

---

## 7. Force Layouts

Force-directed layouts simulate physical forces to position nodes, commonly used for network/graph visualization.

### Creating a Force Simulation

```javascript
const simulation = d3.forceSimulation(nodes)
  .force("charge", d3.forceManyBody().strength(-200))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force("link", d3.forceLink(links).id(d => d.id).distance(80))
  .force("collision", d3.forceCollide().radius(d => d.radius + 2))
  .force("x", d3.forceX(width / 2).strength(0.05))
  .force("y", d3.forceY(height / 2).strength(0.05))
  .on("tick", ticked);

function ticked() {
  node.attr("cx", d => d.x).attr("cy", d => d.y);
  link.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
}
```

### Available Forces

| Force | Description | Key Parameters |
|---|---|---|
| `d3.forceManyBody()` | N-body charge force (attract/repel) | `strength()` (negative = repel) |
| `d3.forceLink(links)` | Spring forces along links | `distance()`, `strength()`, `id()` |
| `d3.forceCenter(x, y)` | Centering force (adjusts mean position) | `x()`, `y()` |
| `d3.forceCollide(radius)` | Collision detection (prevents overlap) | `radius()`, `strength()`, `iterations()` |
| `d3.forceX(targetX)` | Horizontal positioning force | `x()`, `strength()` |
| `d3.forceY(targetY)` | Vertical positioning force | `y()`, `strength()` |
| `d3.forceRadial(radius, cx, cy)` | Push nodes toward a circle | `radius()`, `strength()` |

### Simulation Control

```javascript
simulation.alpha(1).restart();   // Reheat and restart
simulation.stop();               // Pause simulation
simulation.tick(300);            // Run 300 ticks synchronously
simulation.alphaDecay(0.02);     // Control cooling rate (default 0.0228)
simulation.alphaMin(0.001);      // Minimum alpha before stopping
simulation.velocityDecay(0.4);   // Friction (default 0.4)
```

### Drag Integration

```javascript
function drag(simulation) {
  return d3.drag()
    .on("start", (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    })
    .on("drag", (event, d) => {
      d.fx = event.x; d.fy = event.y;
    })
    .on("end", (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    });
}

node.call(drag(simulation));
```

---

## 8. Shape Generators

D3 provides generator functions for complex SVG paths.

### Lines and Areas

```javascript
const line = d3.line()
  .x(d => xScale(d.date))
  .y(d => yScale(d.value))
  .curve(d3.curveCatmullRom.alpha(0.5))  // Smooth curve
  .defined(d => !isNaN(d.value));          // Handle missing data

const area = d3.area()
  .x(d => xScale(d.date))
  .y0(yScale(0))
  .y1(d => yScale(d.value))
  .curve(d3.curveMonotoneX);

// Generate path string
svg.append("path")
  .datum(data)
  .attr("d", line)
  .attr("fill", "none")
  .attr("stroke", "steelblue");
```

### Arcs (Pie/Donut)

```javascript
const pie = d3.pie()
  .value(d => d.count)
  .sort(null)
  .padAngle(0.02);

const arc = d3.arc()
  .innerRadius(60)    // > 0 for donut
  .outerRadius(120)
  .cornerRadius(4);

svg.selectAll("path")
  .data(pie(data))
  .join("path")
  .attr("d", arc)
  .attr("fill", (d, i) => colorScale(i));
```

### Curve Types

| Curve | Description |
|---|---|
| `d3.curveLinear` | Straight line segments (default) |
| `d3.curveBasis` | B-spline (does not pass through points) |
| `d3.curveBundle` | Straightened B-spline |
| `d3.curveCardinal` | Cardinal spline (passes through points) |
| `d3.curveCatmullRom` | Catmull-Rom spline |
| `d3.curveMonotoneX` | Monotone cubic (preserves monotonicity in x) |
| `d3.curveMonotoneY` | Monotone cubic (preserves monotonicity in y) |
| `d3.curveNatural` | Natural cubic spline |
| `d3.curveStep` | Step function |
| `d3.curveStepBefore` | Step before each point |
| `d3.curveStepAfter` | Step after each point |

---

## 9. Hierarchy Layouts

D3 provides layout algorithms for hierarchical data:

```javascript
// Create hierarchy from nested data
const root = d3.hierarchy(data)
  .sum(d => d.value)
  .sort((a, b) => b.value - a.value);

// Treemap layout
d3.treemap()
  .size([width, height])
  .padding(2)
  .round(true)
  (root);

// Tree layout (dendrogram)
d3.tree()
  .size([width, height])
  (root);

// Circle packing
d3.pack()
  .size([width, height])
  .padding(3)
  (root);

// Sunburst / partition
d3.partition()
  .size([2 * Math.PI, radius])
  (root);
```

---

## 10. Zoom and Brush

### Zoom Behavior

```javascript
const zoom = d3.zoom()
  .scaleExtent([0.5, 10])
  .translateExtent([[0, 0], [width, height]])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);

// Programmatic zoom
svg.transition().duration(750).call(
  zoom.transform,
  d3.zoomIdentity.translate(width/2, height/2).scale(2)
);
```

### Brush Behavior

```javascript
const brush = d3.brushX()
  .extent([[0, 0], [width, height]])
  .on("brush end", (event) => {
    if (!event.selection) return;
    const [x0, x1] = event.selection.map(xScale.invert);
    // Filter or highlight data in [x0, x1]
  });

svg.append("g").call(brush);
```

---

## 11. Key Considerations for the Visualization Compiler

- **Imperative vs. declarative**: D3 is imperative -- the compiler would need to generate JavaScript code or use D3 as a rendering backend for higher-level specs.
- **SVG output**: D3 generates standard SVG that can be styled, animated, and made accessible.
- **Performance**: D3 is CPU-bound for large datasets. For >100K data points, consider Canvas rendering (`d3-canvas`) or switch to WebGL-based alternatives (deck.gl, Three.js).
- **Emotional adaptation via transitions**: Easing functions, duration, and delay can convey urgency (fast, sharp) or calm (slow, smooth). Color interpolation can shift palette warmth.
- **Composability**: D3 modules are independent -- the compiler can use just the scales and shapes modules without full DOM manipulation if generating specs for another renderer.
- **Data loading**: `d3.csv()`, `d3.json()`, `d3.tsv()` provide built-in data fetching and parsing.
