import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import noteRoutes from './routes/notes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env explicitly from backend root or current directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = (process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL || '').trim();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const status = err.status || err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    if (!MONGO_URI) {
      console.error(
        '\nError: MongoDB connection string not found in environment variables.\n' +
        'Please open backend/.env and set MONGO_URI (e.g. MONGO_URI=mongodb+srv://... or mongodb://localhost:27017/notestack).\n'
      );
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB database');

    app.listen(PORT, () => {
      console.log(`NoteStack server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
