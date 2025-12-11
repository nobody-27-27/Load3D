/**
 * Container Types and Dimensions
 * Defines interfaces for 3D container specifications and dimensional properties
 */

/**
 * Represents the dimensions of a container
 */
export interface ContainerDimensions {
  /** Length in meters */
  length: number;
  /** Width in meters */
  width: number;
  /** Height in meters */
  height: number;
}

/**
 * Represents weight specifications for a container
 */
export interface ContainerWeight {
  /** Maximum payload weight in kilograms */
  maxPayload: number;
  /** Tare weight (empty container) in kilograms */
  tareWeight: number;
  /** Maximum gross weight in kilograms */
  maxGrossWeight: number;
}

/**
 * Represents capacity information for a container
 */
export interface ContainerCapacity {
  /** Volume in cubic meters */
  volume: number;
  /** Maximum weight capacity in kilograms */
  weightCapacity: number;
  /** Available space percentage (0-100) */
  availableSpace: number;
}

/**
 * Enumeration for standard container types
 */
export enum ContainerType {
  GENERAL_PURPOSE = 'general_purpose',
  HIGH_CUBE = 'high_cube',
  OPEN_TOP = 'open_top',
  FLAT_RACK = 'flat_rack',
  REFRIGERATED = 'refrigerated',
  TANK = 'tank',
  COLLAPSIBLE = 'collapsible',
  PALLETWIDE = 'palletwide',
  CUSTOM = 'custom'
}

/**
 * Enumeration for container size standards
 */
export enum ContainerSize {
  TWENTY_FT = '20ft',
  FORTY_FT = '40ft',
  FORTY_HC_FT = '40hc', // High Cube
  CUSTOM = 'custom'
}

/**
 * Represents the complete container specification
 */
export interface Container {
  /** Unique identifier for the container */
  id: string;
  /** Type of container */
  type: ContainerType;
  /** Standard size classification */
  size: ContainerSize;
  /** Container dimensions */
  dimensions: ContainerDimensions;
  /** Weight specifications */
  weight: ContainerWeight;
  /** Capacity information */
  capacity: ContainerCapacity;
  /** Current load status (0-100 percentage) */
  loadStatus: number;
  /** Indicates if container is available for use */
  isAvailable: boolean;
  /** Container serial number or identifier */
  serialNumber?: string;
  /** Manufacturing date */
  manufacturingDate?: Date;
  /** Last inspection date */
  lastInspectionDate?: Date;
  /** Additional metadata or notes */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a container with its current contents
 */
export interface LoadedContainer extends Container {
  /** Total weight of contents in kilograms */
  contentWeight: number;
  /** Items stored in the container */
  contents: ContainerItem[];
  /** Load timestamp */
  loadedAt: Date;
}

/**
 * Represents an individual item within a container
 */
export interface ContainerItem {
  /** Unique item identifier */
  id: string;
  /** Item name/description */
  name: string;
  /** Weight in kilograms */
  weight: number;
  /** Item dimensions */
  dimensions: ContainerDimensions;
  /** Quantity of items */
  quantity: number;
  /** Item category or type */
  category: string;
  /** Position/coordinates within container [x, y, z] */
  position?: [number, number, number];
}

/**
 * Represents container optimization results
 */
export interface ContainerOptimization {
  /** Container being optimized */
  container: Container;
  /** Proposed item arrangement */
  arrangement: ContainerItem[];
  /** Space utilization percentage */
  spaceUtilization: number;
  /** Weight distribution score (0-100) */
  weightDistribution: number;
  /** Overall optimization score (0-100) */
  optimizationScore: number;
  /** List of warnings or issues */
  warnings: string[];
}

/**
 * Represents container compatibility requirements
 */
export interface ContainerCompatibility {
  /** Container type that is compatible */
  containerType: ContainerType;
  /** Minimum dimension requirements */
  minDimensions?: ContainerDimensions;
  /** Maximum dimension requirements */
  maxDimensions?: ContainerDimensions;
  /** Required features or attributes */
  requiredFeatures?: string[];
  /** Environmental restrictions */
  environmentalRestrictions?: {
    temperatureRange?: [number, number];
    humidityRange?: [number, number];
    requiresVentilation?: boolean;
  };
}
