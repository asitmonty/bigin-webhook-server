# bigin-webhook-server

Webhook → Zoho Bigin CRM (Node.js + Express)

## 🚀 Features
- Accepts incoming webhook JSON via POST /webhook
- Maps fields and pushes to Zoho Bigin Leads
- Includes OAuth2 flow to obtain refresh token
- Automatically refreshes Zoho access tokens

## 🧰 Setup

1. Clone the repo or unzip this folder.
2. Create `.env` from `.env.example` and fill in your credentials.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## 🪄 OAuth Setup

1. Visit [http://localhost:3000/auth/zoho](http://localhost:3000/auth/zoho)
2. Authorize the app → copy refresh token → add to `.env`
3. Restart server.

## 🧪 Test Webhook
```bash
curl -X POST http://localhost:3000/webhook   -H "Content-Type: application/json"   -d '{"name":"John Doe","email":"john@example.com","phone":"9876543210","message":"Interested in demo"}'
```

## 🧱 Deployment
Deploy easily on Render, Railway, or Vercel.
