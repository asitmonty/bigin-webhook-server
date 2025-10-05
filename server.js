const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { sendToZohoBigin } = require("./zoho");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("✅ Webhook → Zoho Bigin server running");
});

app.post("/webhook", async (req, res) => {
  const payload = req.body;
  console.log("📥 Incoming Webhook:", payload);

  const leadData = {
    Last_Name: payload.name || "Unknown",
    Email: payload.email,
    Phone: payload.phone,
    Description: payload.message || JSON.stringify(payload),
  };

  await sendToZohoBigin(leadData);

  res.status(200).json({ status: "ok" });
});

// OAuth Routes
app.get("/auth/zoho", (req, res) => {
  const redirectUri = "http://localhost:3000/oauth/callback";
  const url = `https://accounts.zoho.in/oauth/v2/auth?scope=ZohoBigin.modules.all,ZohoBigin.settings.all&client_id=${process.env.ZOHO_CLIENT_ID}&response_type=code&access_type=offline&redirect_uri=${redirectUri}`;
  res.redirect(url);
});

app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("No code received.");

  const params = new URLSearchParams({
    code,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    redirect_uri: "http://localhost:3000/oauth/callback",
    grant_type: "authorization_code",
  });

  try {
    const response = await axios.post("https://accounts.zoho.in/oauth/v2/token", params);
    const { access_token, refresh_token } = response.data;

    console.log("✅ Access Token:", access_token);
    console.log("🔁 Refresh Token:", refresh_token);

    res.send(
      `Tokens received.<br>Access Token: ${access_token}<br>Refresh Token: ${refresh_token}<br><br>Copy your refresh token into .env`
    );
  } catch (err) {
    console.error("OAuth Error:", err.response?.data || err.message);
    res.send("OAuth error. Check console.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
