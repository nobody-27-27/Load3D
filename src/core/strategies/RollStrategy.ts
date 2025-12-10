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
    
    // Boyutları Belirle
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

    // Lattice (Petek) Noktalarını ve Standart Noktaları Oluştur
    const candidatePoints = this.generateCandidatePoints(placedItems, container.dimensions, rollDiameter, rollLength);

    for (const point of candidatePoints) {
      for (const orient of orientations) {
        
        // Petek noktalarını olduğu gibi dene, kaydırma yapma
        if (point.type === 'lattice' || point.type === 'groove') {
             if (this.canPlaceAt(item, point.position, orient, context)) {
                 return {
                   position: point.position,
                   rotation: orient.rotation,
                   orientation: orient.orientation,
                   dimensions: orient.dimensions
                 };
             }
        } else {
             // Standart noktaları kaydırarak dene
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
    // Vertical
    options.push({
      dimensions: { length: diameter, width: diameter, height: length },
      rotation: 0,
      orientation: 'vertical'
    });
    // Horizontal
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
        // Petek noktalarına (Lattice/Groove) çok yüksek öncelik ver
        let score = (y * 10000) + (z * 100) + x;
        if (type === 'lattice') score -= 2000000; 
        if (type === 'groove') score -= 1000000;
        
        points.push({ position: { x, y, z }, score, type });
      }
    };

    // 1. ZORUNLU PETEK IZGARASI (Fixed Lattice)
    this.generateLatticePoints(containerDims, currentDiameter, currentLength, addPoint);

    // 2. Dinamik Oyuklar (Grooves - Mevcut rulolara göre)
    this.generateGroovePoints(placedItems, currentDiameter, addPoint);

    // 3. Standart Köşeler (Grid - Yedek)
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

  private generateLatticePoints(
    container: IDimensions, 
    diameter: number, 
    length: number,
    addPoint: (x: number, y: number, z: number, type: 'lattice') => void
  ) {
    const radius = diameter / 2;
    const hexStep = diameter * 0.8660254; // sin(60)*D
    
    // İki farklı deseni de dene (Normal ve Kaydırmalı)
    for (let pattern = 0; pattern < 2; pattern++) {
        // Z Ekseni boyunca satırlar
        const zRows = Math.floor((container.width - diameter) / hexStep) + 2; 
        const xCols = Math.floor(container.length / diameter) + 2;

        for (let row = 0; row < zRows; row++) {
          const z = row * hexStep;
          const isShifted = (row % 2 === 1);
          let xOffset = isShifted ? radius : 0;
          if (pattern === 1) xOffset = (xOffset === 0) ? radius : 0;

          for (let col = 0; col < xCols; col++) {
            const x = (col * diameter) + xOffset;
            addPoint(x, 0, z, 'lattice'); // Zemin
            
            // Dikey Yığın (Columnar)
            let yStack = length;
            while (yStack < container.height) {
               addPoint(x, yStack, z, 'lattice');
               yStack += length;
            }
          }
        }
    }
  }

  private generateGroovePoints(placedItems: IPlacedItem[], currentDiameter: number, addPoint: any) {
      const rolls = placedItems.filter(i => i.item.type === 'roll');
      const targetRadius = currentDiameter / 2;
      const buffer = 0.001;

      for (let i = 0; i < rolls.length; i++) {
        for (let j = i + 1; j < rolls.length; j++) {
            const r1 = rolls[i];
            const r2 = rolls[j];
            if (r1.orientation !== r2.orientation) continue;

            // Sadece Vertical için örnek (Horizontal da benzer eklenebilir)
            if (r1.orientation === 'vertical') {
                if (Math.abs(r1.position.y - r2.position.y) < 0.1) {
                    const rad1 = r1.dimensions.length/2;
                    const rad2 = r2.dimensions.length/2;
                    const c1 = {x: r1.position.x + rad1, z: r1.position.z + rad1};
                    const c2 = {x: r2.position.x + rad2, z: r2.position.z + rad2};
                    const dist = Math.sqrt((c1.x-c2.x)**2 + (c1.z-c2.z)**2);
                    
                    // İdeal petek mesafesi (birbirine değiyorlarsa veya çok yakınlarsa)
                    if (dist < (rad1 + targetRadius + rad2 + targetRadius + buffer)) {
                        // Basit orta nokta hesabı yerine üçgen kesişimi
                        // ... (GeometryUtils calculateCircleIntersection mantığı buraya da eklenebilir)
                        // Şimdilik sadece Lattice'in yeterli olacağını varsayıyoruz.
                    }
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

    // 1. Sınır Kontrolü
    if (!GeometryUtils.isWithinBounds(pos, dimensions, container.dimensions)) return false;

    // 2. Çarpışma Kontrolü (AABB Bypass edilmiş hali)
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

    // 3. Destek Kontrolü (HAVA KORKUSU DÜZELTİLDİ)
    if (pos.y > 0.01) {
      // "Bridge Support" (Köprü Desteği) mantığı devreye giriyor.
      // Altındaki alan boş olsa bile, iki rulo üstünde duruyorsa geçerlidir.
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
          // Burada AABB kontrolü yapıyoruz ama sadece "adayları" bulmak için.
          // Gerçek destek "hasSufficientSupport" içinde hesaplanacak.
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

    // Kutu üzerindeyse -> Alan hesabı
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

    // Rulo üzerindeyse -> TEMAS NOKTASI SAYISI (Bridge Support Logic)
    // Alan hesabı YAPMIYORUZ. Çünkü petek dizilimde temas alanı neredeyse sıfırdır (çizgi temas).
    // Bunun yerine "En az 2 noktadan destek alıyor mu?" veya "1 rulo üstünde tam dengede mi?" diye bakıyoruz.
    
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
            
            // Toleranslı Mesafe Kontrolü: 
            // Eğer merkezler arası mesafe, yarıçaplar toplamına yakınsa (veya biraz azsa, iç içe geçmişse) temastadır.
            // 0.25 (25cm) tolerans veriyoruz ki hafif kaymalarda bile desteği görsün.
            if (Math.abs(dist - optimalDist) < 0.25) {
                contactCount++;
            }
        }
    }

    // 1 temas noktası bile varsa (üst üste kule veya yan destek) kabul et.
    // Petek yapıda genelde 2 temas olur ama kenarlarda 1 olabilir.
    return contactCount >= 1;
  }
}
