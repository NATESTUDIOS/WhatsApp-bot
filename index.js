const express = require("express");
const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// WhatsApp Client (Render-safe Puppeteer setup)
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./session" }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // Render can supply Chromium
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
    ],
  },
});

let qrCodeData = null;
let qrGeneratedAt = null;
let isReady = false;

// QR code event
client.on("qr", async (qr) => {
  console.log("⚡ New QR code generated");
  qrCodeData = await qrcode.toDataURL(qr);
  qrGeneratedAt = Date.now();
});

// Ready event
client.on("ready", () => {
  console.log("✅ WhatsApp bot is ready!");
  isReady = true;
  qrCodeData = null;
  qrGeneratedAt = null;
});

// Example command: !tagall
client.on("message", async (msg) => {
  if (msg.body === "!tagall") {
    const chat = await msg.getChat();
    if (chat.isGroup) {
      let text = "";
      let mentions = [];
      for (let participant of chat.participants) {
        const contact = await client.getContactById(participant.id._serialized);
        mentions.push(contact);
        text += `@${participant.id.user} `;
      }
      chat.sendMessage(text, { mentions });
    } else {
      msg.reply("This works only in groups!");
    }
  }
});

client.initialize();

// API endpoint → frontend polls here
app.get("/status", (req, res) => {
  if (isReady) {
    res.json({ status: "ready" });
  } else if (qrCodeData) {
    res.json({
      status: "qr",
      qr: qrCodeData,
      remaining: 60 - Math.floor((Date.now() - qrGeneratedAt) / 1000),
    });
  } else {
    res.json({ status: "init" });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running on http://localhost:${PORT}`);
});