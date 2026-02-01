// src/utils/decimalFormat.ts (simplified version)

/**
 * Simple function to format decimal for input field
 */
export const formatDecimalForInput = (value: number | string): string => {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }

  let num: number;
  if (typeof value === 'string') {
    num = parseFloat(value.replace(/,/g, ''));
  } else {
    num = value;
  }

  if (isNaN(num) || !isFinite(num)) {
    return '0.00';
  }

  // Format with 2 decimal places, no commas
  return num.toFixed(2);
};

/**
 * Simple function to parse input back to number
 */
export const parseDecimalInput = (input: string): number => {
  if (input === '' || input === null || input === undefined) {
    return 0;
  }

  const cleaned = input.replace(/,/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
};

/**
 * Simple validation check
 */
export const isValidDecimalInput = (input: string): boolean => {
  if (input === '') return true;
  
  // Allow numbers with optional decimal point
  const regex = /^\d*\.?\d*$/;
  if (!regex.test(input)) return false;
  
  // Check decimal places
  const parts = input.split('.');
  if (parts.length > 2) return false;
  if (parts.length === 2 && parts[1].length > 4) return false;
  
  return true;
};