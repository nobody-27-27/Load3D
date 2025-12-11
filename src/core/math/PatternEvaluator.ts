import type { ICargoItem, IContainer, IDimensions } from '../types';
import { PatternGenerator, type ILayoutPattern, type IPlacementSlot } from './PatternGenerator';
import { GeometryUtils } from './GeometryUtils';

export interface IPatternEvaluation {
  pattern: ILayoutPattern;
  slots: IPlacementSlot[];
  itemsFitted: number;
  score: number;
}

export class PatternEvaluator {
  // ... (generatePalletPatterns ve generateBoxPatterns metodları AYNEN KALIYOR) ...
  static evaluatePalletPatterns(
    items: ICargoItem[],
    container: IContainer,
    timeout: number = 3000
  ): IPatternEvaluation | null {
    if (items.length === 0) return null;

    const firstItem = items[0];
    if (!firstItem.dimensions) return null;

    const patterns = PatternGenerator.generatePalletPatterns(
      firstItem.dimensions,
      firstItem.palletDimensions,
      container.dimensions,
      items.length
    );

    if (patterns.length === 0) return null;

    const startTime = performance.now();
    let bestEvaluation: IPatternEvaluation | null = null;

    for (const pattern of patterns) {
      if (performance.now() - startTime > timeout) break;

      const slots = PatternGenerator.generatePlacementSlots(
        pattern,
        firstItem.dimensions,
        firstItem.palletDimensions,
        container.dimensions,
        firstItem.isPalletized || false
      );

      const itemsFitted = Math.min(slots.length, items.length);

      const validSlots = slots.filter(slot =>
        GeometryUtils.isWithinBounds(slot.position, slot.dimensions, container.dimensions)
      );

      const score = this.calculateScore(
        itemsFitted,
        pattern.utilizationScore,
        validSlots.length
      );

      const evaluation: IPatternEvaluation = {
        pattern,
        slots: validSlots,
        itemsFitted,
        score
      };

      if (!bestEvaluation || score > bestEvaluation.score) {
        bestEvaluation = evaluation;
      }
    }

    return bestEvaluation;
  }

  static evaluateBoxPatterns(
    items: ICargoItem[],
    container: IContainer,
    timeout: number = 3000
  ): IPatternEvaluation | null {
    if (items.length === 0) return null;

    const firstItem = items[0];
    if (!firstItem.dimensions) return null;

    const patterns = PatternGenerator.generateBoxPatterns(
      firstItem.dimensions,
      firstItem.palletDimensions,
      container.dimensions,
      items.length
    );

    if (patterns.length === 0) return null;

    const startTime = performance.now();
    let bestEvaluation: IPatternEvaluation | null = null;

    for (const pattern of patterns) {
      if (performance.now() - startTime > timeout) break;

      const slots = PatternGenerator.generatePlacementSlots(
        pattern,
        firstItem.dimensions,
        firstItem.palletDimensions,
        container.dimensions,
        firstItem.isPalletized || false
      );

      const itemsFitted = Math.min(slots.length, items.length);

      const validSlots = slots.filter(slot =>
        GeometryUtils.isWithinBounds(slot.position, slot.dimensions, container.dimensions)
      );

      const score = this.calculateScore(
        itemsFitted,
        pattern.utilizationScore,
        validSlots.length
      );

      const evaluation: IPatternEvaluation = {
        pattern,
        slots: validSlots,
        itemsFitted,
        score
      };

      if (!bestEvaluation || score > bestEvaluation.score) {
        bestEvaluation = evaluation;
      }
    }

    return bestEvaluation;
  }

  // ==========================================
  // YENİ EKLENEN RULO (ROLL) DEĞERLENDİRİCİSİ
  // ==========================================

  static evaluateRollPatterns(
    items: ICargoItem[],
    container: IContainer,
    timeout: number = 3000
  ): IPatternEvaluation | null {
      if (items.length === 0) return null;
      const firstItem = items[0];
      
      // Boyutları al (rulo veya standart dimension)
      let d = 0, l = 0;
      if (firstItem.rollDimensions) {
          d = firstItem.rollDimensions.diameter;
          l = firstItem.rollDimensions.length;
      } else if (firstItem.dimensions) {
          d = Math.min(firstItem.dimensions.length, firstItem.dimensions.width);
          l = firstItem.dimensions.height;
      } else {
          return null;
      }

      // 1. Tüm Olası Desenleri Üret (Dik, Yatay, Hibrit)
      const patterns = PatternGenerator.generateRollPatterns(d, l, container.dimensions);
      if (patterns.length === 0) return null;

      let bestEvaluation: IPatternEvaluation | null = null;
      
      // 2. Her deseni dene ve puanla
      for (const pattern of patterns) {
          // Desene göre slotları (koordinatları) üret
          const slots = PatternGenerator.generateRollPlacementSlots(
              pattern, d, l, container.dimensions
          );

          const itemsFitted = Math.min(slots.length, items.length);
          
          // Slotların dışarı taşıp taşmadığını son kez kontrol et (Generator yapıyor ama garanti olsun)
          // Ruloda bounding box silindir karesi gibidir
          const validSlots = slots.filter(slot => 
              GeometryUtils.isWithinBounds(slot.position, slot.dimensions, container.dimensions)
          );

          // Puanlama: En çok sığdıran kazanır
          const score = this.calculateScore(
              itemsFitted, 
              pattern.utilizationScore, 
              validSlots.length
          );

          if (!bestEvaluation || score > bestEvaluation.score) {
              bestEvaluation = {
                  pattern,
                  slots: validSlots,
                  itemsFitted,
                  score
              };
          }
      }

      return bestEvaluation;
  }

  private static calculateScore(
    itemsFitted: number,
    utilizationScore: number,
    validSlotsCount: number
  ): number {
    return (itemsFitted * 1000000) + (utilizationScore * 100) + validSlotsCount;
  }
}
