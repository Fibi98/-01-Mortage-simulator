import { calculateMortgage } from "./calculations/mortgage.js";
import { calculateBankOffer } from "./calculations/bank-comparison.js";
import { renderCharts } from "./components/charts.js";
import { formatCurrency, formatPercentage, formatCsvValue } from "./utils/formatters.js";
import { readSimulationInputs } from "./utils/validators.js";

const DEFAULTS = {
  price: 250000, down: 50000, reno: 10000, years: 25, rate: 3,
  bankAName: "Banca A", bankATan: 3, bankATaeg: "", bankAFees: 0, bankAMonthly: 0,
  bankBName: "Banca B", bankBTan: 3.2, bankBTaeg: "", bankBFees: 0, bankBMonthly: 0,
  mortgageExtraMonthly: 0, mainResidenceEligible: true, deductibleShare: 100,
  agency: 3, notary: 3000, imu: 0, condo: 1200, maint: 1,
  growth: 2, invest: 5, infl: 2, horizon: 30
};

const TAX_DEDUCTION_RATE = 0.19;
const ANNUAL_DEDUCTIBLE_LIMIT = 4000;
let tableData = [];

function showValidationMessage(message = "") {
  document.getElementById("validation-message").textContent = message;
}

function renderKpis({ finalEquity, finalInvestment, cagrHouse, cagrInvestment, monthlyMortgageOutflow, totalTaxRelief }) {
  const difference = finalEquity - finalInvestment;
  const houseCagrText = cagrHouse === null ? "N/D" : formatPercentage(cagrHouse);
  const investmentCagrText = cagrInvestment === null ? "N/D" : formatPercentage(cagrInvestment);
  document.getElementById("kpis").innerHTML = `
    <div class="grid">
      <div class="kpi">🏠 Patrimonio immobiliare: ${formatCurrency(finalEquity)}</div>
      <div class="kpi">💰 Investimento alternativo: ${formatCurrency(finalInvestment)}</div>
      <div class="kpi">📊 Differenza: ${formatCurrency(difference)}</div>
      <div class="kpi">💳 Rata + spese accessorie mensili: ${formatCurrency(monthlyMortgageOutflow)}</div>
      <div class="kpi">🧾 Detrazione 730 teorica cumulata: ${formatCurrency(totalTaxRelief)}</div>
      <div class="kpi">CAGR Casa: ${houseCagrText}</div>
      <div class="kpi">CAGR Investimento: ${investmentCagrText}</div>
    </div>
  `;
}

