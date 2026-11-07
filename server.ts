import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // In-memory storage for mobile phone scanner pairing sessions
  interface ScanSession {
    code?: string;
    createdAt: number;
    updatedAt: number;
    resolved: boolean;
  }
  const scanSessions = new Map<string, ScanSession>();

  // Cleanup sessions older than 30 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of scanSessions.entries()) {
      if (now - session.createdAt > 30 * 60 * 1000) {
        scanSessions.delete(id);
      }
    }
  }, 5 * 60 * 1000);

  // API 1: Handphone sends scanned barcode to laptop session
  app.post('/api/scan-session/:id', (req, res) => {
    const sessionId = req.params.id;
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Kode resi tidak valid' });
    }

    const cleanCode = code.trim();
    const session = scanSessions.get(sessionId) || {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      resolved: false,
    };

    session.code = cleanCode;
    session.updatedAt = Date.now();
    session.resolved = false;
    scanSessions.set(sessionId, session);

    return res.json({ success: true, sessionId, code: cleanCode });
  });

  // API 2: Laptop checks/polls for barcode scanned from phone
  app.get('/api/scan-session/:id', (req, res) => {
    const sessionId = req.params.id;
    const session = scanSessions.get(sessionId);

    if (!session || !session.code) {
      return res.json({ found: false, code: null });
    }

    const result = { found: true, code: session.code, resolved: session.resolved };
    session.resolved = true;

    return res.json(result);
  });

  // API 3: Reset or create a new session
  app.delete('/api/scan-session/:id', (req, res) => {
    const sessionId = req.params.id;
    scanSessions.delete(sessionId);
    return res.json({ success: true });
  });

  // Dev mode: Mount Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve static dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ready on port ${PORT}`);
  });
}

startServer();
