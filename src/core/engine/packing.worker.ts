import { PackingEngine } from './PackingEngine';
import type { ICargoItem, IContainer, ILoadingResult } from '../types';

interface WorkerMessage {
  type: 'START_PACKING';
  payload: {
    items: ICargoItem[];
    container: IContainer;
  };
}

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === 'START_PACKING') {
    const engine = new PackingEngine();
    const result: ILoadingResult = engine.run(payload.items, payload.container);

    self.postMessage({
      type: 'PACKING_COMPLETE',
      payload: result,
    });
  }
};
