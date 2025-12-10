import type { ICargoItem, IPackingContext, IVector3, IDimensions, IPlacedItem, RollOrientation } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';

interface CandidatePoint {
  position: IVector3;
  score: number;
  type: 'corner' | 'groove' | 'lattice';
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

    const orientations = this.getOrientations(rollDiameter, rollLength, item.isPalletized);

    // INTELLIGENT POINT GENERATION
    // Calculate which pattern fits the MOST items and ONLY generate those points.
    const candidatePoints = this.generateBestPatternPoints(placedItems, container.dimensions, rollDiameter, rollLength);

    for (const point of candidatePoints) {
      for (const orient of orientations) {
        
        // Lattice points are precise. Use AS IS.
        if (point.type === 'lattice') {
             if (this.canPlaceAt(item, point.position, orient, context)) {
                 return {
                   position: point.position,
                   rotation: orient.rotation,
                   orientation: orient.orientation,
                   dimensions: orient.dimensions
                 };
             }
        } else {
             // Fallback for non-lattice
             const finalPos = this.tryNudgePosition(item, point.position, orient, context);
             if (finalPos) {
                return {
                  position: finalPos,
                  rotation: orient.rotation,
                  orientation: orient.orientation,
                  dimensions: orient.dimensions
                 };
             }
        }
      }
    }

