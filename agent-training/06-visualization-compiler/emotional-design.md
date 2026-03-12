---
archetypes: [meridian, george]
skills: [visualization, emotional-sensing, creative-vision]
training_cluster: 06-visualization-compiler
domain: visualization
difficulty: intermediate
version: 1.0
---
# Emotional Design and Data Visualization

> Training reference for the JARVIS Visualization Compiler agent.
> Source: Synthesized from research in emotional design, data visualization UX, and affective computing literature.

---

## 1. Overview

Emotional design in data visualization concerns how visual properties of a chart, dashboard, or data display influence the viewer's emotional state, cognitive load, and decision-making. For the JARVIS Visualization Compiler, this means adapting visual output based on the user's detected emotional state to optimize comprehension, reduce anxiety, and support engagement.

### Foundational Concepts

- **Don Norman's Three Levels of Design**: Visceral (immediate aesthetic reaction), Behavioral (usability and function), Reflective (meaning and self-image).
- **Affective visualization**: Visualization that intentionally evokes, responds to, or communicates emotional states.
- **Emotional bandwidth**: The capacity for information processing varies with emotional state -- stressed users need simpler, calmer visuals; engaged users can handle density and complexity.

---

## 2. How Visual Properties Map to Emotional States

### Color

Color is the most powerful emotional channel in visualization.

| Color Property | Emotional Mapping |
|---|---|
| **Warm hues** (red, orange, yellow) | Energy, urgency, alarm, warmth, excitement |
| **Cool hues** (blue, teal, green) | Calm, trust, stability, safety, growth |
| **Neutral hues** (gray, beige, slate) | Objectivity, restraint, professionalism |
| **High saturation** | Intensity, importance, urgency, vibrancy |
| **Low saturation / muted** | Calm, subtlety, sophistication, gentleness |
| **High contrast** (dark bg + bright marks) | Drama, focus, high-energy, modernism |
| **Low contrast** (muted palette) | Softness, approachability, calm |
| **Monochromatic schemes** | Unity, focus, simplicity, clarity |
| **Diverging schemes** | Tension, polarity, comparison, conflict |
| **Dark backgrounds** | Immersion, focus, seriousness, cinematic |
| **Light backgrounds** | Openness, clarity, airiness, accessibility |

#### Color Adaptation by Emotional State

| User State | Color Strategy |
|---|---|
| **Calm / Neutral** | Standard palette; balanced saturation; categorical or sequential schemes |
| **Stressed / Anxious** | Shift to cooler, desaturated tones; reduce red; increase blue-green; softer gradients |
| **Excited / Engaged** | Allow richer saturation; more color variety; vibrant accents |
| **Sad / Low Energy** | Warmer undertones (amber, soft gold); avoid cold grays; gentle gradients |
| **Frustrated / Angry** | Cool down palette; remove red/orange; emphasize calm blues and greens; reduce visual noise |
| **Focused / Flow** | Minimal palette; high data-ink ratio; let the data drive color; reduce decorative color |
| **Overwhelmed** | Reduce to 2-3 colors maximum; increase whitespace; desaturate non-essential elements |

### Typography

| Property | Emotional Effect |
|---|---|
| **Large, bold headers** | Confidence, importance, clarity |
| **Smaller, lighter text** | Subtlety, detail, secondary information |
| **Serif fonts** | Tradition, authority, formality |
| **Sans-serif fonts** | Modernity, clarity, approachability |
| **Monospace fonts** | Technical, precise, data-oriented |
| **Generous line spacing** | Breathing room, calm, readability |
| **Tight line spacing** | Density, urgency, compactness |

### Shape and Form

| Property | Emotional Effect |
|---|---|
| **Rounded corners / circles** | Friendliness, softness, approachability |
| **Sharp corners / rectangles** | Precision, structure, formality |
| **Organic / curved lines** | Natural, flowing, gentle |
| **Straight / angular lines** | Rigid, structured, decisive |
| **Smooth curves (interpolated)** | Continuity, flow, gradual change |
| **Step functions** | Discrete, abrupt, categorical |
| **Large marks** | Importance, emphasis, approachability |
| **Small marks** | Detail, density, precision |

### Motion and Animation

| Property | Emotional Effect |
|---|---|
| **Slow transitions (>1s)** | Calm, contemplative, gentle |
| **Fast transitions (<300ms)** | Responsive, urgent, energetic |
| **Eased motion (ease-in-out)** | Natural, smooth, organic |
| **Linear motion** | Mechanical, steady, predictable |
| **Bounce / elastic easing** | Playful, energetic, attention-grabbing |
| **Staggered animations** | Sequential revelation, storytelling, anticipation |
| **Continuous animation** | Life, dynamism, real-time awareness |
| **No animation** | Static, stable, contemplative, printable |

