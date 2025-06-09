const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

let qrCodeImage = null;
let ready = false;
let chatGroups = [];

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', async (qr) => {
  console.log('QR RECEIVED');
  qrCodeImage = await qrcode.toDataURL(qr);
  ready = false;
});

client.on('ready', async () => {
  console.log('✅ WhatsApp bot is ready!');
  ready = true;
  qrCodeImage = null;

  // Load groups
  const chats = await client.getChats();
  chatGroups = chats.filter(chat => chat.isGroup).map(chat => chat.name);
});

// Start client
client.initialize();

// Routes
app.get('/', (req, res) => {
  if (qrCodeImage) {
    res.send(`<img src="${qrCodeImage}" />`);
  } else {
    res.redirect('/dashboard');
  }
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { qr: qrCodeImage, ready, groups: chatGroups });
});

// Send to number
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  try {
    await client.sendMessage(`${number}@c.us`, message);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Send error:', err);
    res.send('❌ Failed to send message.');
  }
});

// Send to group
app.post('/send-group-message', async (req, res) => {
  const { groupName, message } = req.body;
  const group = (await client.getChats()).find(c => c.isGroup && c.name === groupName);
  if (group) {
    await client.sendMessage(group.id._serialized, message);
    res.redirect('/dashboard');
  } else {
    res.send('Group not found.');
  }
});

// Tag all members
app.post('/tag-group', async (req, res) => {
  const { groupName, message } = req.body;
  const group = (await client.getChats()).find(c => c.isGroup && c.name === groupName);
  if (group) {
    const mentions = group.participants.map(p => p.id._serialized);
    const fullMsg = `${message || ''}\n\n` + mentions.map(m => `@${m.split('@')[0]}`).join(' ');
    await client.sendMessage(group.id._serialized, fullMsg, { mentions });
    res.redirect('/dashboard');
  } else {
    res.send('Group not found.');
  }
});

// Start server
app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
});