const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const fs = require('fs');
const path = require('path');

const client = new Client({ authStrategy: new LocalAuth() });
const app = express();
app.use(express.json());

let lastGroup = null;
let qrImageData = null;

client.on('qr', async (qr) => {
  qrImageData = await qrcode.toDataURL(qr);
  console.log('QR code generated. Open /qr in browser to scan.');
});

client.on('ready', () => {
  console.log('WhatsApp bot is ready');
});

client.on('message', async (msg) => {
  if (msg.body === '@all' && msg.from.includes('@g.us')) {
    const chat = await msg.getChat();
    lastGroup = chat;

    let text = 'Tagging everyone:\n';
    let mentions = [];

    for (let participant of chat.participants) {
      const contact = await client.getContactById(participant.id._serialized);
      mentions.push(contact);
      text += `@${contact.number} `;
    }

    await chat.sendMessage(text, { mentions });
  }
});

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/qr', (req, res) => {
  if (!qrImageData) return res.send('QR code not ready. Please wait...');
  res.send(`
    <html><body>
      <h3>Scan QR with WhatsApp</h3>
      <img src="${qrImageData}" />
    </body></html>
  `);
});

app.post('/send', async (req, res) => {
  const { message } = req.body;
  if (!lastGroup) return res.status(400).send('No group cached');
  await lastGroup.sendMessage(message);
  res.send('Sent');
});

client.initialize();

app.listen(3000, () => console.log('Dashboard running on http://localhost:3000'));