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
