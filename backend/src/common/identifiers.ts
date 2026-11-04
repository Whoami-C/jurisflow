export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function checkDigit(base: string, factors: number[]) {
  const total = base
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpfCnpj(value: string) {
  const digits = onlyDigits(value);
  if (/^(\d)\1+$/.test(digits)) return false;
  if (digits.length === 11) {
    const first = checkDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = checkDigit(
      `${digits.slice(0, 9)}${first}`,
      [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    return digits.endsWith(`${first}${second}`);
  }
  if (digits.length === 14) {
    const first = checkDigit(
      digits.slice(0, 12),
      [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    const second = checkDigit(
      `${digits.slice(0, 12)}${first}`,
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    );
    return digits.endsWith(`${first}${second}`);
  }
  return false;
}

export function isValidCnj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 20) return false;
  const sequence = digits.slice(0, 7);
  const verifier = Number(digits.slice(7, 9));
  const remainder = BigInt(`${sequence}${digits.slice(9)}00`) % 97n;
  return verifier === Number(98n - remainder);
}
