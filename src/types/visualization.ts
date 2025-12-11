/**
 * Visualization Types for Load3D
 * Comprehensive type definitions for 3D visualization, rendering, and scene management
 * 
 * @file src/types/visualization.ts
 * @created 2025-12-11 14:31:10 UTC
 */

/**
 * Represents a 3D vector in 3D space
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents a color in RGBA format
 */
export interface Color {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a?: number; // 0-1, defaults to 1
}

/**
 * Represents a 2D vector/point
 */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Physical material properties for rendering
 */
export interface Material {
  id: string;
  name: string;
  color: Color;
  metallic: number; // 0-1
  roughness: number; // 0-1
  emissive?: Color;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number; // 0-1
  doubleSide?: boolean;
  wireframe?: boolean;
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  aoMap?: string;
  envMap?: string;
}

/**
 * Geometric data structure
 */
export interface Geometry {
  id: string;
  vertices: Vector3D[];
  faces: number[][]; // Arrays of vertex indices forming triangles
  normals?: Vector3D[];
  tangents?: Vector3D[];
  bitangents?: Vector3D[];
  uvs?: Vector2D[];
  colors?: Color[];
  boundingBox?: BoundingBox;
}

/**
 * Axis-aligned bounding box
 */
export interface BoundingBox {
  min: Vector3D;
  max: Vector3D;
}

/**
 * 3D Mesh combining geometry and material
 */
export interface Mesh {
  id: string;
  name: string;
  geometry: Geometry;
  material: Material;
  position: Vector3D;
  rotation: Vector3D; // Euler angles in radians
  scale: Vector3D;
  visible: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  parent?: string; // Parent mesh ID for hierarchical structures
  children?: string[]; // Child mesh IDs
}

/**
 * Camera configuration for scene viewing
 */
export interface Camera {
  id: string;
  type: 'perspective' | 'orthographic';
  position: Vector3D;
  target: Vector3D; // Look-at point
  up?: Vector3D; // Up vector, defaults to (0, 1, 0)
  fov?: number; // Field of view in degrees (perspective only)
  near?: number; // Near clipping plane
  far?: number; // Far clipping plane
  zoom?: number; // Zoom level (orthographic only)
  aspect?: number; // Aspect ratio
  isActive: boolean;
}

/**
 * Light source in the scene
 */
export interface Light {
  id: string;
  type: 'ambient' | 'directional' | 'point' | 'spot';
  color: Color;
  intensity: number;
  position?: Vector3D; // For point and spot lights
  target?: Vector3D; // For directional and spot lights
  distance?: number; // Maximum distance for point light
  decay?: number; // Decay rate for point and spot lights
  angle?: number; // Cone angle for spot light (radians)
  penumbra?: number; // Penumbra of spot light (0-1)
  shadow?: {
    enabled: boolean;
    mapSize: number;
    bias: number;
    radius: number;
    camera?: Camera;
  };
}

/**
 * 3D Scene containing meshes, lights, and cameras
 */
export interface Scene {
  id: string;
  name: string;
  meshes: Mesh[];
  lights: Light[];
  cameras: Camera[];
  activeCamera: string; // Camera ID
  background?: Color;
  fog?: {
    type: 'linear' | 'exponential';
    color: Color;
    near?: number;
    far?: number;
    density?: number;
  };
  gravity?: Vector3D;
  metadata?: Record<string, any>;
}

/**
 * Visualization and rendering configuration
 */
export interface VisualizationConfig {
  renderingMode: 'webgl' | 'webgpu' | 'canvas2d';
  antialiasing: boolean;
  shadowMap: boolean;
  shadowMapResolution: 1024 | 2048 | 4096;
  shadowMapBias: number;
  shadowMapRadius: number;
  ambientOcclusion?: boolean;
  ambientOcclusionIntensity?: number;
  bloomEffect?: boolean;
  bloomIntensity?: number;
  bloomThreshold?: number;
  toneMappingExposure?: number;
  pixelRatio?: number;
  maxPixelRatio?: number;
  preserveDrawingBuffer?: boolean;
  logarithmicDepthBuffer?: boolean;
}

/**
 * Statistics about rendering performance
 */
export interface RenderingStatistics {
  fps: number;
  frameTime: number; // milliseconds
  meshCount: number;
  triangleCount: number;
  drawCalls: number;
  memory: {
    geometryMemory: number; // bytes
    textureMemory: number; // bytes
    total: number; // bytes
  };
  gpuCapabilities: {
    maxTextureSize: number;
    maxRenderbufferSize: number;
    extensions: string[];
  };
}

