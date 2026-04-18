require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting - prevents abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
// Transform plain text to legal language
app.post('/api/transform', async (req, res) => {
  const { text, tone, area } = req.body;

  if (!text) return res.status(400).json({ error: 'No text provided' });

  const prompt = `You are a legal writing assistant. Transform the following text into formal legal language.
Tone: ${tone || 'formal'}
Area of law: ${area || 'general'}
Text: "${text}"
Respond with ONLY the transformed legal text, nothing else.`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                   data?.error?.message || 
                  "Unable to transform text. Please try again.";    res.json({ result, tone: tone || 'formal', area: area || 'general' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get quick legal phrases
app.get('/api/phrases', (req, res) => {
  const { tone } = req.query;

  const phrases = {
    formal: ['Notwithstanding the foregoing', 'Pursuant to', 'In accordance with', 'Whereas', 'Hereinafter referred to as'],
    contract: ['The parties agree that', 'Subject to the terms herein', 'In consideration of', 'The obligations hereunder', 'Time is of the essence'],
    litigation: ['The plaintiff alleges', 'Without prejudice', 'The defendant contends', 'As a matter of law', 'The burden of proof'],
    academic: ['It is submitted that', 'The principle established in', 'According to settled law', 'The ratio decidendi', 'Obiter dictum']
  };

  res.json({ phrases: phrases[tone] || phrases.formal });
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'LexType API is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LexType server running on port ${PORT}`));