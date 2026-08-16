export function americanToDecimal(american: number) {
  if (!Number.isFinite(american) || american === 0) return 1;
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

export function decimalToAmerican(decimal: number) {
  if (!Number.isFinite(decimal) || decimal <= 1) return 0;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

export function payout(stake: number, american: number) {
  if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(american) || american === 0) {
    return 0;
  }
  return american > 0 ? (stake * american) / 100 : (stake * 100) / Math.abs(american);
}

export function parlayAmerican(legOdds: number[]) {
  const valid = legOdds.filter((o) => Number.isFinite(o) && o !== 0);
  if (!valid.length) return 0;
  const dec = valid.reduce((acc, o) => acc * americanToDecimal(o), 1);
  return decimalToAmerican(dec);
}
