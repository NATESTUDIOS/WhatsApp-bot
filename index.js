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

// Create WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

let qrCodeImage = null;
let isClientReady = false;

// WhatsApp events
client.on('qr', async (qr) => {
  console.log('QR RECEIVED');
  qrCodeImage = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
  qrCodeImage = null;
  isClientReady = true;
});

client.initialize();

// Routes
app.get('/', (req, res) => {
  res.render('index', { qr: qrCodeImage });
});

app.get('/dashboard', (req, res) => {
  if (!isClientReady) {
    return res.send('⏳ WhatsApp client is not ready yet. Scan the QR code on the home page first.');
  }
  res.render('dashboard');
});

// Send message to number
app.post('/send-message', async (req, res) => {
  if (!isClientReady) return res.send('❌ WhatsApp client is not ready.');

  const { number, message } = req.body;
  const chatId = number.replace(/\D/g, '') + '@c.us';

  try {
    await client.sendMessage(chatId, message);
    res.send('✅ Message sent successfully.');
  } catch (err) {
    console.error('Send Error:', err);
    res.send('❌ Failed to send message.');
  }
});

// List groups
app.get('/groups', async (req, res) => {
  if (!isClientReady) return res.send('❌ WhatsApp client is not ready.');

  try {
    const chats = await client.getChats();
    const groups = chats.filter(chat => chat.isGroup);

    let html = '<h1>My WhatsApp Groups</h1>';
    groups.forEach(group => {
      html += `<p><b>${group.name}</b>
        <form method="POST" action="/tag-all" style="display:inline;">
          <input type="hidden" name="groupId" value="${group.id._serialized}">
          <button type="submit">Tag All</button>
        </form></p>`;
    });

    res.send(html);
  } catch (err) {
    console.error('Group List Error:', err);
    res.send('❌ Failed to fetch groups.');
  }
});

// Tag all members in group
app.post('/tag-all', async (req, res) => {
  if (!isClientReady) return res.send('❌ WhatsApp client is not ready.');

  const groupId = req.body.groupId;
  try {
    const chat = await client.getChatById(groupId);
    const mentions = chat.participants.map(p => p.id);
    const text = mentions.map(p => `@${p.user}`).join(' ');

    await chat.sendMessage(text, { mentions });
    res.send('✅ Tagged all group members.');
  } catch (err) {
    console.error('Tag Error:', err);
    res.send('❌ Failed to tag members.');
  }
});

// Start server
app.listen(port, () => {
  console.log(`🌐 Server running on http://localhost:${port}`);
});