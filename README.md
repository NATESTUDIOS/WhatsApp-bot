# 🤖 WhatsApp Group Tagging Bot (24/7 Online)

A reliable, easy-to-use WhatsApp bot with a dashboard to send messages, tag group members, and monitor connection status — now with MongoDB logging and animated UI.

## 🔧 Features

- 🔐 Connect to WhatsApp securely via QR code (using `whatsapp-web.js`)
- 📤 Send messages to individual numbers
- 👥 Send messages to groups
- 🔖 Tag all members of any group
- ✅ Dashboard shows real-time connection status
- 📊 Logs all sent messages (MongoDB)
- 💫 Smooth, animated dashboard and login UI (no design change)
- 🌐 Hosted on [Render](https://render.com)
- 🔁 Keep bot online 24/7 using [UptimeRobot](https://uptimerobot.com)

## 📸 Screenshots

> Dashboard and login UI have built-in loader animations and QR expiry timers.

## 🚀 Hosting on Render

1. Push this project to a GitHub repo.
2. Go to [https://render.com](https://render.com), create a **new Web Service**.
3. Choose your repo, and configure it:
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. Add the following environment variables (Render > Environment > Secret Files):
   - `MONGODB_URI` – your MongoDB connection string
   - `SESSION_FILE_PATH` (optional) – path to save session JSON
5. Done! Use UptimeRobot to ping the Render URL every 5 mins to keep it awake.

## ⚙️ Setup Locally

```bash
git clone https://github.com/your-username/whatsapp-bot.git
cd whatsapp-bot
npm install
node index.js