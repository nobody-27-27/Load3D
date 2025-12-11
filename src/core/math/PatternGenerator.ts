import type { IDimensions, IVector3 } from '../types';

export interface IRowPattern {
  rowWidth: number;
  itemOrientation: 'length' | 'width';
  itemsPerRow: number;
}

export interface ILayoutPattern {
  rows: IRowPattern[];
  totalItems: number;
  utilizationScore: number;
  orientation: IDimensions;
  // Rulo için özel etiketler (Opsiyonel olarak eklenip pattern tipini ayırt etmemizi sağlar)
  patternType?: 'box' | 'vertical-honeycomb' | 'horizontal-honeycomb' | 'hybrid'; 
}

export interface IPlacementSlot {
  position: IVector3;
  dimensions: IDimensions;
  rotation: number;
  orientation?: 'vertical' | 'horizontal'; // Rulo için eklendi
}

export class PatternGenerator {
  // ... (Mevcut generatePalletPatterns ve generateBoxPatterns metodları AYNEN KALIYOR) ...
  static generatePalletPatterns(
    itemDims: IDimensions,
    palletDims: IDimensions | undefined,
    containerDims: IDimensions,
    itemCount: number
  ): ILayoutPattern[] {
    const patterns: ILayoutPattern[] = [];

    const baseDims = palletDims ? {
      length: palletDims.length,
      width: palletDims.width,
      height: itemDims.height + palletDims.height
    } : itemDims;

    const containerLength = containerDims.length;
    const containerWidth = containerDims.width;

    const lengthOriented = {
      itemLength: baseDims.length,
      itemWidth: baseDims.width
    };

    const widthOriented = {
      itemLength: baseDims.width,
      itemWidth: baseDims.length
    };

    const maxRowsLength = Math.floor(containerWidth / lengthOriented.itemWidth);
    const maxRowsWidth = Math.floor(containerWidth / widthOriented.itemWidth);

    for (let rowsL = 0; rowsL <= Math.min(maxRowsLength, 5); rowsL++) {
      for (let rowsW = 0; rowsW <= Math.min(maxRowsWidth, 5); rowsW++) {
        const usedWidth = (rowsL * lengthOriented.itemWidth) + (rowsW * widthOriented.itemWidth);

        if (usedWidth > containerWidth + 0.1) continue;
        if (rowsL === 0 && rowsW === 0) continue;

        // For back-to-front filling: itemsPerRow represents positions across width
        const itemsPerRowL = Math.floor(containerWidth / lengthOriented.itemWidth);
        const itemsPerRowW = Math.floor(containerWidth / widthOriented.itemWidth);

        const depthPositions = Math.floor(containerLength / Math.max(lengthOriented.itemLength, widthOriented.itemLength));
        const totalItems = ((rowsL * itemsPerRowL) + (rowsW * itemsPerRowW)) * depthPositions;

        if (totalItems === 0) continue;

        const rows: IRowPattern[] = [];

        for (let i = 0; i < rowsL; i++) {
          rows.push({
            rowWidth: lengthOriented.itemLength,
            itemOrientation: 'length',
            itemsPerRow: itemsPerRowL
          });
        }

        for (let i = 0; i < rowsW; i++) {
          rows.push({
            rowWidth: widthOriented.itemLength,
            itemOrientation: 'width',
            itemsPerRow: itemsPerRowW
          });
        }

        const utilization = (usedWidth / containerWidth) * 100;

        patterns.push({
          rows,
          totalItems,
          utilizationScore: utilization,
          orientation: baseDims
        });
      }
    }

    patterns.sort((a, b) => {
      if (a.totalItems !== b.totalItems) {
        return b.totalItems - a.totalItems;
      }
      return b.utilizationScore - a.utilizationScore;
    });

    return patterns.slice(0, 15);
  }

