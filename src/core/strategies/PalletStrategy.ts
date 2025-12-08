import type { ICargoItem, IPackingContext, IVector3, IDimensions } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';
import { PatternGenerator } from '../math/PatternGenerator';

export class PalletStrategy implements IPackingStrategy {
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; dimensions?: IDimensions } | null {
    const { container } = context;
    const itemDims = item.dimensions;
    if (!itemDims) return null;

    let baseDims = itemDims;
    if (item.palletDimensions) {
      baseDims = {
        length: item.palletDimensions.length,
        width: item.palletDimensions.width,
        height: itemDims.height + item.palletDimensions.height
      };
    }

    const tryPatternBased = context.placedItems.length === 0;

    if (tryPatternBased) {
      const patternResult = this.tryPatternBasedPlacement(item, baseDims, context);
      if (patternResult) return patternResult;
    }

    const orientations = [
      { rotation: 0, dimensions: baseDims },
      { rotation: 90, dimensions: { length: baseDims.width, width: baseDims.length, height: baseDims.height } }
    ];

    const step = 0.5;

    for (const orientation of orientations) {
      const maxX = container.dimensions.length - orientation.dimensions.length;
      const maxZ = container.dimensions.width - orientation.dimensions.width;

      if (maxX < 0 || maxZ < 0) continue;

      for (let x = 0; x <= maxX; x += step) {
        for (let z = 0; z <= maxZ; z += step) {
          const candidatePos = { x, y: 0, z };

          if (this.canPlaceAt(item, candidatePos, orientation.dimensions, context)) {
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

  private tryPatternBasedPlacement(
    item: ICargoItem,
    baseDims: IDimensions,
    context: IPackingContext
  ): { position: IVector3; rotation: number; dimensions: IDimensions } | null {
    const patterns = PatternGenerator.generatePalletPatterns(
      item.dimensions!,
      item.palletDimensions,
      context.container.dimensions,
      1
    );

    if (patterns.length === 0) return null;

    const bestPattern = patterns[0];
    const slots = PatternGenerator.generatePlacementSlots(
      bestPattern,
      item.dimensions!,
      item.palletDimensions,
      context.container.dimensions,
      item.isPalletized || false
    );

    if (slots.length === 0) return null;

    const slot = slots[0];

    if (this.canPlaceAt(item, slot.position, slot.dimensions, context)) {
      return {
        position: slot.position,
        rotation: slot.rotation,
        dimensions: slot.dimensions
      };
    }

    return null;
  }

  canPlaceAt(
    item: ICargoItem,
    position: IVector3,
    dimensions: IDimensions,
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;

    if (!GeometryUtils.isWithinBounds(position, dimensions, container.dimensions)) {
      return false;
    }

    if (item.isPalletized && position.y > 0.01) {
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
