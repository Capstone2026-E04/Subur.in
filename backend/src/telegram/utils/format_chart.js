"use strict";

function buildHistoryChartUrl(logs) {
  const labels = logs.map((log) =>
    new Date(log.timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" }),
  );
  const phData = logs.map((log) => log.ph);
  const moistureData = logs.map((log) => log.moisture);

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "pH", data: phData, borderColor: "#2e7d32", yAxisID: "y" },
        { label: "Kelembapan (%)", data: moistureData, borderColor: "#1565c0", yAxisID: "y1" },
      ],
    },
    options: {
      scales: {
        y: { type: "linear", position: "left", title: { display: true, text: "pH" } },
        y1: {
          type: "linear",
          position: "right",
          title: { display: true, text: "Kelembapan (%)" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&width=700&height=400&backgroundColor=white`;
}

module.exports = { buildHistoryChartUrl };
