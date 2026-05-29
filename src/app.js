import express from 'express';
import morgan from 'morgan';
import corsMiddleware from './middleware/cors.js';
import errorHandler from './middleware/errorHandler.js';
import { registerRoutes } from './routes/index.js';

const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(morgan('combined'));
app.use(corsMiddleware);

registerRoutes(app);

app.use(errorHandler);

export default app;
