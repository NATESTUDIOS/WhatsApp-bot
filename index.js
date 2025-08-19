const express = require("express");
const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./session" }),
    puppeteer: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
});

let qrCodeData = null;
let qrGeneratedAt = null;
let isReady = false;

client.on("qr", async (qr) => {
    console.log("⚡ New QR code generated");
    qrCodeData = await qrcode.toDataURL(qr);
    qrGeneratedAt = Date.now();
});

client.on("ready", () => {
    console.log("✅ WhatsApp bot is ready!");
    isReady = true;
    qrCodeData = null;
    qrGeneratedAt = null;
});

// Example command
client.on("message", async (msg) => {
    if (msg.body === "!tagall") {
        const chat = await msg.getChat();
        if (chat.isGroup) {
            let text = "";
            let mentions = [];
            for (let participant of chat.participants) {
                const contact = await client.getContactById(
                    participant.id._serialized
                );
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

// API endpoint for frontend to fetch status/QR
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
