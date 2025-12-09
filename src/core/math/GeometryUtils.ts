import type { IVector3, IDimensions, RollOrientation } from '../types';

export class GeometryUtils {
  private static readonly EPSILON = 0.001;

  /**
   * Checks generic intersection between items.
   * SAFEGUARD: If types are 'box' (default), it runs the exact original AABB logic.
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
    // 1. AABB Check (Hızlı Eleme - Tüm tipler için geçerli ortak fizik kuralı)
    if (!this.checkAABBIntersection(pos1, dim1, pos2, dim2)) {
      return false;
    }

    // BACKWARD COMPATIBILITY: If both are boxes, rely solely on AABB result (which is true here)
    if (item1Type === 'box' && item2Type === 'box') {
      return true; 
    }

    // --- ROLL SPECIFIC LOGIC STARTS HERE ---
    
    // Cylinder - Cylinder Check
    if (item1Type === 'roll' && item2Type === 'roll') {
      return this.checkCylinderCylinderIntersection(pos1, dim1, orientation1, pos2, dim2, orientation2);
    }

    // Mixed Check (Box vs Roll)
    if (item1Type === 'roll' && item2Type !== 'roll') {
      return this.checkBoxCylinderIntersection(pos2, dim2, pos1, dim1, orientation1);
    }
    
    if (item1Type !== 'roll' && item2Type === 'roll') {
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

  // --- PRIVATE METHODS FOR ROLL MATH ---

  private static checkCylinderCylinderIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    orient1: RollOrientation,
    pos2: IVector3,
    dim2: IDimensions,
    orient2: RollOrientation
  ): boolean {
    // Toleransı biraz artırarak "sürtünme" payı bırakıyoruz
    const ROLL_EPSILON = 0.0005;

    if (orient1 === orient2) {
      // VERTICAL
      if (orient1 === 'vertical') {
        // Y ekseninde çakışma yoksa çarpışma yoktur
        if (!this.checkIntervalOverlap(pos1.y, dim1.height, pos2.y, dim2.height)) return false;
        
        const r1 = dim1.length / 2;
        const r2 = dim2.length / 2;
        // Merkezler (X, Z)
        const c1x = pos1.x + r1;
        const c1z = pos1.z + r1;
        const c2x = pos2.x + r2;
        const c2z = pos2.z + r2;
        
        const distSq = (c1x - c2x) ** 2 + (c1z - c2z) ** 2;
        // Eğer mesafe yarıçaplar toplamından küçükse çarpışma vardır.
        // Eşitse (temas) çarpışma yoktur.
        // float hatası için epsilon çıkarıyoruz: (r1+r2-eps)^2
        const minDist = r1 + r2 - ROLL_EPSILON;
        return distSq < minDist * minDist;
      } 
      // HORIZONTAL
      else {
        // Hangi eksende uzandığını bulalım
        const isX1 = dim1.length > dim1.width;
        const isX2 = dim2.length > dim2.width;

        if (isX1 === isX2) {
           // Aynı eksende yataylar
           const longAxisOverlap = isX1 
             ? this.checkIntervalOverlap(pos1.x, dim1.length, pos2.x, dim2.length)
             : this.checkIntervalOverlap(pos1.z, dim1.width, pos2.z, dim2.width);
           
           if (!longAxisOverlap) return false;

           // Kesit alanı (Daire) kontrolü
           const r1 = dim1.height / 2;
           const r2 = dim2.height / 2;
           
           let distSq = 0;
           if (isX1) {
             // Kesit Y-Z
             const c1y = pos1.y + r1; 
             const c1z = pos1.z + r1;
             const c2y = pos2.y + r2; 
             const c2z = pos2.z + r2;
             distSq = (c1y - c2y) ** 2 + (c1z - c2z) ** 2;
           } else {
             // Kesit X-Y
             const c1x = pos1.x + r1;
             const c1y = pos1.y + r1;
             const c2x = pos2.x + r2;
             const c2y = pos2.y + r2;
             distSq = (c1x - c2x) ** 2 + (c1y - c2y) ** 2;
           }

           const minDist = r1 + r2 - ROLL_EPSILON;
           return distSq < minDist * minDist;
        }
      }
    }
    return true; // Farklı oryantasyonlar için şimdilik güvenli çarpışma (AABB yeterliydi)
  }

  private static checkBoxCylinderIntersection(
    boxPos: IVector3,
    boxDim: IDimensions,
    cylPos: IVector3,
    cylDim: IDimensions,
    cylOrient: RollOrientation
  ): boolean {
    const ROLL_EPSILON = 0.0005;
    const radius = (cylOrient === 'vertical' ? cylDim.length : cylDim.height) / 2;
    
    if (cylOrient === 'vertical') {
       // Silindir Merkezi (X, Z)
       const cx = cylPos.x + radius;
       const cz = cylPos.z + radius;
       
       // Kutu üzerinde silindir merkezine en yakın nokta (X, Z düzleminde)
       const clampedX = Math.max(boxPos.x, Math.min(cx, boxPos.x + boxDim.length));
       const clampedZ = Math.max(boxPos.z, Math.min(cz, boxPos.z + boxDim.width));
       
       const distSq = (cx - clampedX) ** 2 + (cz - clampedZ) ** 2;
       
       // Y ekseninde çakışma var mı?
       const yOverlap = this.checkIntervalOverlap(boxPos.y, boxDim.height, cylPos.y, cylDim.height);
       
       return yOverlap && (distSq < (radius - ROLL_EPSILON) ** 2);
    } 
    else {
      // Horizontal
      const isXAxis = cylDim.length > cylDim.width;
      if (isXAxis) {
          const cy = cylPos.y + radius;
          const cz = cylPos.z + radius;
          const clampedY = Math.max(boxPos.y, Math.min(cy, boxPos.y + boxDim.height));
          const clampedZ = Math.max(boxPos.z, Math.min(cz, boxPos.z + boxDim.width));
          
          const distSq = (cy - clampedY) ** 2 + (cz - clampedZ) ** 2;
          const xOverlap = this.checkIntervalOverlap(boxPos.x, boxDim.length, cylPos.x, cylDim.length);
          return xOverlap && (distSq < (radius - ROLL_EPSILON) ** 2);
      } else {
          const cx = cylPos.x + radius;
          const cy = cylPos.y + radius;
          const clampedX = Math.max(boxPos.x, Math.min(cx, boxPos.x + boxDim.length));
          const clampedY = Math.max(boxPos.y, Math.min(cy, boxPos.y + boxDim.height));
          
          const distSq = (cx - clampedX) ** 2 + (cy - clampedY) ** 2;
          const zOverlap = this.checkIntervalOverlap(boxPos.z, boxDim.width, cylPos.z, cylDim.width);
          return zOverlap && (distSq < (radius - ROLL_EPSILON) ** 2);
      }
    }
  }

  private static checkIntervalOverlap(min1: number, len1: number, min2: number, len2: number): boolean {
    const eps = this.EPSILON;
    return min1 < min2 + len2 - eps && min1 + len1 > min2 + eps;
  }
}
