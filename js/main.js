import { calculateMortgage } from "./calculations/mortgage.js";
import { renderCharts } from "./components/charts.js";
import { formatCurrency, formatPercentage, formatCsvValue } from "./utils/formatters.js";
import { readSimulationInputs } from "./utils/validators.js";

const DEFAULTS = {
  price: 250000,
  down: 50000,
  reno: 10000,
  years: 25,
  rate: 3,
  mortgageExtraMonthly: 0,
  agency: 3,
  notary: 3000,
  imu: 0,
  condo: 1200,
  maint: 1,
  growth: 2,
  invest: 5,
  infl: 2,
  horizon: 30
};

let tableData = [];

function showValidationMessage(message = "") {
  document.getElementById("validation-message").textContent = message;
}

function renderKpis({ finalEquity, finalInvestment, cagrHouse, cagrInvestment, monthlyMortgageOutflow }) {
  const difference = finalEquity - finalInvestment;
  const houseCagrText = cagrHouse === null ? "N/D" : formatPercentage(cagrHouse);
  const investmentCagrText = cagrInvestment === null ? "N/D" : formatPercentage(cagrInvestment);

  document.getElementById("kpis").innerHTML = `
    <div class="grid">
      <div class="kpi">🏠 Patrimonio immobiliare: ${formatCurrency(finalEquity)}</div>
      <div class="kpi">💰 Investimento alternativo: ${formatCurrency(finalInvestment)}</div>
      <div class="kpi">📊 Differenza: ${formatCurrency(difference)}</div>
      <div class="kpi">💳 Rata + spese accessorie mensili: ${formatCurrency(monthlyMortgageOutflow)}</div>
      <div class="kpi">CAGR Casa: ${houseCagrText}</div>
      <div class="kpi">CAGR Investimento: ${investmentCagrText}</div>
    </div>
  `;
}

function renderTable() {
  const head = document.querySelector("#results thead");
  const body = document.querySelector("#results tbody");
  const headings = [
    "Anno", "Valore Immobile", "Debito Residuo", "Equity Casa",
    "Costi Annuali", "Spese Aggiuntive Mutuo", "Rata Annua", "Esborso Totale", "Investimento"
  ];

  head.replaceChildren();
  const headerRow = document.createElement("tr");

  headings.forEach((heading) => {
    const cell = document.createElement("th");
    cell.textContent = heading;
    headerRow.appendChild(cell);
  });
  head.appendChild(headerRow);

  body.replaceChildren();
  tableData.forEach((row) => {
    const tableRow = document.createElement("tr");

    row.forEach((value, index) => {
      const cell = document.createElement("td");
      cell.textContent = index === 0 ? String(value) : formatCurrency(value);
      tableRow.appendChild(cell);
    });

    body.appendChild(tableRow);
  });
}

function calculate() {
  showValidationMessage();

  try {
    const input = readSimulationInputs();
    const {
      price, down, years, rate, mortgageExtraMonthly, agency, notary, reno,
      imu, condo, maint, growth, invest, horizon
    } = input;

    const agencyCost = price * agency / 100;
    const loan = Math.max(0, price - down);
    const mortgage = calculateMortgage(loan, rate, years);

    // La logica finanziaria originale è mantenuta in questa fase di refactoring.
    let investmentValue = down + agencyCost + notary + reno;

    tableData = [];
    const labels = [];
    const equity = [];
    const investment = [];
    const homeValues = [];
    const debt = [];
    const costs = [];

    for (let year = 1; year <= horizon; year += 1) {
      const homeValue = price * Math.pow(1 + growth / 100, year);
      const scheduleRow = year <= mortgage.schedule.length
        ? mortgage.schedule[year - 1]
        : { balance: 0 };

      const balance = scheduleRow.balance || 0;
      const maintenanceCost = homeValue * maint / 100;
      const annualCosts = imu + condo + maintenanceCost;
      const annualMortgage = year <= years ? mortgage.monthly * 12 : 0;
      const annualMortgageExtra = year <= years ? mortgageExtraMonthly * 12 : 0;
      const totalOut = annualCosts + annualMortgage + annualMortgageExtra;

      investmentValue *= 1 + invest / 100;
      const homeEquity = homeValue - balance;

      tableData.push([
        year, homeValue, balance, homeEquity,
        annualCosts, annualMortgageExtra, annualMortgage, totalOut, investmentValue
      ]);

      labels.push(year);
      equity.push(homeEquity);
      investment.push(investmentValue);
      homeValues.push(homeValue);
      debt.push(balance);
      costs.push(annualCosts + annualMortgageExtra);
    }

    const finalEquity = equity[equity.length - 1];
    const finalInvestment = investment[investment.length - 1];
    const initialCapital = down + agencyCost + notary + reno;

    const calculateCagr = (finalValue) => (
      initialCapital > 0 && finalValue > 0
        ? Math.pow(finalValue / initialCapital, 1 / horizon) - 1
        : null
    );

    renderKpis({
      finalEquity,
      finalInvestment,
      cagrHouse: calculateCagr(finalEquity),
      cagrInvestment: calculateCagr(finalInvestment),
      monthlyMortgageOutflow: mortgage.monthly + mortgageExtraMonthly
    });

    renderTable();
    renderCharts({ labels, equity, investment, homeValues, debt, costs });
  } catch (error) {
    showValidationMessage(error.message);
  }
}

function exportCsv() {
  if (tableData.length === 0) {
    showValidationMessage("Calcola prima una simulazione da esportare.");
    return;
  }

  const headings = [
    "Anno", "Valore Immobile", "Debito Residuo", "Equity Casa",
    "Costi Annuali", "Spese Aggiuntive Mutuo", "Rata Annua", "Esborso Totale", "Investimento"
  ];

  const rows = [
    headings.map(formatCsvValue).join(";"),
    ...tableData.map((row) => row.map(formatCsvValue).join(";"))
  ];

  const csv = "\uFEFF" + rows.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "simulazione_casa.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function resetInputs() {
  Object.entries(DEFAULTS).forEach(([id, value]) => {
    document.getElementById(id).value = value;
  });

  calculate();
}

document.getElementById("calculate-button").addEventListener("click", calculate);
document.getElementById("reset-button").addEventListener("click", resetInputs);
document.getElementById("export-button").addEventListener("click", exportCsv);

calculate();
