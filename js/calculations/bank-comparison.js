import { calculateMortgage } from "./mortgage.js";

export function calculateBankOffer(principal, years, offer) {
  const mortgage = calculateMortgage(principal, offer.tan, years);
  const totalInterest = mortgage.schedule.reduce((sum, year) => sum + year.interest, 0);
  const installmentsTotal = mortgage.monthly * years * 12;
  const recurringCosts = offer.monthlyCosts * years * 12;
  return {
    ...offer,
    monthlyPayment: mortgage.monthly,
    totalInterest,
    installmentsTotal,
    recurringCosts,
    totalCost: installmentsTotal + offer.initialCosts + recurringCosts,
    totalOutflow: installmentsTotal + offer.initialCosts + recurringCosts
  };
}
