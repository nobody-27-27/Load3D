import type { IVector3, IDimensions } from '../types';

export class GeometryUtils {
  private static readonly EPSILON = 0.001;

  /**
   * Checks if two cuboids (Axis-Aligned Bounding Boxes) intersect.
   */
  static checkIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    pos2: IVector3,
    dim2: IDimensions
  ): boolean {
    const eps = this.EPSILON;

    const box1MinX = pos1.x;
    const box1MaxX = pos1.x + dim1.length;
    const box1MinY = pos1.y;
    const box1MaxY = pos1.y + dim1.height;
    const box1MinZ = pos1.z;
    const box1MaxZ = pos1.z + dim1.width;

    const box2MinX = pos2.x;
    const box2MaxX = pos2.x + dim2.length;
    const box2MinY = pos2.y;
    const box2MaxY = pos2.y + dim2.height;
    const box2MinZ = pos2.z;
    const box2MaxZ = pos2.z + dim2.width;

    return (
      box1MinX < box2MaxX - eps &&
      box1MaxX > box2MinX + eps &&
      box1MinY < box2MaxY - eps &&
      box1MaxY > box2MinY + eps &&
      box1MinZ < box2MaxZ - eps &&
      box1MaxZ > box2MinZ + eps
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
    const eps = this.EPSILON;

    return (
      position.x >= -eps &&
      position.y >= -eps &&
      position.z >= -eps &&
      position.x + dimensions.length <= containerDimensions.length + eps &&
      position.y + dimensions.height <= containerDimensions.height + eps &&
      position.z + dimensions.width <= containerDimensions.width + eps
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
