const express = require('express');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp-sessions';

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

let qrCodeImage = null;
let ready = false;
let chatGroups = [];

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Initialize store and client
const store = new MongoStore({ mongoose });

let client = new Client({
  authStrategy: new RemoteAuth({
    store,
    backupSyncIntervalMs: 60000,
    clientId: 'debug-client-' + Date.now()
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// WhatsApp Events
client.on('qr', async (qr) => {
  console.log('📸 QR received');
  qrCodeImage = await qrcode.toDataURL(qr);
  ready = false;
});

client.on('ready', async () => {
  if (client.info) {
    console.log('✅ WhatsApp client connected as:', client.info.wid.user);
    ready = true;
    qrCodeImage = null;

    const chats = await client.getChats();
    chatGroups = chats
      .filter(chat => chat.isGroup)
      .map(chat => chat.name || chat.id.user);

    console.log('📦 Groups loaded:', chatGroups.length);
  } else {
    console.warn('⚠️ Ready triggered, but client.info is undefined.');
    ready = false;
  }
});

client.on('disconnected', (reason) => {
  console.warn('⚠️ WhatsApp disconnected:', reason);
  ready = false;
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failure:', msg);
  ready = false;
});

client.on('remote_session_saved', () => {
  console.log('💾 Remote session saved');
});

// Initialize client
try {
  client.initialize();
} catch (err) {
  console.error('❌ WhatsApp failed to initialize:', err);
  ready = false;
}

// Routes
app.get('/', (req, res) => {
  if (!ready) {
    res.render('index', { qr: qrCodeImage, ready });
  } else {
    res.redirect('/dashboard');
  }
});

app.get('/dashboard', (req, res) => {
  if (!ready) return res.redirect('/');
  res.render('dashboard', { groups: chatGroups, ready });
});

app.get('/status', (req, res) => {
  res.json({ connected: ready });
});

app.get('/diagnostics', (req, res) => {
  const html = `
    <h1>📊 WhatsApp Diagnostics</h1>
    <p><strong>Connected:</strong> ${!!client.info}</p>
    <p><strong>Ready:</strong> ${ready}</p>
    <p><strong>QR Available:</strong> ${!!qrCodeImage}</p>
    <p><strong>Client Info:</strong> ${client.info ? JSON.stringify(client.info, null, 2) : 'N/A'}</p>
    <form method="POST" action="/reset-session" onsubmit="return confirm('Reset session? You will need to re-authenticate.')">
      <button type="submit" style="padding: 10px 20px; margin-top: 10px; background: red; color: white; border: none; border-radius: 4px;">🔄 Reset Session</button>
    </form>
    <br><a href="/">← Back to Home</a>
  `;
  res.send(html);
});

// ✅ Fixed reset-session route
app.post('/reset-session', async (req, res) => {
  try {
    if (client) {
      await client.destroy();
      console.log('🔌 Client destroyed');
    }

    if (store && store.sessionCollection) {
      await store.sessionCollection.deleteMany({});
      console.log('🧹 Session collection cleared');
    }

    client = null;
    qrCodeImage = null;
    ready = false;
    chatGroups = [];

    // Reinitialize client
    client = new Client({
      authStrategy: new RemoteAuth({
        store,
        backupSyncIntervalMs: 60000,
        clientId: 'debug-client-' + Date.now()
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    client.on('qr', async (qr) => {
      qrCodeImage = await qrcode.toDataURL(qr);
      ready = false;
    });

    client.on('ready', async () => {
      if (client.info) {
        ready = true;
        qrCodeImage = null;

        const chats = await client.getChats();
        chatGroups = chats.filter(chat => chat.isGroup).map(chat => chat.name || chat.id.user);
      }
    });

    client.initialize();
    res.redirect('/diagnostics');
  } catch (error) {
    console.error('❌ Failed to reset session:', error);
    res.status(500).send('Failed to reset session.');
  }
});

app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  try {
    await client.sendMessage(`${number}@c.us`, message);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ Failed to send message:', err);
    res.status(500).send('Failed to send message.');
  }
});

app.post('/send-group-message', async (req, res) => {
  const { groupName, message } = req.body;
  try {
    const group = (await client.getChats()).find(c => c.isGroup && c.name === groupName);
    if (!group) return res.status(404).send('Group not found.');
    await client.sendMessage(group.id._serialized, message);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ Failed to send group message:', err);
    res.status(500).send('Failed to send group message.');
  }
});

app.post('/tag-group', async (req, res) => {
  const { groupName, message } = req.body;
  try {
    const group = (await client.getChats()).find(c => c.isGroup && c.name === groupName);
    if (!group) return res.status(404).send('Group not found.');
    const mentions = group.participants.map(p => p.id._serialized);
    const taggedMessage = `${message || ''}\n\n` + mentions.map(m => `@${m.split('@')[0]}`).join(' ');
    await client.sendMessage(group.id._serialized, taggedMessage, { mentions });
    res.redirect('/dashboard');
  } catch (err) {
    console.error('❌ Failed to tag group:', err);
    res.status(500).send('Failed to tag group.');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('🛑 Unhandled Rejection:', reason);
});