export const root = async (req, res) => {
  res.send('Getbucks Vas Server Working');
};

export const health = async (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

export const testerPage = async (req, res) => {
  res.sendFile('tester.html', { root: 'public' });
};

export const iframeTesterPage = async (req, res) => {
  res.sendFile('iframe-tester.html', { root: 'public' });
};
