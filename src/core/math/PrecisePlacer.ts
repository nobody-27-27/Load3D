import type { ICargoItem, IPlacedItem, IContainer } from '../types';
import type { IPlacementSlot } from './PatternGenerator';
import { GeometryUtils } from './GeometryUtils';

export class PrecisePlacer {
  static placeItemsFromSlots(
    items: ICargoItem[],
    slots: IPlacementSlot[],
    container: IContainer,
    placedItems: IPlacedItem[]
  ): { placed: IPlacedItem[]; remaining: ICargoItem[] } {
    const placed: IPlacedItem[] = [];
    const remaining: ICargoItem[] = [];

    let slotIndex = 0;

    for (const item of items) {
      if (slotIndex >= slots.length) {
        remaining.push(item);
        continue;
      }

      const slot = slots[slotIndex];

      if (item.isPalletized && slot.position.y > 0.01) {
        remaining.push(item);
        continue;
      }

      const isValid = this.validateSlot(slot, container, [...placedItems, ...placed]);

      if (isValid) {
        placed.push({
          itemId: item.id,
          item: item,
          position: slot.position,
          rotation: slot.rotation,
          dimensions: slot.dimensions,
          orientation: 'horizontal'
        });
        slotIndex++;
      } else {
        remaining.push(item);
      }
    }

    return { placed, remaining };
  }

  private static validateSlot(
    slot: IPlacementSlot,
    container: IContainer,
    placedItems: IPlacedItem[]
  ): boolean {
    if (!GeometryUtils.isWithinBounds(slot.position, slot.dimensions, container.dimensions)) {
      return false;
    }

    for (const other of placedItems) {
      if (GeometryUtils.checkIntersection(
        slot.position,
        slot.dimensions,
        other.position,
        other.dimensions
      )) {
        return false;
      }
    }

    return true;
  }

  static canPlaceAtPosition(
    slot: IPlacementSlot,
    container: IContainer,
    placedItems: IPlacedItem[]
  ): boolean {
    return this.validateSlot(slot, container, placedItems);
  }
}
