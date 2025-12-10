import type { ICargoItem, IPackingContext, IVector3, IDimensions, IPlacedItem, RollOrientation } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';

interface CandidatePoint {
  position: IVector3;
  score: number;
  type: 'lattice';
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

    const orientations = this.getOrientations(rollDiameter, rollLength, item.isPalletized);

    // 2. Generate Dense Lattice Points
    // We only generate valid lattice points inside the container.
    const candidatePoints = this.generateCandidatePoints(placedItems, container.dimensions, rollDiameter, rollLength);

    // 3. Find Best Fit
    for (const point of candidatePoints) {
      for (const orient of orientations) {
        // Lattice points are precise. Use AS IS. No nudging.
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
    // Vertical is primary for rolls
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
    diameter: number,
    length: number
  ): CandidatePoint[] {
    const points: CandidatePoint[] = [];
    const pointSet = new Set<string>();

    const addPoint = (x: number, y: number, z: number) => {
      // Basic bounds check (allow small tolerance)
      if (x < -0.01 || y < -0.01 || z < -0.01) return;
      if (x > containerDims.length || y > containerDims.height || z > containerDims.width) return;

      const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        // Simple sorting score: fill back-left-bottom first
        const score = (y * 10000) + (z * 100) + x;
        points.push({ position: { x, y, z }, score, type: 'lattice' });
      }
    };

    // GENERATE DENSE LATTICE
    // We decide the best axis (X or Z) for rows based on simple capacity check.
    const hexStep = diameter * 0.8660254; // sin(60) * D
    const radius = diameter / 2;

    // Capacity Check
    const capZ = (Math.floor((container.width - diameter) / hexStep) + 1) * Math.floor(container.length / diameter);
    const capX = (Math.floor((container.length - diameter) / hexStep) + 1) * Math.floor(container.width / diameter);

    // Default to Z-rows (standard width filling) unless X-rows is clearly better
    const useXPattern = capX > capZ;

    if (!useXPattern) {
        // Pattern Z: Rows along Z axis (Depth)
        // Rows are spaced by hexStep. Items in row spaced by diameter.
        const zRows = Math.floor((container.width - diameter) / hexStep) + 2; 
        const xCols = Math.floor(container.length / diameter) + 1;

        for (let row = 0; row < zRows; row++) {
          const z = row * hexStep;
          // Shift every odd row
          const xOffset = (row % 2 === 1) ? radius : 0;
          
          for (let col = 0; col < xCols; col++) {
            const x = (col * diameter) + xOffset;
            // Floor Point
            addPoint(x, 0, z);
            // Stack Points (Columnar stacking for stability)
            let yStack = length;
            while (yStack < container.height) {
               addPoint(x, yStack, z);
               yStack += length;
            }
          }
        }
    } else {
        // Pattern X: Rows along X axis (Length)
        const xRows = Math.floor((container.length - diameter) / hexStep) + 2;
        const zCols = Math.floor(container.width / diameter) + 1;

        for (let row = 0; row < xRows; row++) {
            const x = row * hexStep;
            const zOffset = (row % 2 === 1) ? radius : 0;

            for (let col = 0; col < zCols; col++) {
                const z = (col * diameter) + zOffset;
                addPoint(x, 0, z);
                
                let yStack = length;
                while (yStack < container.height) {
                    addPoint(x, yStack, z);
                    yStack += length;
                }
            }
        }
    }

    return points.sort((a, b) => a.score - b.score);
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

    // 1. Bounds Check
    if (!GeometryUtils.isWithinBounds(pos, dimensions, container.dimensions)) return false;

    // 2. Intersection Check
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

    // 3. Support Check
    // CRITICAL FIX: If on the floor (y=0), ALWAYS valid.
    if (pos.y < 0.01) {
        return true; 
    }

    // If stacked (y > 0), check for support
    if (!this.hasSufficientSupport(pos, dimensions, orientationType, placedItems)) {
        return false;
    }
    
    // Rule: No Vertical on Horizontal
    if (orientationType === 'vertical') {
        const supportingItems = this.getSupportingItems(pos, dimensions, placedItems);
        for (const support of supportingItems) {
          if (support.item.type === 'roll' && support.orientation === 'horizontal') return false;
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
          // Use expanded AABB to find potential supports
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

    // ROLL BRIDGE SUPPORT
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
            
            // Loose tolerance for support
            if (Math.abs(dist - optimalDist) < 0.25) {
                contactCount++;
            }
        }
    }

    return contactCount >= 1;
  }
}
