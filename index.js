import express from "express";
import { Client, LocalAuth } from "whatsapp-web.js";
import qrcode from "qrcode";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let qrData = null;
let qrExpire = null;
let isConnected = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  qrExpire = Date.now() + 60 * 1000; // 60s expiry
  qrcode.toDataURL(qr, (err, url) => {
    qrData = url;
  });
  isConnected = false;
});

client.on("ready", () => {
  console.log("✅ WhatsApp bot is ready!");
  isConnected = true;
  qrData = null;
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

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));