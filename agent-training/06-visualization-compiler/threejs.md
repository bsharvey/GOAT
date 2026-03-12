---
archetypes: [meridian, harvey]
skills: [visualization, creative-vision]
training_cluster: 06-visualization-compiler
domain: visualization
difficulty: advanced
version: 1.0
---
# Three.js Fundamentals

> Training reference for the JARVIS Visualization Compiler agent.
> Source: Three.js official documentation (threejs.org/docs)

---

## 1. What Is Three.js?

Three.js is a cross-browser JavaScript library and API used to create and display animated 3D computer graphics in a web browser using WebGL (and optionally WebGPU). It abstracts the complexity of raw WebGL into a high-level, object-oriented scene graph API.

### Key Capabilities

- **3D rendering**: Render complex 3D scenes with lighting, shadows, materials, and post-processing
- **WebGL abstraction**: No need to write GLSL shaders directly (though you can)
- **Cross-platform**: Runs in any modern browser, mobile included
- **Rich ecosystem**: Loaders for 3D models (glTF, OBJ, FBX), physics engines, VR/AR support
- **Data visualization**: 3D scatter plots, network graphs, terrain visualization, volumetric rendering

---

## 2. The Core Triad: Scene, Camera, Renderer

Every Three.js application requires three fundamental objects.

### Scene

The scene is the container for all objects, lights, and cameras. It represents the 3D world.

```javascript
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);    // Background color
scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);     // Depth fog
scene.add(mesh);                                   // Add objects
scene.remove(mesh);                                // Remove objects
```

**Scene Graph**: Objects in a scene form a hierarchy. Children inherit parent transforms:

```javascript
const group = new THREE.Group();
group.add(mesh1);
group.add(mesh2);
group.position.set(5, 0, 0);    // Both meshes move together
scene.add(group);
```

### Camera

Cameras define the viewpoint and projection.

#### PerspectiveCamera (most common)

Mimics human eye perspective -- objects farther away appear smaller.

```javascript
const camera = new THREE.PerspectiveCamera(
  75,                                    // Field of view (degrees)
  window.innerWidth / window.innerHeight, // Aspect ratio
  0.1,                                   // Near clipping plane
  1000                                   // Far clipping plane
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);                 // Point camera at origin
```

#### OrthographicCamera

No perspective distortion -- parallel projection. Used for 2D overlays, CAD views, isometric games.

```javascript
const camera = new THREE.OrthographicCamera(
  -width/2, width/2,    // left, right
  height/2, -height/2,  // top, bottom
  0.1, 1000             // near, far
);
```

### Renderer

The renderer draws the scene from the camera's perspective.

```javascript
const renderer = new THREE.WebGLRenderer({
  antialias: true,               // Smooth edges
  alpha: true,                   // Transparent background
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));  // Retina support
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);

// Render one frame
renderer.render(scene, camera);
```

**WebGPURenderer**: Three.js is adding WebGPU support for next-generation GPU access.

---

## 3. Geometries

Geometries define the shape/mesh of 3D objects as collections of vertices, faces, and normals.

### Built-in Geometries

