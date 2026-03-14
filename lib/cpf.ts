function cleanDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCpfInput(value: string): string {
  const digits = cleanDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(value: string): boolean {
  const digits = cleanDigits(value);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index);
  }

  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;

  return remainder === Number(digits[10]);
}

export function normalizeCpf(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const digits = cleanDigits(value);
  return isValidCpf(digits) ? digits : null;
}
