import type { IVector3, IDimensions, RollOrientation } from '../types';

export class GeometryUtils {
  // Epsilon'u biraz daha küçülttük ki "tam temas" durumunda hata vermesin
  private static readonly EPSILON = 0.0001;

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
    // 1. AABB Check (Hızlı Eleme)
    if (!this.checkAABBIntersection(pos1, dim1, pos2, dim2)) {
      return false;
    }

    const isRoll1 = item1Type === 'roll';
    const isRoll2 = item2Type === 'roll';

    if (!isRoll1 && !isRoll2) return true;

    // Cylinder - Cylinder Check
    if (isRoll1 && isRoll2) {
      return this.checkCylinderCylinderIntersection(pos1, dim1, orientation1, pos2, dim2, orientation2);
    }

    // Mixed Check
    if (isRoll1 && !isRoll2) {
      return this.checkBoxCylinderIntersection(pos2, dim2, pos1, dim1, orientation1);
    }
    
    if (!isRoll1 && isRoll2) {
      return this.checkBoxCylinderIntersection(pos1, dim1, pos2, dim2, orientation2);
    }

    return true;
  }

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

  private static checkCylinderCylinderIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    orient1: RollOrientation,
    pos2: IVector3,
    dim2: IDimensions,
    orient2: RollOrientation
  ): boolean {
    if (orient1 === orient2) {
      // VERTICAL
      if (orient1 === 'vertical') {
        if (!this.checkIntervalOverlap(pos1.y, dim1.height, pos2.y, dim2.height)) return false;
        
        const r1 = dim1.length / 2;
        const r2 = dim2.length / 2;
        const c1 = { x: pos1.x + r1, z: pos1.z + r1 };
        const c2 = { x: pos2.x + r2, z: pos2.z + r2 };
        
        const distSq = (c1.x - c2.x) ** 2 + (c1.z - c2.z) ** 2;
        const minDist = r1 + r2 - this.EPSILON;
        return distSq < minDist * minDist;
      } 
      // HORIZONTAL
      else {
        // Ekseni belirle (Boyuna göre)
        const axis1 = dim1.length > dim1.width ? 'x' : 'z';
        const axis2 = dim2.length > dim2.width ? 'x' : 'z';

        if (axis1 === axis2) {
           const longAxisOverlap = axis1 === 'x' 
             ? this.checkIntervalOverlap(pos1.x, dim1.length, pos2.x, dim2.length)
             : this.checkIntervalOverlap(pos1.z, dim1.width, pos2.z, dim2.width);
           
           if (!longAxisOverlap) return false;

           // Kesit alanı çarpışması (Daire-Daire)
           const r1 = dim1.height / 2;
           const r2 = dim2.height / 2;
           
           let c1, c2;
           if (axis1 === 'x') {
             // Kesit Y-Z düzlemi
             c1 = { a: pos1.y + r1, b: pos1.z + r1 };
             c2 = { a: pos2.y + r2, b: pos2.z + r2 };
           } else {
             // Kesit X-Y düzlemi (Z ekseninde uzanıyor)
             c1 = { a: pos1.x + r1, b: pos1.y + r1 };
             c2 = { a: pos2.x + r2, b: pos2.y + r2 };
           }

           const distSq = (c1.a - c2.a) ** 2 + (c1.b - c2.b) ** 2;
           const minDist = r1 + r2 - this.EPSILON;
           return distSq < minDist * minDist;
        }
      }
    }
    return true; 
  }

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
       cylCenter = { x: cylPos.x + radius, y: cylPos.y, z: cylPos.z + radius };
       const clampedX = Math.max(boxPos.x, Math.min(cylCenter.x, boxPos.x + boxDim.length));
       const clampedZ = Math.max(boxPos.z, Math.min(cylCenter.z, boxPos.z + boxDim.width));
       
       const distSq = (cylCenter.x - clampedX) ** 2 + (cylCenter.z - clampedZ) ** 2;
       const yOverlap = this.checkIntervalOverlap(boxPos.y, boxDim.height, cylPos.y, cylDim.height);
       return yOverlap && (distSq < radius * radius);
    } 
    else {
      // Horizontal
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
