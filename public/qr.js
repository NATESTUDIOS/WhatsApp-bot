let timer = null;

async function fetchStatus() {
  const res = await fetch("/api/status");
  const data = await res.json();
  const statusDiv = document.getElementById("status");

  if (data.connected) {
    // Clear any old timer
    if (timer) clearInterval(timer);
    statusDiv.innerHTML = `
      <h2>✅ Connected</h2>
      <p>Your bot is running successfully.</p>
    `;
  } else if (data.qr) {
    statusDiv.innerHTML = `
      <h2>📷 Scan QR to Connect</h2>
      <img src="${data.qr}" class="qr" />
      <p class="countdown">Expires in <span id="time">${Math.floor(data.timeLeft / 1000)}</span> seconds</p>
    `;

    let timeLeft = Math.floor(data.timeLeft / 1000);

    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      if (timeLeft <= 0) {
        clearInterval(timer);
        fetchStatus(); // reload QR when expired
      } else {
        document.getElementById("time").textContent = timeLeft;
        timeLeft--;
      }
    }, 1000);
  } else {
    statusDiv.innerHTML = `
      <h2>⏳ Waiting for QR...</h2>
      <p>Please wait while we generate a new QR code.</p>
    `;
  }
}

// Initial load + poll every 5s
fetchStatus();
setInterval(fetchStatus, 5000);