import type { ICargoItem, IContainer, ILoadingResult, IPlacedItem, IPackingContext } from '../types';
import { BoxStrategy } from '../strategies/BoxStrategy';
import { RollStrategy } from '../strategies/RollStrategy';
import { PalletStrategy } from '../strategies/PalletStrategy';
import type { IPackingStrategy } from '../strategies/IPackingStrategy';
import { PatternEvaluator } from '../math/PatternEvaluator';
import { PrecisePlacer } from '../math/PrecisePlacer';

export interface IPackingConfig {
  enablePatternPacking: boolean;
  maxPatternGenerationTime: number;
  minItemsForPatterns: number;
}

export class PackingEngine {
  private boxStrategy: IPackingStrategy;
  private rollStrategy: IPackingStrategy;
  private palletStrategy: IPackingStrategy;
  private config: IPackingConfig;

  constructor(config?: Partial<IPackingConfig>) {
    this.boxStrategy = new BoxStrategy();
    this.rollStrategy = new RollStrategy();
    this.palletStrategy = new PalletStrategy();
    this.config = {
      enablePatternPacking: true,
      maxPatternGenerationTime: 3000,
      minItemsForPatterns: 5,
      ...config
    };
  }

  private getStrategy(type: string): IPackingStrategy {
    switch (type) {
      case 'box':
        return this.boxStrategy;
      case 'roll':
        return this.rollStrategy;
      case 'pallet':
        return this.palletStrategy;
      default:
        return this.boxStrategy;
    }
  }

  run(items: ICargoItem[], container: IContainer): ILoadingResult {
    const startTime = performance.now();
    const placedItems: IPlacedItem[] = [];
    const unplacedItems: ICargoItem[] = [];

    const expandedItems: ICargoItem[] = [];
    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        expandedItems.push({
          ...item,
          id: `${item.id}-${i}`,
          quantity: 1,
        });
      }
    }

    const sortedItems = expandedItems.sort((a, b) => {
        const getVol = (i: ICargoItem) => {
            if (i.rollDimensions) {
                const r = i.rollDimensions.diameter / 2;
                return Math.PI * r * r * i.rollDimensions.length;
            }
            if (i.dimensions) {
                return i.dimensions.length * i.dimensions.width * i.dimensions.height;
            }
            return 0;
        };
        return getVol(b) - getVol(a);
    });

    const itemGroups = this.groupIdenticalItems(sortedItems);

    for (const group of itemGroups) {
      if (this.config.enablePatternPacking &&
          group.items.length >= this.config.minItemsForPatterns &&
          (group.items[0].type === 'pallet' || group.items[0].type === 'box')) {

        const patternResult = this.tryPatternPackingForGroup(group.items, container, placedItems);

        if (patternResult.placed.length > 0) {
          placedItems.push(...patternResult.placed);
          unplacedItems.push(...patternResult.remaining);
          continue;
        }
      }

      for (const item of group.items) {
        const strategy = this.getStrategy(item.type);

        const context: IPackingContext = {
          container,
          placedItems,
          activeLayer: { zStart: 0, zEnd: 0, occupiedSpaces: [] }
        };

        const result = strategy.findBestPosition(item, context);

        if (result && result.dimensions) {
          placedItems.push({
            itemId: item.id,
            item: item,
            position: result.position,
            rotation: result.rotation,
            dimensions: result.dimensions,
            orientation: (result as any).orientation || 'horizontal'
          });
        } else {
          unplacedItems.push(item);
        }
      }
    }

    const endTime = performance.now();

    const containerVol = container.dimensions.length * container.dimensions.width * container.dimensions.height;
    const itemsVol = placedItems.reduce((acc, p) => acc + (p.dimensions.length * p.dimensions.width * p.dimensions.height), 0);

    return {
      placedItems,
      unplacedItems,
      utilizationPercent: containerVol > 0 ? (itemsVol / containerVol) * 100 : 0,
      totalWeight: placedItems.reduce((acc, p) => acc + (p.item.weight || 0), 0),
      executionTime: endTime - startTime,
    };
  }

  private groupIdenticalItems(items: ICargoItem[]): Array<{ key: string; items: ICargoItem[] }> {
    const groups = new Map<string, ICargoItem[]>();

    for (const item of items) {
      const key = this.getItemKey(item);

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(item);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
  }

  private getItemKey(item: ICargoItem): string {
    const dims = item.dimensions;
    const palletDims = item.palletDimensions;
    const rollDims = item.rollDimensions;

    return `${item.type}-${dims?.length}-${dims?.width}-${dims?.height}-${palletDims?.length}-${palletDims?.width}-${palletDims?.height}-${rollDims?.diameter}-${rollDims?.length}-${item.isPalletized}`;
  }

  private tryPatternPackingForGroup(
    items: ICargoItem[],
    container: IContainer,
    existingPlaced: IPlacedItem[]
  ): { placed: IPlacedItem[]; remaining: ICargoItem[] } {
    if (items.length === 0) return { placed: [], remaining: [] };

    const itemType = items[0].type;

    let evaluation = null;

    if (itemType === 'pallet') {
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
}
