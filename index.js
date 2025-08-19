import express from "express";
import qrcode from "qrcode";
import { Client, LocalAuth } from "whatsapp-web.js";

const app = express();
const PORT = process.env.PORT || 3000;

// WhatsApp Client with LocalAuth (stores session on disk)
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./session" }), // will survive restarts if disk is mounted
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

let qrCodeData = null;
let isReady = false;

// QR code event
client.on("qr", async (qr) => {
    console.log("⚡ Scan this QR code to connect");
    qrCodeData = await qrcode.toDataURL(qr); // convert QR → base64 image
});

// When ready
client.on("ready", () => {
    console.log("✅ WhatsApp bot is ready!");
    isReady = true;
    qrCodeData = null;
});

// Example command (!tagall)
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

// --- Dashboard Routes ---
app.get("/", (req, res) => {
    if (isReady) {
        res.send("<h2>✅ Bot is connected to WhatsApp!</h2>");
    } else if (qrCodeData) {
        res.send(`
            <h2>Scan QR Code to connect WhatsApp</h2>
            <img src="${qrCodeData}" />
        `);
    } else {
        res.send("<h2>⌛ Initializing bot...</h2>");
    }
});

app.listen(PORT, () => {
    console.log(`🌐 Dashboard running on http://localhost:${PORT}`);
});