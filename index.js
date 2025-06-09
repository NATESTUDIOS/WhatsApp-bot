const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let qrCodeImage = null;
let isReady = false;

client.on('qr', async (qr) => {
  console.log('📷 QR code received');
  qrCodeImage = await qrcode.toDataURL(qr);
  isReady = false;
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
  qrCodeImage = null;
  isReady = true;
});

client.on('auth_failure', msg => {
  console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', reason => {
  console.log('🔌 Client was logged out', reason);
  isReady = false;
});

// Initialize WhatsApp client
client.initialize();

// Routes
app.get('/', (req, res) => {
  res.render('index', { qr: qrCodeImage, ready: isReady });
});

// Start the server
app.listen(port, () => {
  console.log(`🌐 Server running on http://localhost:${port}`);
});