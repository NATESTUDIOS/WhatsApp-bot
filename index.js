const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let qrCodeImage = null;
let isReady = false;
let chats = [];

// WhatsApp Events
client.on('qr', async (qr) => {
  console.log('📷 QR RECEIVED');
  qrCodeImage = await qrcode.toDataURL(qr);
  isReady = false;
});

client.on('ready', async () => {
  console.log('✅ WhatsApp bot is ready!');
  qrCodeImage = null;
  isReady = true;
  chats = await client.getChats();
});

// Web routes
app.get('/', async (req, res) => {
  const groupChats = chats.filter(c => c.isGroup);
  res.render('index', {
    qr: qrCodeImage,
    isReady,
    groups: groupChats.map(c => ({ id: c.id._serialized, name: c.name }))
  });
});

app.post('/tag', async (req, res) => {
  const groupId = req.body.groupId;
  if (!groupId) return res.redirect('/');

  try {
    const chat = await client.getChatById(groupId);
    if (!chat.isGroup) return res.send('Not a group');

    const mentions = [];
    let text = '';

    for (let p of chat.participants) {
      const contact = await client.getContactById(p.id._serialized);
      mentions.push(contact);
      text += `@${contact.number} `;
    }

    await chat.sendMessage(text, { mentions });
    res.send('✅ Tagged everyone in the group!');
  } catch (e) {
    console.error(e);
    res.send('❌ Failed to tag group.');
  }
});

client.initialize();

app.listen(port, () => {
  console.log(`🌐 Server running at http://localhost:${port}`);
});