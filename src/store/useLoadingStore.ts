import { create } from 'zustand';
import type { ICargoItem, IContainer, ILoadingResult, IContainerPreset } from '../core/types';
import { WorkerHandler } from '../core/engine/WorkerHandler';
import { fetchContainerPresets } from '../services/containerService';
import { convertCmToM, DEFAULT_CONTAINERS } from '../core/constants/containers';

interface LoadingStore {
  container: IContainer;
  cargoItems: ICargoItem[];
  loadingResult: ILoadingResult | null;
  isCalculating: boolean;
  workerHandler: WorkerHandler;
  containerPresets: IContainerPreset[];
  selectedPresetId: string;
  isLoadingPresets: boolean;

  setContainer: (container: IContainer) => void;
  setCargoItems: (items: ICargoItem[]) => void;
  addCargoItem: (item: ICargoItem) => void;
  removeCargoItem: (id: string) => void;
  updateCargoItem: (id: string, updates: Partial<ICargoItem>) => void;
  startCalculation: () => Promise<void>;
  resetCalculation: () => void;
  loadContainerPresets: () => Promise<void>;
  selectContainerPreset: (presetId: string) => void;
  updateContainerDimensions: (length: number, width: number, height: number, maxWeight: number) => void;
}

const defaultPreset = DEFAULT_CONTAINERS['40HC'];

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  container: {
    id: defaultPreset.id,
    name: defaultPreset.name,
    dimensions: {
      length: convertCmToM(defaultPreset.length),
      width: convertCmToM(defaultPreset.width),
      height: convertCmToM(defaultPreset.height),
    },
    maxWeight: defaultPreset.maxWeight,
  },
  cargoItems: [],
  loadingResult: null,
  isCalculating: false,
  workerHandler: new WorkerHandler(),
  containerPresets: Object.values(DEFAULT_CONTAINERS),
  selectedPresetId: defaultPreset.id,
  isLoadingPresets: false,

  setContainer: (container) => set({ container }),

  setCargoItems: (items) => set({ cargoItems: items }),

  addCargoItem: (item) => {
    const { cargoItems } = get();
    set({ cargoItems: [...cargoItems, item], loadingResult: null });
  },

  removeCargoItem: (id) => {
    const { cargoItems } = get();
    set({ cargoItems: cargoItems.filter((item) => item.id !== id), loadingResult: null });
  },

  updateCargoItem: (id, updates) => {
    const { cargoItems } = get();
    set({
      cargoItems: cargoItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
      loadingResult: null,
    });
  },

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

  loadContainerPresets: async () => {
    set({ isLoadingPresets: true });
    try {
      const presets = await fetchContainerPresets();
      if (presets.length > 0) {
        set({ containerPresets: presets });
      }
    } catch (error) {
      console.error('Failed to load container presets:', error);
    } finally {
      set({ isLoadingPresets: false });
    }
  },

  selectContainerPreset: (presetId: string) => {
    const { containerPresets } = get();
    const preset = containerPresets.find((p) => p.id === presetId);

    if (preset) {
      set({
        selectedPresetId: presetId,
        container: {
          id: preset.id,
          name: preset.name,
          dimensions: {
            length: convertCmToM(preset.length),
            width: convertCmToM(preset.width),
            height: convertCmToM(preset.height),
          },
          maxWeight: preset.maxWeight,
        },
        loadingResult: null,
      });
    }
  },

  updateContainerDimensions: (length: number, width: number, height: number, maxWeight: number) => {
    const { container } = get();
    set({
      container: {
        ...container,
        name: 'Custom Container',
        dimensions: {
          length: convertCmToM(length),
          width: convertCmToM(width),
          height: convertCmToM(height),
        },
        maxWeight,
      },
      selectedPresetId: 'custom',
      loadingResult: null,
    });
  },
}));
