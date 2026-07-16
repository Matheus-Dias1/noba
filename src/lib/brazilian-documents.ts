/** Normalize the 14-position CNPJ, allowing letters in the first 12 positions. */
export function normalizeCnpj(value: string): string {
  const characters = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return characters.slice(0, 12) + characters.slice(12).replace(/\D/g, "").slice(0, 2);
}

/** Format numeric and alphanumeric CNPJs as XX.XXX.XXX/XXXX-XX. */
export function formatCnpj(value: string): string {
  const normalized = normalizeCnpj(value);
  let formatted = normalized.slice(0, 2);
  if (normalized.length > 2) formatted += `.${normalized.slice(2, 5)}`;
  if (normalized.length > 5) formatted += `.${normalized.slice(5, 8)}`;
  if (normalized.length > 8) formatted += `/${normalized.slice(8, 12)}`;
  if (normalized.length > 12) formatted += `-${normalized.slice(12, 14)}`;
  return formatted;
}

function calculateCnpjDigit(base: string, weights: number[]): number {
  const sum = [...base].reduce(
    (total, character, index) => total + (character.charCodeAt(0) - 48) * weights[index],
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Validate legacy numeric and Receita Federal alphanumeric CNPJ check digits. */
export function isValidCnpj(value: string): boolean {
  const normalized = normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(normalized) || /^(.)\1{13}$/.test(normalized)) {
    return false;
  }

  const firstDigit = calculateCnpjDigit(normalized.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateCnpjDigit(`${normalized.slice(0, 12)}${firstDigit}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return normalized.endsWith(`${firstDigit}${secondDigit}`);
}

export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}
