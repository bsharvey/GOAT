---
archetypes: [meridian]
skills: [visualization, data-memory]
training_cluster: 06-visualization-compiler
domain: visualization
difficulty: advanced
version: 1.0
---
# Deck.gl Overview

> Training reference for the JARVIS Visualization Compiler agent.
> Source: deck.gl official documentation (deck.gl/docs)

---

## 1. What Is Deck.gl?

Deck.gl is a **GPU-powered framework for visual exploratory data analysis of large datasets**. Originally developed by Uber's Visualization team (now part of the OpenJS Foundation under vis.gl), it is designed to render millions of data points interactively in the browser using WebGL2 (and experimentally WebGPU).

### Key Design Principles

- **GPU-accelerated**: All rendering and many computations run on the GPU, enabling real-time visualization of datasets with millions of rows.
- **Layer-based architecture**: Visualizations are composed of layers, each handling a specific type of data representation.
- **Reactive**: Layers efficiently update when data or properties change, only re-computing what is necessary.
- **Interoperable**: Works with popular base map libraries (Mapbox GL JS, MapLibre, Google Maps) and rendering frameworks (React, pure JS).
- **Geospatial focus**: Strong support for geographic data, map projections, and geospatial layer types, though it handles non-geo data equally well.

### When to Use Deck.gl

| Scenario | Deck.gl Suitability |
|---|---|
| 100K-10M+ data points on a map | Excellent |
| Large-scale scatter plots, arcs, paths | Excellent |
| Geospatial heatmaps and hex bins | Excellent |
| 3D terrain and building visualization | Good |
| Point clouds (LiDAR) | Excellent |
| Traditional 2D charts (bar, line, pie) | Not ideal (use Vega-Lite/D3) |
| Small datasets (<1K points) | Overkill |

---

## 2. Architecture

### Core Rendering Pipeline

```
Data (Array/DataFrame)
  --> Layer (maps data to visual properties)
    --> GPU Buffers (positions, colors, sizes)
      --> WebGL Shaders (vertex + fragment)
        --> Framebuffer / Screen
```

### Key Architectural Components

| Component | Role |
|---|---|
| **Deck** | Top-level container; manages layers, views, interactions |
| **Layer** | Maps data to GPU-rendered visuals |
| **View** | Defines a viewport (MapView, OrthographicView, FirstPersonView) |
| **Controller** | Handles user interactions (pan, zoom, rotate) |
| **Effect** | Post-processing effects (lighting, shadows) |
| **Widget** | UI overlays (compass, zoom buttons, tooltip) |

### Basic Usage

```javascript
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer } from '@deck.gl/layers';

const deck = new Deck({
  initialViewState: {
    longitude: -122.4,
    latitude: 37.8,
    zoom: 11,
    pitch: 0,
    bearing: 0
  },
  controller: true,
  layers: [
    new ScatterplotLayer({
      id: 'scatterplot',
      data: 'https://data.source/points.json',
      getPosition: d => [d.longitude, d.latitude],
      getRadius: d => d.magnitude * 100,
      getFillColor: d => [255, 140, 0, 200],
      radiusMinPixels: 2,
      radiusMaxPixels: 20,
      pickable: true,
      onHover: info => setTooltip(info)
    })
  ]
});
```

### React Integration

```jsx
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl';

function App() {
  const layers = [
    new ScatterplotLayer({ /* ... */ })
  ];

  return (
    <DeckGL
      initialViewState={viewState}
      controller={true}
      layers={layers}
    >
      <Map mapStyle="mapbox://styles/mapbox/dark-v11" />
    </DeckGL>
  );
}
```

---

## 3. Layer Types

Deck.gl provides a rich taxonomy of layer types organized into packages.

### Core Layers (`@deck.gl/layers`)

| Layer | Description | Data Type |
|---|---|---|
| `ScatterplotLayer` | Circles at geographic or screen positions | Points with position |
| `LineLayer` | Straight lines between two points | Origin-destination pairs |
| `ArcLayer` | Curved arcs between two points (great circle) | Origin-destination pairs |
| `PathLayer` | Polylines / multi-segment paths | Arrays of coordinates |
| `PolygonLayer` | Filled and stroked polygons | Polygon coordinate arrays |
| `SolidPolygonLayer` | Filled polygons (no stroke, faster) | Polygon coordinate arrays |
| `GeoJsonLayer` | Renders GeoJSON Feature Collections | GeoJSON objects |
| `IconLayer` | Icons/sprites at positions | Points with icon mapping |
| `TextLayer` | Text labels at positions | Points with text |
| `ColumnLayer` | 3D cylinders (extruded circles) | Points with value |
| `GridCellLayer` | 3D grid cells | Pre-aggregated grid data |
| `BitmapLayer` | Raster image overlay | Image URL + bounds |
| `PointCloudLayer` | 3D point cloud | Points with x, y, z |

### Aggregation Layers (`@deck.gl/aggregation-layers`)

These layers perform GPU-accelerated data aggregation.

