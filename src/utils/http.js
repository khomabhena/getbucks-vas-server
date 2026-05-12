export const sendError = (res, status, message, code, details) => {
  const payload = { error: message };
  if (code) payload.code = code;
  if (details) payload.details = details;
  return res.status(status).json(payload);
};

export const proxyBankWareResponse = async (res, response) => {
  const responseText = await response.text().catch(() => '');
  if (!responseText) {
    return res.sendStatus(response.status);
  }

  try {
    return res.status(response.status).json(JSON.parse(responseText));
  } catch {
    return res.status(response.status).send(responseText);
  }
};
