/**
 * Precision round to 2 decimal places for financial calculations
 * @param {number} num
 * @returns {number}
 */
function roundCurrency(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates GST amount and total premium for a given base premium and GST percentage.
 * 
 * @param {number} premiumAmount - Net premium amount before tax
 * @param {number} [gstRate=18.0] - GST rate percentage (e.g. 18 for 18%)
 * @returns {{ premiumAmount: number, gstRate: number, gstAmount: number, totalPremium: number }}
 */
function calculateGst(premiumAmount, gstRate = 18.0) {
  const premium = roundCurrency(premiumAmount);
  const rate = roundCurrency(gstRate);
  const gstAmount = roundCurrency((premium * rate) / 100);
  const totalPremium = roundCurrency(premium + gstAmount);

  return {
    premiumAmount: premium,
    gstRate: rate,
    gstAmount,
    totalPremium
  };
}

module.exports = {
  roundCurrency,
  calculateGst
};
