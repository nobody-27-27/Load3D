export type CargoType = 'box' | 'roll' | 'pallet';

export type RollOrientation = 'vertical' | 'horizontal';

export type ContainerPresetType = '20DC' | '40DC' | '40HC' | 'TRUCK';

export interface IContainerPreset {
  id: string;
  name: string;
  type: ContainerPresetType;
  length: number;
  width: number;
  height: number;
  maxWeight: number;
  isDefault: boolean;
}

export interface IVector3 {
  x: number;
  y: number;
  z: number;
}

export interface IDimensions {
  length: number;
  width: number;
  height: number;
}

export interface IRollDimensions {
  diameter: number;
  length: number;
}

export interface ICargoItem {
  id: string;
  type: CargoType;
  name: string;
  weight?: number;
  quantity: number;
  dimensions?: IDimensions;
  rollDimensions?: IRollDimensions;
  stackable?: boolean;
  fragile?: boolean;
  isPalletized?: boolean;
  color?: string;
}

export interface IContainer {
  id: string;
  name: string;
  dimensions: IDimensions;
  maxWeight: number;
}

export interface IPlacedItem {
  itemId: string;
  item: ICargoItem;
  position: IVector3;
  rotation: number;
  orientation?: RollOrientation;
  dimensions: IDimensions;
}

export interface ILoadingResult {
  placedItems: IPlacedItem[];
  unplacedItems: ICargoItem[];
  utilizationPercent: number;
  totalWeight: number;
  executionTime: number;
}

export interface ISpaceOccupancy {
  position: IVector3;
  dimensions: IDimensions;
}

export interface IActiveLayer {
  zStart: number;
  zEnd: number;
  occupiedSpaces: ISpaceOccupancy[];
}

export interface IPackingContext {
  container: IContainer;
  placedItems: IPlacedItem[];
  activeLayer: IActiveLayer;
}