function renderTable() {
  const head = document.querySelector("#results thead");
  const body = document.querySelector("#results tbody");
  const headings = [
    "Anno", "Interessi passivi", "Detrazione 730 stimata", "Esborso netto dopo detrazione",
    "Valore Immobile", "Debito Residuo", "Equity Casa", "Costi Annuali",
    "Spese Aggiuntive Mutuo", "Rata Annua", "Esborso Totale", "Investimento"
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


function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function compareBanks() {
  const results = document.getElementById("bank-comparison-results");
  const readValue = (id, label, optional = false) => {
    const raw = document.getElementById(id).value.trim();
    if (optional && raw === "") return null;
    if (raw === "") throw new Error(`Inserisci un valore per: ${label}.`);
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) throw new Error(`Il valore di "${label}" deve essere un numero non negativo.`);
    return value;
  };
  try {
    const principal = readValue("price", "Prezzo immobile") - readValue("down", "Anticipo");
    if (principal <= 0) throw new Error("Il capitale finanziato deve essere maggiore di zero per confrontare le offerte.");
    const years = readValue("years", "Durata mutuo");
    if (!Number.isInteger(years) || years <= 0) throw new Error("La durata del mutuo deve essere un numero intero positivo.");
    const readOffer = (prefix, label) => {
      const name = document.getElementById(prefix + "Name").value.trim() || label;
      const tan = readValue(prefix + "Tan", label + " - TAN");
      const taeG = readValue(prefix + "Taeg", label + " - TAEG", true);
      const initialCosts = readValue(prefix + "Fees", label + " - spese iniziali");
      const monthlyCosts = readValue(prefix + "Monthly", label + " - costi mensili");
      return calculateBankOffer(principal, years, { name, tan, taeg: taeG, initialCosts, monthlyCosts });
    };
    const offers = [readOffer("bankA", "Offerta A"), readOffer("bankB", "Offerta B")];
    const money = (value) => formatCurrency(value);
    const winner = offers[0].totalCost === offers[1].totalCost ? null : offers.reduce((a, b) => a.totalCost < b.totalCost ? a : b);
    const rows = [
      ["Capitale finanziato", money(principal), money(principal)],
      ["Durata", years + " anni", years + " anni"],
      ["TAN", formatPercentage(offers[0].tan / 100), formatPercentage(offers[1].tan / 100)],
      ["TAEG dichiarato", offers[0].taeg === null ? "Non indicato" : formatPercentage(offers[0].taeg / 100), offers[1].taeg === null ? "Non indicato" : formatPercentage(offers[1].taeg / 100)],
      ["Rata mensile", money(offers[0].monthlyPayment), money(offers[1].monthlyPayment)],
      ["Interessi complessivi", money(offers[0].totalInterest), money(offers[1].totalInterest)],
      ["Spese iniziali", money(offers[0].initialCosts), money(offers[1].initialCosts)],
      ["Altri costi mensili (totale)", money(offers[0].recurringCosts), money(offers[1].recurringCosts)],
      ["Esborso complessivo stimato", money(offers[0].totalOutflow), money(offers[1].totalOutflow)]
    ];
    results.innerHTML = `
      <table class="comparison-table">
        <thead><tr><th>Voce</th><th>${escapeHtml(offers[0].name)}</th><th>${escapeHtml(offers[1].name)}</th></tr></thead>
        <tbody>${rows.map(row => `<tr><th>${row[0]}</th><td>${row[1]}</td><td>${row[2]}</td></tr>`).join("")}</tbody>
      </table>
      <p class="comparison-verdict">${winner ? "In base ai costi inseriti, risulta meno costosa: " + escapeHtml(winner.name) + " (risparmio stimato " + money(Math.abs(offers[0].totalOutflow - offers[1].totalOutflow)) + ")." : "Le due offerte hanno lo stesso esborso complessivo stimato."}</p>
      <p class="input-help">Stima matematica basata su TAN, rate mensili costanti e costi inseriti. Il TAEG è solo riportato a titolo informativo. Verifica sempre il piano e il prospetto informativo ufficiale della banca.</p>`;
    showValidationMessage();
  } catch (error) {
    results.replaceChildren();
    showValidationMessage(error.message);
  }
}

function calculate() {
  showValidationMessage();
  try {
    const input = readSimulationInputs();
    const {
      price, down, years, rate, mortgageExtraMonthly, mainResidenceEligible,
      deductibleShare, agency, notary, reno, imu, condo, maint, growth, invest, horizon
    } = input;

    const agencyCost = price * agency / 100;
    const loan = Math.max(0, price - down);
    const mortgage = calculateMortgage(loan, rate, years);
    let investmentValue = down + agencyCost + notary + reno;

    tableData = [];
    const labels = [], equity = [], investment = [], homeValues = [], debt = [], costs = [];
    let totalTaxRelief = 0;

    for (let year = 1; year <= horizon; year += 1) {
      const homeValue = price * Math.pow(1 + growth / 100, year);
      const scheduleRow = year <= mortgage.schedule.length
        ? mortgage.schedule[year - 1]
        : { balance: 0, interest: 0 };
      const balance = scheduleRow.balance || 0;
      const annualInterest = scheduleRow.interest || 0;
      const eligibleInterest = mainResidenceEligible ? annualInterest * deductibleShare / 100 : 0;
      const deductibleExpense = Math.min(eligibleInterest, ANNUAL_DEDUCTIBLE_LIMIT * deductibleShare / 100);
      const taxRelief = deductibleExpense * TAX_DEDUCTION_RATE;
      totalTaxRelief += taxRelief;

      const maintenanceCost = homeValue * maint / 100;
      const annualCosts = imu + condo + maintenanceCost;
      const annualMortgage = year <= years ? mortgage.monthly * 12 : 0;
      const annualMortgageExtra = year <= years ? mortgageExtraMonthly * 12 : 0;
      const totalOut = annualCosts + annualMortgage + annualMortgageExtra;
      const netOutAfterTax = totalOut - taxRelief;

      investmentValue *= 1 + invest / 100;
      const homeEquity = homeValue - balance;

      tableData.push([
        year, annualInterest, taxRelief, netOutAfterTax, homeValue, balance, homeEquity,
        annualCosts, annualMortgageExtra, annualMortgage, totalOut, investmentValue
      ]);
      labels.push(year);
      equity.push(homeEquity);
      investment.push(investmentValue);
      homeValues.push(homeValue);
      debt.push(balance);
      costs.push(annualCosts + annualMortgageExtra - taxRelief);
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
      finalEquity, finalInvestment,
      cagrHouse: calculateCagr(finalEquity),
      cagrInvestment: calculateCagr(finalInvestment),
      monthlyMortgageOutflow: mortgage.monthly + mortgageExtraMonthly,
      totalTaxRelief
    });
    document.getElementById("tax-note").textContent = mainResidenceEligible
      ? "Stima teorica: 19% degli interessi passivi entro il limite annuo di 4.000 €, riproporzionato alla quota indicata. La detrazione effettiva dipende dai requisiti di legge e dall'IRPEF disponibile."
      : "Detrazione non conteggiata: non è stata selezionata la condizione di mutuo per acquisto dell'abitazione principale.";
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
    "Anno", "Interessi passivi", "Detrazione 730 stimata", "Esborso netto dopo detrazione",
    "Valore Immobile", "Debito Residuo", "Equity Casa", "Costi Annuali",
    "Spese Aggiuntive Mutuo", "Rata Annua", "Esborso Totale", "Investimento"
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
    const element = document.getElementById(id);
    if (element.type === "checkbox") element.checked = value;
    else element.value = value;
  });
  calculate();
  document.getElementById("bank-comparison-results").replaceChildren();
}

function activateTab(name) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    const selected = button.dataset.tab === name;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const selected = panel.id === "tab-" + name;
    panel.hidden = !selected;
    panel.classList.toggle("active", selected);
  });
  if (name === "charts") {
    requestAnimationFrame(() => {
      document.querySelectorAll("#tab-charts canvas").forEach((canvas) => {
        const chart = Chart.getChart(canvas);
        if (chart) chart.resize();
      });
    });
  }
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tab));
});

document.getElementById("calculate-button").addEventListener("click", () => {
  calculate();
  activateTab("results");
});
document.getElementById("reset-button").addEventListener("click", resetInputs);
document.getElementById("export-button").addEventListener("click", exportCsv);
document.getElementById("compare-banks-button").addEventListener("click", () => {
  compareBanks();
  activateTab("results");
});
calculate();
