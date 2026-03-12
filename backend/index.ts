import 'dotenv/config';
import express from 'express';
import path from 'path';
import routes from './routes';

const app = express();

// Middleware
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', routes);

// Catch-all: serve login.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BFHL OPD Suite running on port ${PORT}`));
