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

        // For back-to-front filling: itemsPerRow represents positions across width
        const itemsPerRowL = Math.floor(containerWidth / lengthOriented.itemWidth);
        const itemsPerRowW = Math.floor(containerWidth / widthOriented.itemWidth);

        const depthPositions = Math.floor(containerLength / Math.max(lengthOriented.itemLength, widthOriented.itemLength));
        const totalItems = ((rowsL * itemsPerRowL) + (rowsW * itemsPerRowW)) * depthPositions;

        if (totalItems === 0) continue;

        const rows: IRowPattern[] = [];

        for (let i = 0; i < rowsL; i++) {
          rows.push({
            rowWidth: lengthOriented.itemLength,
            itemOrientation: 'length',
            itemsPerRow: itemsPerRowL
          });
        }

        for (let i = 0; i < rowsW; i++) {
          rows.push({
            rowWidth: widthOriented.itemLength,
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

    for (const orientation of orientations) {
      const lengthOriented = {
        itemLength: orientation.length,
        itemWidth: orientation.width,
        itemHeight: orientation.height
      };

      const widthOriented = {
        itemLength: orientation.width,
        itemWidth: orientation.length,
        itemHeight: orientation.height
      };

      const configs = [
        { lengthRows: 1, widthRows: 0 },
        { lengthRows: 0, widthRows: 1 }
      ];

      const maxLengthRows = Math.floor(containerDims.width / lengthOriented.itemWidth);
      const maxWidthRows = Math.floor(containerDims.width / widthOriented.itemWidth);

      if (maxLengthRows > 1 && maxWidthRows > 0) {
        for (let lr = 1; lr <= Math.min(maxLengthRows, 3); lr++) {
          for (let wr = 0; wr <= Math.min(maxWidthRows, 3); wr++) {
            if (lr === 1 && wr === 0) continue;
            if (lr === 0 && wr === 1) continue;
            const usedWidth = (lr * lengthOriented.itemWidth) + (wr * widthOriented.itemWidth);
            if (usedWidth <= containerDims.width + 0.01) {
              configs.push({ lengthRows: lr, widthRows: wr });
            }
          }
        }
      }

      for (const config of configs) {
        const rows: IRowPattern[] = [];
        // For back-to-front filling: itemsPerRow represents positions across container WIDTH
        // not positions along container LENGTH
        const itemsPerRowL = Math.floor(containerDims.width / lengthOriented.itemWidth);
        const itemsPerRowW = Math.floor(containerDims.width / widthOriented.itemWidth);

        for (let i = 0; i < config.lengthRows; i++) {
          rows.push({
            rowWidth: lengthOriented.itemLength,
            itemOrientation: 'length',
            itemsPerRow: itemsPerRowL
          });
        }

        for (let i = 0; i < config.widthRows; i++) {
          rows.push({
            rowWidth: widthOriented.itemLength,
            itemOrientation: 'width',
            itemsPerRow: itemsPerRowW
          });
        }

        if (rows.length === 0) continue;

        const itemsInLayer = (config.lengthRows * itemsPerRowL) + (config.widthRows * itemsPerRowW);
        if (itemsInLayer === 0) continue;

        const layers = Math.floor(containerDims.height / orientation.height);
        const depthPositions = Math.floor(containerDims.length / orientation.length);
        const totalItems = itemsInLayer * layers * depthPositions;

        if (totalItems === 0) continue;

        const usedVolume = totalItems * (orientation.length * orientation.width * orientation.height);
        const containerVolume = containerDims.length * containerDims.width * containerDims.height;
        const utilization = (usedVolume / containerVolume) * 100;

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

    const maxLayers = isPalletized ? 1 : Math.floor(containerDims.height / baseDims.height);

    // Calculate depth positions based on first row dimensions
    if (pattern.rows.length === 0) return slots;

    const firstRow = pattern.rows[0];
    const depthIncrement = firstRow.itemOrientation === 'length' ? baseDims.length : baseDims.width;
    const maxDepthPositions = Math.floor(containerDims.length / depthIncrement);

    // Back-to-front filling: iterate depth (X) first, then height (Y), then width (Z)
    for (let depthPos = 0; depthPos < maxDepthPositions; depthPos++) {
      const x = depthPos * depthIncrement;

      if (x + depthIncrement > containerDims.length + 0.01) break;

      for (let layer = 0; layer < maxLayers; layer++) {
        const y = layer * baseDims.height;

        if (y + baseDims.height > containerDims.height + 0.01) break;

        let currentZ = 0;

        for (const row of pattern.rows) {
          const rowItemLength = row.itemOrientation === 'length' ? baseDims.length : baseDims.width;
          const rowItemWidth = row.itemOrientation === 'length' ? baseDims.width : baseDims.length;
          const rowRotation = row.itemOrientation === 'length' ? 0 : 90;

          if (currentZ + rowItemWidth > containerDims.width + 0.01) break;

          for (let i = 0; i < row.itemsPerRow; i++) {
            const z = currentZ + (i * rowItemWidth);

            if (z + rowItemWidth > containerDims.width + 0.01) break;

            slots.push({
              position: { x, y, z },
              dimensions: {
                length: rowItemLength,
                width: rowItemWidth,
                height: baseDims.height
              },
              rotation: rowRotation
            });
          }

          currentZ += row.rowWidth;
        }
      }
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
