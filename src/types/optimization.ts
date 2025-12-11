/**
 * Type definitions for optimization algorithms and packing operations
 * Includes interfaces for item placement, space management, and optimization configuration
 */

/**
 * Represents a successfully placed item in the container
 */
export interface PlacedItem {
  id: string;
  originalIndex: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  weight: number;
  layer: number;
  packingSequence: number;
}

/**
 * Represents an empty space available in the container
 */
export interface EmptySpace {
  id: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  volume: number;
  accessibility: 'high' | 'medium' | 'low';
}

/**
 * Represents an item that could not be loaded
 */
export interface UnloadedItem {
  id: string;
  originalIndex: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  reason: 'insufficient_space' | 'weight_limit_exceeded' | 'dimension_mismatch' | 'constraint_violation' | 'unknown';
}

/**
 * Represents a suggested placement for an item
 */
export interface FitSuggestion {
  itemId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  confidence: number;
  emptySpaceId: string;
  orientations: Array<{
    rotation: { x: number; y: number; z: number };
    score: number;
  }>;
}

/**
 * Represents the result of an optimization operation
 */
export interface OptimizationResult {
  success: boolean;
  placedItems: PlacedItem[];
  unloadedItems: UnloadedItem[];
  emptySpaces: EmptySpace[];
  totalVolume: number;
  usedVolume: number;
  volumeUtilization: number;
  totalWeight: number;
  weightUtilization: number;
  loadingSequence: string[];
  totalLayers: number;
  packingDensity: number;
  executionTime: number;
  algorithm: string;
  timestamp: Date;
}

/**
 * Configuration options for optimization algorithms
 */
export interface OptimizationConfig {
  algorithm: 'guillotine' | 'maxrects' | 'genetic' | 'simulated_annealing' | 'greedy';
  heuristic: 'best_fit' | 'first_fit' | 'worst_fit' | 'best_area_fit' | 'best_short_side_fit' | 'best_long_side_fit';
  rotationAllowed: boolean;
  rotationPriority: 'all' | 'xy_plane_only' | 'vertical_only';
  maxIterations: number;
  timeLimit: number;
  targetUtilization: number;
  prioritizeWeight: boolean;
  prioritizeSequence: boolean;
}

/**
 * Loading constraints for items and containers
 */
export interface LoadingConstraints {
  maxTotalWeight: number;
  maxItemWeight: number;
  maxWeightPerLayer: number;
  maxLayers: number;
  minStackingHeight: number;
  stackingTolerance: number;
  fragility: 'fragile' | 'normal' | 'robust';
  supportRequirement: 'full' | 'partial' | 'none';
  orientation: 'any' | 'upright' | 'flat';
}

/**
 * Packing options and preferences
 */
export interface PackingOptions {
  containerDimensions: {
    length: number;
    width: number;
    height: number;
  };
  containerVolume: number;
  containerWeight: number;
  containerMaxWeight: number;
  constraints: LoadingConstraints;
  itemPriority: 'volume' | 'weight' | 'value' | 'sequence';
  allowOverhang: boolean;
  enableCompartments: boolean;
  compartmentSize: {
    length: number;
    width: number;
    height: number;
  } | null;
  padding: {
    x: number;
    y: number;
    z: number;
  };
}

/**
 * Request for batch optimization of multiple containers or configurations
 */
export interface BatchOptimizationRequest {
  requestId: string;
  items: Array<{
    id: string;
    dimensions: { length: number; width: number; height: number };
    weight: number;
    quantity: number;
    priority: number;
    value?: number;
  }>;
  containers: PackingOptions[];
  config: OptimizationConfig;
  constraints: LoadingConstraints;
  timestamp: Date;
}

/**
 * Result of batch optimization
 */
export interface BatchOptimizationResult {
  requestId: string;
  results: OptimizationResult[];
  totalContainersNeeded: number;
  totalItemsProcessed: number;
  totalItemsLoaded: number;
  totalUnloadedItems: number;
  overallUtilization: number;
  overallCost: number;
  processingTime: number;
  completedAt: Date;
}

/**
 * Represents a packing layer within a container
 */
export interface PackingLayer {
  layerIndex: number;
  height: number;
  maxHeight: number;
  itemsInLayer: PlacedItem[];
  totalWeight: number;
  maxWeight: number;
  volumeUsed: number;
  volumeAvailable: number;
  utilization: number;
  stable: boolean;
  supportSurface: 'floor' | 'items' | 'mixed';
}

/**
 * Statistics for optimization operations
 */
export interface OptimizationStatistics {
  totalItemsProcessed: number;
  totalItemsPlaced: number;
  totalItemsUnloaded: number;
  averageUtilization: number;
  bestUtilization: number;
  worstUtilization: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  totalContainersUsed: number;
  averageItemsPerContainer: number;
  totalVolume: number;
  totalUsedVolume: number;
  totalWeight: number;
  averageWeightPerContainer: number;
  algorithmPreferences: {
    algorithm: string;
    usageCount: number;
    averageUtilization: number;
  }[];
  heuristicPerformance: {
    heuristic: string;
    usageCount: number;
    averageUtilization: number;
  }[];
  timeRange: {
    start: Date;
    end: Date;
  };
}
