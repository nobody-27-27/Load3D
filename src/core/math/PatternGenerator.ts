import type { IDimensions, IVector3 } from '../types';

export interface IRowPattern {
  rowWidth: number;
  itemOrientation: 'length' | 'width';
  itemsPerRow: number;
}

export interface ILayoutPattern {
  rows: IRowPattern[];
  totalItems: number;
  utilizationScore: number;
}

export interface IPlacementSlot {
  position: IVector3;
  dimensions: IDimensions;
  rotation: number;
}

export class PatternGenerator {
  static generatePalletPatterns(
    itemDims: IDimensions,
    palletDims: IDimensions | undefined,
    containerDims: IDimensions,
    itemCount: number
  ): ILayoutPattern[] {
    const patterns: ILayoutPattern[] = [];

    const baseDims = palletDims ? {
      length: palletDims.length,
      width: palletDims.width,
      height: itemDims.height + palletDims.height
    } : itemDims;

    const containerLength = containerDims.length;
    const containerWidth = containerDims.width;

    const lengthOriented = {
      itemLength: baseDims.length,
      itemWidth: baseDims.width
    };

    const widthOriented = {
      itemLength: baseDims.width,
      itemWidth: baseDims.length
    };

    const maxRowsLength = Math.floor(containerWidth / lengthOriented.itemWidth);
    const maxRowsWidth = Math.floor(containerWidth / widthOriented.itemWidth);

    for (let rowsL = 0; rowsL <= Math.min(maxRowsLength, 5); rowsL++) {
      for (let rowsW = 0; rowsW <= Math.min(maxRowsWidth, 5); rowsW++) {
        const usedWidth = (rowsL * lengthOriented.itemWidth) + (rowsW * widthOriented.itemWidth);

        if (usedWidth > containerWidth + 0.1) continue;
        if (rowsL === 0 && rowsW === 0) continue;

        const itemsPerRowL = Math.floor(containerLength / lengthOriented.itemLength);
        const itemsPerRowW = Math.floor(containerLength / widthOriented.itemLength);

        const totalItems = (rowsL * itemsPerRowL) + (rowsW * itemsPerRowW);

        if (totalItems === 0) continue;

        const rows: IRowPattern[] = [];

        for (let i = 0; i < rowsL; i++) {
          rows.push({
            rowWidth: lengthOriented.itemWidth,
            itemOrientation: 'length',
            itemsPerRow: itemsPerRowL
          });
        }

        for (let i = 0; i < rowsW; i++) {
          rows.push({
            rowWidth: widthOriented.itemWidth,
            itemOrientation: 'width',
            itemsPerRow: itemsPerRowW
          });
        }

        const utilization = (usedWidth / containerWidth) * 100;

        patterns.push({
          rows,
          totalItems,
          utilizationScore: utilization
        });
      }
    }

    patterns.sort((a, b) => {
      if (a.totalItems !== b.totalItems) {
        return b.totalItems - a.totalItems;
      }
      return b.utilizationScore - a.utilizationScore;
    });

    return patterns.slice(0, 15);
  }

  static generateBoxPatterns(
    itemDims: IDimensions,
    palletDims: IDimensions | undefined,
    containerDims: IDimensions,
    itemCount: number
  ): ILayoutPattern[] {
    const patterns: ILayoutPattern[] = [];

    const baseDims = palletDims ? {
      length: palletDims.length,
      width: palletDims.width,
      height: itemDims.height + palletDims.height
    } : itemDims;

    const orientations = this.getAllOrientations(baseDims);

    for (const primaryOrientation of orientations.slice(0, 6)) {
      const lengthFit = Math.floor(containerDims.length / primaryOrientation.length);
      const widthFit = Math.floor(containerDims.width / primaryOrientation.width);
      const itemsInLayer = lengthFit * widthFit;

      if (itemsInLayer === 0) continue;

      const layers = Math.floor(containerDims.height / primaryOrientation.height);
      const totalItems = itemsInLayer * layers;

      if (totalItems === 0) continue;

      const usedVolume = totalItems * (primaryOrientation.length * primaryOrientation.width * primaryOrientation.height);
      const containerVolume = containerDims.length * containerDims.width * containerDims.height;
      const utilization = (usedVolume / containerVolume) * 100;

      patterns.push({
        rows: [{
          rowWidth: primaryOrientation.width,
          itemOrientation: 'length',
          itemsPerRow: lengthFit
        }],
        totalItems,
        utilizationScore: utilization
      });
    }

    patterns.sort((a, b) => {
      if (a.totalItems !== b.totalItems) {
        return b.totalItems - a.totalItems;
      }
      return b.utilizationScore - a.utilizationScore;
    });

    return patterns.slice(0, 10);
  }

  static generatePlacementSlots(
    pattern: ILayoutPattern,
    itemDims: IDimensions,
    palletDims: IDimensions | undefined,
    containerDims: IDimensions,
    isPalletized: boolean = false
  ): IPlacementSlot[] {
    const slots: IPlacementSlot[] = [];

    const baseDims = palletDims ? {
      length: palletDims.length,
      width: palletDims.width,
      height: itemDims.height + palletDims.height
    } : itemDims;

    let currentZ = 0;

    for (const row of pattern.rows) {
      if (currentZ >= containerDims.width) break;

      const itemLength = row.itemOrientation === 'length' ? baseDims.length : baseDims.width;
      const itemWidth = row.itemOrientation === 'length' ? baseDims.width : baseDims.length;
      const rotation = row.itemOrientation === 'length' ? 0 : 90;

      for (let i = 0; i < row.itemsPerRow; i++) {
        const x = i * itemLength;

        if (x + itemLength > containerDims.length + 0.1) break;

        slots.push({
          position: { x, y: 0, z: currentZ },
          dimensions: {
            length: itemLength,
            width: itemWidth,
            height: baseDims.height
          },
          rotation
        });
      }

      currentZ += row.rowWidth;
    }

    return slots;
  }

  private static getAllOrientations(dims: IDimensions): IDimensions[] {
    const allOrientations = [
      { length: dims.length, width: dims.width, height: dims.height },
      { length: dims.length, width: dims.height, height: dims.width },
      { length: dims.width, width: dims.length, height: dims.height },
      { length: dims.width, width: dims.height, height: dims.length },
      { length: dims.height, width: dims.length, height: dims.width },
      { length: dims.height, width: dims.width, height: dims.length }
    ];

    const seen = new Set<string>();
    return allOrientations.filter((o) => {
      const key = `${o.length},${o.width},${o.height}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
