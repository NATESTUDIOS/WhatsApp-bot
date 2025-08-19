async function fetchStatus() {
  const res = await fetch("/api/status");
  const data = await res.json();

  const statusDiv = document.getElementById("status");

  if (data.connected) {
    statusDiv.innerHTML = `
      <h2>✅ Connected</h2>
      <p>Your bot is running successfully.</p>
    `;
  } else {
    statusDiv.innerHTML = `
      <h2>📷 Scan QR to Connect</h2>
      <img src="${data.qr}" class="qr" />
      <p class="countdown">Expires in <span id="time">${Math.floor(data.timeLeft/1000)}</span> seconds</p>
    `;

    let timeLeft = Math.floor(data.timeLeft / 1000);
    const timer = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timer);
        fetchStatus(); // refresh when expired
      } else {
        document.getElementById("time").textContent = timeLeft;
        timeLeft--;
      }
    }, 1000);
  }
}

fetchStatus();
setInterval(fetchStatus, 5000);