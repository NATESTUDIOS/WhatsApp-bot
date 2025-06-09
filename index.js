const express = require("express");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

const client = new Client({
    authStrategy: new LocalAuth()
});

let qrCode = "";
let isReady = false;

client.on("qr", async (qr) => {
    qrCode = await qrcode.toDataURL(qr);
    isReady = false;
    console.log("QR RECEIVED");
});

client.on("ready", () => {
    console.log("Client is ready!");
    isReady = true;
    qrCode = "";
});

client.initialize();

app.get("/", (req, res) => {
    res.render("dashboard", { qrCode, isReady });
});

app.get("/tagall", async (req, res) => {
    const chat = await client.getChats();
    const group = chat.find(c => c.isGroup);
    if (!group) return res.send("No group found.");

    const mentions = group.participants.map(p => p.id._serialized);
    client.sendMessage(group.id._serialized, `@everyone`, { mentions });
    res.send("Tagged all members!");
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
