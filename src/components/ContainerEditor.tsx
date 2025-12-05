import { useState, useEffect } from 'react';
import { Edit3, RotateCcw, Check, X } from 'lucide-react';
import { useLoadingStore } from '../store/useLoadingStore';
import { convertMToCm } from '../core/constants/containers';

export function ContainerEditor() {
  const { container, updateContainerDimensions, selectedPresetId, selectContainerPreset } = useLoadingStore();
  const [isEditing, setIsEditing] = useState(false);
  const [length, setLength] = useState(convertMToCm(container.dimensions.length));
  const [width, setWidth] = useState(convertMToCm(container.dimensions.width));
  const [height, setHeight] = useState(convertMToCm(container.dimensions.height));
  const [maxWeight, setMaxWeight] = useState(container.maxWeight);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLength(convertMToCm(container.dimensions.length));
    setWidth(convertMToCm(container.dimensions.width));
    setHeight(convertMToCm(container.dimensions.height));
    setMaxWeight(container.maxWeight);
    setErrors({});
  }, [container]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (length <= 0) newErrors.length = 'Length must be greater than 0';
    if (width <= 0) newErrors.width = 'Width must be greater than 0';
    if (height <= 0) newErrors.height = 'Height must be greater than 0';
    if (maxWeight < 0) newErrors.maxWeight = 'Max weight cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      updateContainerDimensions(length, width, height, maxWeight);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setLength(convertMToCm(container.dimensions.length));
    setWidth(convertMToCm(container.dimensions.width));
    setHeight(convertMToCm(container.dimensions.height));
    setMaxWeight(container.maxWeight);
    setErrors({});
    setIsEditing(false);
  };

  const handleReset = () => {
    if (selectedPresetId !== 'custom') {
      selectContainerPreset(selectedPresetId);
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between border-t border-slate-600 pt-3">
        <span className="text-sm text-slate-400">Custom Dimensions</span>
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-400 hover:bg-slate-600 rounded-md transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-slate-600 pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Edit Dimensions</span>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2 py-1 text-sm text-green-400 hover:bg-slate-600 rounded transition-colors"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 text-sm text-slate-400 hover:bg-slate-600 rounded transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
          {selectedPresetId !== 'custom' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-sm text-orange-400 hover:bg-slate-600 rounded transition-colors"
              title="Reset to preset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Length (cm)
          </label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className={`w-full px-3 py-2 bg-slate-600 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.length ? 'border-red-500' : 'border-slate-500'
            }`}
            min="1"
            step="1"
          />
          {errors.length && <p className="text-xs text-red-400 mt-1">{errors.length}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Width (cm)
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className={`w-full px-3 py-2 bg-slate-600 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.width ? 'border-red-500' : 'border-slate-500'
            }`}
            min="1"
            step="1"
          />
          {errors.width && <p className="text-xs text-red-400 mt-1">{errors.width}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Height (cm)
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className={`w-full px-3 py-2 bg-slate-600 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.height ? 'border-red-500' : 'border-slate-500'
            }`}
            min="1"
            step="1"
          />
          {errors.height && <p className="text-xs text-red-400 mt-1">{errors.height}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Max Weight (kg)
          </label>
          <input
            type="number"
            value={maxWeight}
            onChange={(e) => setMaxWeight(Number(e.target.value))}
            className={`w-full px-3 py-2 bg-slate-600 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.maxWeight ? 'border-red-500' : 'border-slate-500'
            }`}
            min="0"
            step="100"
          />
          {errors.maxWeight && <p className="text-xs text-red-400 mt-1">{errors.maxWeight}</p>}
        </div>
      </div>
    </div>
  );
}
