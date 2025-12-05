import type { ICargoItem, IPackingContext, IVector3, IDimensions } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';

export class BoxStrategy implements IPackingStrategy {
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; dimensions?: IDimensions } | null {
    const { container } = context;
    const itemDims = item.dimensions;
    if (!itemDims) return null;

    const step = 5;

    for (let x = 0; x <= container.dimensions.length - itemDims.length; x += step) {
      for (let z = 0; z <= container.dimensions.width - itemDims.width; z += step) {
        for (let y = 0; y <= container.dimensions.height - itemDims.height; y += step) {

          const candidatePos = { x, y, z };

          if (this.canPlaceAt(item, candidatePos, 0, context)) {
            return { position: candidatePos, rotation: 0, dimensions: itemDims };
          }

          if (this.canPlaceAt(item, candidatePos, 90, context)) {
             return {
               position: candidatePos,
               rotation: 90,
               dimensions: GeometryUtils.rotateDimensions(itemDims, 90)
             };
          }
        }
      }
    }
    return null;
  }

  canPlaceAt(
    item: ICargoItem,
    position: IVector3,
    rotation: number,
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;
    const itemDims = item.dimensions;
    if (!itemDims) return false;

    const currentDims = GeometryUtils.rotateDimensions(itemDims, rotation);

    if (!GeometryUtils.isWithinBounds(position, currentDims, container.dimensions)) return false;

    for (const other of placedItems) {
      if (GeometryUtils.checkIntersection(position, currentDims, other.position, other.dimensions)) {
        return false;
      }
    }

    if (position.y > 0 && !this.hasSupport(position, currentDims, placedItems)) {
        return false;
    }

    return true;
  }

  private hasSupport(pos: IVector3, dims: IDimensions, placedItems: any[]): boolean {
      return true;
  }
}
