import { sendError } from '../utils/http.js';

const errorHandler = (err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Invalid JSON payload', 'INVALID_JSON');
  }
  console.error('Unhandled error:', err);
  return sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
};

export default errorHandler;
