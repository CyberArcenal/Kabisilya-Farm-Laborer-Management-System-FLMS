// src/components/Dialogs/AddNoteDialog.tsx
import React, { useState, useEffect } from 'react';
import { X, FileText, Save, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '../../../utils/notification';
import bukidAPI from '../../../apis/bukid';

interface AddNoteDialogProps {
  id: number;
  bukidName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddNoteDialog: React.FC<AddNoteDialogProps> = ({
  id,
  bukidName,
  onClose,
  onSuccess
}) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Note cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await bukidAPI.addNote(id, note);
      
      if (response.status) {
        showSuccess('Note added successfully');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(response.message || 'Failed to add note');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add note');
      showError('Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Add Note to Bukid</h3>
              <p className="text-xs text-gray-600">{bukidName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note Content
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Enter your note here..."
              disabled={loading}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {note.length}/1000 characters
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3 py-1.5 rounded text-sm font-medium border border-gray-300 hover:bg-gray-100 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !note.trim()}
              className="px-4 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNoteDialog;