import express from 'express';
import mongoose from 'mongoose';
import Note from '../models/Note.js';
import authenticate from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all note routes
router.use(authenticate);

// GET /api/notes — list current user's notes, newest first
router.get('/', async (req, res, next) => {
  try {
    const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(notes);
  } catch (err) {
    next(err);
  }
});

// POST /api/notes — create note { title, body }
router.post('/', async (req, res, next) => {
  try {
    const { title, body } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newNote = await Note.create({
      title: title.trim(),
      body: typeof body === 'string' ? body : '',
      owner: req.user.id,
    });

    return res.status(201).json(newNote);
  } catch (err) {
    next(err);
  }
});

// GET /api/notes/:id — single note (404 if not owned or not found)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = await Note.findOne({ _id: id, owner: req.user.id });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.status(200).json(note);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notes/:id — update title/body (404 if not owned or not found)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const { title, body } = req.body;

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const note = await Note.findOne({ _id: id, owner: req.user.id });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (title !== undefined) {
      note.title = title.trim();
    }
    if (body !== undefined) {
      note.body = typeof body === 'string' ? body : '';
    }

    await note.save();

    return res.status(200).json(note);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notes/:id — delete note (404 if not owned or not found)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = await Note.findOneAndDelete({ _id: id, owner: req.user.id });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.status(200).json({ message: 'Note deleted successfully', id });
  } catch (err) {
    next(err);
  }
});

export default router;
