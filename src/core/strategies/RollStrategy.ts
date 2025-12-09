import type { ICargoItem, IPackingContext, IVector3, IDimensions, IPlacedItem, RollOrientation } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';

interface CandidatePoint {
  position: IVector3;
  score: number;
  type: 'corner' | 'groove';
}

interface OrientationOption {
  dimensions: IDimensions;
  rotation: number;
  orientation: RollOrientation;
}

export class RollStrategy implements IPackingStrategy {
  
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; orientation: string; dimensions: IDimensions } | null {
    const { container, placedItems } = context;
    
    // 1. Determine Dimensions
    let rollDiameter = 0;
    let rollLength = 0;

    if (item.rollDimensions) {
      rollDiameter = item.rollDimensions.diameter;
      rollLength = item.rollDimensions.length;
    } else if (item.dimensions) {
      rollDiameter = Math.min(item.dimensions.length, item.dimensions.width);
      rollLength = item.dimensions.height;
    } else {
      return null;
    }

    if (item.palletDimensions) {
      const totalHeight = rollLength + item.palletDimensions.height;
      rollDiameter = Math.max(item.palletDimensions.length, item.palletDimensions.width); 
      rollLength = totalHeight; 
    }

    // 2. Get Valid Orientations
    const orientations = this.getOrientations(rollDiameter, rollLength, item.isPalletized);

    // 3. Generate Candidate Points (Corners AND Grooves)
    const candidatePoints = this.generateCandidatePoints(placedItems, container.dimensions, rollDiameter);

    // 4. Find Best Fit
    // Optimization: Store best fit found so far to possibly break early if we want, 
    // but typically we take the first valid one because points are sorted by score.
    for (const point of candidatePoints) {
      for (const orient of orientations) {
        
        if (this.canPlaceAt(item, point.position, orient, context)) {
           return {
             position: point.position,
             rotation: orient.rotation,
             orientation: orient.orientation,
             dimensions: orient.dimensions
           };
        }
      }
    }

    return null;
  }

  private getOrientations(diameter: number, length: number, isPalletized?: boolean): OrientationOption[] {
    const options: OrientationOption[] = [];

    // Vertical
    options.push({
      dimensions: { length: diameter, width: diameter, height: length },
      rotation: 0,
      orientation: 'vertical'
    });

    if (!isPalletized) {
      // Horizontal X-Axis (Length along X)
      options.push({
        dimensions: { length: length, width: diameter, height: diameter },
        rotation: 0,
        orientation: 'horizontal'
      });

      // Horizontal Z-Axis (Length along Z - Rotated 90)
      options.push({
        dimensions: { length: diameter, width: length, height: diameter },
        rotation: 90,
        orientation: 'horizontal'
      });
    }

    return options;
  }

  private generateCandidatePoints(
    placedItems: IPlacedItem[], 
    containerDims: IDimensions,
    currentDiameter: number
  ): CandidatePoint[] {
    const points: CandidatePoint[] = [];
    const pointSet = new Set<string>();

    const addPoint = (x: number, y: number, z: number, type: 'corner' | 'groove') => {
      // Basic bounds check
      if (x < 0 || y < 0 || z < 0) return;
      if (x > containerDims.length || y > containerDims.height || z > containerDims.width) return;

      const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        // Scoring: Prioritize Y (bottom), then Z (back), then X (left)
        // Groove points get a bonus to encourage tight packing
        let score = (y * 10000) + (z * 100) + x;
        if (type === 'groove') score -= 50; 
        
        points.push({ position: { x, y, z }, score, type });
      }
    };

    // 1. Origin
    addPoint(0, 0, 0, 'corner');

    // 2. Standard Corners
    for (const item of placedItems) {
      const pos = item.position;
      const dim = item.dimensions;

      addPoint(pos.x + dim.length, pos.y, pos.z, 'corner'); // Right
      addPoint(pos.x, pos.y, pos.z + dim.width, 'corner'); // Back
      addPoint(pos.x, pos.y + dim.height, pos.z, 'corner'); // Top
      
      // Combinations for L-shapes
      addPoint(pos.x + dim.length, pos.y, pos.z + dim.width, 'corner'); 
    }

    // 3. Groove Points (Hexagonal Logic)
    const rolls = placedItems.filter(i => i.item.type === 'roll');
    
    for (let i = 0; i < rolls.length; i++) {
      for (let j = i + 1; j < rolls.length; j++) {
        const r1 = rolls[i];
        const r2 = rolls[j];

        // Only calculate grooves for same-orientation pairs
        if (r1.orientation !== r2.orientation) continue;

        // Radii calculations
        const radius1 = (r1.orientation === 'vertical' ? r1.dimensions.length : r1.dimensions.height) / 2;
        const radius2 = (r2.orientation === 'vertical' ? r2.dimensions.length : r2.dimensions.height) / 2;
        const targetRadius = currentDiameter / 2;

        if (r1.orientation === 'vertical') {
            // Check if they are neighbors on the floor (Y is similar)
            if (Math.abs(r1.position.y - r2.position.y) < 0.1) {
                // Centers in X-Z plane
                const c1 = { x: r1.position.x + radius1, z: r1.position.z + radius1 };
                const c2 = { x: r2.position.x + radius2, z: r2.position.z + radius2 };
                
                const dist = Math.sqrt((c1.x - c2.x)**2 + (c1.z - c2.z)**2);
                
                // If the gap allows nesting
                if (dist < (radius1 + targetRadius + radius2 + targetRadius)) {
                    const intersect = this.calculateCircleIntersection(c1.x, c1.z, radius1 + targetRadius, c2.x, c2.z, radius2 + targetRadius);
                    if (intersect) {
                        // Try both intersection points
                        addPoint(intersect.x1 - targetRadius, r1.position.y, intersect.y1 - targetRadius, 'groove');
                        addPoint(intersect.x2 - targetRadius, r1.position.y, intersect.y2 - targetRadius, 'groove');
                    }
                }
            }
        } 
      }
    }

    return points.sort((a, b) => a.score - b.score);
  }

  private calculateCircleIntersection(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) {
      return null; 
    }

    const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
    const h = Math.sqrt(r0 * r0 - a * a);
    
    const x2 = x0 + a * (dx / d);
    const y2 = y0 + a * (dy / d);

    return {
      x1: x2 + h * (dy / d),
      y1: y2 - h * (dx / d),
      x2: x2 - h * (dy / d),
      y2: y2 + h * (dx / d)
    };
  }

  canPlaceAt(
    item: ICargoItem, 
    pos: IVector3, 
    orient: OrientationOption,
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;
    const dimensions = orient.dimensions;
    const orientationType = orient.orientation;

    // 1. Boundary
    if (!GeometryUtils.isWithinBounds(pos, dimensions, container.dimensions)) {
      return false;
    }

    // 2. Intersection (Using new generic check)
    for (const other of placedItems) {
      if (GeometryUtils.checkIntersection(
          pos, dimensions, 
          other.position, other.dimensions,
          'roll', other.item.type,
          orientationType, other.orientation || 'vertical' 
      )) {
        return false;
      }
    }

    // 3. Support & Stacking Rules
    if (pos.y > 0.01) {
      const supportingItems = this.getSupportingItems(pos, dimensions, placedItems);
      
      if (!this.hasSufficientSupport(pos, dimensions, supportingItems)) {
        return false;
      }

      // Rule: No Vertical on Horizontal
      if (orientationType === 'vertical') {
        for (const support of supportingItems) {
          if (support.item.type === 'roll' && support.orientation === 'horizontal') {
            return false;
          }
        }
      }
    }

    return true;
  }

  private getSupportingItems(pos: IVector3, dims: IDimensions, placedItems: IPlacedItem[]): IPlacedItem[] {
    const supports: IPlacedItem[] = [];
    const epsilon = 0.01;
    const bottomY = pos.y;

    for (const item of placedItems) {
      const itemTop = item.position.y + item.dimensions.height;
      if (Math.abs(itemTop - bottomY) < epsilon) {
          // Simple AABB overlap check for support candidacy
          if (GeometryUtils.checkAABBIntersection(
              { x: pos.x, y: 0, z: pos.z }, { ...dims, height: 1 },
              { x: item.position.x, y: 0, z: item.position.z }, { ...item.dimensions, height: 1 }
          )) {
              supports.push(item);
          }
      }
    }
    return supports;
  }

  private hasSufficientSupport(pos: IVector3, dims: IDimensions, supportingItems: IPlacedItem[]): boolean {
    if (supportingItems.length === 0) return false;
    
    const itemCenter = {
        x: pos.x + dims.length / 2,
        z: pos.z + dims.width / 2
    };

    let centerSupported = false;
    let supportedArea = 0;
    const itemArea = dims.length * dims.width;

    for (const support of supportingItems) {
        // Check if center is within support AABB
        if (itemCenter.x >= support.position.x && itemCenter.x <= support.position.x + support.dimensions.length &&
            itemCenter.z >= support.position.z && itemCenter.z <= support.position.z + support.dimensions.width) {
            centerSupported = true;
        }

        // Area overlap
        const overlapX = Math.max(0, Math.min(pos.x + dims.length, support.position.x + support.dimensions.length) - Math.max(pos.x, support.position.x));
        const overlapZ = Math.max(0, Math.min(pos.z + dims.width, support.position.z + support.dimensions.width) - Math.max(pos.z, support.position.z));
        supportedArea += overlapX * overlapZ;
    }

    // For rolls, allow if center is supported OR >60% area is supported
    return centerSupported || (supportedArea / itemArea) > 0.6;
  }
}
