# WhatsApp Bot (Render Deployment)

This is a sample WhatsApp bot built with **Node.js** and **whatsapp-web.js**.  
It can tag all group members with `!tagall`.

## 🚀 Features
- QR code login (via dashboard page)
- Persistent session (with Render disk)
- Simple web dashboard

## 🔧 Deployment on Render
1. Create a **new Web Service** on Render.
2. Connect this repo.
3. Set:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free or Starter
4. Add a **Persistent Disk**:
   - Mount path: `/opt/render/project/src/session`
5. Visit your Render app URL:
   - If not connected → QR code will appear
   - After scanning → bot stays online

## 💬 Commands
- `!tagall` → tags everyone in a group.