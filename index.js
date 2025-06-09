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
  console.log('QR RECEIVED');
  qrCodeImage = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
  qrCodeImage = null;
  isReady = true;
});

client.initialize();

app.get('/', (req, res) => {
  if (isReady) {
    res.redirect('/dashboard');
  } else {
    res.render('index', { qr: qrCodeImage });
  }
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

// Send message to any number
app.post('/send-message', async (req, res) => {
  const number = req.body.number.replace(/\D/g, '') + '@c.us';
  const message = req.body.message;

  try {
    await client.sendMessage(number, message);
    res.send('<h3>✅ Message sent!</h3><a href="/dashboard">Back</a>');
  } catch (err) {
    res.send(`<h3>❌ Error: ${err.message}</h3><a href="/dashboard">Back</a>`);
  }
});

// Get list of groups
app.get('/groups', async (req, res) => {
  const chats = await client.getChats();
  const groups = chats.filter(chat => chat.isGroup);

  let html = '<h2>Groups</h2><ul>';
  for (const group of groups) {
    html += `<li>${group.name} - <form method="POST" action="/tag-group" style="display:inline;">
      <input type="hidden" name="groupId" value="${group.id._serialized}" />
      <button>Tag All</button>
    </form></li>`;
  }
  html += '</ul><a href="/dashboard">Back</a>';
  res.send(html);
});

// Tag everyone in a group
app.post('/tag-group', async (req, res) => {
  const groupId = req.body.groupId;
  const chat = await client.getChatById(groupId);

  if (!chat.isGroup) return res.send('❌ Not a group');

  let mentions = [];
  for (let participant of chat.participants) {
    mentions.push(`@${participant.id.user}`);
  }

  const message = mentions.join(' ');
  await chat.sendMessage(message);
  res.send('<h3>✅ Tagged everyone!</h3><a href="/dashboard">Back</a>');
});

app.listen(port, () => {
  console.log(`🌐 Server running on http://localhost:${port}`);
});
