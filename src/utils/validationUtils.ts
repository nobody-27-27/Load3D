export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePositiveNumber(value: number, fieldName: string): ValidationResult {
  if (isNaN(value) || value <= 0) {
    return {
      isValid: false,
      error: `${fieldName} must be a positive number`,
    };
  }
  return { isValid: true };
}

export function validateDimensions(
  length: number,
  width: number,
  height: number
): ValidationResult {
  const lengthCheck = validatePositiveNumber(length, 'Length');
  if (!lengthCheck.isValid) return lengthCheck;

  const widthCheck = validatePositiveNumber(width, 'Width');
  if (!widthCheck.isValid) return widthCheck;

  const heightCheck = validatePositiveNumber(height, 'Height');
  if (!heightCheck.isValid) return heightCheck;

  return { isValid: true };
}

export function validateRollDimensions(
  diameter: number,
  length: number
): ValidationResult {
  const diameterCheck = validatePositiveNumber(diameter, 'Diameter');
  if (!diameterCheck.isValid) return diameterCheck;

  const lengthCheck = validatePositiveNumber(length, 'Length');
  if (!lengthCheck.isValid) return lengthCheck;

  return { isValid: true };
}

export function validateWeight(weight: number): ValidationResult {
  return validatePositiveNumber(weight, 'Weight');
}

export function validateQuantity(quantity: number): ValidationResult {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return {
      isValid: false,
      error: 'Quantity must be at least 1',
    };
  }
  return { isValid: true };
}

export function validateName(name: string): ValidationResult {
  return { isValid: true };
}

export function validatePalletDimensions(
  palletLength: number,
  palletWidth: number,
  palletHeight: number,
  itemLength: number,
  itemWidth: number
): ValidationResult {
  const lengthCheck = validatePositiveNumber(palletLength, 'Pallet length');
  if (!lengthCheck.isValid) return lengthCheck;

  const widthCheck = validatePositiveNumber(palletWidth, 'Pallet width');
  if (!widthCheck.isValid) return widthCheck;

  const heightCheck = validatePositiveNumber(palletHeight, 'Pallet height');
  if (!heightCheck.isValid) return heightCheck;

  if (palletLength < itemLength) {
    return {
      isValid: false,
      error: 'Pallet length must be at least as large as item length',
    };
  }

  if (palletWidth < itemWidth) {
    return {
      isValid: false,
      error: 'Pallet width must be at least as large as item width',
    };
  }

  return { isValid: true };
}
