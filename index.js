const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Hold QR string
let qrCodeImage = null;

// Events
client.on('qr', async (qr) => {
  console.log('QR RECEIVED');
  qrCodeImage = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
  qrCodeImage = null;
});

// Start WhatsApp client
client.initialize();

// Routes
app.get('/', (req, res) => {
  res.render('index', { qr: qrCodeImage });
});

// Start server
app.listen(port, () => {
  console.log(`🌐 Server running on http://localhost:${port}`);
});