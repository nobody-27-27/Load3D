import { useState } from 'react';
import { Box, Package, Cylinder, Play, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useLoadingStore } from '../store/useLoadingStore';
import type { ICargoItem } from '../core/types';
import { ContainerSelector } from './ContainerSelector';
import { ContainerEditor } from './ContainerEditor';
import { CargoItemForm } from './CargoItemForm';

export function Sidebar() {
  const {
    container,
    cargoItems,
    setCargoItems,
    addCargoItem,
    removeCargoItem,
    startCalculation,
    isCalculating,
    loadingResult,
  } = useLoadingStore();

  const [showForm, setShowForm] = useState(false);

  const addSampleItems = () => {
    const sampleItems: ICargoItem[] = [
      {
        id: 'box-1',
        type: 'box',
        name: 'Box 1',
        weight: 100,
        quantity: 1,
        dimensions: { length: 1.2, width: 0.8, height: 1.0 },
        stackable: true,
        color: '#10b981',
      },
      {
        id: 'box-2',
        type: 'box',
        name: 'Box 2',
        weight: 150,
        quantity: 1,
        dimensions: { length: 1.5, width: 1.0, height: 1.2 },
        stackable: true,
        color: '#3b82f6',
      },
      {
        id: 'pallet-1',
        type: 'pallet',
        name: 'Pallet 1',
        weight: 50,
        quantity: 1,
        dimensions: { length: 1.2, width: 0.8, height: 0.15 },
        color: '#f59e0b',
      },
    ];

    setCargoItems([...cargoItems, ...sampleItems]);
  };

  const clearItems = () => {
    setCargoItems([]);
  };

  const handleStartCalculation = () => {
    startCalculation();
  };

  const handleAddItem = (item: ICargoItem) => {
    addCargoItem(item);
    setShowForm(false);
  };

  const handleDeleteItem = (id: string) => {
    removeCargoItem(id);
  };

  return (
    <div className="w-80 bg-slate-800 text-white p-6 flex flex-col h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">3D Container Loading</h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Container</h2>
        <div className="bg-slate-700 rounded-lg p-4 space-y-4">
          <ContainerSelector />
          <ContainerEditor />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Cargo Items ({cargoItems.length})</h2>
          <button
            onClick={clearItems}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            title="Clear all items"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg p-3 flex items-center justify-center gap-2 font-semibold transition-colors"
          >
            {showForm ? (
              <>
                <ChevronUp size={20} />
                Hide Form
              </>
            ) : (
              <>
                <Plus size={20} />
                Add Cargo Item
              </>
            )}
          </button>

          {showForm && (
            <CargoItemForm onAdd={handleAddItem} onCancel={() => setShowForm(false)} />
          )}

          <button
            onClick={addSampleItems}
            className="w-full bg-slate-700 hover:bg-slate-600 rounded-lg p-3 transition-colors text-sm"
          >
            Add Sample Items
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {cargoItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-700 rounded-lg p-3 flex items-center gap-3 border-l-4"
              style={{ borderLeftColor: item.color || '#64748b' }}
            >
              {item.type === 'box' && <Package size={20} style={{ color: item.color || '#10b981' }} />}
              {item.type === 'roll' && <Cylinder size={20} style={{ color: item.color || '#3b82f6' }} />}
              {item.type === 'pallet' && <Box size={20} style={{ color: item.color || '#f59e0b' }} />}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-slate-400">
                  {item.weight} kg × {item.quantity}
                </div>
              </div>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="p-1.5 hover:bg-slate-600 rounded transition-colors"
                title="Delete item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-700">
        <button
          onClick={handleStartCalculation}
          disabled={cargoItems.length === 0 || isCalculating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg p-4 flex items-center justify-center gap-2 font-semibold transition-colors"
        >
          {isCalculating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Calculating...
            </>
          ) : (
            <>
              <Play size={20} />
              Start Calculation
            </>
          )}
        </button>

        {loadingResult && (
          <div className="mt-4 bg-slate-700 rounded-lg p-4 space-y-2 text-sm">
            <div className="font-semibold mb-2">Results:</div>
            <div className="flex justify-between">
              <span className="text-slate-400">Placed:</span>
              <span className="text-green-400">{loadingResult.placedItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Unplaced:</span>
              <span className="text-red-400">{loadingResult.unplacedItems.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Utilization:</span>
              <span>{loadingResult.utilizationPercent.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Time:</span>
              <span>{loadingResult.executionTime.toFixed(2)}ms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
