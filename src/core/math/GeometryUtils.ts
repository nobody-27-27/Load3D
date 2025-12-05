import type { IVector3, IDimensions } from '../types';

export class GeometryUtils {
  static checkIntersection(
    pos1: IVector3,
    dim1: IDimensions,
    pos2: IVector3,
    dim2: IDimensions
  ): boolean {
    return false;
  }

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
