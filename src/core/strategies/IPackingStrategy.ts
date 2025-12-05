import type { ICargoItem, IPackingContext, IVector3 } from '../types';

export interface IPackingStrategy {
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; orientation?: string } | null;

  canPlaceAt(
    item: ICargoItem,
    position: IVector3,
    rotation: number,
    context: IPackingContext
  ): boolean;
}
