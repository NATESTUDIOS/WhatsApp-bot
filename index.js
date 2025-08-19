import express from "express";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let qrData = null;
let qrExpire = null;
let isConnected = false;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "render-session" }), // persistent folder per project
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process", // sometimes helps in container env
      "--disable-gpu",
    ],
  },
});

client.on("qr", async (qr) => {
  console.log("⚡ New QR generated");
  qrExpire = Date.now() + 60 * 1000; // 60s expiry
  try {
    qrData = await qrcode.toDataURL(qr);
  } catch (err) {
    console.error("QR error:", err);
    qrData = null;
  }
  isConnected = false;
});

client.on("ready", () => {
  console.log("✅ WhatsApp bot is ready!");
  isConnected = true;
  qrData = null;
});

client.on("disconnected", () => {
  console.log("❌ WhatsApp disconnected");
  isConnected = false;
});

client.initialize();

// API to get status
app.get("/api/status", (req, res) => {
  res.json({
    connected: isConnected,
    qr: isConnected ? null : qrData,
    timeLeft: isConnected ? null : Math.max(0, qrExpire - Date.now()),
  });
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);