  static generateBoxPatterns(
    itemDims: IDimensions,
    palletDims: IDimensions | undefined,
    containerDims: IDimensions,
    itemCount: number
  ): ILayoutPattern[] {
    const patterns: ILayoutPattern[] = [];

    const baseDims = palletDims ? {
      length: palletDims.length,
      width: palletDims.width,
      height: itemDims.height + palletDims.height
    } : itemDims;

    const orientations = this.getAllOrientations(baseDims);

    for (const orientation of orientations) {
      const lengthOriented = {
        itemLength: orientation.length,
        itemWidth: orientation.width,
        itemHeight: orientation.height
      };

      const widthOriented = {
        itemLength: orientation.width,
        itemWidth: orientation.length,
        itemHeight: orientation.height
      };

      const configs = [
        { lengthRows: 1, widthRows: 0 },
        { lengthRows: 0, widthRows: 1 }
      ];

      const maxLengthRows = Math.floor(containerDims.width / lengthOriented.itemWidth);
      const maxWidthRows = Math.floor(containerDims.width / widthOriented.itemWidth);

      if (maxLengthRows > 1 && maxWidthRows > 0) {
        for (let lr = 1; lr <= Math.min(maxLengthRows, 3); lr++) {
          for (let wr = 0; wr <= Math.min(maxWidthRows, 3); wr++) {
            if (lr === 1 && wr === 0) continue;
            if (lr === 0 && wr === 1) continue;
            const usedWidth = (lr * lengthOriented.itemWidth) + (wr * widthOriented.itemWidth);
            if (usedWidth <= containerDims.width + 0.01) {
              configs.push({ lengthRows: lr, widthRows: wr });
            }
          }
        }
      }

      for (const config of configs) {
        const rows: IRowPattern[] = [];
        const itemsPerRowL = Math.floor(containerDims.width / lengthOriented.itemWidth);
        const itemsPerRowW = Math.floor(containerDims.width / widthOriented.itemWidth);

        for (let i = 0; i < config.lengthRows; i++) {
          rows.push({
            rowWidth: lengthOriented.itemLength,
            itemOrientation: 'length',
            itemsPerRow: itemsPerRowL
          });
        }

        for (let i = 0; i < config.widthRows; i++) {
          rows.push({
            rowWidth: widthOriented.itemLength,
            itemOrientation: 'width',
            itemsPerRow: itemsPerRowW
          });
        }

        if (rows.length === 0) continue;

        const itemsInLayer = (config.lengthRows * itemsPerRowL) + (config.widthRows * itemsPerRowW);
        if (itemsInLayer === 0) continue;

        const layers = Math.floor(containerDims.height / orientation.height);
        const depthPositions = Math.floor(containerDims.length / orientation.length);
        const totalItems = itemsInLayer * layers * depthPositions;

        if (totalItems === 0) continue;

        const usedVolume = totalItems * (orientation.length * orientation.width * orientation.height);
        const containerVolume = containerDims.length * containerDims.width * containerDims.height;
        const utilization = (usedVolume / containerVolume) * 100;

        patterns.push({
          rows,
          totalItems,
          utilizationScore: utilization,
          orientation: orientation,
          patternType: 'box'
        });
      }
    }

    patterns.sort((a, b) => {
      if (a.totalItems !== b.totalItems) {
        return b.totalItems - a.totalItems;
      }
      return b.utilizationScore - a.utilizationScore;
    });

    return patterns.slice(0, 10);
  }

  // ... (Mevcut generatePlacementSlots ve getAllOrientations metodları AYNEN KALIYOR) ...
  static generatePlacementSlots(
    pattern: ILayoutPattern,
    itemDims: IDimensions,
    palletDims: IDimensions | undefined,
    containerDims: IDimensions,
    isPalletized: boolean = false
  ): IPlacementSlot[] {
    const slots: IPlacementSlot[] = [];

    const baseDims = pattern.orientation;

    const maxLayers = isPalletized ? 1 : Math.floor(containerDims.height / baseDims.height);

    if (pattern.rows.length === 0) return slots;

    const firstRow = pattern.rows[0];
    const depthIncrement = firstRow.itemOrientation === 'length' ? baseDims.length : baseDims.width;
    const maxDepthPositions = Math.floor(containerDims.length / depthIncrement);

    const itemWidth = firstRow.itemOrientation === 'length' ? baseDims.width : baseDims.length;
    const itemLength = firstRow.itemOrientation === 'length' ? baseDims.length : baseDims.width;
    const itemRotation = firstRow.itemOrientation === 'length' ? 0 : 90;
    const widthPositions = Math.floor(containerDims.width / itemWidth);

    for (let depthPos = 0; depthPos < maxDepthPositions; depthPos++) {
      const x = depthPos * depthIncrement;

      if (x + depthIncrement > containerDims.length + 0.01) break;

      for (let layer = 0; layer < maxLayers; layer++) {
        const y = layer * baseDims.height;

        if (y + baseDims.height > containerDims.height + 0.01) break;

        for (let widthPos = 0; widthPos < widthPositions; widthPos++) {
          const z = widthPos * itemWidth;

          if (z + itemWidth > containerDims.width + 0.01) break;

          slots.push({
            position: { x, y, z },
            dimensions: {
              length: itemLength,
              width: itemWidth,
              height: baseDims.height
            },
            rotation: itemRotation
          });
        }
      }
    }

    return slots;
  }

