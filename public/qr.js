async function fetchStatus() {
  const res = await fetch("/status");
  const data = await res.json();

  const content = document.getElementById("content");

  if (data.status === "ready") {
    content.innerHTML = `<h2 class="ready">✅ Bot is connected to WhatsApp!</h2>`;
  } else if (data.status === "qr") {
    if (data.remaining > 0) {
      content.innerHTML = `
        <h2>Scan QR Code to connect WhatsApp</h2>
        <img src="${data.qr}" />
        <p>⏳ Expires in <span id="countdown">${data.remaining}</span> seconds</p>
      `;

      let remaining = data.remaining;
      const countdownEl = document.getElementById("countdown");

      const timer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(timer);
          content.innerHTML = `<p class="expired">QR Expired ⌛ — refreshing...</p>`;
          setTimeout(fetchStatus, 2000); // auto-refresh for new QR
        } else {
          countdownEl.textContent = remaining;
        }
      }, 1000);
    } else {
      content.innerHTML = `<p class="expired">QR Expired ⌛ — refreshing...</p>`;
      setTimeout(fetchStatus, 2000);
    }
  } else {
    content.innerHTML = `<h2>⌛ Initializing bot...</h2>`;
  }
}

// Keep polling every 5s in case status changes
setInterval(fetchStatus, 5000);
fetchStatus();
