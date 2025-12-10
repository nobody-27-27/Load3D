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
    
    // --- GÜVENLİK KONTROLÜ 1: Veri Doğrulama ---
    let rollDiameter = 0;
    let rollLength = 0;

    if (item.rollDimensions) {
      rollDiameter = item.rollDimensions.diameter;
      rollLength = item.rollDimensions.length;
    } else if (item.dimensions) {
      // Fallback: Boyutların en küçüğünü çap kabul et
      rollDiameter = Math.min(item.dimensions.length, item.dimensions.width);
      rollLength = item.dimensions.height;
    }

    // Paletli ürün kontrolü
    if (item.palletDimensions) {
      const totalHeight = rollLength + item.palletDimensions.height;
      rollDiameter = Math.max(item.palletDimensions.length, item.palletDimensions.width); 
      rollLength = totalHeight; 
    }

    // KRİTİK: Eğer boyutlar 0 veya geçersiz ise işlem yapma (Sonsuz döngüyü önler)
    if (!rollDiameter || rollDiameter <= 0.01 || !rollLength || rollLength <= 0.01) {
      console.warn(`[RollStrategy] Geçersiz rulo boyutları: Çap=${rollDiameter}, Uzunluk=${rollLength}`);
      return null;
    }

    const orientations = this.getOrientations(rollDiameter, rollLength, item.isPalletized);

    // 2. Aday Noktaları Oluştur
    const candidatePoints = this.generateCandidatePoints(placedItems, container.dimensions, rollDiameter, rollLength);

    // Eğer hiç nokta üretilemediyse log bas
    if (candidatePoints.length === 0) {
       // console.warn('[RollStrategy] Hiç uygun nokta bulunamadı. Konteyner dolu veya rulo çok büyük.');
       return null;
    }

    // 3. En İyi Noktayı Bul
    for (const point of candidatePoints) {
      for (const orient of orientations) {
        // Lattice noktaları kesindir, kaydırma yapmadan dene
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
    // 1. DİK (Vertical)
    options.push({
      dimensions: { length: diameter, width: diameter, height: length },
      rotation: 0,
      orientation: 'vertical'
    });
    
    // 2. YATAY (Horizontal) - Eğer paletli değilse
    if (!isPalletized) {
      // X Ekseni boyunca
      options.push({
        dimensions: { length: length, width: diameter, height: diameter },
        rotation: 0,
        orientation: 'horizontal'
      });
      // Z Ekseni boyunca
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
      // Sınır Güvenliği (Toleranslı)
      const TOL = 0.01; 
      if (x < -TOL || y < -TOL || z < -TOL) return;
      if (x > containerDims.length + TOL || y > containerDims.height + TOL || z > containerDims.width + TOL) return;

      const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
      if (!pointSet.has(key)) {
        pointSet.add(key);
        // Sıralama Puanı: En alt (Y), En arka (Z), En sol (X) öncelikli
        const score = (y * 10000) + (z * 100) + x;
        points.push({ position: { x, y, z }, score, type: 'lattice' });
      }
    };

    // --- SIKIŞIK PETEK (DENSE LATTICE) ÜRETİMİ ---
    const hexStep = diameter * 0.8660254; // sin(60) * D
    const radius = diameter / 2;

    // GÜVENLİK: hexStep çok küçükse sonsuz döngüye girer.
    if (hexStep < 0.01) return [];

    // Kapasite Tahmini: Hangi yönde daha çok sığar? (X vs Z)
    // Basit bir alan hesabı yerine, kaç sıra sığdığını hesaplıyoruz.
    
    // Z-Yönlü Kapasite (Mevcut favori)
    const zRowsCount = Math.floor((containerDims.width - diameter) / hexStep) + 2; 
    const xColsCount = Math.floor(containerDims.length / diameter) + 1;
    const capZ = zRowsCount * xColsCount;

    // X-Yönlü Kapasite
    const xRowsCount = Math.floor((containerDims.length - diameter) / hexStep) + 2;
    const zColsCount = Math.floor(containerDims.width / diameter) + 1;
    const capX = xRowsCount * zColsCount;

    // Hangisi daha verimliyse onu kullan
    const useXPattern = capX > capZ;

    if (!useXPattern) {
        // DESEN Z: Satırlar Z ekseni boyunca (Derinlemesine)
        for (let row = 0; row < zRowsCount; row++) {
          const z = row * hexStep;
          // Tek satırlarda kaydırma (Zigzag)
          const xOffset = (row % 2 === 1) ? radius : 0;
          
          for (let col = 0; col < xColsCount; col++) {
            const x = (col * diameter) + xOffset;
            
            // Zemin Noktası
            addPoint(x, 0, z);
            
            // Üst Üste İstifleme (Kule)
            let yStack = length;
            // Güvenlik: length çok küçükse döngüye girme
            if (length > 0.1) {
                while (yStack + length <= containerDims.height + 0.05) { // +0.05 tolerans
                   addPoint(x, yStack, z);
                   yStack += length;
                }
            }
          }
        }
    } else {
        // DESEN X: Satırlar X ekseni boyunca (Enlemesine)
        for (let row = 0; row < xRowsCount; row++) {
            const x = row * hexStep;
            const zOffset = (row % 2 === 1) ? radius : 0;

            for (let col = 0; col < zColsCount; col++) {
                const z = (col * diameter) + zOffset;
                
                // Zemin Noktası
                addPoint(x, 0, z);
                
                // Üst Üste İstifleme
                let yStack = length;
                if (length > 0.1) {
                    while (yStack + length <= containerDims.height + 0.05) {
                        addPoint(x, yStack, z);
                        yStack += length;
                    }
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

    // 1. Sınır Kontrolü
    if (!GeometryUtils.isWithinBounds(pos, dimensions, container.dimensions)) return false;

    // 2. Çarpışma Kontrolü
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

    // 3. Destek Kontrolü
    // ZEMİN KATI İÇİN DESTEK ARANMAZ (Y < 0.01)
    if (pos.y < 0.01) {
        return true; 
    }

    // Üst katlar için destek kontrolü
    if (!this.hasSufficientSupport(pos, dimensions, orientationType, placedItems)) {
        return false;
    }
    
    // Kural: Yatay üstü Dik OLMAZ
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

    // Kutu üstündeyse -> Alan
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

    // Rulo üstündeyse -> Köprü (Bridge) Teması
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
            
            // Tolerans: 25cm'ye kadar boşluk olsa bile dengede say (Sıkışık düzende bu gereklidir)
            if (Math.abs(dist - optimalDist) < 0.25) {
                contactCount++;
            }
        }
    }

    return contactCount >= 1;
  }
}
