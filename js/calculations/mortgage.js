/**
 * Calcola la rata mensile e il piano di ammortamento annuale.
 * Il tasso è espresso in percentuale annua.
 */
export function calculateMortgage(principal, annualRate, years) {
  if (!Number.isFinite(principal) || principal < 0) {
    throw new Error("Il capitale finanziato deve essere non negativo.");
  }
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    throw new Error("Il tasso annuo deve essere non negativo.");
  }
  if (!Number.isInteger(years) || years <= 0) {
    throw new Error("La durata deve essere un numero intero positivo.");
  }

  const monthlyRate = annualRate / 100 / 12;
  const numberOfPayments = years * 12;
  let monthlyPayment = 0;

  if (principal > 0) {
    monthlyPayment = monthlyRate === 0
      ? principal / numberOfPayments
      : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -numberOfPayments));
  }

  let balance = principal;
  const schedule = [];

  for (let year = 1; year <= years; year += 1) {
    let yearlyInterest = 0;
    let yearlyCapital = 0;

    for (let month = 0; month < 12; month += 1) {
      const interest = balance * monthlyRate;
      const capital = Math.min(balance, monthlyPayment - interest);

      balance = Math.max(0, balance - capital);
      yearlyInterest += interest;
      yearlyCapital += capital;
    }

    schedule.push({
      year,
      interest: yearlyInterest,
      capital: yearlyCapital,
      balance
    });
  }

  return { monthly: monthlyPayment, schedule };
}
