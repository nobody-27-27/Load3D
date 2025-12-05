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

    const step = 0.1;

    for (let y = 0; y <= container.dimensions.height - itemDims.height; y += step) {
      for (let z = 0; z <= container.dimensions.width - itemDims.width; z += step) {
        for (let x = 0; x <= container.dimensions.length - itemDims.length; x += step) {
          const candidatePos = { x, y, z };

          if (this.canPlaceAt(item, candidatePos, 0, context)) {
            return {
              position: candidatePos,
              rotation: 0,
              dimensions: itemDims
            };
          }

          if (itemDims.length !== itemDims.width) {
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

    if (!GeometryUtils.isWithinBounds(position, currentDims, container.dimensions)) {
      return false;
    }

    for (const other of placedItems) {
      if (GeometryUtils.checkIntersection(
        position, currentDims,
        other.position, other.dimensions
      )) {
        return false;
      }
    }

    if (position.y > 0 && !this.hasSupport(position, currentDims, placedItems)) {
      return false;
    }

    return true;
  }

  private hasSupport(
    position: IVector3,
    dimensions: IDimensions,
    placedItems: any[]
  ): boolean {
    const supportThreshold = 0.15;

    for (const other of placedItems) {
      const isBelowCurrentItem = Math.abs((other.position.y + other.dimensions.height) - position.y) < supportThreshold;

      if (isBelowCurrentItem) {
        const overlapX = Math.min(position.x + dimensions.length, other.position.x + other.dimensions.length) -
                        Math.max(position.x, other.position.x);
        const overlapZ = Math.min(position.z + dimensions.width, other.position.z + other.dimensions.width) -
                        Math.max(position.z, other.position.z);

        if (overlapX > 0 && overlapZ > 0) {
          const supportArea = overlapX * overlapZ;
          const requiredArea = dimensions.length * dimensions.width;

          if (supportArea >= requiredArea * 0.6) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
