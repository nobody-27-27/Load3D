import type { IContainerPreset } from '../types';

export const DEFAULT_CONTAINERS: Record<string, IContainerPreset> = {
  '20DC': {
    id: '20dc-default',
    name: '20ft Dry Container',
    type: '20DC',
    length: 590,
    width: 235,
    height: 237,
    maxWeight: 28000,
    isDefault: true,
  },
  '40DC': {
    id: '40dc-default',
    name: '40ft Dry Container',
    type: '40DC',
    length: 1198,
    width: 235,
    height: 235,
    maxWeight: 29000,
    isDefault: true,
  },
  '40HC': {
    id: '40hc-default',
    name: '40ft High Cube',
    type: '40HC',
    length: 1198,
    width: 235,
    height: 269,
    maxWeight: 29000,
    isDefault: true,
  },
  TRUCK: {
    id: 'truck-default',
    name: 'Truck',
    type: 'TRUCK',
    length: 1360,
    width: 242,
    height: 260,
    maxWeight: 24000,
    isDefault: true,
  },
};

export const CM_TO_M = 0.01;
export const M_TO_CM = 100;

export function convertCmToM(cm: number): number {
  return cm * CM_TO_M;
}

export function convertMToCm(m: number): number {
  return Math.round(m * M_TO_CM);
}

export function formatDimensions(length: number, width: number, height: number, unit: 'cm' | 'm' = 'cm'): string {
  if (unit === 'm') {
    const l = convertCmToM(length).toFixed(2);
    const w = convertCmToM(width).toFixed(2);
    const h = convertCmToM(height).toFixed(2);
    return `${l}m × ${w}m × ${h}m`;
  }
  return `${length}cm × ${width}cm × ${height}cm`;
}

export function calculateVolume(length: number, width: number, height: number): number {
  return (length * width * height) / 1000000;
}
