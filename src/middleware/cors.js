const corsMiddleware = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, Authorization, IFS-Program-Id'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
};

export default corsMiddleware;
