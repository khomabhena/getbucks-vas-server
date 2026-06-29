import { VALID_APPS } from '../config/env.js';

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

/** Redirect mistaken /vas/debug hits to the H5 app debug screen (not an API route). */
export const debugRedirect = async (req, res) => {
  const appKey = req.query.app === 'bill-payments' ? 'bill-payments' : 'airtime';
  const baseUrl = (VALID_APPS[appKey] || VALID_APPS.airtime).replace(/\/$/, '');
  res.redirect(302, `${baseUrl}/debug`);
};
