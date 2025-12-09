import type { ICargoItem, IPackingContext, IVector3, IDimensions, IPlacedItem } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';

interface CornerPoint {
  position: IVector3;
  score: number;
}

interface OrientationOption {
  dimensions: IDimensions;
  rotation: number;
  orientation: 'vertical' | 'horizontal';
}

export class RollStrategy implements IPackingStrategy {
  /**
   * Finds the best position for a roll item using a Corner Point strategy.
   * Tries to minimize wasted space while respecting physical constraints.
   */
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; orientation: string; dimensions: IDimensions } | null {
    const { container, placedItems } = context;
    
    // Determine roll dimensions
    let rollDiameter = 0;
    let rollLength = 0;

    if (item.rollDimensions) {
      rollDiameter = item.rollDimensions.diameter;
      rollLength = item.rollDimensions.length;
    } else if (item.dimensions) {
      // Fallback: use dimensions if specific roll dimensions are missing
      // Assuming smallest dimension is diameter, height is length
      rollDiameter = Math.min(item.dimensions.length, item.dimensions.width);
      rollLength = item.dimensions.height;
    } else {
      return null;
    }

    // Adjust for palletized items
    if (item.palletDimensions) {
        // If palletized, the effective height includes the pallet.
        const totalHeight = rollLength + item.palletDimensions.height;
        // Palletized rolls typically require the base dimensions of the pallet
        rollDiameter = Math.max(item.palletDimensions.length, item.palletDimensions.width); 
        rollLength = totalHeight; 
    }

    // Get all valid orientations for this item
    const orientations = this.getOrientations(rollDiameter, rollLength, item.isPalletized);

    // Generate candidate placement points based on existing items and container boundaries
    const cornerPoints = this.generateCornerPoints(placedItems, container.dimensions);

    // Search for the best position
    // Strategy: Evaluate points with the lowest score (closest to origin/bottom) first.
    // At each point, try vertical orientation first to build stable columns, then horizontal.
    
    for (const corner of cornerPoints) {
      for (const orient of orientations) {
        if (this.canPlaceAt(item, corner.position, orient, context)) {
          return {
            position: corner.position,
            rotation: orient.rotation,
            orientation: orient.orientation,
            dimensions: orient.dimensions
          };
        }
      }
    }

    return null;
  }

  /**
   * Defines possible orientations for a roll:
   * 1. Vertical (standing on end)
   * 2. Horizontal (lying on side, along X or Z axis)
   */
  private getOrientations(diameter: number, length: number, isPalletized?: boolean): OrientationOption[] {
    const options: OrientationOption[] = [];

    // 1. VERTICAL - Diameter is base, Length is height
    options.push({
      dimensions: { length: diameter, width: diameter, height: length },
      rotation: 0,
      orientation: 'vertical'
    });

    // If not palletized, it can also be placed horizontally.
    // Palletized items usually must stay upright.
    if (!isPalletized) {
      // 2. HORIZONTAL - Parallel to X axis
      options.push({
        dimensions: { length: length, width: diameter, height: diameter },
        rotation: 0,
        orientation: 'horizontal'
      });

      // 3. HORIZONTAL - Parallel to Z axis (Rotated 90 degrees)
      options.push({
        dimensions: { length: diameter, width: length, height: diameter },
        rotation: 90,
        orientation: 'horizontal'
      });
    }

    // Note: Vertical is pushed first to prioritize vertical stacking (creating columns),
    // which facilitates the "Horizontal on Vertical" rule later.
    return options;
  }

  /**
   * Generates a list of potential placement coordinates (Corner Points) 
   * based on the container origin and the corners of already placed items.
   */
  private generateCornerPoints(placedItems: IPlacedItem[], containerDims: IDimensions): CornerPoint[] {
    const corners: CornerPoint[] = [];
    
    // Always consider the origin (0,0,0)
    const pointSet = new Set<string>();
    pointSet.add('0.00,0.00,0.00');
    corners.push({ position: { x: 0, y: 0, z: 0 }, score: 0 });

    for (const item of placedItems) {
      const pos = item.position;
      const dims = item.dimensions;

      // Generate points at the Right, Back, and Top faces of existing items
      const candidatePoints = [
        { x: pos.x + dims.length, y: pos.y, z: pos.z }, // Right of item
        { x: pos.x, y: pos.y, z: pos.z + dims.width }, // Behind item
        { x: pos.x, y: pos.y + dims.height, z: pos.z }, // On top of item
        
        // Compound corners (e.g., placing in the nook created by an item)
        { x: pos.x + dims.length, y: pos.y, z: pos.z + dims.width }, 
        { x: pos.x, y: pos.y + dims.height, z: pos.z }, 
      ];

      for (const p of candidatePoints) {
        // Filter points outside container
        // Using a small epsilon for float comparison safety if needed, but direct comparison is usually OK for generation
        if (p.x <= containerDims.length && p.y <= containerDims.height && p.z <= containerDims.width) {
          const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
          if (!pointSet.has(key)) {
            pointSet.add(key);
            
            // Scoring logic:
            // Prioritize low Y (gravity), then low X (back), then low Z (left).
            // Y is weighted heavily to ensure layers are filled from bottom up.
            const score = (p.y * 1000000) + (p.x * 1000) + p.z;
            corners.push({ position: p, score });
          }
        }
      }
    }

    // Sort by score ascending (Best points first)
    return corners.sort((a, b) => a.score - b.score);
  }

  /**
   * Validates if an item can be placed at a specific position with a specific orientation.
   */
  canPlaceAt(
    item: ICargoItem, 
    pos: IVector3, 
    orient: OrientationOption | IDimensions, // Supports both interface and raw dimensions
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;
    
    // Normalize inputs
    let dimensions: IDimensions;
    let orientationType: string = 'horizontal'; // Default fallback

    if ('orientation' in orient) {
      dimensions = orient.dimensions;
      orientationType = orient.orientation;
    } else {
      dimensions = orient as IDimensions;
    }

    // 1. Boundary Check
    if (!GeometryUtils.isWithinBounds(pos, dimensions, container.dimensions)) {
      return false;
    }

    // 2. Intersection Check (No overlapping)
    for (const other of placedItems) {
      if (GeometryUtils.checkIntersection(pos, dimensions, other.position, other.dimensions)) {
        return false;
      }
    }

    // 3. Stacking & Support Rules
    if (pos.y > 0.01) {
      // Find items directly below this position
      const supportingItems = this.getSupportingItems(pos, dimensions, placedItems);
      
      // Rule: Must be supported (cannot float)
      if (!this.hasSufficientSupport(pos, dimensions, supportingItems)) {
        return false;
      }

      // RULE: You cannot place Vertical on top of Horizontal.
      // (You CAN place Horizontal on top of Vertical).
      if (orientationType === 'vertical') {
        for (const support of supportingItems) {
          // If the item below is Horizontal, we cannot place a Vertical item on it.
          // We check the 'orientation' property of the placed item.
          // Note: BoxStrategy items might not have 'orientation' property set explicitly 
          // or it might be 'horizontal' by default.
          if (support.orientation === 'horizontal') {
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Identifies items that are directly below the potential placement area.
   */
  private getSupportingItems(pos: IVector3, dims: IDimensions, placedItems: IPlacedItem[]): IPlacedItem[] {
    const supports: IPlacedItem[] = [];
    const epsilon = 0.01;
    const bottomY = pos.y;

    for (const item of placedItems) {
      const itemTop = item.position.y + item.dimensions.height;
      
      // Check if the other item's top surface is at the same level as our bottom
      if (Math.abs(itemTop - bottomY) < epsilon) {
        // Check for intersection in the X-Z plane (2D overlap)
        if (GeometryUtils.checkIntersection(
          { x: pos.x, y: 0, z: pos.z }, 
          { ...dims, height: 1 }, // Ignore height for 2D check
          { x: item.position.x, y: 0, z: item.position.z },
          { ...item.dimensions, height: 1 }
        )) {
          supports.push(item);
        }
      }
    }
    return supports;
  }

  /**
   * Calculates if the supporting items provide enough surface area.
   */
  private hasSufficientSupport(pos: IVector3, dims: IDimensions, supportingItems: IPlacedItem[]): boolean {
    if (supportingItems.length === 0) return false;

    // Requirement: At least 60% of the base area must be supported
    const requiredRatio = 0.60;
    const itemArea = dims.length * dims.width;
    let supportedArea = 0;

    for (const support of supportingItems) {
      // Calculate intersection area in X-Z plane
      const overlapX = Math.max(0, 
        Math.min(pos.x + dims.length, support.position.x + support.dimensions.length) - 
        Math.max(pos.x, support.position.x)
      );
      
      const overlapZ = Math.max(0, 
        Math.min(pos.z + dims.width, support.position.z + support.dimensions.width) - 
        Math.max(pos.z, support.position.z)
      );

      supportedArea += overlapX * overlapZ;
    }

    return (supportedArea / itemArea) >= requiredRatio;
  }
}
