import type { ICargoItem, IPackingContext, IVector3, IDimensions } from '../types';
import type { IPackingStrategy } from './IPackingStrategy';
import { GeometryUtils } from '../math/GeometryUtils';
import { PatternGenerator } from '../math/PatternGenerator';

interface CornerPoint {
  position: IVector3;
  score: number;
}

export class BoxStrategy implements IPackingStrategy {
  findBestPosition(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; dimensions?: IDimensions } | null {
    const { container, placedItems } = context;
    const itemDims = item.dimensions;
    if (!itemDims) return null;

    const tryPatternBased = placedItems.length === 0 || item.isPalletized;

    if (tryPatternBased) {
      const patternResult = this.tryPatternBasedPlacement(item, context);
      if (patternResult) return patternResult;
    }

    const cornerPoints = this.generateCornerPoints(placedItems, container.dimensions);

    const orientations = this.getOrientations(itemDims, item.palletDimensions);

    for (const corner of cornerPoints) {
      for (const orientation of orientations) {
        if (this.canPlaceAt(item, corner.position, orientation.dimensions, context)) {
          return {
            position: corner.position,
            rotation: orientation.rotation,
            dimensions: orientation.dimensions
          };
        }
      }
    }

    return null;
  }

  private tryPatternBasedPlacement(
    item: ICargoItem,
    context: IPackingContext
  ): { position: IVector3; rotation: number; dimensions: IDimensions } | null {
    const patterns = PatternGenerator.generateBoxPatterns(
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

    for (const slot of slots) {
      if (this.canPlaceAt(item, slot.position, slot.dimensions, context)) {
        return {
          position: slot.position,
          rotation: slot.rotation,
          dimensions: slot.dimensions
        };
      }
    }

    return null;
  }

  private generateCornerPoints(placedItems: any[], containerDims: IDimensions): CornerPoint[] {
    const corners: CornerPoint[] = [];

    if (placedItems.length === 0) {
      corners.push({
        position: { x: 0, y: 0, z: 0 },
        score: 0
      });
      return corners;
    }

    const pointSet = new Set<string>();

    pointSet.add('0,0,0');

    for (const item of placedItems) {
      const pos = item.position;
      const dims = item.dimensions;

      const candidatePoints = [
        { x: pos.x + dims.length, y: pos.y, z: pos.z },
        { x: pos.x, y: pos.y, z: pos.z + dims.width },
        { x: pos.x, y: pos.y + dims.height, z: pos.z },
      ];

      for (const point of candidatePoints) {
        if (point.x <= containerDims.length &&
            point.y <= containerDims.height &&
            point.z <= containerDims.width) {
          const key = `${point.x},${point.y},${point.z}`;
          pointSet.add(key);
        }
      }
    }

    for (const key of pointSet) {
      const [x, y, z] = key.split(',').map(Number);
      const position = { x, y, z };

      if (!this.isPointInsidePlacedItem(position, placedItems)) {
        const score = y * 1000000 + x * 1000 + z;
        corners.push({ position, score });
      }
    }

    corners.sort((a, b) => a.score - b.score);

    return corners;
  }

  private isPointInsidePlacedItem(point: IVector3, placedItems: any[]): boolean {
    for (const item of placedItems) {
      const pos = item.position;
      const dims = item.dimensions;

      if (point.x > pos.x && point.x < pos.x + dims.length &&
          point.y > pos.y && point.y < pos.y + dims.height &&
          point.z > pos.z && point.z < pos.z + dims.width) {
        return true;
      }
    }
    return false;
  }

  private getOrientations(dims: IDimensions, palletDims?: IDimensions): Array<{ rotation: number; dimensions: IDimensions }> {
    if (palletDims) {
      const totalHeight = dims.height + palletDims.height;
      const allOrientations = [
        { rotation: 0, dimensions: { length: palletDims.length, width: palletDims.width, height: totalHeight } },
        { rotation: 90, dimensions: { length: palletDims.width, width: palletDims.length, height: totalHeight } }
      ];

      const seen = new Set<string>();
      const uniqueOrientations = allOrientations.filter((o) => {
        const key = `${o.dimensions.length},${o.dimensions.width},${o.dimensions.height}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return uniqueOrientations;
    }

    const allOrientations = [
      { rotation: 0, dimensions: { length: dims.length, width: dims.width, height: dims.height } },
      { rotation: 0, dimensions: { length: dims.length, width: dims.height, height: dims.width } },
      { rotation: 0, dimensions: { length: dims.width, width: dims.length, height: dims.height } },
      { rotation: 0, dimensions: { length: dims.width, width: dims.height, height: dims.length } },
      { rotation: 0, dimensions: { length: dims.height, width: dims.length, height: dims.width } },
      { rotation: 0, dimensions: { length: dims.height, width: dims.width, height: dims.length } }
    ];

    const seen = new Set<string>();
    const uniqueOrientations = allOrientations.filter((o) => {
      const key = `${o.dimensions.length},${o.dimensions.width},${o.dimensions.height}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    uniqueOrientations.sort((a, b) => {
      const heightDiff = a.dimensions.height - b.dimensions.height;
      if (heightDiff !== 0) return heightDiff;

      const areaA = a.dimensions.length * a.dimensions.width;
      const areaB = b.dimensions.length * b.dimensions.width;
      return areaB - areaA;
    });

    return uniqueOrientations;
  }

  canPlaceAt(
    item: ICargoItem,
    position: IVector3,
    dimensions: IDimensions,
    context: IPackingContext
  ): boolean {
    const { container, placedItems } = context;

    if (!GeometryUtils.isWithinBounds(position, dimensions, container.dimensions)) return false;

    if (item.isPalletized && position.y > 0.01) {
      return false;
    }

    for (const other of placedItems) {
      if (GeometryUtils.checkIntersection(position, dimensions, other.position, other.dimensions)) {
        return false;
      }
    }

    if (position.y > 0.01 && !this.hasSupport(position, dimensions, placedItems)) {
      return false;
    }

    return true;
  }

  private hasSupport(pos: IVector3, dims: IDimensions, placedItems: any[]): boolean {
    const supportThreshold = 0.75;
    const boxBottomArea = dims.length * dims.width;
    let supportedArea = 0;

    const epsilon = 0.01;
    const supportY = pos.y - epsilon;

    for (const item of placedItems) {
      const itemTop = item.position.y + item.dimensions.height;

      if (Math.abs(itemTop - pos.y) < epsilon) {
        const overlapX = Math.max(0,
          Math.min(pos.x + dims.length, item.position.x + item.dimensions.length) -
          Math.max(pos.x, item.position.x)
        );

        const overlapZ = Math.max(0,
          Math.min(pos.z + dims.width, item.position.z + item.dimensions.width) -
          Math.max(pos.z, item.position.z)
        );

        supportedArea += overlapX * overlapZ;
      }
    }

    return (supportedArea / boxBottomArea) >= supportThreshold;
  }
}
