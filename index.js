const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Setup view engine and static folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// WhatsApp bot state
let qrCodeImage = null;
let ready = false;
let chatGroups = [];

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', async (qr) => {
  console.log('📸 QR received');
  qrCodeImage = await qrcode.toDataURL(qr);
  ready = false;
});

client.on('ready', async () => {
  console.log('✅ WhatsApp client is ready');
  ready = true;
  qrCodeImage = null;

  const chats = await client.getChats();
  chatGroups = chats.filter(chat => chat.isGroup).map(chat => chat.name);
  console.log('📦 Groups loaded:', chatGroups);
});

client.initialize();

// ROUTES

// Root: Show QR or redirect to dashboard
app.get('/', (req, res) => {
  if (!ready) {
    res.render('index', { qr: qrCodeImage, ready });
  } else {
    res.redirect('/dashboard');
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  console.log("🔁 Serving dashboard. Ready:", ready, "Groups:", chatGroups.length);
  if (!ready) return res.redirect('/');
  res.render('dashboard', { groups: chatGroups, ready });
});

// Send individual message
app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  try {
    await client.sendMessage(`${number}@c.us`, message);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ Failed to send message:', err);
    res.send('Failed to send message.');
  }
});

// Send message to group
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

// Tag all group members
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
  console.log(`🚀 Server is running at http://localhost:${port}`);
});