#### Animation Adaptation by Emotional State

| User State | Animation Strategy |
|---|---|
| **Calm** | Standard transitions, moderate duration (500-750ms) |
| **Stressed** | Slow, gentle transitions (800-1200ms); ease-in-out; no bouncing; reduce motion |
| **Excited** | Snappier transitions (200-400ms); staggered reveals; allow playful easing |
| **Overwhelmed** | Minimize or eliminate animation; instant state changes; reduce visual motion |
| **Focused** | Minimal, functional transitions; no decorative animation |

---

## 3. Information Density Patterns

Information density -- how much data is presented per unit of visual space -- profoundly affects cognitive load and emotional response.

### The Density Spectrum

```
Low Density                              High Density
|----------------------------------------|
Single KPI       Dashboard Grid       Dense Matrix
Hero Number       Multi-chart          Heatmap
Sparkline         Small Multiples      Raw Table
                  Layered Views        Packed Layout
```

### Density and Emotional State

| User State | Optimal Density | Rationale |
|---|---|---|
| **Calm / Engaged** | Medium-High | User can process complex information; show detail |
| **Stressed / Anxious** | Low | Reduce cognitive load; show only critical information |
| **Overwhelmed** | Minimal | Single KPI or hero metric; everything else hidden |
| **Focused / Flow** | High | User is in deep work mode; maximize data-ink ratio |
| **Curious / Exploring** | Medium | Balanced; enough to explore without overwhelming |
| **Fatigued** | Low-Medium | Reduce density; larger fonts; more spacing |

### Density Control Mechanisms

1. **Data aggregation level**: Show daily vs. monthly vs. yearly granularity
2. **Number of visible series**: 1-2 series for low density; 5-10 for high density
3. **Chart count per view**: Single chart vs. dashboard grid
4. **Annotation density**: No annotations vs. key callouts vs. full annotation
5. **Axis detail**: Minimal ticks vs. full grid lines
6. **Legend verbosity**: Inline labels vs. separate legends vs. interactive legends
7. **Decimal precision**: Rounded integers vs. 2 decimal places
8. **Mark size**: Larger marks = lower perceived density

### Adaptive Density Rules

```
IF user.emotionalState == "overwhelmed":
  density = "minimal"
  showOnlyTopMetric()
  hideSecondaryCharts()
  increaseWhitespace(factor=2.0)

ELIF user.emotionalState == "stressed":
  density = "low"
  aggregateToHigherLevel()     // day -> week -> month
  reduceSeriesCount(max=3)
  removeGridLines()
  increaseWhitespace(factor=1.5)

ELIF user.emotionalState == "focused":
  density = "high"
  showFullDetail()
  enableSmallMultiples()
  tightenLayout()

ELIF user.emotionalState == "curious":
  density = "medium"
  showInteractiveFilters()
  enableDrillDown()
  showTooltipsOnHover()
```

---

## 4. Whitespace and Visual Breathing Room

Whitespace (negative space) is a critical emotional design tool. It is not "empty" space -- it is active design that affects perception.

### Whitespace Functions

| Function | Description |
|---|---|
| **Separation** | Creates visual grouping; separates chart from controls |
| **Emphasis** | Draws attention to isolated elements |
| **Breathing room** | Reduces cognitive load; prevents claustrophobia |
| **Hierarchy** | More whitespace around important elements |
| **Elegance** | Conveys sophistication and confidence |
| **Rest** | Provides visual rest areas for eye movement |

### Whitespace Parameters

```
Micro whitespace:   4-8px   (between axis labels, within legends)
Small whitespace:   12-16px (between chart elements, padding)
Medium whitespace:  24-32px (between sections, card padding)
Large whitespace:   48-64px (between major sections, page margins)
Hero whitespace:    96px+   (around hero metrics, single KPI displays)
```

### Adaptive Whitespace

| User State | Whitespace Multiplier | Effect |
|---|---|---|
| **Calm** | 1.0x (baseline) | Standard spacing |
| **Stressed** | 1.5-2.0x | More breathing room; elements feel less crowded |
| **Overwhelmed** | 2.0-3.0x | Maximum space; minimal content |
| **Focused** | 0.8-1.0x | Tighter spacing acceptable; maximize data visibility |
| **Fatigued** | 1.3-1.5x | Slightly more space; easier scanning |

---

## 5. Progressive Disclosure

Progressive disclosure reveals information in stages, starting with the most important summary and allowing users to drill into detail on demand.

### The Progressive Disclosure Hierarchy

