import type { ICargoItem, IContainer, ILoadingResult, IPlacedItem } from '../types';
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
    const unplacedItems: ICargoItem[] = [...items];

    const endTime = performance.now();

    return {
      placedItems,
      unplacedItems,
      utilizationPercent: 0,
      totalWeight: 0,
      executionTime: endTime - startTime,
    };
  }
}
