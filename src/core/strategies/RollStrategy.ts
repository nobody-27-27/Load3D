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

    // 2. Generate Points (All 4 Lattice Variations)
    const candidatePoints = this.generateCandidatePoints(placedItems, container.dimensions, rollDiameter, rollLength);

    // 3. Find Best Fit
    for (const point of candidatePoints) {
      for (const orient of orientations) {
        
        // Lattice points are mathematically precise. Use AS IS.
        if (point.type === 'lattice') {
             if (this.canPlaceAt(null, point.position, orient, context)) {
                 return {
                   position: point.position,
                   rotation: orient.rotation,
                   orientation: orient.orientation,
                   dimensions: orient.dimensions
                 };
             }
        } else {
             // Fallback logic
             const finalPos = this.tryNudgePosition(point.position, orient, context);
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
    startPos: IVector3,
    orient: OrientationOption,
    context: IPackingContext
  ): IVector3 | null {
    if (this.canPlaceAt(null, startPos, orient, context)) {
      return this.optimizeCoordinate(startPos, orient, context);
    }
    return null;
  }

  private optimizeCoordinate(pos: IVector3, orient: OrientationOption, context: IPackingContext): IVector3 {
    let bestPos = { ...pos };
    const step = 0.05; 
    while (bestPos.z - step >= 0) {
      const testPos = { ...bestPos, z: bestPos.z - step };
      if (this.canPlaceAt(null, testPos, orient, context)) bestPos = testPos;
      else break; 
    }
    while (bestPos.x - step >= 0) {
      const testPos = { ...bestPos, x: bestPos.x - step };
      if (this.canPlaceAt(null, testPos, orient, context)) bestPos = testPos;
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

  private generateCandidatePoints(
    placedItems: IPlacedItem[], 
    containerDims: IDimensions,
    currentDiameter: number,
    currentLength: number
  ): CandidatePoint[] {
    const points: CandidatePoint[] = [];
    const pointSet = new Set<string>();

    const addPoint = (x: number, y: number, z: number, type: 'corner' | 'groove' | 'lattice') => {
      if (x < -0.01 || y < -0.01 || z < -0.01) return;
      if (x > containerDims.length || y > containerDims.height || z > containerDims.width) return;

      const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        
        let score = (y * 10000) + (z * 100) + x;
        if (type === 'lattice') score -= 1000000; 
        
        points.push({ position: { x, y, z }, score, type });
      }
    };

    // 1. GENERATE FORCED LATTICE
    // This generates ALL valid hex points for 4 different pattern strategies.
    this.generateForcedLattice(containerDims, currentDiameter, currentLength, addPoint);

    // 2. Fallback Grid (Score is much worse, so these are checked LAST)
    addPoint(0, 0, 0, 'corner');
    for (const item of placedItems) {
      const pos = item.position;
      const dim = item.dimensions;
      addPoint(pos.x + dim.length, pos.y, pos.z, 'corner'); 
      addPoint(pos.x, pos.y, pos.z + dim.width, 'corner'); 
      addPoint(pos.x, pos.y + dim.height, pos.z, 'corner'); 
      addPoint(pos.x + dim.length, pos.y, pos.z + dim.width, 'corner'); 
    }

    return points.sort((a, b) => a.score - b.score);
  }

  /**
   * Generates 4 variations of Hex Lattices (Direction X/Z + Start Shifted/Normal).
   * It blindly adds ALL of them. The algorithm will filter valid ones.
   */
  private generateForcedLattice(
    container: IDimensions, 
    diameter: number, 
    length: number,
    addPoint: (x: number, y: number, z: number, type: 'lattice') => void
  ) {
    const radius = diameter / 2;
    const hexStep = diameter * 0.8660254; 
    
    // PATTERN SET 1: Rows along Z-Axis (Vertical packing flow along width)
    // We try Normal Start (0) and Shifted Start (Radius)
    for (let shiftStrategy = 0; shiftStrategy < 2; shiftStrategy++) {
        
        const zRows = Math.floor((container.width - diameter) / hexStep) + 3; 
        const xCols = Math.floor(container.length / diameter) + 2;

        for (let row = 0; row < zRows; row++) {
          const z = row * hexStep;
          
          // Determine if this row is indented
          const isIndentedRow = (row % 2 === 1);
          let xOffset = isIndentedRow ? radius : 0;
          
          // If shiftStrategy is 1, we INVERT the indentation logic (Start indented)
          if (shiftStrategy === 1) {
              xOffset = (xOffset === 0) ? radius : 0;
          }

          for (let col = 0; col < xCols; col++) {
            const x = (col * diameter) + xOffset;
            addPoint(x, 0, z, 'lattice'); // Floor
            
            // Stacking
            let yStack = length;
            while (yStack < container.height) {
               addPoint(x, yStack, z, 'lattice');
               yStack += length;
            }
          }
        }
    }

    // PATTERN SET 2: Rows along X-Axis (Vertical packing flow along length)
    // Rotated Lattice logic
    for (let shiftStrategy = 0; shiftStrategy < 2; shiftStrategy++) {
        const xRows = Math.floor((container.length - diameter) / hexStep) + 3;
        const zCols = Math.floor((container.width / diameter) + 2);

        for (let row = 0; row < xRows; row++) {
            const x = row * hexStep;
            
            const isIndentedRow = (row % 2 === 1);
            let zOffset = isIndentedRow ? radius : 0;
            
            if (shiftStrategy === 1) {
                zOffset = (zOffset === 0) ? radius : 0;
            }

            for (let col = 0; col < zCols; col++) {
                const z = (col * diameter) + zOffset;
                addPoint(x, 0, z, 'lattice'); // Floor

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
    item: ICargoItem | null,
    pos: IVector3, 
    orient: OrientationOption,
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;
    const dimensions = orient.dimensions;
    const orientationType = orient.orientation;

    if (!GeometryUtils.isWithinBounds(pos, dimensions, container.dimensions)) return false;

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

    if (pos.y > 0.01) {
      if (!this.hasSufficientSupport(pos, dimensions, orientationType, placedItems)) return false;
      
      if (orientationType === 'vertical') {
        const supportingItems = this.getSupportingItems(pos, dimensions, placedItems);
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
            
            if (Math.abs(dist - optimalDist) < 0.25) {
                contactCount++;
            }
        }
    }

    return contactCount >= 1;
  }
}
