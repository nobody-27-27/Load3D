import { ICargoItem, IContainer, IPlacedItem, IPackingResult } from '../types';
import { PatternEvaluator } from '../math/PatternEvaluator';
import { PrecisePlacer } from '../math/PrecisePlacer';
// ÖNEMLİ: Yeni algoritmayı import ediyoruz
import { calculateCoilLoading } from '../../utils/packingAlgorithm';

export class PackingEngine {
  private config = {
    maxPatternGenerationTime: 1000, // ms
    timeout: 5000 // 5 saniye zaman aşımı
  };

  public async calculatePacking(
    items: ICargoItem[],
    container: IContainer
  ): Promise<IPackingResult> {
    console.log('Hesaplama başladı...', { itemCount: items.length, container });
    
    const startTime = performance.now();
    let placedItems: IPlacedItem[] = [];
    let unplacedItems: ICargoItem[] = [...items];

    // Gruplama (Aynı boyuttaki ürünleri grupla)
    const groups = this.groupItems(items);

    for (const group of groups) {
      if (performance.now() - startTime > this.config.timeout) {
        console.warn('Zaman aşımı!');
        break;
      }

      // --- RULO (ROLL) İÇİN ÖZEL KONTROL ---
      if (group[0].type === 'roll' && group[0].rollDimensions) {
        console.log("Rulo algoritması çalıştırılıyor...");
        
        // Bizim yazdığımız matematiksel fonksiyonu çağır
        const algoResult = calculateCoilLoading(
          {
            width: container.dimensions.width,
            height: container.dimensions.height,
            length: container.dimensions.length
          },
          {
            id: group[0].id,
            diameter: group[0].rollDimensions.diameter,
            length: group[0].rollDimensions.length,
            quantity: group.length,
            weight: group[0].weight
          }
        );

        // Sonuçları PackingEngine formatına dönüştür
        algoResult.placed.forEach((p, idx) => {
          if (idx < group.length) {
            const originalItem = group[idx];
            placedItems.push({
              itemId: originalItem.id,
              item: originalItem,
              position: p.position,
              rotation: p.rotation,
              dimensions: {
                 // Görselleştirme için bounding box boyutları
                 length: originalItem.rollDimensions!.length, // Silindir boyu (Z ekseninde)
                 width: originalItem.rollDimensions!.diameter, // Çap
                 height: originalItem.rollDimensions!.diameter // Çap
              },
              orientation: 'horizontal'
            });
          }
        });

        // Yerleşemeyenleri güncelle
        // Yerleşen sayısı kadar ürünü listeden düşüyoruz
        const placedCount = algoResult.placed.length;
        // Bu gruptan kalanlar (eğer sığmayan varsa)
        // Not: Basitlik için tamamını placed sayıyoruz, kalanları unplaced listesine eklemiyoruz
        // Eğer unplaced yönetimi gerekirse burayı detaylandırabiliriz.
        
        // Bu gruptaki ürünleri unplaced listesinden çıkar
        unplacedItems = unplacedItems.filter(ui => !placedItems.find(pi => pi.itemId === ui.id));

        continue; // Rulo grubu bitti, sonraki gruba geç
      }
      // --- RULO BİTİŞ ---

      // DİĞER TİPLER (KUTU, PALET) İÇİN ESKİ MANTIK
      const result = this.tryPatternPackingForGroup(group, container, placedItems);
      placedItems = [...placedItems, ...result.placed];
      
      // Yerleşenleri unplaced listesinden çıkar
      const placedIds = new Set(result.placed.map(p => p.itemId));
      unplacedItems = unplacedItems.filter(item => !placedIds.has(item.id));
    }

    return {
      containerId: container.id,
      placedItems,
      unplacedItems,
      metrics: this.calculateMetrics(placedItems, container)
    };
  }

  private groupItems(items: ICargoItem[]): ICargoItem[][] {
    const groups: { [key: string]: ICargoItem[] } = {};
    
    items.forEach(item => {
      // Gruplama anahtarı: Boyutlar + Tip
      let key = `${item.type}`;
      if (item.type === 'box' || item.type === 'pallet') {
        key += `-${item.dimensions.length}x${item.dimensions.width}x${item.dimensions.height}`;
      } else if (item.type === 'roll' && item.rollDimensions) {
        key += `-${item.rollDimensions.diameter}x${item.rollDimensions.length}`;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.values(groups);
  }

  private tryPatternPackingForGroup(
    items: ICargoItem[],
    container: IContainer,
    existingPlaced: IPlacedItem[]
  ): { placed: IPlacedItem[]; remaining: ICargoItem[] } {
    if (items.length === 0) return { placed: [], remaining: [] };

    const itemType = items[0].type;
    const isPalletized = items[0].isPalletized;

    let evaluation = null;

    if (itemType === 'pallet' || (itemType === 'box' && isPalletized)) {
      evaluation = PatternEvaluator.evaluatePalletPatterns(
        items,
        container,
        this.config.maxPatternGenerationTime
      );
    } else if (itemType === 'box') {
      evaluation = PatternEvaluator.evaluateBoxPatterns(
        items,
        container,
        this.config.maxPatternGenerationTime
      );
    }

    if (!evaluation || evaluation.slots.length === 0) {
      return { placed: [], remaining: items };
    }

    return PrecisePlacer.placeItemsFromSlots(
      items,
      evaluation.slots,
      container,
      existingPlaced
    );
  }

  private calculateMetrics(placedItems: IPlacedItem[], container: IContainer) {
    const totalVolume = container.dimensions.length * container.dimensions.width * container.dimensions.height;
    
    let usedVolume = 0;
    placedItems.forEach(p => {
        if(p.item.type === 'roll' && p.item.rollDimensions) {
            // Silindir hacmi: pi * r^2 * h
            const r = p.item.rollDimensions.diameter / 2;
            usedVolume += Math.PI * r * r * p.item.rollDimensions.length;
        } else {
            usedVolume += p.item.dimensions.length * p.item.dimensions.width * p.item.dimensions.height;
        }
    });

    return {
      usedVolume,
      totalVolume,
      utilizationPercentage: (usedVolume / totalVolume) * 100,
      placedCount: placedItems.length,
      unplacedCount: 0 // Hesaplaması yukarıda yapılmalı
    };
  }
}