| Layer | Description |
|---|---|
| `HexagonLayer` | Hexagonal binning with 3D extrusion |
| `GridLayer` | Rectangular grid aggregation with 3D extrusion |
| `ScreenGridLayer` | Screen-space grid aggregation (2D heatmap) |
| `HeatmapLayer` | Kernel density estimation heatmap |
| `ContourLayer` | Contour lines / filled contours from point data |
| `GPUGridLayer` | GPU-computed grid aggregation (faster for large data) |
| `CPUGridLayer` | CPU-computed grid aggregation (more flexible) |

### Geo Layers (`@deck.gl/geo-layers`)

| Layer | Description |
|---|---|
| `TileLayer` | Renders map tiles (raster or vector) |
| `MVTLayer` | Mapbox Vector Tiles |
| `TerrainLayer` | 3D terrain from elevation tiles |
| `Tile3DLayer` | 3D Tiles (buildings, point clouds, BIM) |
| `TripsLayer` | Animated paths with trailing effect (vehicle trips) |
| `S2Layer` | S2 geometry cells |
| `H3HexagonLayer` | H3 hexagonal cells |
| `H3ClusterLayer` | Clustered H3 hexagons |
| `GreatCircleLayer` | Great circle arcs |
| `QuadkeyLayer` | Quadkey-indexed tiles |
| `WMSLayer` | Web Map Service raster |

### Mesh Layers (`@deck.gl/mesh-layers`)

| Layer | Description |
|---|---|
| `SimpleMeshLayer` | 3D mesh instances at positions |
| `ScenegraphLayer` | glTF 3D model instances at positions |

---

## 4. Data Visualization for Large Datasets

### GPU Acceleration

Deck.gl achieves performance through several GPU-centric strategies:

#### Attribute-Based Rendering

Data properties are mapped to GPU attributes (buffers) that the shader reads per-vertex:

```javascript
new ScatterplotLayer({
  data: millionPoints,          // 1M+ items
  getPosition: d => d.coords,  // Compiled to GPU attribute
  getRadius: d => d.size,      // Compiled to GPU attribute
  getFillColor: d => d.color,  // Compiled to GPU attribute
})
```

The `get*` accessor functions are called once per data item, results are packed into typed arrays, and uploaded to GPU buffers. On subsequent renders, only changed attributes are re-uploaded.

#### Binary Data (Zero-Copy)

For maximum performance, pass pre-formatted binary data directly:

```javascript
new ScatterplotLayer({
  data: {
    length: 1000000,
    attributes: {
      getPosition: new Float32Array(buffer, 0, 3000000),  // 3 floats per point
      getFillColor: new Uint8Array(buffer, 12000000, 4000000)  // 4 bytes per point
    }
  }
})
```

#### Data Filtering on GPU

The `DataFilterExtension` performs filtering in the shader without re-uploading data:

```javascript
import { DataFilterExtension } from '@deck.gl/extensions';

new ScatterplotLayer({
  // ...
  getFilterValue: d => d.timestamp,
  filterRange: [startTime, endTime],
  extensions: [new DataFilterExtension({ filterSize: 1 })],
  updateTriggers: {
    getFilterValue: filterField
  }
})
```

### Aggregation

For datasets too large even for GPU rendering, aggregation layers bin data into spatial cells:

- **HexagonLayer**: Bins points into hexagons, extruded by count or sum
- **GridLayer**: Bins into rectangular cells
- **HeatmapLayer**: Continuous density estimation
- **ContourLayer**: Isoline/isoband contours

```javascript
new HexagonLayer({
  data: tenMillionPoints,
  getPosition: d => d.coords,
  radius: 200,                   // Hex radius in meters
  elevationScale: 4,
  getElevationValue: points => points.length,
  getColorValue: points => points.reduce((sum, p) => sum + p.value, 0) / points.length,
  colorRange: [
    [1, 152, 189], [73, 227, 206], [216, 254, 181],
    [254, 237, 177], [254, 173, 84], [209, 55, 78]
  ],
  extruded: true
})
```

### Tiling

For planetary-scale datasets, deck.gl supports tiled rendering:

```javascript
new TileLayer({
  data: 'https://tiles.server/{z}/{x}/{y}.mvt',
  minZoom: 0,
  maxZoom: 14,
  renderSubLayers: props => new GeoJsonLayer(props)
})
```

---

## 5. Views and Projections

Deck.gl supports multiple simultaneous views:

| View | Projection | Use Case |
|---|---|---|
| `MapView` | Web Mercator | Standard maps |
| `GlobeView` | Spherical globe | Global visualization |
| `FirstPersonView` | Perspective from a point | Street-level, VR |
| `OrthographicView` | Orthographic (no perspective) | 2D charts, diagrams |
| `OrbitView` | Orbit around a target | 3D object inspection |

### Multi-View Example

