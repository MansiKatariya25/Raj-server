// server.js  (or index.js)
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = 'AIzaSyBuZNTiJ5EjdsN4-8vFZcqBH_TFatVYFZQ';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent';

app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  // 1. Tell the browser we’re sending SSE
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  try {
    const { data: stream } = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { responseType: 'stream' }
    );

    // 2. Forward every line as SSE
    stream.on('data', (buf) => {
      const lines = buf
        .toString()
        .split('\n')
        .filter(l => l.trim());

      for (const line of lines) {
        // Skip empty or "data: [DONE]" leftovers
        if (line.startsWith('data:')) {
          res.write(`data: ${line.slice(5).trim()}\n\n`);
        }
      }
    });

    stream.on('end', () => {
      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', () => {
      res.write('data: [ERROR]\n\n');
      res.end();
    });

    // If the client closes the tab/browser
    req.on('close', () => stream.destroy());
  } catch (e) {
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
});

app.listen(5000, () => console.log('Listening on http://localhost:5000'));