| Geometry | Constructor | Use Case |
|---|---|---|
| `BoxGeometry` | `(width, height, depth, wSeg, hSeg, dSeg)` | Cubes, bars in 3D bar charts |
| `SphereGeometry` | `(radius, wSeg, hSeg)` | Spheres, 3D scatter plot points, globes |
| `CylinderGeometry` | `(radiusTop, radiusBot, height, radSeg)` | Cylinders, 3D bar charts |
| `ConeGeometry` | `(radius, height, radSeg)` | Directional markers |
| `PlaneGeometry` | `(width, height, wSeg, hSeg)` | Ground planes, terrain, backgrounds |
| `CircleGeometry` | `(radius, segments)` | Flat circles, pie chart faces |
| `RingGeometry` | `(innerR, outerR, segments)` | Donut shapes, annular charts |
| `TorusGeometry` | `(radius, tube, radSeg, tubeSeg)` | Torus, ring visualization |
| `TorusKnotGeometry` | `(radius, tube, tubeSeg, radSeg)` | Decorative/artistic |
| `IcosahedronGeometry` | `(radius, detail)` | Low-poly spheres |
| `OctahedronGeometry` | `(radius, detail)` | Gem-like shapes |
| `TetrahedronGeometry` | `(radius, detail)` | Simplest 3D shape |
| `DodecahedronGeometry` | `(radius, detail)` | 12-sided polyhedron |
| `LatheGeometry` | `(points, segments)` | Surfaces of revolution |
| `ExtrudeGeometry` | `(shape, options)` | Extruded 2D shapes to 3D |
| `ShapeGeometry` | `(shape)` | Flat 2D shapes in 3D space |
| `TubeGeometry` | `(curve, tubSeg, radius)` | Tubes along curves, pipes |
| `EdgesGeometry` | `(geometry)` | Wireframe edges only |

### BufferGeometry (Custom)

For data visualization, you often need custom geometries built from data:

```javascript
const geometry = new THREE.BufferGeometry();

const positions = new Float32Array(pointCount * 3); // x, y, z per vertex
const colors = new Float32Array(pointCount * 3);    // r, g, b per vertex

for (let i = 0; i < pointCount; i++) {
  positions[i * 3]     = data[i].x;
  positions[i * 3 + 1] = data[i].y;
  positions[i * 3 + 2] = data[i].z;
  colors[i * 3]     = data[i].r;
  colors[i * 3 + 1] = data[i].g;
  colors[i * 3 + 2] = data[i].b;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
```

### InstancedMesh (High Performance)

Render thousands of identical geometries with different transforms efficiently:

```javascript
const mesh = new THREE.InstancedMesh(geometry, material, count);
const matrix = new THREE.Matrix4();

for (let i = 0; i < count; i++) {
  matrix.setPosition(data[i].x, data[i].y, data[i].z);
  mesh.setMatrixAt(i, matrix);
  mesh.setColorAt(i, new THREE.Color(data[i].color));
}
mesh.instanceMatrix.needsUpdate = true;
```

---

## 4. Materials

Materials define the surface appearance of geometries.

### Material Types

| Material | Description | Performance |
|---|---|---|
| `MeshBasicMaterial` | Flat color, unaffected by lights | Fastest |
| `MeshLambertMaterial` | Diffuse (matte) shading | Fast |
| `MeshPhongMaterial` | Specular highlights (plastic-like) | Medium |
| `MeshStandardMaterial` | Physically based (PBR) with metalness/roughness | Slower |
| `MeshPhysicalMaterial` | Extended PBR: clearcoat, transmission, sheen | Slowest |
| `MeshToonMaterial` | Cel-shading / cartoon look | Medium |
| `MeshNormalMaterial` | Colors based on surface normals (debug) | Fast |
| `MeshDepthMaterial` | Colors based on depth (for shadow maps) | Fast |
| `LineBasicMaterial` | For Line objects | Fast |
| `LineDashedMaterial` | Dashed lines | Fast |
| `PointsMaterial` | For particle systems (Points objects) | Fast |
| `SpriteMaterial` | For billboard sprites | Fast |
| `ShaderMaterial` | Custom GLSL vertex/fragment shaders | Varies |
| `RawShaderMaterial` | Full custom shaders (no Three.js uniforms) | Varies |

### Common Material Properties