```
Level 0: Ambient / Glanceable
  - Single KPI, traffic light, status indicator
  - "Everything is OK" or "Attention needed"
  - 0.5-2 seconds to comprehend

Level 1: Summary
  - Key metrics with trend direction
  - Sparklines, mini charts
  - 5-15 seconds to comprehend

Level 2: Overview
  - Full dashboard with multiple charts
  - Comparative views, small multiples
  - 30-60 seconds to comprehend

Level 3: Detail
  - Interactive exploration
  - Drill-down, filtering, brushing
  - 1-10 minutes of exploration

Level 4: Raw Data
  - Data tables, export, full detail
  - Unlimited exploration time
```

### Progressive Disclosure Triggers

| Trigger | Mechanism |
|---|---|
| **User interaction** | Click/tap to expand; hover for detail; scroll for more |
| **Emotional state** | Start at appropriate level based on detected state |
| **Time spent** | If user lingers, offer to show more detail |
| **Screen size** | Mobile = Level 0-1; Tablet = Level 1-2; Desktop = Level 2-3 |
| **Task context** | Monitoring = Level 0-1; Analysis = Level 2-3; Debug = Level 3-4 |
| **Urgency** | Alerts auto-expand to Level 2; routine data stays at Level 0-1 |

### Implementation Patterns

#### Drill-Down

```
Country Map (Level 1)
  --> Click country --> Region Chart (Level 2)
    --> Click region --> City Table (Level 3)
      --> Click city --> Raw Data (Level 4)
```

#### Tooltip Progression

```
Hover (instant):   Value label
Hover (500ms):     Contextual comparison ("12% above average")
Click:             Expanded detail panel
Double-click:      Navigate to detail view
```

#### Dashboard Sections

```
Above the fold:    KPIs + hero chart (Level 1)
Below the fold:    Supporting charts (Level 2)
Expandable panels: Detail views (Level 3)
Modal / drawer:    Data tables and raw data (Level 4)
```

### Emotional State and Disclosure Level

| User State | Starting Level | Auto-Disclosure Behavior |
|---|---|---|
| **Overwhelmed** | Level 0 (glanceable) | Do not auto-expand; wait for user interaction |
| **Stressed** | Level 1 (summary) | Show only what is immediately actionable |
| **Calm** | Level 2 (overview) | Standard interactive dashboard |
| **Curious** | Level 2-3 | Auto-show exploration tools; suggest drill-downs |
| **Focused** | Level 3-4 | Full detail; maximize data access; minimize chrome |

---

## 6. Emotional Color Palettes

### Palette Definitions

#### Calm Palette
```
Background: #f8f9fa (light warm gray)
Primary:    #5b8fb9 (soft blue)
Secondary:  #7eb8a3 (sage green)
Accent:     #deb887 (warm tan)
Text:       #4a4a4a (dark gray, not black)
Border:     #e0e0e0 (light gray)
Gradient:   soft linear from primary to secondary
```

#### Alert Palette
```
Background: #1a1a2e (dark navy)
Critical:   #e74c3c (red)
Warning:    #f39c12 (amber)
Info:       #3498db (blue)
Success:    #27ae60 (green)
Text:       #ecf0f1 (near-white)
Emphasis:   Pulsing glow on critical items
```

#### Focused Palette
```
Background: #ffffff (white) or #1e1e1e (dark mode)
Primary:    #2c3e50 (dark blue-gray)
Data:       #3498db (functional blue)
Highlight:  #e74c3c (attention red, used sparingly)
Text:       #2c3e50 (high contrast)
Grid:       #f0f0f0 (barely visible)
Style:      Maximum data-ink ratio; no decoration
```

#### Warm/Supportive Palette
```
Background: #fef9ef (warm cream)
Primary:    #d4a574 (warm gold)
Secondary:  #c17f59 (terracotta)
Accent:     #8fbc8f (soft green)
Text:       #5d4e37 (warm brown)
Borders:    #e8d5b7 (warm beige)
```

---

## 7. Mapping Emotional States to Visualization Parameters

### Comprehensive Parameter Matrix

| Parameter | Calm | Stressed | Excited | Overwhelmed | Focused |
|---|---|---|---|---|---|
| **Color saturation** | 60-80% | 30-50% | 80-100% | 20-40% | 50-70% |
| **Color temperature** | Neutral | Cool | Warm | Cool | Neutral |
| **Contrast** | Medium | Low-Medium | High | Low | High |
| **Whitespace** | 1.0x | 1.5x | 0.9x | 2.5x | 0.8x |
| **Info density** | Medium | Low | Medium-High | Minimal | High |
| **Animation speed** | 500-750ms | 800-1200ms | 200-400ms | None | 200-300ms |
| **Animation easing** | ease-in-out | ease-out (gentle) | ease-out (snappy) | None | linear |
| **Font size** | Base | Base+2px | Base | Base+4px | Base-1px |
| **Mark size** | Medium | Large | Medium | Extra large | Small |
| **Grid lines** | Subtle | Hidden | Subtle | Hidden | Visible |
| **Disclosure level** | Level 2 | Level 1 | Level 2-3 | Level 0 | Level 3-4 |
| **Border radius** | 4-8px | 8-12px | 2-4px | 12-16px | 0-2px |
| **Shadow depth** | Medium | Light | Medium | None | None |
| **Tooltip delay** | 300ms | 500ms | 100ms | 700ms | 100ms |
| **Number precision** | 1 decimal | 0 decimals | 1-2 decimals | 0 decimals | 2+ decimals |
| **Series count** | 3-5 | 1-2 | 5-8 | 1 | 5-10 |