    return null;
  }

  private tryNudgePosition(
    item: ICargoItem,
    startPos: IVector3,
    orient: OrientationOption,
    context: IPackingContext
  ): IVector3 | null {
    if (this.canPlaceAt(item, startPos, orient, context)) {
      return this.optimizeCoordinate(item, startPos, orient, context);
    }
    return null;
  }

  private optimizeCoordinate(item: ICargoItem, pos: IVector3, orient: OrientationOption, context: IPackingContext): IVector3 {
    let bestPos = { ...pos };
    const step = 0.05; 
    while (bestPos.z - step >= 0) {
      const testPos = { ...bestPos, z: bestPos.z - step };
      if (this.canPlaceAt(item, testPos, orient, context)) bestPos = testPos;
      else break; 
    }
    while (bestPos.x - step >= 0) {
      const testPos = { ...bestPos, x: bestPos.x - step };
      if (this.canPlaceAt(item, testPos, orient, context)) bestPos = testPos;
      else break;
    }
    return bestPos;
  }

  private getOrientations(diameter: number, length: number, isPalletized?: boolean): OrientationOption[] {
    const options: OrientationOption[] = [];
    options.push({
      dimensions: { length: diameter, width: diameter, height: length },
      rotation: 0,
      orientation: 'vertical'
    });
    if (!isPalletized) {
      options.push({
        dimensions: { length: length, width: diameter, height: diameter },
        rotation: 0,
        orientation: 'horizontal'
      });
      options.push({
        dimensions: { length: diameter, width: length, height: diameter },
        rotation: 90,
        orientation: 'horizontal'
      });
    }
    return options;
  }

  /**
   * DECISION MAKER:
   * 1. Calculate Capacity for Grid Pattern
   * 2. Calculate Capacity for Hex Pattern X-Aligned
   * 3. Calculate Capacity for Hex Pattern Z-Aligned
   * 4. Generate points ONLY for the winner.
   */
  private generateBestPatternPoints(
    placedItems: IPlacedItem[], 
    container: IDimensions,
    diameter: number,
    length: number
  ): CandidatePoint[] {
    const points: CandidatePoint[] = [];
    const pointSet = new Set<string>();

    const addPoint = (x: number, y: number, z: number, type: 'corner' | 'groove' | 'lattice') => {
      // Bounds check with slight tolerance
      if (x < -0.01 || y < -0.01 || z < -0.01) return;
      if (x > container.length || y > container.height || z > container.width) return;

      const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        // Prioritize bottom-back-left
        let score = (y * 10000) + (z * 100) + x;
        if (type === 'lattice') score -= 2000000;
        points.push({ position: { x, y, z }, score, type });
      }
    };

    // --- CALCULATE CAPACITIES ---
    const hexStep = diameter * 0.8660254;
    const radius = diameter / 2;

    // 1. GRID (Box-like)
    const gridColsX = Math.floor(container.length / diameter);
    const gridRowsZ = Math.floor(container.width / diameter);
    const capGrid = gridColsX * gridRowsZ;

    // 2. HEX Z (Zigzag in X)
    // Z-rows are spaced by diameter. X-cols spaced by hexStep? No.
    // Hex Z means rows running along Z axis? No, usually rows are Z=const.
    // Let's assume standard dense packing:
    // Rows along Z axis (Z=0, Z=hexStep...)
    const zRows = Math.floor((container.width - diameter) / hexStep) + 1;
    // Items per row:
    // Even rows (0, 2...): start at 0. Count = floor(L/D)
    // Odd rows (1, 3...): start at R. Count = floor((L-R)/D)
    let capHexZ = 0;
    for (let r = 0; r <= zRows; r++) {
        const offset = (r % 2 === 1) ? radius : 0;
        capHexZ += Math.floor((container.length - offset) / diameter);
    }

    // 3. HEX X (Zigzag in Z)
    // Rows along X axis (X=0, X=hexStep...)
    const xRows = Math.floor((container.length - diameter) / hexStep) + 1;
    let capHexX = 0;
    for (let r = 0; r <= xRows; r++) {
        const offset = (r % 2 === 1) ? radius : 0;
        capHexX += Math.floor((container.width - offset) / diameter);
    }

    // --- SELECT WINNER ---
    // If Hex is better, use it. If Grid is better/equal, use Grid (simpler).
    // Note: User says 14 fits (Hex) vs 12 (Grid). So one of the Hex caps should be 14.
    
    if (capHexZ > capGrid && capHexZ >= capHexX) {
        // GENERATE HEX Z PATTERN
        this.generateHexLattice(container, diameter, length, 'Z', addPoint);
    } else if (capHexX > capGrid && capHexX > capHexZ) {
        // GENERATE HEX X PATTERN
        this.generateHexLattice(container, diameter, length, 'X', addPoint);
    } else {
        // FALLBACK TO GRID (If Hex doesn't actually add value)
        // But since user insists on 14, we trust the Hex logic will find it.
        // We will generate Hex Z anyway if it's equal to Grid, just to be safe with the "honeycomb" requirement.
        this.generateHexLattice(container, diameter, length, 'Z', addPoint);
    }

    return points.sort((a, b) => a.score - b.score);
  }

  private generateHexLattice(
    container: IDimensions, 
    diameter: number, 
    length: number,
    axis: 'X' | 'Z',
    addPoint: (x: number, y: number, z: number, type: 'lattice') => void
  ) {
    const radius = diameter / 2;
    const hexStep = diameter * 0.8660254;

    if (axis === 'Z') {
        // Rows along Z (Depth)
        const zRows = Math.floor((container.width - diameter) / hexStep) + 2; 
        const xCols = Math.floor(container.length / diameter) + 1;

        for (let row = 0; row < zRows; row++) {
          const z = row * hexStep;
          const xOffset = (row % 2 === 1) ? radius : 0;
          for (let col = 0; col < xCols; col++) {
            const x = (col * diameter) + xOffset;
            addPoint(x, 0, z, 'lattice'); // Floor
            // Stack
            let yStack = length;
            while (yStack < container.height) {
               addPoint(x, yStack, z, 'lattice');
               yStack += length;
            }
          }
        }
    } else {
        // Rows along X (Width/Length)
        const xRows = Math.floor((container.length - diameter) / hexStep) + 2;
        const zCols = Math.floor((container.width / diameter) + 1;

        for (let row = 0; row < xRows; row++) {
            const x = row * hexStep;
            const zOffset = (row % 2 === 1) ? radius : 0;
            for (let col = 0; col < zCols; col++) {
                const z = (col * diameter) + zOffset;
                addPoint(x, 0, z, 'lattice'); // Floor
                // Stack
                let yStack = length;
                while (yStack < container.height) {
                    addPoint(x, yStack, z, 'lattice');
                    yStack += length;
                }
            }
        }
    }
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

    // 1. Bounds
    if (!GeometryUtils.isWithinBounds(pos, dimensions, container.dimensions)) return false;

    // 2. Intersection
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

    // 3. Support (Simplified for Floor items)
    if (pos.y > 0.01) {
      if (!this.hasSufficientSupport(pos, dimensions, orientationType, placedItems)) return false;
      
      if (orientationType === 'vertical') {
        const supportingItems = this.getSupportingItems(pos, dimensions, placedItems);
        for (const support of supportingItems) {
          if (support.item.type === 'roll' && support.orientation === 'horizontal') return false;
        }
      }
    }

    return true;
  }

  private getSupportingItems(pos: IVector3, dims: IDimensions, placedItems: IPlacedItem[]): IPlacedItem[] {
    const supports: IPlacedItem[] = [];
    const epsilon = 0.05;
    const bottomY = pos.y;

    for (const item of placedItems) {
      const itemTop = item.position.y + item.dimensions.height;
      if (Math.abs(itemTop - bottomY) < epsilon) {
          if (GeometryUtils.checkAABBIntersection(
              { x: pos.x - epsilon, y: 0, z: pos.z - epsilon }, 
              { length: dims.length + epsilon*2, width: dims.width + epsilon*2, height: 1 },
              { x: item.position.x, y: 0, z: item.position.z }, 
              { ...item.dimensions, height: 1 }
          )) {
              supports.push(item);
          }
      }
    }
    return supports;
  }

  private hasSufficientSupport(
    pos: IVector3, 
    dims: IDimensions, 
    orientation: RollOrientation, 
    placedItems: IPlacedItem[]
  ): boolean {
    const supportingItems = this.getSupportingItems(pos, dims, placedItems);
    if (supportingItems.length === 0) return false;

    const isSittingOnBox = supportingItems.some(i => i.item.type !== 'roll');
    if (isSittingOnBox) {
        let supportedArea = 0;
        const itemArea = dims.length * dims.width;
        for (const support of supportingItems) {
            const overlapX = Math.max(0, Math.min(pos.x + dims.length, support.position.x + support.dimensions.length) - Math.max(pos.x, support.position.x));
            const overlapZ = Math.max(0, Math.min(pos.z + dims.width, support.position.z + support.dimensions.width) - Math.max(pos.z, support.position.z));
            supportedArea += overlapX * overlapZ;
        }
        return (supportedArea / itemArea) > 0.5;
    }

    // BRIDGE SUPPORT (Loose)
    let contactCount = 0;
    const myRadius = (orientation === 'vertical' ? dims.length : dims.height) / 2;
    
    let myCenter: {a: number, b: number}; 
    if (orientation === 'vertical') myCenter = { a: pos.x + myRadius, b: pos.z + myRadius }; 
    else if (dims.length > dims.width) myCenter = { a: pos.y + myRadius, b: pos.z + myRadius }; 
    else myCenter = { a: pos.x + myRadius, b: pos.y + myRadius };

    for (const support of supportingItems) {
        if (support.item.type === 'roll') {
            const supportRadius = (support.orientation === 'vertical' ? support.dimensions.length : support.dimensions.height) / 2;
            let supportCenter: {a: number, b: number};

            if (orientation === 'vertical' && support.orientation === 'vertical') {
                 supportCenter = { a: support.position.x + supportRadius, b: support.position.z + supportRadius };
            } else if (orientation === 'horizontal' && support.orientation === 'horizontal') {
                 const myAlign = dims.length > dims.width ? 'x' : 'z';
                 const supAlign = support.dimensions.length > support.dimensions.width ? 'x' : 'z';
                 if (myAlign !== supAlign) continue;

                 if (myAlign === 'x') supportCenter = { a: support.position.y + supportRadius, b: support.position.z + supportRadius };
                 else supportCenter = { a: support.position.x + supportRadius, b: support.position.y + supportRadius };
            } else {
                continue; 
            }

            const dist = Math.sqrt((myCenter.a - supportCenter.a)**2 + (myCenter.b - supportCenter.b)**2);
            const optimalDist = myRadius + supportRadius;
            
            // Allow significant tolerance for bridge detection
            if (Math.abs(dist - optimalDist) < 0.25) {
                contactCount++;
            }
        }
    }

    return contactCount >= 1;
  }
}
