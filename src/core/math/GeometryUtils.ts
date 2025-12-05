import type { IVector3, IDimensions } from '../types';

export class GeometryUtils {
  /**
   * Checks if two cuboids (Axis-Aligned Bounding Boxes) intersect.
   */
  static checkIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    pos2: IVector3,
    dim2: IDimensions
  ): boolean {
    return (
      pos1.x < pos2.x + dim2.length &&
      pos1.x + dim1.length > pos2.x &&
      pos1.y < pos2.y + dim2.height &&
      pos1.y + dim1.height > pos2.y &&
      pos1.z < pos2.z + dim2.width &&
      pos1.z + dim1.width > pos2.z
    );
  }

  /**
   * Checks if an item fits within the container boundaries.
   */
  static isWithinBounds(
    position: IVector3,
    dimensions: IDimensions,
    containerDimensions: IDimensions
  ): boolean {
    return (
      position.x >= 0 &&
      position.y >= 0 &&
      position.z >= 0 &&
      position.x + dimensions.length <= containerDimensions.length &&
      position.y + dimensions.height <= containerDimensions.height &&
      position.z + dimensions.width <= containerDimensions.width
    );
  }

  /**
   * Swaps length and width dimensions for rotation (90 degrees).
   */
  static rotateDimensions(
    dimensions: IDimensions,
    rotation: number
  ): IDimensions {
    if (rotation === 90 || rotation === 270) {
      return {
        length: dimensions.width,
        width: dimensions.length,
        height: dimensions.height,
      };
    }
    return dimensions;
  }
}
