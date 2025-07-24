const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = 'AIzaSyBuZNTiJ5EjdsN4-8vFZcqBH_TFatVYFZQ'; // <-- Put your Gemini API key here
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent';

app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'No prompt provided' });
  }

  // Set headers for SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const response = await axios({
      method: 'post',
      url: `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      data: {
        contents: [{ parts: [{ text: prompt }] }]
      },
      responseType: 'stream',
    });

    response.data.on('data', (chunk) => {
      // Forward each chunk to the client as an SSE event
      res.write(`data: ${chunk}\n\n`);
    });

    response.data.on('end', () => {
      res.write('event: end\ndata: [DONE]\n\n');
      res.end();
    });

    response.data.on('error', (err) => {
      res.write('event: error\ndata: Error occurred\n\n');
      res.end();
    });

    req.on('close', () => {
      response.data.destroy();
    });

  } catch (error) {
    res.write('event: error\ndata: Error in backend\n\n');
    res.end();
  }
});

app.listen(5000, () => {
  console.log('Server started on http://localhost:5000');
});
