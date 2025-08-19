const express = require("express");
const qrcode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

const app = express();
const PORT = process.env.PORT || 3000;

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./session" }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let qrCodeData = null;
let isReady = false;

client.on("qr", async (qr) => {
    console.log("⚡ Scan this QR code to connect");
    qrCodeData = await qrcode.toDataURL(qr);
});

client.on("ready", () => {
    console.log("✅ WhatsApp bot is ready!");
    isReady = true;
    qrCodeData = null;
});

client.on("message", async msg => {
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

// Dashboard
app.get("/", (req, res) => {
    if (isReady) {
        res.send("<h2>✅ Bot is connected to WhatsApp!</h2>");
    } else if (qrCodeData) {
        res.send(`<h2>Scan QR Code to connect</h2><img src="${qrCodeData}" />`);
    } else {
        res.send("<h2>⌛ Initializing bot...</h2>");
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Dashboard running on http://localhost:${PORT}`);
});