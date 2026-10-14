import 'dotenv/config';
import express from 'express';
import http from 'http';
import { db } from './db/config.js';
import { mainRouter } from './src/api/routes.js';
import { errorHandler } from './src/middleware/error-handler.js';
import { initSocket } from './src/socket/socket.server.js';
import cors from 'cors';
import helmet from 'helmet';
import { allowedOrigins } from './src/utils/cors.js';

if (
  process.env.NODE_ENV === 'production' &&
  (process.env.JWT_SECRET || '').length < 32
) {
  console.warn('WARNING: JWT_SECRET is shorter than 32 characters. Use a long random value in production.');
}

const app = express();
const port = process.env.PORT || 3777;

// Behind a hosting proxy (Nginx, cPanel, a PaaS) the real client IP is in
// X-Forwarded-For. Without this every user looks like one IP and would share
// a single rate-limit bucket. Override with TRUST_PROXY=0 if you have no proxy.
if (process.env.TRUST_PROXY !== undefined) {
  app.set('trust proxy', Number(process.env.TRUST_PROXY) || false);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
// cross-origin resource policy relaxed so the separately hosted frontend can load chat attachments.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: allowedOrigins() }));
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use('/api', mainRouter);

app.use(errorHandler);

// Socket.io needs the raw HTTP server used by Express.
const httpServer = http.createServer(app);
initSocket(httpServer);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const connection = await db.getConnection();

    console.log('Database connection established successfully.');
    connection.release();

    httpServer.listen(port, err => {
      if (err) {
        console.error('Failed to start the server:', err.message);
        process.exit(1);
      }
      console.log(`Server running on port http://localhost:${port}`);
    });
  } catch (error) {
    console.error(
      'Failed to connect to the database. Server not started.',
      error.message,
    );
    process.exit(1);
  }
};

startServer();
