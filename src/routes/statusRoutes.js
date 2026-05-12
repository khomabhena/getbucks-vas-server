import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Getbucks Vas Server Working');
});

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.get('/tester', (req, res) => {
  res.sendFile('tester.html', { root: 'public' });
});

router.get('/iframe-tester', (req, res) => {
  res.sendFile('iframe-tester.html', { root: 'public' });
});

export default router;
