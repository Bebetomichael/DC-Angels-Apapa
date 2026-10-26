import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CHOIR_DATABASE } from './src/data/initialDatabase.ts';
import { ChoirDatabase } from './src/types/choir.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'choir_db.json');

function ensureDatabase(): ChoirDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_CHOIR_DATABASE, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(INITIAL_CHOIR_DATABASE));
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ChoirDatabase>;
    const hasExactScreenshotMembers = parsed.members?.some(
      (m) => m.fullName === 'Esther Chioma Ukpabi'
    );
    const merged: ChoirDatabase = {
      members:
        hasExactScreenshotMembers && parsed.members
          ? parsed.members
          : INITIAL_CHOIR_DATABASE.members,
      leaders: parsed.leaders ?? INITIAL_CHOIR_DATABASE.leaders,
      rehearsals: parsed.rehearsals ?? INITIAL_CHOIR_DATABASE.rehearsals,
      ministrations: parsed.ministrations ?? INITIAL_CHOIR_DATABASE.ministrations,
      attendance: parsed.attendance ?? INITIAL_CHOIR_DATABASE.attendance,
      finances: parsed.finances ?? INITIAL_CHOIR_DATABASE.finances,
      units: parsed.units ?? INITIAL_CHOIR_DATABASE.units,
      songs: parsed.songs ?? INITIAL_CHOIR_DATABASE.songs,
      welfare: parsed.welfare ?? INITIAL_CHOIR_DATABASE.welfare,
      assets: parsed.assets ?? INITIAL_CHOIR_DATABASE.assets,
      organogram: parsed.organogram ?? INITIAL_CHOIR_DATABASE.organogram,
      rosters: parsed.rosters ?? INITIAL_CHOIR_DATABASE.rosters,
      activities: parsed.activities ?? INITIAL_CHOIR_DATABASE.activities,
    };
    if (!hasExactScreenshotMembers) {
      saveDatabase(merged);
    }
    return merged;
  } catch {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_CHOIR_DATABASE, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(INITIAL_CHOIR_DATABASE));
  }
}

function saveDatabase(db: ChoirDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Get entire database state
  app.get('/api/db', (_req, res) => {
    try {
      const db = ensureDatabase();
      res.json(db);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read database', details: String(err) });
    }
  });

  // Save/sync entire database state or specific collection
  app.put('/api/db', (req, res) => {
    try {
      const incoming = req.body as ChoirDatabase;
      if (!incoming || typeof incoming !== 'object') {
        res.status(400).json({ error: 'Invalid database payload' });
        return;
      }
      saveDatabase(incoming);
      res.json({ ok: true, db: incoming });
    } catch (err) {
      res.status(500).json({ error: 'Failed to persist database', details: String(err) });
    }
  });

  // Update a specific collection + append an activity log atomically
  app.put('/api/db/:collection', (req, res) => {
    try {
      const collection = req.params.collection as keyof ChoirDatabase;
      const db = ensureDatabase();
      if (!(collection in db)) {
        res.status(400).json({ error: `Unknown collection: ${collection}` });
        return;
      }
      const { items, activity } = req.body;
      if (!Array.isArray(items)) {
        res.status(400).json({ error: 'Expected items array' });
        return;
      }
      (db[collection] as unknown[]) = items;
      if (activity && activity.title) {
        db.activities = [activity, ...db.activities].slice(0, 50);
      }
      saveDatabase(db);
      res.json({ ok: true, db });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update collection', details: String(err) });
    }
  });

  // Reset database to initial seed
  app.post('/api/db/reset', (_req, res) => {
    try {
      saveDatabase(INITIAL_CHOIR_DATABASE);
      res.json({ ok: true, db: INITIAL_CHOIR_DATABASE });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset database', details: String(err) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DC Angels Apapa Choir Portal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
