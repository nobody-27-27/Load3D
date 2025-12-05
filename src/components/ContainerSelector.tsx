import { useEffect } from 'react';
import { Package } from 'lucide-react';
import { useLoadingStore } from '../store/useLoadingStore';
import { formatDimensions, calculateVolume, convertCmToM } from '../core/constants/containers';

export function ContainerSelector() {
  const {
    containerPresets,
    selectedPresetId,
    container,
    selectContainerPreset,
    loadContainerPresets,
    isLoadingPresets,
  } = useLoadingStore();

  useEffect(() => {
    loadContainerPresets();
  }, []);

  const selectedPreset = containerPresets.find((p) => p.id === selectedPresetId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
        <Package className="w-4 h-4" />
        <span>Container Type</span>
      </div>

      <div className="space-y-3">
        <select
          value={selectedPresetId}
          onChange={(e) => selectContainerPreset(e.target.value)}
          disabled={isLoadingPresets}
          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-800 disabled:cursor-not-allowed"
        >
          {containerPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>

        {selectedPreset && (
          <div className="bg-slate-600 rounded-lg p-3 space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-400 mb-1">Internal Dimensions</div>
              <div className="text-sm font-medium text-white">
                {formatDimensions(selectedPreset.length, selectedPreset.width, selectedPreset.height, 'm')}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {formatDimensions(selectedPreset.length, selectedPreset.width, selectedPreset.height, 'cm')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">Volume</div>
                <div className="text-sm font-medium text-white">
                  {calculateVolume(selectedPreset.length, selectedPreset.width, selectedPreset.height).toFixed(1)} m³
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">Max Weight</div>
                <div className="text-sm font-medium text-white">
                  {(selectedPreset.maxWeight / 1000).toFixed(1)} tons
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
