import type { IActiveLayer, IDimensions, IVector3 } from '../types';

export class SpaceCalculator {
  static findAvailableSpaces(layer: IActiveLayer): IVector3[] {
    return [];
  }

  static calculateVolumeUtilization(
    placedVolume: number,
    containerVolume: number
  ): number {
    return (placedVolume / containerVolume) * 100;
  }

  static getItemVolume(dimensions: IDimensions): number {
    return dimensions.length * dimensions.width * dimensions.height;
  }
}
