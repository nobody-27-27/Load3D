import type { ICargoItem, IContainer, ILoadingResult, IPlacedItem, IPackingContext } from '../types';
import { BoxStrategy } from '../strategies/BoxStrategy';
import { RollStrategy } from '../strategies/RollStrategy';
import { PalletStrategy } from '../strategies/PalletStrategy';
import type { IPackingStrategy } from '../strategies/IPackingStrategy';

export class PackingEngine {
  private boxStrategy: IPackingStrategy;
  private rollStrategy: IPackingStrategy;
  private palletStrategy: IPackingStrategy;

  constructor() {
    this.boxStrategy = new BoxStrategy();
    this.rollStrategy = new RollStrategy();
    this.palletStrategy = new PalletStrategy();
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

    const sortedItems = [...items].sort((a, b) => {
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

    for (const item of sortedItems) {
      const strategy = this.getStrategy(item.type);

      const context: IPackingContext = {
        container,
        placedItems,
        activeLayer: { zStart: 0, zEnd: 0, occupiedSpaces: [] }
      };

      const result = strategy.findBestPosition(item, context);

      if (result) {
        placedItems.push({
          itemId: item.id,
          item: item,
          position: result.position,
          rotation: result.rotation,
          dimensions: result.dimensions || item.dimensions!,
          orientation: (result as any).orientation || 'horizontal'
        });
      } else {
        unplacedItems.push(item);
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
}
