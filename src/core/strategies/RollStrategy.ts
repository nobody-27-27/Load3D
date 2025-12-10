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
    
    // Boyutları al
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

    // 2. TÜM DESENLERİ OLUŞTUR (GRID + HEX_X + HEX_Z)
    // Sadece birini seçmek yerine hepsini havuza atıp puana göre yarıştırıyoruz.
    const candidatePoints = this.generateAllPatternPoints(placedItems, container.dimensions, rollDiameter, rollLength);

    // 3. En İyisini Bul
    for (const point of candidatePoints) {
      for (const orient of orientations) {
        
        // Lattice/Hex noktaları hassastır, kaydırma yapma.
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
             // Grid noktaları için kaydırma (Nudge) deneyebilirsin.
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

  private generateAllPatternPoints(
    placedItems: IPlacedItem[], 
    containerDims: IDimensions,
    diameter: number,
    length: number
  ): CandidatePoint[] {
    const points: CandidatePoint[] = [];
    const pointSet = new Set<string>();

    const addPoint = (x: number, y: number, z: number, type: 'corner' | 'lattice') => {
      // Sınır kontrolü (Toleranslı)
      if (x < -0.01 || y < -0.01 || z < -0.01) return;
      if (x > containerDims.length || y > containerDims.height || z > containerDims.width) return;

      const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        // PUANLAMA:
        // Lattice (Hex) noktalarına devasa öncelik ver (-1 Milyon)
        // Böylece önce petek denenir. Sığmazsa Grid denenir.
        let score = (y * 10000) + (z * 100) + x;
        if (type === 'lattice') score -= 2000000; 
        
        points.push({ position: { x, y, z }, score, type });
      }
    };

    const radius = diameter / 2;
    const hexStep = diameter * 0.8660254;

    // 1. GRID NOKTALARI (Garantör)
    // Standart kutu gibi dizilim
    {
        const colsX = Math.floor(containerDims.length / diameter);
        const rowsZ = Math.floor(containerDims.width / diameter);
        for(let r=0; r<=rowsZ; r++) {
            for(let c=0; c<=colsX; c++) {
                const x = c * diameter;
                const z = r * diameter;
                addPoint(x, 0, z, 'corner');
                // Stack
                let yStack = length;
                while(yStack < containerDims.height) {
                    addPoint(x, yStack, z, 'corner');
                    yStack += length;
                }
            }
        }
    }

    // 2. HEX-Z DESENİ (X Ekseninde Zigzag)
    {
        // Döngü sınırlarını geniş tutuyoruz, bounds check zaten yukarıda yapılıyor
        const rowsZ = Math.ceil(containerDims.width / hexStep);
        const colsX = Math.ceil(containerDims.length / diameter);
        
        for (let r = 0; r <= rowsZ; r++) {
            const z = r * hexStep;
            const xOffset = (r % 2 === 1) ? radius : 0;
            
            for (let c = 0; c <= colsX; c++) {
                const x = (c * diameter) + xOffset;
                addPoint(x, 0, z, 'lattice');
                // Stack
                let yStack = length;
                while(yStack < containerDims.height) {
                    addPoint(x, yStack, z, 'lattice');
                    yStack += length;
                }
            }
        }
    }

    // 3. HEX-X DESENİ (Z Ekseninde Zigzag)
    {
        const rowsX = Math.ceil(containerDims.length / hexStep);
        const colsZ = Math.ceil(containerDims.width / diameter);

        for (let r = 0; r <= rowsX; r++) {
            const x = r * hexStep;
            const zOffset = (r % 2 === 1) ? radius : 0;

            for (let c = 0; c <= colsZ; c++) {
                const z = (c * diameter) + zOffset;
                addPoint(x, 0, z, 'lattice');
                // Stack
                let yStack = length;
                while(yStack < containerDims.height) {
                    addPoint(x, yStack, z, 'lattice');
                    yStack += length;
                }
            }
        }
    }

    // 4. Standart Kutu Köşeleri (Placed Items - Yedek)
    for (const item of placedItems) {
        const pos = item.position;
        const dim = item.dimensions;
        addPoint(pos.x + dim.length, pos.y, pos.z, 'corner'); 
        addPoint(pos.x, pos.y, pos.z + dim.width, 'corner'); 
        addPoint(pos.x, pos.y + dim.height, pos.z, 'corner'); 
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

    // Zemin Kat (Y=0) için destek kontrolü yapma
    if (pos.y < 0.01) {
        return true; 
    }

    if (!this.hasSufficientSupport(pos, dimensions, orientationType, placedItems)) {
        return false;
    }
    
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
