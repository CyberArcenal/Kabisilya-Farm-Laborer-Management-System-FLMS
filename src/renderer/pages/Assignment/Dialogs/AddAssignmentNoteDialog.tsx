// src/components/Dialogs/AddAssignmentNoteDialog.tsx (Enhanced version)
import React, { useState } from 'react';
import { X, FileText, Save, Loader2, Tag } from 'lucide-react';
import { showError, showSuccess } from '../../../utils/notification';
import assignmentAPI from '../../../apis/assignment';

interface AddAssignmentNoteDialogProps {
  assignmentId: number;
  assignmentName: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialNoteType?: string;
}

interface NoteType {
  value: string;
  label: string;
  color: string;
}

const AddAssignmentNoteDialog: React.FC<AddAssignmentNoteDialogProps> = ({
  assignmentId,
  assignmentName,
  onClose,
  onSuccess,
  initialNoteType = 'general'
}) => {
  const [note, setNote] = useState('');
  const [selectedNoteType, setSelectedNoteType] = useState(initialNoteType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note type options with colors
  const noteTypeOptions: NoteType[] = [
    { value: 'general', label: 'General Note', color: 'bg-gray-100 text-gray-800' },
    { value: 'status_change', label: 'Status Change', color: 'bg-blue-100 text-blue-800' },
    { value: 'luwang_update', label: 'LuWang Update', color: 'bg-purple-100 text-purple-800' },
    { value: 'worker_note', label: 'Worker Note', color: 'bg-amber-100 text-amber-800' },
    { value: 'pitak_note', label: 'Pitak Note', color: 'bg-green-100 text-green-800' },
    { value: 'quality_note', label: 'Quality Note', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'issue_note', label: 'Issue/Problem', color: 'bg-red-100 text-red-800' },
    { value: 'resolution_note', label: 'Resolution', color: 'bg-teal-100 text-teal-800' },
    { value: 'equipment_note', label: 'Equipment Note', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'weather_note', label: 'Weather Note', color: 'bg-cyan-100 text-cyan-800' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Note cannot be empty');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await assignmentAPI.addAssignmentNote(assignmentId, note, selectedNoteType);
      
      if (response.status) {
        showSuccess('Note added successfully to assignment');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(response.message || 'Failed to add note to assignment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add note to assignment');
      showError('Failed to add note to assignment');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentNoteType = () => {
    return noteTypeOptions.find(opt => opt.value === selectedNoteType) || noteTypeOptions[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-lg shadow-xl border border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Add Note to Assignment</h3>
              <p className="text-xs text-gray-600">Assignment: {assignmentName}</p>
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

          {/* Note Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Note Type
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {noteTypeOptions.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedNoteType(type.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedNoteType === type.value 
                      ? `${type.color} ring-2 ring-offset-1 ring-gray-300` 
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md ${getCurrentNoteType().color}`}>
              <span className="text-xs font-medium">Selected: {getCurrentNoteType().label}</span>
            </div>
          </div>

          {/* Note Content */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note Content
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              placeholder={`Enter your ${getCurrentNoteType().label.toLowerCase()} here...`}
              disabled={loading}
              maxLength={2000}
            />
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs text-gray-500">
                Characters: {note.length}/2000
              </div>
              <div className="text-xs text-gray-500">
                Lines: {note.split('\n').length}
              </div>
            </div>
          </div>

          {/* Context Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Assignment Context</h4>
            <p className="text-xs text-gray-600 mb-3">
              Adding a note to assignment: <span className="font-medium">{assignmentName}</span>
            </p>
            <div className="text-xs text-gray-500">
              <p>• Notes are recorded in assignment history</p>
              <p>• Can be viewed in assignment details</p>
              <p>• Useful for tracking issues and resolutions</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              <span className="font-medium">Tip:</span> Be specific and include relevant details
            </div>
            <div className="flex items-center gap-2">
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
                className="px-4 py-1.5 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAssignmentNoteDialog;