/**
 * TypeScript interfaces for pallet and palletization types
 * Defines data structures for representing pallets and palletization operations
 */

/**
 * Physical dimensions of a pallet or item
 */
export interface Dimensions {
  length: number; // mm
  width: number; // mm
  height: number; // mm
}

/**
 * Physical properties of a pallet
 */
export interface PalletProperties {
  weight: number; // kg
  maxWeight: number; // kg - maximum load capacity
  material: 'wood' | 'plastic' | 'metal' | 'cardboard';
  stackable: boolean;
  topOverhang: number; // mm
  bottomOverhang: number; // mm
}

/**
 * Represents a pallet with its specifications
 */
export interface Pallet {
  id: string;
  name: string;
  dimensions: Dimensions;
  properties: PalletProperties;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Physical properties of an item to be palletized
 */
export interface ItemProperties {
  weight: number; // kg
  fragile: boolean;
  stackable: boolean;
  orientation?: 'upright' | 'sideways' | 'stacked';
  handlingRequirements?: string[];
}

/**
 * Represents an item to be palletized
 */
export interface PalletizationItem {
  id: string;
  name: string;
  sku: string;
  dimensions: Dimensions;
  properties: ItemProperties;
  quantity: number;
  description?: string;
}

/**
 * Represents a single item placement on a pallet
 */
export interface PlacedItem {
  itemId: string;
  position: Position3D;
  rotation: Rotation3D;
  quantity: number;
  weight: number; // Total weight of this placement
}

/**
 * 3D position coordinates
 */
export interface Position3D {
  x: number; // mm
  y: number; // mm
  z: number; // mm
}

/**
 * 3D rotation angles (Euler angles)
 */
export interface Rotation3D {
  x: number; // degrees
  y: number; // degrees
  z: number; // degrees
}

/**
 * Packing layer information
 */
export interface PackingLayer {
  id: string;
  layerNumber: number;
  height: number; // mm from pallet bottom
  items: PlacedItem[];
  totalWeight: number; // kg
  utilization: number; // percentage
}

/**
 * Stability analysis results
 */
export interface StabilityAnalysis {
  isStable: boolean;
  centerOfGravity: Position3D;
  tiltingRisk: 'low' | 'medium' | 'high';
  supportArea: number; // mm²
  issues: string[];
}

/**
 * Palletization result/plan
 */
export interface PalletizationResult {
  id: string;
  palletId: string;
  items: PalletizationItem[];
  layers: PackingLayer[];
  totalWeight: number; // kg
  totalHeight: number; // mm
  volumeUtilization: number; // percentage
  weightDistribution: number; // percentage of max weight
  stability: StabilityAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Palletization configuration and constraints
 */
export interface PalletizationConfig {
  palletId: string;
  items: PalletizationItem[];
  maxStackHeight: number; // mm
  minStackHeight?: number; // mm
  allowStacking: boolean;
  allowRotation: boolean;
  allowSplitting: boolean; // Allow items to be split across pallets
  allowMixedItems: boolean;
  minimumStability: 'low' | 'medium' | 'high';
  loadPattern?: 'layer' | 'interlocking' | 'optimal';
}

/**
 * Palletization algorithm options
 */
export interface PalletizationOptions {
  algorithm: 'greedy' | 'genetic' | 'simulated-annealing' | 'brute-force';
  maxIterations?: number;
  timeoutMs?: number;
  optimizeFor: 'space' | 'stability' | 'weight-distribution' | 'balanced';
  debug?: boolean;
}

/**
 * Palletization report
 */
export interface PalletizationReport {
  palletizationId: string;
  palletName: string;
  itemCount: number;
  totalItemWeight: number; // kg
  palletWeight: number; // kg
  totalWeight: number; // kg
  maxWeightExceeded: boolean;
  layerCount: number;
  totalHeight: number; // mm
  volumeUtilization: number; // percentage
  weightDistribution: number; // percentage of max weight
  stabilityScore: number; // 0-100
  issues: PalletizationIssue[];
  warnings: string[];
  timestamp: Date;
}

/**
 * Issue detected during palletization
 */
export interface PalletizationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  affectedItems?: string[];
  suggestion?: string;
}

/**
 * Pallet configuration preset
 */
export interface PalletPreset {
  id: string;
  name: string;
  description: string;
  defaultPallet: Pallet;
  defaultConfig: Partial<PalletizationConfig>;
  defaultOptions: Partial<PalletizationOptions>;
}
