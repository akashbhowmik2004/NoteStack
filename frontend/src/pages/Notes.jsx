import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export const Notes = () => {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [updating, setUpdating] = useState(false);

  // Fetch notes on load
  const loadNotes = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getNotes();
      setNotes(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  // Handle note creation
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Note title is required');
      return;
    }

    try {
      setCreating(true);
      setError('');
      const created = await api.createNote({
        title: newTitle.trim(),
        body: newBody,
      });
      setNotes([created, ...notes]);
      setNewTitle('');
      setNewBody('');
    } catch (err) {
      setError(err.message || 'Failed to create note');
    } finally {
      setCreating(false);
    }
  };

  // Start inline editing
  const startEditing = (note) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditBody(note.body || '');
    setError('');
  };

  // Cancel inline editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
    setEditBody('');
  };

  // Save inline edit
  const handleUpdate = async (id) => {
    if (!editTitle.trim()) {
      setError('Note title cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      setError('');
      const updated = await api.updateNote(id, {
        title: editTitle.trim(),
        body: editBody,
      });
      setNotes(notes.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Failed to update note');
    } finally {
      setUpdating(false);
    }
  };

  // Delete note with confirmation
  const handleDelete = async (id, title) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${title}"?`);
    if (!confirmed) return;

    try {
      setError('');
      await api.deleteNote(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete note');
    }
  };

  return (
    <div className="notes-page">
      {/* Simple Header */}
      <header className="notes-header">
        <div className="header-content">
          <h1>NoteStack</h1>
          <div className="user-section">
            <span className="user-email">{user?.email}</span>
            <button onClick={logout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="notes-main">
        {/* Backend Error Display */}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => setError('')} className="btn-close-error" aria-label="Dismiss error">
              ✕
            </button>
          </div>
        )}

        {/* Create Note Form */}
        <section className="create-section">
          <h2>Create Note</h2>
          <form onSubmit={handleCreate} className="note-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Title (required)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={creating}
                required
              />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Body (optional)"
                rows={3}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                disabled={creating}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating || !newTitle.trim()}>
              {creating ? 'Adding...' : 'Add Note'}
            </button>
          </form>
        </section>

        {/* List of Notes */}
        <section className="notes-list-section">
          <h2>Your Notes ({notes.length})</h2>

          {loading ? (
            <p className="loading-text">Loading notes...</p>
          ) : notes.length === 0 ? (
            <p className="empty-text">No notes yet. Add your first note above!</p>
          ) : (
            <div className="notes-list">
              {notes.map((note) => (
                <div key={note.id} className="note-item">
                  {editingId === note.id ? (
                    /* Inline Edit Mode */
                    <div className="inline-edit-form">
                      <div className="form-group">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title"
                          disabled={updating}
                          autoFocus
                        />
                      </div>
                      <div className="form-group">
                        <textarea
                          rows={3}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          placeholder="Body"
                          disabled={updating}
                        />
                      </div>
                      <div className="button-row">
                        <button
                          type="button"
                          onClick={() => handleUpdate(note.id)}
                          className="btn btn-primary btn-sm"
                          disabled={updating || !editTitle.trim()}
                        >
                          {updating ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="btn btn-secondary btn-sm"
                          disabled={updating}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="note-display">
                      <div className="note-content">
                        <h3>{note.title}</h3>
                        {note.body && <p className="note-body">{note.body}</p>}
                        <span className="note-date">
                          {new Date(note.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <div className="button-row">
                        <button
                          type="button"
                          onClick={() => startEditing(note)}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id, note.title)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Notes;