/**
 * Animation frame keyframe
 */
export interface Keyframe {
  time: number; // Time in seconds
  value: Vector3D | number | Color;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'custom';
  easingFunction?: (t: number) => number;
}

/**
 * Animation track for a specific property
 */
export interface AnimationTrack {
  targetId: string; // Mesh or Light ID
  property: 'position' | 'rotation' | 'scale' | 'color' | 'intensity' | 'opacity';
  keyframes: Keyframe[];
}

/**
 * Animation clip containing multiple tracks
 */
export interface AnimationClip {
  id: string;
  name: string;
  duration: number; // seconds
  fps: number;
  tracks: AnimationTrack[];
  loop?: boolean;
  loopCount?: number;
  autoPlay?: boolean;
}

/**
 * Post-processing effect
 */
export interface PostProcessingEffect {
  id: string;
  type: 'blur' | 'bloom' | 'chromatic-aberration' | 'depth-of-field' | 'vignette' | 'color-correction' | 'glitch' | 'custom';
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
  renderOrder?: number;
}

/**
 * UI Overlay element for scene annotations
 */
export interface UIOverlay {
  id: string;
  type: 'label' | 'marker' | 'annotation' | 'custom';
  position: Vector3D; // World position
  screenPosition?: Vector2D; // Optional screen position override
  content: string;
  style?: {
    color: Color;
    backgroundColor?: Color;
    fontSize?: number;
    fontFamily?: string;
    opacity?: number;
    borderRadius?: number;
  };
  targetMesh?: string; // Optional mesh ID to follow
  visible: boolean;
}

/**
 * User interaction event
 */
export interface InteractionEvent {
  type: 'click' | 'hover' | 'drag' | 'zoom' | 'rotate' | 'pan' | 'custom';
  targetId?: string; // Mesh or Light ID
  position: Vector2D; // Screen coordinates
  worldPosition?: Vector3D; // 3D world position
  delta?: Vector2D; // Movement delta for drag events
  timestamp: number; // Milliseconds since epoch
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/**
 * Rendering options for a render pass
 */
export interface RenderOptions {
  width: number;
  height: number;
  outputTarget?: 'screen' | 'texture' | 'cubemap';
  clear?: {
    color: boolean;
    depth: boolean;
    stencil: boolean;
  };
  viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  depthTest?: boolean;
  depthWrite?: boolean;
  blending?: 'normal' | 'additive' | 'subtractive' | 'multiply';
  colorWrite?: boolean;
}

/**
 * Snapshot of the current scene state
 */
export interface SceneSnapshot {
  id: string;
  timestamp: number; // Milliseconds since epoch
  sceneName: string;
  cameraState: Camera;
  meshTransforms: Array<{
    meshId: string;
    position: Vector3D;
    rotation: Vector3D;
    scale: Vector3D;
  }>;
  lightStates: Array<{
    lightId: string;
    color: Color;
    intensity: number;
    position?: Vector3D;
  }>;
  activeAnimations: string[]; // Animation clip IDs
  metadata?: Record<string, any>;
}

/**
 * Preset lighting configuration
 */
export interface LightingPreset {
  id: string;
  name: string;
  description?: string;
  lights: Light[];
  ambientColor?: Color;
  skyColor?: Color;
  groundColor?: Color;
  shadowQuality: 'low' | 'medium' | 'high';
  exposure?: number;
  metadata?: Record<string, any>;
}

/**
 * Complete visualization state
 */
export interface VisualizationState {
  scene: Scene;
  config: VisualizationConfig;
  renderOptions: RenderOptions;
  statistics?: RenderingStatistics;
  activeAnimations: AnimationClip[];
  postProcessingEffects: PostProcessingEffect[];
  uiOverlays: UIOverlay[];
  snapshots: SceneSnapshot[];
  lightingPreset?: LightingPreset;
}

/**
 * Export options for scene serialization
 */
export interface ExportOptions {
  format: 'gltf' | 'glb' | 'usdz' | 'obj' | 'fbx' | 'json';
  includeAnimations?: boolean;
  includeTextures?: boolean;
  includeMetadata?: boolean;
  compressed?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Import options for scene deserialization
 */
export interface ImportOptions {
  format: 'gltf' | 'glb' | 'usdz' | 'obj' | 'fbx' | 'json';
  preserveHierarchy?: boolean;
  loadAnimations?: boolean;
  loadTextures?: boolean;
  centerModel?: boolean;
  autoScale?: boolean;
}
