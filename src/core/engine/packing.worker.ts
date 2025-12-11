import { PackingEngine } from './PackingEngine';
import type { ICargoItem, IContainer, ILoadingResult } from '../types';

interface WorkerMessage {
  type: 'START_PACKING';
  payload: {
    items: ICargoItem[];
    container: IContainer;
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'START_PACKING') {
    const engine = new PackingEngine();
    
    try {
      // DÜZELTME: engine.run() yerine engine.calculatePacking() kullanıyoruz
      // Ve bu işlem asenkron (async) olduğu için 'await' ekliyoruz.
      const packingResult = await engine.calculatePacking(payload.items, payload.container);

      // PackingEngine'den gelen sonucu, Frontend'in beklediği formata (ILoadingResult) çeviriyoruz
      const result: ILoadingResult = {
        placedItems: packingResult.placedItems,
        unplacedItems: packingResult.unplacedItems,
        utilizationPercent: packingResult.metrics.utilizationPercentage,
        totalWeight: 0, // Ağırlık hesabı gerekirse buraya eklenebilir
        executionTime: 0 // Süre hesabı gerekirse buraya eklenebilir
      };

      self.postMessage({
        type: 'PACKING_COMPLETE',
        payload: result,
      });
    } catch (error) {
      console.error("Worker Calculation Error:", error);
      // Hata durumunda boş sonuç dönerek uygulamanın kilitlenmesini önle
      self.postMessage({
        type: 'PACKING_COMPLETE',
        payload: {
          placedItems: [],
          unplacedItems: payload.items,
          utilizationPercent: 0,
          totalWeight: 0,
          executionTime: 0
        } as ILoadingResult,
      });
    }
  }
};
