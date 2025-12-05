import type { ICargoItem, IPackingContext, IVector3 } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';

export class BoxStrategy implements IPackingStrategy {
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number } | null {
    return null;
  }

  canPlaceAt(
    item: ICargoItem,
    position: IVector3,
    rotation: number,
    context: IPackingContext
  ): boolean {
    return false;
  }
}
