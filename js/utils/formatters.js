export const formatCurrency = (value) => new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
}).format(value);

export const formatPercentage = (value) => `${(value * 100).toFixed(2)}%`;

export function formatCsvValue(value) {
  if (typeof value === "number") {
    return value.toLocaleString("it-IT", {
      useGrouping: false,
      maximumFractionDigits: 2
    });
  }

  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
