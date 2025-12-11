import { IPlacedItem } from '../core/types';

export interface ContainerDims {
  width: number;
  height: number;
  length: number;
}

export interface ItemDims {
  id: string;
  diameter: number;
  length: number;
  quantity: number;
  weight?: number;
}

export interface PlacedItemResult {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  isPlaced: boolean;
}

/**
 * Ruloları 'Honeycomb' (Bal peteği) düzeninde istifler.
 */
export const calculateCoilLoading = (
  container: ContainerDims,
  item: ItemDims
): { placed: PlacedItemResult[]; unplacedCount: number } => {
  
  const placedItems: PlacedItemResult[] = [];
  const radius = item.diameter / 2;
  
  // 1. Yatayda kaç tane sığacağını kesin sınırla (Örn: 235/60 = 3.91 -> 3 adet)
  const itemsPerNormalRow = Math.floor(container.width / item.diameter);
  
  // Şaşırtmalı satırda 1 eksik olur
  const itemsPerStaggeredRow = itemsPerNormalRow - 1;

  // 2. Dikey Artış (sin(60) * çap)
  const verticalStep = item.diameter * Math.sin(Math.PI / 3);

  let count = 0;
  let rowLayer = 0; // Katman sırası

  // Z ekseni (Derinlik) - Şimdilik tek sıra
  // Three.js koordinat sistemine göre Z'yi ayarlıyoruz
  const zPos = item.length / 2;

  while (count < item.quantity) {
    // Yükseklik hesabı (Yerden yukarı)
    const yPos = radius + (rowLayer * verticalStep);

    // Tavan kontrolü
    if (yPos + radius > container.height) {
      break; 
    }

    // Sıra tipi
    const isStaggered = rowLayer % 2 !== 0;
    const limitInThisRow = isStaggered ? itemsPerStaggeredRow : itemsPerNormalRow;

    // Başlangıç X ofseti
    let startX = radius;
    if (isStaggered) {
      startX = radius + radius; // Yarım çap kadar kaydır
    }

    for (let i = 0; i < limitInThisRow; i++) {
      if (count >= item.quantity) break;

      const xPos = startX + (i * item.diameter);

      // Genişlik kontrolü
      if (xPos + radius > container.width) {
        break; 
      }

      placedItems.push({
        id: `${item.id}-${count}`,
        position: { x: xPos, y: yPos, z: zPos },
        rotation: { x: 0, y: 0, z: Math.PI / 2 }, // Silindir yatık
        isPlaced: true
      });

      count++;
    }
    rowLayer++;
  }

  return {
    placed: placedItems,
    unplacedCount: item.quantity - count
  };
};
