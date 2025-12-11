// src/utils/packingAlgorithm.ts

// Tip tanımlamaları (Projene göre bunları import edebilirsin)
interface ContainerDims {
  width: number;
  height: number;
  length: number;
}

interface ItemDims {
  id: string; // Ürün ID'si
  diameter: number; // Çap (Örn: 60)
  length: number;   // Uzunluk (Örn: 1165)
  quantity: number; // Adet
}

interface PlacedItem {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  isPlaced: boolean;
}

/**
 * Ruloları 'Honeycomb' (Bal peteği) düzeninde istifler.
 * Bu algoritma konteyner genişliğini aşmamayı garanti eder.
 */
export const calculateCoilLoading = (
  container: ContainerDims,
  item: ItemDims
): { placed: PlacedItem[]; unplacedCount: number } => {
  
  const placedItems: PlacedItem[] = [];
  const radius = item.diameter / 2;
  
  // --- 1. KRİTİK HESAPLAMA: YATAY LİMİT ---
  // Konteyner genişliğine (235) kaç tane çap (60) sığar?
  // Math.floor ile aşağı yuvarlıyoruz. 235/60 = 3.91 -> 3 Adet.
  // Bu sayede görseldeki gibi 4. rulo duvara girmez.
  const itemsPerNormalRow = Math.floor(container.width / item.diameter);
  
  // Şaşırtmalı (araya giren) satırda genelde 1 tane eksik olur
  const itemsPerStaggeredRow = itemsPerNormalRow - 1;

  // --- 2. KRİTİK HESAPLAMA: DİKEY ARTIŞ (Step Y) ---
  // Rulolar üst üste tam tepeye binmez, araya girer.
  // Bu yüzden yükseklik tam çap (60) kadar değil, sin(60) * çap kadar artar.
  // 60 * 0.866 = ~51.96 cm
  const verticalStep = item.diameter * Math.sin(Math.PI / 3);

  let count = 0;
  let currentRow = 0; // Katman (Yükseklik sırası)
  
  // Z ekseni (Derinlik) için basit kontrol: 
  // Rulo uzunluğu konteynerden kısaysa tek sıra koyuyoruz varsayıyorum.
  // Eğer birden fazla sıra olacaksa buraya Z döngüsü de eklenmeli.
  const zPosition = item.length / 2; // Ortalamak istersen veya container.length / 2

  // Toplam adet kadar döngüye gir
  while (count < item.quantity) {
    
    // Yüksekliği hesapla: İlk sıra yerde (radius), sonrakiler üstüne ekleniyor
    const yPos = radius + (currentRow * verticalStep);

    // Tavan kontrolü: Eğer bu katman tavana çarpıyorsa döngüyü kır
    if (yPos + radius > container.height) {
      console.warn("Konteyner yüksekliği doldu!");
      break;
    }

    // Bu satır şaşırtmalı mı? (Tek numaralı satırlar: 1, 3, 5...)
    const isStaggered = currentRow % 2 !== 0;
    
    // Bu satıra kaç tane sığacak?
    const limitInThisRow = isStaggered ? itemsPerStaggeredRow : itemsPerNormalRow;

    // Yatay ofset (X başlangıç noktası)
    // Düz satırsa en soldan başla (radius), şaşırtmalıysa yarım çap içeriden başla
    let startX = radius;
    if (isStaggered) {
      startX = radius + (item.diameter / 2);
    }

    // Satır içindeki elemanları yerleştir
    for (let i = 0; i < limitInThisRow; i++) {
      if (count >= item.quantity) break;

      const xPos = startX + (i * item.diameter);

      // Güvenlik kontrolü: X sınırını aşıyor mu?
      if (xPos + radius > container.width) {
        break; 
      }

      placedItems.push({
        id: `${item.id}-${count}`,
        position: { x: xPos, y: yPos, z: zPosition },
        rotation: { x: 0, y: 0, z: Math.PI / 2 }, // Ruloları yatık varsayıyoruz
        isPlaced: true
      });

      count++;
    }

    currentRow++; // Bir üst katmana geç
  }

  return {
    placed: placedItems,
    unplacedCount: item.quantity - count
  };
};
