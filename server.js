require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.POREL_API_KEY;
const API_BASE = process.env.POREL_API_BASE || 'https://porel.up.railway.app/v1';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// List models
app.get('/api/models', async (req, res) => {
  try {
    const resp = await fetch(`${API_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      signal: AbortSignal.timeout(10000),
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(502).json({ error: { message: `Failed to fetch models: ${err.message}` } });
  }
});

// Chat completions (streaming)
app.post('/api/chat', async (req, res) => {
  if (!API_KEY || API_KEY.includes('your_api_key')) {
    return res.status(400).json({ error: { message: 'Set POREL_API_KEY in .env first.' } });
  }

  try {
    const resp = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120000),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();

    req.on('close', () => reader.cancel());

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: { message: `Proxy error: ${err.message}` } });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`\n  Porel AI Chatbot → http://localhost:${PORT}`);
  console.log(`  API Base:        ${API_BASE}`);
  console.log(`  API Key:         ${API_KEY && !API_KEY.includes('your_api_key') ? 'configured' : 'SET POREL_API_KEY in .env'}\n`);
});
