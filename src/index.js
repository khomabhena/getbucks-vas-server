/**
 * GetBucks VAS Server
 * Entry point for the Value Added Services API
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Getbucks Vas Server Working');
});

// Start server
app.listen(PORT, () => {
  console.log(`Getbucks Vas Server Working`);
  console.log(`Server running on http://localhost:${PORT}`);
});

