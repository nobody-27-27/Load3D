import type { ICargoItem, IPackingContext, IVector3, IDimensions } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';

export class PalletStrategy implements IPackingStrategy {
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; dimensions?: IDimensions } | null {
    const { container } = context;
    const itemDims = item.dimensions;
    if (!itemDims) return null;

    const orientations = [
      { rotation: 0, dimensions: itemDims },
      { rotation: 90, dimensions: { length: itemDims.width, width: itemDims.length, height: itemDims.height } }
    ];

    const step = 0.5;

    for (const orientation of orientations) {
      const maxX = container.dimensions.length - orientation.dimensions.length;
      const maxZ = container.dimensions.width - orientation.dimensions.width;

      if (maxX < 0 || maxZ < 0) continue;

      for (let x = 0; x <= maxX; x += step) {
        for (let z = 0; z <= maxZ; z += step) {
          const candidatePos = { x, y: 0, z };

          if (this.canPlaceAt(candidatePos, orientation.dimensions, context)) {
            return {
              position: candidatePos,
              rotation: orientation.rotation,
              dimensions: orientation.dimensions
            };
          }
        }
      }
    }

    return null;
  }

  canPlaceAt(
    position: IVector3,
    dimensions: IDimensions,
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;

    if (!GeometryUtils.isWithinBounds(position, dimensions, container.dimensions)) {
      return false;
    }

    for (const other of placedItems) {
      if (GeometryUtils.checkIntersection(
        position, dimensions,
        other.position, other.dimensions
      )) {
        return false;
      }
    }

    return true;
  }
}
