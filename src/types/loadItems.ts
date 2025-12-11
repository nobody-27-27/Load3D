/**
 * Type definitions for load items (Box and Roll)
 */

/**
 * Represents a Box item in the load
 */
export interface Box {
  /** Unique identifier for the box */
  id: string;
  
  /** Length of the box in centimeters */
  length: number;
  
  /** Width of the box in centimeters */
  width: number;
  
  /** Height of the box in centimeters */
  height: number;
  
  /** Weight of the box in kilograms */
  weight: number;
  
  /** Optional description or label for the box */
  label?: string;
  
  /** Whether the box is fragile (requires careful handling) */
  fragile?: boolean;
}

/**
 * Represents a Roll item in the load
 */
export interface Roll {
  /** Unique identifier for the roll */
  id: string;
  
  /** Diameter of the roll in centimeters */
  diameter: number;
  
  /** Length/width of the roll in centimeters */
  length: number;
  
  /** Weight of the roll in kilograms */
  weight: number;
  
  /** Optional description or label for the roll */
  label?: string;
  
  /** Material type of the roll (e.g., 'fabric', 'paper', 'vinyl') */
  material?: string;
}

/**
 * Union type for any load item
 */
export type LoadItem = Box | Roll;

/**
 * Type guard to check if an item is a Box
 */
export function isBox(item: LoadItem): item is Box {
  return 'length' in item && 'width' in item && 'height' in item;
}

/**
 * Type guard to check if an item is a Roll
 */
export function isRoll(item: LoadItem): item is Roll {
  return 'diameter' in item && !('width' in item);
}
