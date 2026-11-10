let activeCharts = [];

export function renderCharts({ labels, equity, investment, homeValues, debt, costs }) {
  activeCharts.forEach((chart) => chart.destroy());
  activeCharts = [];

  activeCharts.push(new Chart(document.getElementById("c1"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Equity Casa", data: equity },
        { label: "Investimento", data: investment }
      ]
    }
  }));

  activeCharts.push(new Chart(document.getElementById("c2"), {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Valore Immobile", data: homeValues },
        { label: "Debito Residuo", data: debt }
      ]
    }
  }));

  activeCharts.push(new Chart(document.getElementById("c3"), {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Costi annuali + spese accessorie, al netto della detrazione stimata (escluse rate)", data: costs }]
    }
  }));
}