  private static getAllOrientations(dims: IDimensions): IDimensions[] {
    const allOrientations = [
      { length: dims.length, width: dims.width, height: dims.height },
      { length: dims.length, width: dims.height, height: dims.width },
      { length: dims.width, width: dims.length, height: dims.height },
      { length: dims.width, width: dims.height, height: dims.length },
      { length: dims.height, width: dims.length, height: dims.width },
      { length: dims.height, width: dims.width, height: dims.length }
    ];

    const seen = new Set<string>();
    return allOrientations.filter((o) => {
      const key = `${o.length},${o.width},${o.height}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ==========================================
  // YENİ EKLENEN RULO (ROLL) MANTIĞI
  // ==========================================

  static generateRollPatterns(
    diameter: number,
    length: number,
    containerDims: IDimensions
  ): ILayoutPattern[] {
    const patterns: ILayoutPattern[] = [];

    // Senaryo 1: Sadece Dikey (Vertical) - Honeycomb (Petek)
    // Eğer rulo dik sığmıyorsa bu senaryo otomatik elenir.
    if (length <= containerDims.height) {
        const slotsV = this.calculateHoneycombSlots(containerDims, diameter, length, 'vertical');
        patterns.push({
            rows: [], // Ruloda row mantığı karmaşık, slots üzerinden gidiyoruz
            totalItems: slotsV.length,
            utilizationScore: this.calcUtilization(slotsV, diameter, length, containerDims),
            orientation: { length: diameter, width: diameter, height: length },
            patternType: 'vertical-honeycomb'
        });
    }

    // Senaryo 2: Sadece Yatay (Horizontal) - Log Stacking (Oluklu İstif)
    // Z eksenine paralel yatırma
    if (length <= containerDims.length) {
        const slotsHZ = this.calculateHoneycombSlots(containerDims, diameter, length, 'horizontal-z');
        patterns.push({
            rows: [],
            totalItems: slotsHZ.length,
            utilizationScore: this.calcUtilization(slotsHZ, diameter, length, containerDims),
            orientation: { length: length, width: diameter, height: diameter },
            patternType: 'horizontal-honeycomb'
        });
    }

    // Senaryo 3: Hibrit (Hybrid) - Dik Zemin + Yatay Tavan
    // Önce zemini dik doldur, kalan yüksekliğe yatay at.
    if (length <= containerDims.height) {
        const slotsBase = this.calculateHoneycombSlots(containerDims, diameter, length, 'vertical');
        const remainingHeight = containerDims.height - length;
        
        // Eğer tepede en az 1 sıra yatay rulo sığacak yer varsa
        if (remainingHeight >= diameter) {
            // Tavan için sanal bir konteyner oluştur (sadece Y ekseni farklı)
            const topContainer = { ...containerDims, height: remainingHeight };
            // Yatayları bu boşluğa doldur, ama Y pozisyonlarını yukarı ötele
            const slotsTop = this.calculateHoneycombSlots(topContainer, diameter, length, 'horizontal-z')
                .map(s => ({
                    ...s,
                    position: { ...s.position, y: s.position.y + length }
                }));
            
            const totalSlots = [...slotsBase, ...slotsTop];
            patterns.push({
                rows: [],
                totalItems: totalSlots.length,
                utilizationScore: this.calcUtilization(totalSlots, diameter, length, containerDims),
                orientation: { length: diameter, width: diameter, height: length },
                patternType: 'hybrid'
            });
        }
    }

    // En çok ürün alanı en başa al
    return patterns.sort((a, b) => b.totalItems - a.totalItems);
  }

  // Rulo Yerleşim Slotlarını Hesaplayan "Akıllı Petek" Fonksiyonu
  static generateRollPlacementSlots(
    pattern: ILayoutPattern,
    diameter: number,
    length: number,
    containerDims: IDimensions
  ): IPlacementSlot[] {
      // Pattern tipine göre yeniden hesapla veya önbelleklenmiş datayı kullan
      // Burada dinamik olarak tekrar hesaplıyoruz:
      
      if (pattern.patternType === 'vertical-honeycomb') {
          return this.calculateHoneycombSlots(containerDims, diameter, length, 'vertical');
      } 
      else if (pattern.patternType === 'horizontal-honeycomb') {
           // Yatayda hem Z'ye hem X'e hizalıyı deneyip en iyisini seçebiliriz ama şimdilik Z (standart)
           return this.calculateHoneycombSlots(containerDims, diameter, length, 'horizontal-z');
      }
      else if (pattern.patternType === 'hybrid') {
          const slotsBase = this.calculateHoneycombSlots(containerDims, diameter, length, 'vertical');
          const remainingHeight = containerDims.height - length;
          if (remainingHeight >= diameter) {
               const topContainer = { ...containerDims, height: remainingHeight };
               const slotsTop = this.calculateHoneycombSlots(topContainer, diameter, length, 'horizontal-z')
                .map(s => ({
                    ...s,
                    position: { ...s.position, y: s.position.y + length }
                }));
               return [...slotsBase, ...slotsTop];
          }
          return slotsBase;
      }
      return [];
  }

  private static calculateHoneycombSlots(
      container: IDimensions, 
      d: number, 
      l: number, 
      mode: 'vertical' | 'horizontal-z'
  ): IPlacementSlot[] {
      const slots: IPlacementSlot[] = [];
      const r = d / 2;
      const hexStep = d * 0.8660254; // sin(60) * d -> Katlar arası yükseklik/mesafe

      if (mode === 'vertical') {
          // X-Z düzleminde petek döşeme
          const colsX = Math.floor((container.length - (d - hexStep)) / hexStep); 
          // Not: İlk sıra tam çap kaplar, sonrakiler sıkışır. Basit hesap:
          
          let rowCountZ = 0;
          let zPos = 0;
          
          while (zPos + d <= container.width + 0.01) {
              const isOffsetRow = rowCountZ % 2 === 1;
              const xStart = isOffsetRow ? d : r; // Offsetli sıra r kadar içerden başlar (veya d)
              // Burada sıkıştırma mantığı:
              // X ekseninde düz dizelim, Z ekseninde zig zag yapalım (veya tam tersi)
              
              // Basit Petek: 
              // Sıra 1 (Z=0): O O O O
              // Sıra 2 (Z=0.86d):  O O O
              
              let xPos = isOffsetRow ? (r + 0.01) : 0;
              while (xPos + d <= container.length + 0.01) {
                  slots.push({
                      position: { x: xPos, y: 0, z: zPos },
                      dimensions: { length: d, width: d, height: l }, // Kapladığı alan (Bounding Box)
                      rotation: 0,
                      orientation: 'vertical'
                  });
                  xPos += d; // Yan yana bitişik
              }
              
              zPos += hexStep; // Bir sonraki sıra "oluğa" girer
              rowCountZ++;
          }
          
      } else if (mode === 'horizontal-z') {
          // Y-X düzleminde üst üste istifleme (Tomruk gibi)
          // Rulolar Z eksenine paralel uzanır.
          
          let layerY = 0;
          let layerIndex = 0;
          
          while (layerY + d <= container.height + 0.01) {
              const isOffsetLayer = layerIndex % 2 === 1;
              let xPos = isOffsetLayer ? r : 0;
              
              while (xPos + d <= container.length + 0.01) {
                  // Z ekseni boyunca kaç tane sığar? (Arka arkaya değil, tek parça uzunsa)
                  // Eğer rulo boyu (l) konteyner genişliğinden (width) küçükse, arka arkaya da dizebiliriz.
                  // Şimdilik boydan boya tek sıra kabul edelim veya Grid döşeyelim.
                  
                  let zPos = 0;
                  while(zPos + l <= container.width + 0.01) {
                      slots.push({
                          position: { x: xPos, y: layerY, z: zPos },
                          dimensions: { length: d, width: l, height: d }, // Yatik
                          rotation: 90, // Z eksenine paralel
                          orientation: 'horizontal'
                      });
                      zPos += l;
                  }
                  
                  xPos += d;
              }
              
              layerY += hexStep; // Üst kat oluğa oturur
              layerIndex++;
          }
      }

      return slots;
  }

  private static calcUtilization(slots: IPlacementSlot[], d: number, l: number, c: IDimensions): number {
      const volItem = Math.PI * (d/2)**2 * l;
      const volTotal = slots.length * volItem;
      const volCont = c.length * c.width * c.height;
      return (volTotal / volCont) * 100;
  }
}