```javascript
const material = new THREE.MeshStandardMaterial({
  color: 0x4488cc,             // Base color
  metalness: 0.3,              // 0 = dielectric, 1 = metal
  roughness: 0.7,              // 0 = mirror, 1 = rough
  emissive: 0x112244,          // Self-illumination color
  emissiveIntensity: 0.5,
  transparent: true,           // Enable transparency
  opacity: 0.8,                // 0 = invisible, 1 = opaque
  side: THREE.DoubleSide,      // Render both sides of faces
  wireframe: false,            // Wireframe mode
  flatShading: false,          // Flat vs smooth shading
  vertexColors: true,          // Use per-vertex colors from geometry
  depthWrite: true,            // Write to depth buffer
  depthTest: true,             // Test against depth buffer
  blending: THREE.NormalBlending
});
```

### Texture Maps

```javascript
const textureLoader = new THREE.TextureLoader();
const material = new THREE.MeshStandardMaterial({
  map: textureLoader.load('diffuse.jpg'),          // Color/albedo texture
  normalMap: textureLoader.load('normal.jpg'),      // Surface detail
  roughnessMap: textureLoader.load('roughness.jpg'),
  metalnessMap: textureLoader.load('metalness.jpg'),
  aoMap: textureLoader.load('ao.jpg'),              // Ambient occlusion
  envMap: cubeTexture,                               // Environment reflection
  displacementMap: textureLoader.load('height.jpg'), // Vertex displacement
  alphaMap: textureLoader.load('alpha.jpg'),         // Transparency map
});
```

---

## 5. Lighting

Lights illuminate the scene and are essential for any material beyond `MeshBasicMaterial`.

### Light Types

| Light | Description | Shadows | Cost |
|---|---|---|---|
| `AmbientLight` | Uniform light in all directions (no shadows) | No | Cheapest |
| `DirectionalLight` | Parallel rays from infinite distance (sun) | Yes | Medium |
| `PointLight` | Radiates from a point in all directions (bulb) | Yes | Medium |
| `SpotLight` | Cone of light from a point (flashlight) | Yes | Higher |
| `HemisphereLight` | Sky + ground gradient light | No | Cheap |
| `RectAreaLight` | Rectangular area light (window, screen) | No | Higher |

### Light Setup Examples

```javascript
// Ambient fill
const ambient = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambient);

// Key light (directional)
const directional = new THREE.DirectionalLight(0xffffff, 1.0);
directional.position.set(5, 10, 7);
directional.castShadow = true;
directional.shadow.mapSize.width = 2048;
directional.shadow.mapSize.height = 2048;
directional.shadow.camera.near = 0.5;
directional.shadow.camera.far = 50;
scene.add(directional);

// Point light
const point = new THREE.PointLight(0xff6600, 1.0, 100);
point.position.set(0, 5, 0);
point.castShadow = true;
scene.add(point);

// Hemisphere (sky/ground)
const hemi = new THREE.HemisphereLight(0x87ceeb, 0x362d1b, 0.6);
scene.add(hemi);
```

### Environment Maps for Lighting

```javascript
// HDR environment map for image-based lighting (IBL)
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

new RGBELoader().load('environment.hdr', (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;    // All PBR materials use this for lighting
  scene.background = texture;     // Optional: use as background
});
```

---

## 6. Animation Loop

Three.js uses a render loop pattern driven by `requestAnimationFrame`.

### Basic Animation Loop

```javascript
function animate() {
  requestAnimationFrame(animate);

  // Update objects
  mesh.rotation.y += 0.01;
  mesh.position.x = Math.sin(Date.now() * 0.001) * 5;

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);
}
animate();
```

### Clock-Based Animation (Frame-Rate Independent)

```javascript
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();       // Time since last frame (seconds)
  const elapsed = clock.getElapsedTime(); // Total elapsed time

  // Frame-rate independent rotation
  mesh.rotation.y += delta * 0.5;       // 0.5 radians per second

  // Smooth oscillation
  mesh.position.y = Math.sin(elapsed * 2) * 3;

  renderer.render(scene, camera);
}
```

### Animation with GSAP (GreenSock)

For complex, timeline-based animations:

```javascript
import gsap from 'gsap';

gsap.to(mesh.position, {
  x: 5, y: 2, z: -3,
  duration: 2,
  ease: "power2.inOut",
  onUpdate: () => renderer.render(scene, camera)
});

gsap.to(mesh.material, {
  opacity: 0,
  duration: 1,
  delay: 1
});
```

### AnimationMixer (For Model Animations)

```javascript
const mixer = new THREE.AnimationMixer(model);
const action = mixer.clipAction(model.animations[0]);
action.play();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  mixer.update(delta);
  renderer.render(scene, camera);
}
```

---

## 7. OrbitControls

OrbitControls enables mouse/touch interaction to orbit, zoom, and pan around a target point.

### Setup

```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;         // Smooth inertia
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.enableRotate = true;
controls.autoRotate = false;           // Auto-rotation
controls.autoRotateSpeed = 2.0;
controls.minDistance = 2;              // Minimum zoom distance
controls.maxDistance = 50;             // Maximum zoom distance
controls.minPolarAngle = 0;           // Min vertical angle (radians)
controls.maxPolarAngle = Math.PI / 2; // Max vertical angle (don't go below ground)
controls.target.set(0, 0, 0);         // Look-at target

// Must call update() in animation loop when damping is enabled
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
```

### Other Control Types

| Control | Description |
|---|---|
| `OrbitControls` | Orbit around a target point |
| `TrackballControls` | Free rotation without gimbal lock |
| `FlyControls` | Flight simulator-style movement |
| `FirstPersonControls` | FPS-style camera |
| `PointerLockControls` | Mouse-locked FPS movement |
| `MapControls` | Map-style pan/zoom (OrbitControls variant) |
| `ArcballControls` | Arcball rotation interface |
| `DragControls` | Drag individual objects |
| `TransformControls` | Translate/rotate/scale gizmo |

---

## 8. Responsive Design

Handle window resizing:

```javascript
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
```

---

## 9. Post-Processing

Three.js supports multi-pass rendering for visual effects:

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,    // Bloom strength
  0.4,    // Bloom radius
  0.85    // Bloom threshold
));
composer.addPass(new SMAAPass());

// In animation loop: replace renderer.render() with:
composer.render();
```

### Common Post-Processing Effects

| Effect | Description |
|---|---|
| `UnrealBloomPass` | Glow/bloom effect |
| `SMAAPass` / `FXAAPass` | Anti-aliasing |
| `BokehPass` | Depth of field blur |
| `SSAOPass` | Screen-space ambient occlusion |
| `OutlinePass` | Object outline highlighting |
| `GlitchPass` | Glitch/distortion effect |
| `FilmPass` | Film grain and scanlines |
| `DotScreenPass` | Dot screen pattern |
| `ShaderPass` | Custom shader effect |

---

## 10. Raycasting (Object Picking)

Detect which 3D objects the mouse is hovering over or clicking:

```javascript
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    const point = intersects[0].point;
    const face = intersects[0].face;
    // Handle selection
  }
});
```

---

## 11. Key Considerations for the Visualization Compiler

- **3D data visualization**: Three.js excels for 3D scatter plots, network graphs, terrain/surface plots, globe visualizations, and volumetric rendering.
- **Performance tiers**: Use `InstancedMesh` for large datasets (10K-1M objects), `Points` with `PointsMaterial` for point clouds, and `BufferGeometry` for custom shapes.
- **Emotional adaptation**: Lighting warmth (color temperature), fog density, bloom intensity, camera distance, rotation speed, and material properties (roughness, metalness, emissive glow) can all convey emotional states.
- **Safe generation**: Three.js requires JavaScript execution. For safe declarative specs, consider generating serializable scene descriptions that a trusted renderer interprets, rather than raw JS code.
- **WebGPU future**: Three.js is transitioning to WebGPU support via `WebGPURenderer`, enabling compute shaders and better performance for large-scale data visualization.
- **Integration with D3**: D3 scales and data processing can be used to map data to Three.js object properties (position, color, size).
