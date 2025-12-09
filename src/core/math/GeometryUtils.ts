import type { IVector3, IDimensions, RollOrientation } from '../types';

export class GeometryUtils {
  private static readonly EPSILON = 0.001;

  /**
   * Checks generic intersection between a candidate item and an existing placed item.
   * Dispatches to specific handlers based on item types (Box vs Roll).
   */
  static checkIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    pos2: IVector3,
    dim2: IDimensions,
    item1Type: 'box' | 'roll' | 'pallet' = 'box',
    item2Type: 'box' | 'roll' | 'pallet' = 'box',
    orientation1: RollOrientation = 'vertical',
    orientation2: RollOrientation = 'vertical'
  ): boolean {
    // Optimization: First do a quick AABB check. If bounding boxes don't overlap, shapes definitely don't.
    if (!this.checkAABBIntersection(pos1, dim1, pos2, dim2)) {
      return false;
    }

    // If both are boxes, AABB check is sufficient.
    const isRoll1 = item1Type === 'roll';
    const isRoll2 = item2Type === 'roll';

    if (!isRoll1 && !isRoll2) {
      return true; // Already confirmed by AABB check above
    }

    // Cylinder - Cylinder Check
    if (isRoll1 && isRoll2) {
      return this.checkCylinderCylinderIntersection(pos1, dim1, orientation1, pos2, dim2, orientation2);
    }

    // Box - Cylinder Mixed Check
    if (isRoll1 && !isRoll2) {
      return this.checkBoxCylinderIntersection(pos2, dim2, pos1, dim1, orientation1);
    }
    
    if (!isRoll1 && isRoll2) {
      return this.checkBoxCylinderIntersection(pos1, dim1, pos2, dim2, orientation2);
    }

    return true;
  }

  /**
   * Standard Axis-Aligned Bounding Box intersection.
   */
  static checkAABBIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    pos2: IVector3,
    dim2: IDimensions
  ): boolean {
    const eps = this.EPSILON;

    return (
      pos1.x < pos2.x + dim2.length - eps &&
      pos1.x + dim1.length > pos2.x + eps &&
      pos1.y < pos2.y + dim2.height - eps &&
      pos1.y + dim1.height > pos2.y + eps &&
      pos1.z < pos2.z + dim2.width - eps &&
      pos1.z + dim1.width > pos2.z + eps
    );
  }

  /**
   * Checks if an item fits within the container boundaries.
   */
  static isWithinBounds(
    position: IVector3,
    dimensions: IDimensions,
    containerDimensions: IDimensions
  ): boolean {
    const eps = this.EPSILON;

    return (
      position.x >= -eps &&
      position.y >= -eps &&
      position.z >= -eps &&
      position.x + dimensions.length <= containerDimensions.length + eps &&
      position.y + dimensions.height <= containerDimensions.height + eps &&
      position.z + dimensions.width <= containerDimensions.width + eps
    );
  }

  /**
   * Precise intersection check between two cylinders.
   */
  private static checkCylinderCylinderIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    orient1: RollOrientation,
    pos2: IVector3,
    dim2: IDimensions,
    orient2: RollOrientation
  ): boolean {
    // 1. If orientations are parallel, we can simplify to a 2D circle check + 1D interval check
    if (orient1 === orient2) {
      if (orient1 === 'vertical') {
        // Both Vertical: Check X-Z distance and Y-interval
        if (!this.checkIntervalOverlap(pos1.y, dim1.height, pos2.y, dim2.height)) return false;
        
        const r1 = dim1.length / 2;
        const r2 = dim2.length / 2;
        const c1 = { x: pos1.x + r1, z: pos1.z + r1 };
        const c2 = { x: pos2.x + r2, z: pos2.z + r2 };
        
        const distSq = (c1.x - c2.x) ** 2 + (c1.z - c2.z) ** 2;
        const minDist = r1 + r2 - this.EPSILON; // Allow touching
        return distSq < minDist * minDist;
      } 
      else {
        // Both Horizontal
        // Determine axis based on dimensions (assuming simplified logic: standard horizontal is usually length-aligned)
        // Ideally, we'd pass exact axis, but here we infer from dimensions logic in RollStrategy
        const axis1 = dim1.length > dim1.width ? 'x' : 'z';
        const axis2 = dim2.length > dim2.width ? 'x' : 'z';

        if (axis1 === axis2) {
           // Same axis horizontal
           const longAxisOverlap = axis1 === 'x' 
             ? this.checkIntervalOverlap(pos1.x, dim1.length, pos2.x, dim2.length)
             : this.checkIntervalOverlap(pos1.z, dim1.width, pos2.z, dim2.width);
           
           if (!longAxisOverlap) return false;

           // Check cross-section distance
           const r1 = dim1.height / 2; // Height is diameter in horizontal
           const r2 = dim2.height / 2;
           
           // Center coordinates in the cross-section plane
           let c1, c2;
           if (axis1 === 'x') {
             c1 = { a: pos1.y + r1, b: pos1.z + r1 }; // Y, Z plane
             c2 = { a: pos2.y + r2, b: pos2.z + r2 };
           } else {
             c1 = { a: pos1.x + r1, b: pos1.y + r1 }; // X, Y plane
             c2 = { a: pos2.x + r2, b: pos2.y + r2 };
           }

           const distSq = (c1.a - c2.a) ** 2 + (c1.b - c2.b) ** 2;
           const minDist = r1 + r2 - this.EPSILON;
           return distSq < minDist * minDist;
        }
      }
    }

    // 2. Perpendicular cylinders fallback to AABB (already checked at start)
    // For a perfect fit, complex 3D math is needed, but AABB is safe (conservative).
    return true; 
  }

  /**
   * Checks intersection between a Box and a Cylinder.
   */
  private static checkBoxCylinderIntersection(
    boxPos: IVector3,
    boxDim: IDimensions,
    cylPos: IVector3,
    cylDim: IDimensions,
    cylOrient: RollOrientation
  ): boolean {
    const radius = (cylOrient === 'vertical' ? cylDim.length : cylDim.height) / 2;
    let cylCenter: IVector3;
    
    if (cylOrient === 'vertical') {
       cylCenter = { 
         x: cylPos.x + radius, 
         y: cylPos.y, 
         z: cylPos.z + radius 
       };
       
       // Clamp cylinder center to box bounds in X-Z
       const clampedX = Math.max(boxPos.x, Math.min(cylCenter.x, boxPos.x + boxDim.length));
       const clampedZ = Math.max(boxPos.z, Math.min(cylCenter.z, boxPos.z + boxDim.width));
       
       const distSq = (cylCenter.x - clampedX) ** 2 + (cylCenter.z - clampedZ) ** 2;
       const yOverlap = this.checkIntervalOverlap(boxPos.y, boxDim.height, cylPos.y, cylDim.height);
       
       return yOverlap && (distSq < radius * radius);
    } 
    else {
      const isXAxis = cylDim.length > cylDim.width;
      
      if (isXAxis) {
          cylCenter = { x: cylPos.x, y: cylPos.y + radius, z: cylPos.z + radius };
          const clampedY = Math.max(boxPos.y, Math.min(cylCenter.y, boxPos.y + boxDim.height));
          const clampedZ = Math.max(boxPos.z, Math.min(cylCenter.z, boxPos.z + boxDim.width));
          
          const distSq = (cylCenter.y - clampedY) ** 2 + (cylCenter.z - clampedZ) ** 2;
          const xOverlap = this.checkIntervalOverlap(boxPos.x, boxDim.length, cylPos.x, cylDim.length);
          
          return xOverlap && (distSq < radius * radius);
      } else {
          cylCenter = { x: cylPos.x + radius, y: cylPos.y + radius, z: cylPos.z };
          const clampedX = Math.max(boxPos.x, Math.min(cylCenter.x, boxPos.x + boxDim.length));
          const clampedY = Math.max(boxPos.y, Math.min(cylCenter.y, boxPos.y + boxDim.height));
          
          const distSq = (cylCenter.x - clampedX) ** 2 + (cylCenter.y - clampedY) ** 2;
          const zOverlap = this.checkIntervalOverlap(boxPos.z, boxDim.width, cylPos.z, cylDim.width);
          
          return zOverlap && (distSq < radius * radius);
      }
    }
  }

  private static checkIntervalOverlap(min1: number, len1: number, min2: number, len2: number): boolean {
    return min1 < min2 + len2 - this.EPSILON && min1 + len1 > min2 + this.EPSILON;
  }
}
