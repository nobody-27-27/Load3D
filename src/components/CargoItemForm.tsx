import { useState } from 'react';
import { Package, Cylinder, Plus, X } from 'lucide-react';
import type { CargoType, ICargoItem } from '../core/types';
import { getRandomColor, CARGO_COLOR_PALETTE } from '../utils/colorUtils';
import {
  validateName,
  validateWeight,
  validateQuantity,
  validateDimensions,
  validateRollDimensions,
} from '../utils/validationUtils';

interface CargoItemFormProps {
  onAdd: (item: ICargoItem) => void;
  onCancel?: () => void;
}

export function CargoItemForm({ onAdd, onCancel }: CargoItemFormProps) {
  const [itemType, setItemType] = useState<CargoType>('box');
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('100');
  const [quantity, setQuantity] = useState('1');

  const [length, setLength] = useState('1.2');
  const [width, setWidth] = useState('0.8');
  const [height, setHeight] = useState('1.0');

  const [diameter, setDiameter] = useState('0.5');
  const [rollLength, setRollLength] = useState('2.0');

  const [color, setColor] = useState('');
  const [stackable, setStackable] = useState(false);
  const [isPalletized, setIsPalletized] = useState(false);

  const [errors, setErrors] = useState<string[]>([]);

  const handleTypeChange = (type: CargoType) => {
    setItemType(type);
    setErrors([]);
    if (!name) {
      setName(type === 'box' ? 'Box' : 'Roll');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      newErrors.push(nameValidation.error!);
    }

    const weightValidation = validateWeight(parseFloat(weight));
    if (!weightValidation.isValid) {
      newErrors.push(weightValidation.error!);
    }

    const quantityValidation = validateQuantity(parseInt(quantity));
    if (!quantityValidation.isValid) {
      newErrors.push(quantityValidation.error!);
    }

    if (itemType === 'box') {
      const dimensionsValidation = validateDimensions(
        parseFloat(length),
        parseFloat(width),
        parseFloat(height)
      );
      if (!dimensionsValidation.isValid) {
        newErrors.push(dimensionsValidation.error!);
      }
    } else if (itemType === 'roll') {
      const rollValidation = validateRollDimensions(
        parseFloat(diameter),
        parseFloat(rollLength)
      );
      if (!rollValidation.isValid) {
        newErrors.push(rollValidation.error!);
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const selectedColor = color || getRandomColor();
    const itemId = `${itemType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newItem: ICargoItem = {
      id: itemId,
      type: itemType,
      name: name.trim(),
      weight: parseFloat(weight),
      quantity: parseInt(quantity),
      stackable,
      isPalletized,
      color: selectedColor,
    };

    if (itemType === 'box') {
      newItem.dimensions = {
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
      };
    } else if (itemType === 'roll') {
      newItem.rollDimensions = {
        diameter: parseFloat(diameter),
        length: parseFloat(rollLength),
      };
    }

    onAdd(newItem);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setWeight('100');
    setQuantity('1');
    setLength('1.2');
    setWidth('0.8');
    setHeight('1.0');
    setDiameter('0.5');
    setRollLength('2.0');
    setColor('');
    setStackable(false);
    setIsPalletized(false);
    setErrors([]);
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="bg-slate-700 rounded-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Item Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('box')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                itemType === 'box'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <Package size={20} />
              <span>Box</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('roll')}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                itemType === 'roll'
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <Cylinder size={20} />
              <span>Roll</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={itemType === 'box' ? 'Box 1' : 'Roll 1'}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        {itemType === 'box' && (
          <div>
            <label className="block text-sm font-medium mb-2">Dimensions (meters)</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="Length"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 mt-1 block">L</span>
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Width"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 mt-1 block">W</span>
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Height"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 mt-1 block">H</span>
              </div>
            </div>
          </div>
        )}

        {itemType === 'roll' && (
          <div>
            <label className="block text-sm font-medium mb-2">Dimensions (meters)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={diameter}
                  onChange={(e) => setDiameter(e.target.value)}
                  placeholder="Diameter"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 mt-1 block">Diameter</span>
              </div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={rollLength}
                  onChange={(e) => setRollLength(e.target.value)}
                  placeholder="Length"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 mt-1 block">Length</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium mb-2">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="100"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              min="1"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Color {!color && <span className="text-slate-400">(random if not selected)</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {CARGO_COLOR_PALETTE.map((paletteColor) => (
              <button
                key={paletteColor}
                type="button"
                onClick={() => setColor(paletteColor)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  color === paletteColor
                    ? 'border-white scale-110'
                    : 'border-slate-600 hover:border-slate-400'
                }`}
                style={{ backgroundColor: paletteColor }}
                title={paletteColor}
              />
            ))}
            {color && !CARGO_COLOR_PALETTE.includes(color) && (
              <div
                className="w-8 h-8 rounded-lg border-2 border-white"
                style={{ backgroundColor: color }}
              />
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stackable}
              onChange={(e) => setStackable(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm">Stackable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPalletized}
              onChange={(e) => setIsPalletized(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm">Palletized</span>
          </label>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-3">
            {errors.map((error, index) => (
              <p key={index} className="text-red-400 text-sm">
                {error}
              </p>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 rounded-lg p-3 flex items-center justify-center gap-2 font-semibold transition-colors"
          >
            <Plus size={20} />
            Add Item
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
