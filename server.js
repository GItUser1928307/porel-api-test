require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3456;
const API_KEY = process.env.POREL_API_KEY;
const API_BASE = process.env.POREL_API_BASE || 'http://localhost:3000/v1';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/proxy/chat/completions', async (req, res) => {
  try {
    const resp = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(60000),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: `Proxy error: ${err.message}` } });
  }
});

app.get('/proxy/models', async (req, res) => {
  try {
    const resp = await fetch(`${API_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: `Proxy error: ${err.message}` } });
  }
});

app.get('/config', (req, res) => {
  res.json({
    apiBase: API_BASE,
    hasKey: !!API_KEY && !API_KEY.includes('your_api_key'),
  });
});

app.listen(PORT, () => {
  console.log(`\n  Porel API Test → http://localhost:${PORT}`);
  console.log(`  API Base:       ${API_BASE}`);
  console.log(`  API Key:        ${API_KEY && !API_KEY.includes('your_api_key') ? '✓ configured' : '✗ set POREL_API_KEY in .env'}\n`);
});