---

## 8. Psychological Principles

### Cognitive Load Theory (Sweller)

- **Intrinsic load**: Complexity inherent in the data. Cannot be reduced, only managed.
- **Extraneous load**: Complexity from poor design. Must be minimized.
- **Germane load**: Effort spent building mental models. Should be supported.
- **Emotional stress increases extraneous load sensitivity.** Under stress, even minor design flaws become disproportionately harmful.

### Pre-Attentive Visual Properties

These visual features are processed in <250ms without conscious effort:

- **Color hue** (strongest pre-attentive channel)
- **Color intensity/saturation**
- **Size / length**
- **Orientation**
- **Position (spatial)**
- **Motion / flicker**
- **Shape** (weakest pre-attentive channel)

Under emotional stress, pre-attentive processing narrows. Use fewer channels and more dominant ones (color, position) when adapting for stress.

### Gestalt Principles

| Principle | Application | Emotional Relevance |
|---|---|---|
| **Proximity** | Group related charts/elements | Clustering reduces perceived complexity |
| **Similarity** | Consistent color/shape for same categories | Consistency builds trust and reduces anxiety |
| **Continuity** | Aligned axes, smooth lines | Flow and continuity feel natural and calming |
| **Closure** | Implied boundaries, card layouts | Completeness provides psychological comfort |
| **Figure-ground** | Clear data vs. background separation | Clarity reduces cognitive strain |
| **Common fate** | Synchronized animations | Unity and coherence |

### The Aesthetic-Usability Effect

Users perceive aesthetically pleasing designs as more usable, even when they are not objectively more functional. Beautiful visualizations build trust and patience, while ugly ones trigger frustration and abandonment. This effect is amplified under emotional stress.

---

## 9. Implementation Guidelines for the Visualization Compiler

### Emotional State Input

The compiler should accept an emotional state parameter:

```json
{
  "emotionalContext": {
    "primaryState": "stressed",
    "intensity": 0.7,
    "confidence": 0.85,
    "secondaryState": "focused",
    "recentTrend": "improving"
  }
}
```

### Adaptation Pipeline

```
1. Receive visualization request + emotional context
2. Select base visualization type (chart/mark type)
3. Apply emotional state modifiers:
   a. Adjust color palette (hue, saturation, contrast)
   b. Set information density level
   c. Configure whitespace multiplier
   d. Set animation parameters
   e. Choose progressive disclosure starting level
   f. Adjust typography scale
   g. Configure interaction sensitivity
4. Generate final declarative spec (Vega-Lite / deck.gl / Three.js)
5. Include metadata about adaptations made (for transparency)
```

### Guardrails

- Never remove data that changes the factual interpretation of a visualization.
- Density reduction should aggregate, not omit.
- Color adaptations must maintain distinguishability between categories.
- Accessibility standards (WCAG contrast ratios) must be met regardless of emotional adaptation.
- Users should be able to override emotional adaptations.
- Log all adaptations for auditability.

### Transition Between States

When the user's emotional state changes, the visualization should transition smoothly:

```
1. Detect state change
2. Calculate delta between current and target parameters
3. Apply smooth transition (duration proportional to parameter change magnitude)
4. Never make jarring changes -- always interpolate
5. If state is "overwhelmed", transition to simpler view slowly (don't add sudden motion)
```

---

## 10. Research References

- Norman, D. (2004). *Emotional Design: Why We Love (or Hate) Everyday Things*
- Tufte, E. (1983). *The Visual Display of Quantitative Information*
- Few, S. (2006). *Information Dashboard Design*
- Ware, C. (2012). *Information Visualization: Perception for Design*
- Kennedy, H. & Hill, R.L. (2018). "The Feeling of Numbers: Emotions in Everyday Engagements with Data and Their Visualisation"
- Bartram, L., Patra, A., & Stone, M. (2017). "Affective Color in Visualization"
- Harrison, L., et al. (2013). "Influencing Visual Judgment through Affective Priming"
- Lan, F., et al. (2021). "Emotional Responses to Data Visualization"
- Boy, J., et al. (2017). "Showing People Behind Data: Anthropographics"
