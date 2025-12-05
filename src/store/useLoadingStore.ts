import { create } from 'zustand';
import type { ICargoItem, IContainer, ILoadingResult } from '../core/types';
import { WorkerHandler } from '../core/engine/WorkerHandler';

interface LoadingStore {
  container: IContainer;
  cargoItems: ICargoItem[];
  loadingResult: ILoadingResult | null;
  isCalculating: boolean;
  workerHandler: WorkerHandler;

  setContainer: (container: IContainer) => void;
  setCargoItems: (items: ICargoItem[]) => void;
  startCalculation: () => Promise<void>;
  resetCalculation: () => void;
}

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  container: {
    id: 'container-1',
    name: '40ft Container',
    dimensions: {
      length: 12,
      width: 2.4,
      height: 2.4,
    },
    maxWeight: 26000,
  },
  cargoItems: [],
  loadingResult: null,
  isCalculating: false,
  workerHandler: new WorkerHandler(),

  setContainer: (container) => set({ container }),

  setCargoItems: (items) => set({ cargoItems: items }),

  startCalculation: async () => {
    const { cargoItems, container, workerHandler } = get();

    if (cargoItems.length === 0) {
      return;
    }

    set({ isCalculating: true, loadingResult: null });

    try {
      const result = await workerHandler.startPacking(cargoItems, container);
      set({ loadingResult: result, isCalculating: false });
    } catch (error) {
      console.error('Packing calculation failed:', error);
      set({ isCalculating: false });
    }
  },

  resetCalculation: () => set({ loadingResult: null }),
}));
