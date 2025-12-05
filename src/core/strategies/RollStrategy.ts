import type { ICargoItem, IPackingContext, IVector3, IDimensions } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';

export class RollStrategy implements IPackingStrategy {
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; orientation: string; dimensions: IDimensions } | null {
    const { container } = context;

    let dims: IDimensions;

    if (item.rollDimensions) {
        const d = item.rollDimensions.diameter;
        dims = { length: d, width: d, height: item.rollDimensions.length };
    } else if (item.dimensions) {
        dims = item.dimensions;
    } else {
        return null;
    }

    const step = 0.5;
    const maxX = container.dimensions.length - dims.length;
    const maxZ = container.dimensions.width - dims.width;

    if (maxX < 0 || maxZ < 0) return null;

    for (let x = 0; x <= maxX; x += step) {
      for (let z = 0; z <= maxZ; z += step) {
          const pos = { x, y: 0, z };

          if (this.canPlaceAt(pos, dims, context)) {
              return {
                  position: pos,
                  rotation: 0,
                  orientation: 'vertical',
                  dimensions: dims
              };
          }
      }
    }

    return null;
  }

  canPlaceAt(pos: IVector3, dims: IDimensions, context: IPackingContext): boolean {
      if (!GeometryUtils.isWithinBounds(pos, dims, context.container.dimensions)) return false;

      for (const other of context.placedItems) {
          if (GeometryUtils.checkIntersection(pos, dims, other.position, other.dimensions)) return false;
      }
      return true;
  }
}
