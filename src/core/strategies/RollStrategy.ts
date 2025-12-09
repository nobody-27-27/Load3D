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

    // Generate Candidate Points (Standard Corners + Hexagonal Grooves)
    const candidatePoints = this.generateCandidatePoints(placedItems, container.dimensions, rollDiameter);

    // Find Best Fit
    for (const point of candidatePoints) {
      for (const orient of orientations) {
        
        let finalPos: IVector3 | null = null;

        // STRATEGY FIX: 
        // If it's a 'groove' point, it is mathematically perfect for nesting.
        // Do NOT try to nudge/optimize it, as that breaks the hex pattern.
        // Just check if it fits.
        if (point.type === 'groove') {
             if (this.canPlaceAt(null, point.position, orient, context)) {
                 finalPos = point.position;
             }
        } else {
             // For standard grid corners, try to nudge (gravity slide)
             finalPos = this.tryNudgePosition(point.position, orient, context);
        }

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

  // Slide the item towards 0,0,0 to close gaps in grid layout
  private optimizeCoordinate(pos: IVector3, orient: OrientationOption, context: IPackingContext): IVector3 {
    let bestPos = { ...pos };
    const step = 0.05; 
    
    // Back (Z)
    while (bestPos.z - step >= 0) {
      const testPos = { ...bestPos, z: bestPos.z - step };
      if (this.canPlaceAt(null, testPos, orient, context)) {
        bestPos = testPos;
      } else {
        break; 
      }
    }

    // Left (X)
    while (bestPos.x - step >= 0) {
      const testPos = { ...bestPos, x: bestPos.x - step };
      if (this.canPlaceAt(null, testPos, orient, context)) {
        bestPos = testPos;
      } else {
        break;
      }
    }

    return bestPos;
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
      // Horizontal X
      options.push({
        dimensions: { length: length, width: diameter, height: diameter },
        rotation: 0,
        orientation: 'horizontal'
      });
      // Horizontal Z
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
      // Basic Container Bounds Check
      if (x < 0 || y < 0 || z < 0) return;
      if (x > containerDims.length || y > containerDims.height || z > containerDims.width) return;

      const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        
        let score = (y * 10000) + (z * 100) + x;
        // CRITICAL PRIORITY:
        // Give Groove points a massive negative score so they are ALWAYS processed before Corner points.
        // This forces the "honeycomb" logic to trigger first.
        if (type === 'groove') score -= 50000; 
        
        points.push({ position: { x, y, z }, score, type });
      }
    };

    // 1. Grid Points
    addPoint(0, 0, 0, 'corner');
    for (const item of placedItems) {
      const pos = item.position;
      const dim = item.dimensions;
      addPoint(pos.x + dim.length, pos.y, pos.z, 'corner'); 
      addPoint(pos.x, pos.y, pos.z + dim.width, 'corner'); 
      addPoint(pos.x, pos.y + dim.height, pos.z, 'corner'); 
      addPoint(pos.x + dim.length, pos.y, pos.z + dim.width, 'corner'); 
    }

    // 2. Hex/Groove Points
    const rolls = placedItems.filter(i => i.item.type === 'roll');
    const targetRadius = currentDiameter / 2;

    for (let i = 0; i < rolls.length; i++) {
      for (let j = i + 1; j < rolls.length; j++) {
        const r1 = rolls[i];
        const r2 = rolls[j];

        if (r1.orientation !== r2.orientation) continue;

        const radius1 = (r1.orientation === 'vertical' ? r1.dimensions.length : r1.dimensions.height) / 2;
        const radius2 = (r2.orientation === 'vertical' ? r2.dimensions.length : r2.dimensions.height) / 2;

        // -- VERTICAL GROOVES --
        if (r1.orientation === 'vertical') {
            if (Math.abs(r1.position.y - r2.position.y) < 0.1) {
                // Centers
                const c1 = { x: r1.position.x + radius1, z: r1.position.z + radius1 };
                const c2 = { x: r2.position.x + radius2, z: r2.position.z + radius2 };
                const dist = Math.sqrt((c1.x - c2.x)**2 + (c1.z - c2.z)**2);
                
                // If they are neighbors (distance approx sum of radii)
                if (dist < (radius1 + targetRadius + radius2 + targetRadius)) {
                    const intersect = this.calculateCircleIntersection(c1.x, c1.z, radius1 + targetRadius, c2.x, c2.z, radius2 + targetRadius);
                    if (intersect) {
                        // Returns 2 possible points. Try both.
                        addPoint(intersect.x1 - targetRadius, r1.position.y, intersect.y1 - targetRadius, 'groove');
                        addPoint(intersect.x2 - targetRadius, r1.position.y, intersect.y2 - targetRadius, 'groove');
                    }
                }
            }
        }
        // -- HORIZONTAL GROOVES --
        else {
             const isXAxis = r1.dimensions.length > r1.dimensions.width;
             const isXAxis2 = r2.dimensions.length > r2.dimensions.width;
             if (isXAxis !== isXAxis2) continue;

             if (Math.abs(r1.position.y - r2.position.y) < 0.1) {
                 if (isXAxis) { // Y-Z Plane
                    const c1 = { a: r1.position.y + radius1, b: r1.position.z + radius1 };
                    const c2 = { a: r2.position.y + radius2, b: r2.position.z + radius2 };
                    const dist = Math.sqrt((c1.a - c2.a)**2 + (c1.b - c2.b)**2);
                    
                    if (dist < (radius1 + targetRadius + radius2 + targetRadius)) {
                        const intersect = this.calculateCircleIntersection(c1.a, c1.b, radius1 + targetRadius, c2.a, c2.b, radius2 + targetRadius);
                        if (intersect) {
                            const validX = Math.max(r1.position.x, r2.position.x);
                            addPoint(validX, intersect.x1 - targetRadius, intersect.y1 - targetRadius, 'groove');
                            addPoint(validX, intersect.x2 - targetRadius, intersect.y2 - targetRadius, 'groove');
                        }
                    }
                 } else { // X-Y Plane
                    const c1 = { a: r1.position.x + radius1, b: r1.position.y + radius1 };
                    const c2 = { a: r2.position.x + radius2, b: r2.position.y + radius2 };
                    const dist = Math.sqrt((c1.a - c2.a)**2 + (c1.b - c2.b)**2);
                    
                    if (dist < (radius1 + targetRadius + radius2 + targetRadius)) {
                        const intersect = this.calculateCircleIntersection(c1.a, c1.b, radius1 + targetRadius, c2.a, c2.b, radius2 + targetRadius);
                        if (intersect) {
                            const validZ = Math.max(r1.position.z, r2.position.z);
                            addPoint(intersect.x1 - targetRadius, intersect.y1 - targetRadius, validZ, 'groove');
                            addPoint(intersect.x2 - targetRadius, intersect.y2 - targetRadius, validZ, 'groove');
                        }
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

    if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) return null;

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
    item: ICargoItem | null,
    pos: IVector3, 
    orient: OrientationOption,
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;
    const dimensions = orient.dimensions;
    const orientationType = orient.orientation;

    // 1. Boundary
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

    // 3. Support Check
    if (pos.y > 0.01) {
      if (!this.hasSufficientSupport(pos, dimensions, orientationType, placedItems)) return false;
      
      // Vertical on Horizontal Check
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

    // Box Support Check
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

    // Roll Bridge Support Check
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
            
            // Allow loose tolerance for support validation
            if (Math.abs(dist - optimalDist) < 0.25) {
                contactCount++;
            }
        }
    }

    return contactCount >= 1;
  }
}