```javascript
import { Deck, MapView, OrthographicView } from '@deck.gl/core';

new Deck({
  views: [
    new MapView({ id: 'map', x: 0, y: 0, width: '60%', height: '100%' }),
    new OrthographicView({ id: 'chart', x: '60%', y: 0, width: '40%', height: '100%' })
  ],
  layers: [
    new ScatterplotLayer({
      // This layer renders in both views
    })
  ],
  layerFilter: ({ layer, viewport }) => {
    // Control which layers appear in which views
    return true;
  }
});
```

---

## 6. Interactions

### Picking (Hover/Click)

```javascript
new ScatterplotLayer({
  pickable: true,
  autoHighlight: true,
  highlightColor: [255, 200, 0, 128],
  onHover: info => {
    if (info.object) {
      showTooltip(info.x, info.y, info.object);
    }
  },
  onClick: info => {
    if (info.object) {
      selectItem(info.object);
    }
  }
})
```

### Controller Options

```javascript
new Deck({
  controller: {
    type: MapController,
    scrollZoom: true,
    dragPan: true,
    dragRotate: true,
    doubleClickZoom: true,
    touchZoom: true,
    touchRotate: true,
    keyboard: true,
    minZoom: 0,
    maxZoom: 20,
    minPitch: 0,
    maxPitch: 60
  }
})
```

---

## 7. Animations and Transitions

### View State Transitions

```javascript
deck.setProps({
  initialViewState: {
    longitude: -122.4,
    latitude: 37.8,
    zoom: 14,
    transitionDuration: 1000,
    transitionInterpolator: new FlyToInterpolator(),
    transitionEasing: t => t * (2 - t)  // Ease-out quadratic
  }
});
```

### Layer Property Transitions

```javascript
new ScatterplotLayer({
  transitions: {
    getPosition: 600,
    getRadius: 300,
    getFillColor: 300
  }
})
```

### TripsLayer (Animated Paths)

```javascript
new TripsLayer({
  data: trips,
  getPath: d => d.waypoints.map(p => [p.lng, p.lat, p.timestamp]),
  getColor: [253, 128, 93],
  widthMinPixels: 2,
  trailLength: 180,
  currentTime: animationTime   // Advance this in requestAnimationFrame
})
```

---

## 8. Extensions

Deck.gl layers can be enhanced with extensions:

| Extension | Purpose |
|---|---|
| `DataFilterExtension` | GPU-based data filtering |
| `BrushingExtension` | Highlight data near cursor |
| `PathStyleExtension` | Dashed lines, arrow heads |
| `FillStyleExtension` | Pattern fills |
| `ClipExtension` | Clip layers to a region |
| `CollisionFilterExtension` | Hide overlapping labels |
| `MaskExtension` | Mask layers with geometry |
| `TerrainExtension` | Drape layers on terrain |

---

## 9. Performance Characteristics

| Dataset Size | Strategy | Expected FPS |
|---|---|---|
| < 10K | Any layer, no optimization needed | 60 |
| 10K - 100K | Standard layers with typed array accessors | 60 |
| 100K - 1M | Binary attributes, DataFilterExtension | 30-60 |
| 1M - 10M | Aggregation layers, tiling | 30-60 |
| 10M+ | Server-side pre-aggregation + tiling | 30-60 |

### Performance Tips

- Use binary/typed array data instead of accessor functions for large datasets
- Minimize layer count (combine similar data into one layer)
- Use `DataFilterExtension` instead of filtering data in JavaScript
- Enable `pickable` only on layers that need interaction
- Use `updateTriggers` to control when accessors re-evaluate
- Prefer `SolidPolygonLayer` over `PolygonLayer` when stroke is not needed

---

## 10. Integration with Other Tools

### With Vega-Lite

Deck.gl can render Vega-Lite-like specs at GPU scale. The compiler can generate deck.gl layer configurations as an alternative rendering backend when datasets exceed Vega-Lite's performance limits.

### With D3

D3 scales and color schemes work directly in deck.gl accessors:

```javascript
import { scaleLinear, scaleSequential, interpolateViridis } from 'd3';

const colorScale = scaleSequential(interpolateViridis).domain([0, maxValue]);

new ScatterplotLayer({
  getFillColor: d => {
    const rgb = colorScale(d.value);
    // Parse D3 color string to [r, g, b] array
    return d3.color(rgb).rgb();
  }
})
```

---

## 11. Key Considerations for the Visualization Compiler

- **Declarative layer specs**: Deck.gl layer configurations are essentially JSON-serializable objects (layer type + props), making them safe to generate.
- **Scale threshold**: Use deck.gl when data exceeds ~10K points or when geospatial rendering is needed. For smaller datasets, Vega-Lite or D3 are more appropriate.
- **Emotional adaptation**: Color ranges, opacity, extrusion height, animation speed (TripsLayer), and view pitch/bearing can be adjusted to convey emotional states. Warm colors and slower animations for calm; sharp contrasts and faster animations for urgency.
- **Progressive disclosure**: Start with aggregation layers (HeatmapLayer at low zoom), transition to individual points (ScatterplotLayer) as the user zooms in. The TileLayer architecture supports this pattern natively.
- **Safety**: Layer configurations are data, not code. The compiler can generate layer props without executing arbitrary JavaScript.
