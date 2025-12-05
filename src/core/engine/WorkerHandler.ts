import type { ICargoItem, IContainer, ILoadingResult } from '../types';

export class WorkerHandler {
  private worker: Worker | null = null;

  initialize() {
    this.worker = new Worker(
      new URL('./packing.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }

  startPacking(
    items: ICargoItem[],
    container: IContainer
  ): Promise<ILoadingResult> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.initialize();
      }

      if (!this.worker) {
        reject(new Error('Failed to initialize worker'));
        return;
      }

      this.worker.onmessage = (event) => {
        if (event.data.type === 'PACKING_COMPLETE') {
          resolve(event.data.payload);
        }
      };

      this.worker.onerror = (error) => {
        reject(error);
      };

      this.worker.postMessage({
        type: 'START_PACKING',
        payload: { items, container },
      });
    });
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
