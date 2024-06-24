function subscribe() {
  const topic = document.getElementById("topic").value;
  const url = `ws://localhost:8080/Command/subscribe/${encodeURIComponent(
    topic
  )}`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log("WebSocket connection opened");
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
    updateTable(data);
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };
}

function updateTable(data) {
  const tableBody = document
    .getElementById("data-table")
    .getElementsByTagName("tbody")[0];
  const newRow = tableBody.insertRow();

  const deviceCell = newRow.insertCell(0);
  const avgCOCell = newRow.insertCell(1);
  const avgHumidityCell = newRow.insertCell(2);
  const avgLPGCell = newRow.insertCell(3);
  const avgSmokeCell = newRow.insertCell(4);
  const avgTemperatureCell = newRow.insertCell(5);

  deviceCell.textContent = data.device;
  avgCOCell.textContent = data.avg_carbon_oxide.toFixed(5);
  avgHumidityCell.textContent = data.avg_humidity.toFixed(5);
  avgLPGCell.textContent = data.avg_liquid_petroleum_gas.toFixed(5);
  avgSmokeCell.textContent = data.avg_smoke.toFixed(5);
  avgTemperatureCell.textContent = data.avg_temperature.toFixed(5);
}

window.subscribe = subscribe;
