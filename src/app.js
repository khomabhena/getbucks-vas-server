import express from 'express';
import morgan from 'morgan';
import corsMiddleware from './middleware/cors.js';
import errorHandler from './middleware/errorHandler.js';
import statusRoutes from './routes/statusRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import bankwareRoutes from './routes/bankwareRoutes.js';
import hotRechargeRoutes from './routes/hotRechargeRoutes.js';
import { sendError } from './utils/http.js';

const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(morgan('combined'));
app.use(corsMiddleware);

app.use('/', statusRoutes);
app.use('/api', tokenRoutes);
app.use('/api/getbucks', bankwareRoutes);
app.use('/api/hot-recharge', hotRechargeRoutes);

app.use('/api', (req, res) => {
  return sendError(res, 404, 'Not found', 'NOT_FOUND');
});

app.use(errorHandler);

export default app;
