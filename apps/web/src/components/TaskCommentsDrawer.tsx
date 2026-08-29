import { useState } from 'react';
import { MessageSquare, Send, X, Trash2, Edit2 } from 'lucide-react';
import { usePowerSync, useQuery } from '@powersync/react';
import { useAuth } from '../hooks/useAuth';

export interface TaskCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: string;
}

export function TaskCommentsDrawer({ isOpen, onClose, taskTitle, taskId }: TaskCommentsDrawerProps) {
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  
  const powersync = usePowerSync();
  const { user } = useAuth();

  // Query live comments from SQLite
  const { data: comments = [] } = useQuery<any>(
    `SELECT c.*, p.display_name, p.email 
     FROM comments c
     LEFT JOIN profiles p ON c.user_id = p.id
     WHERE c.task_id = ? AND c.deleted_at IS NULL
     ORDER BY c.created_at ASC`,
    [taskId]
  );

  const currentUserId = user?.id || 'demo-user';

  if (!isOpen) return null;

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    try {
      await powersync.execute(
        `INSERT INTO comments (id, task_id, user_id, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newId, taskId, currentUserId, commentText.trim(), now, now]
      );
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const startEditing = (id: string, currentContent: string) => {
    setEditingCommentId(id);
    setEditCommentText(currentContent);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editCommentText.trim()) return;
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE comments SET content = ?, updated_at = ? WHERE id = ?`,
        [editCommentText.trim(), now, id]
      );
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      console.error('Failed to edit comment:', err);
    }
  };

  const handleDeleteComment = async (id: string) => {
    const now = new Date().toISOString();
    try {
      await powersync.execute(
        `UPDATE comments SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, id]
      );
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <h2>Discussions</h2>
          </div>
          <p className="text-xs text-zinc-500 truncate max-w-[250px]">{taskTitle}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3">
            <div className="h-12 w-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-zinc-600" />
            </div>
            <p className="text-sm">No comments yet. Start the discussion!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isMe = comment.user_id === currentUserId;
              const authorName = comment.display_name || 'Guest';
              const isEditing = editingCommentId === comment.id;

              return (
                <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isMe ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="font-semibold text-zinc-300">{isMe ? 'You' : authorName}</span>
                      <span className="text-zinc-600 font-mono">
                        {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {isEditing ? (
                      <div className="w-full bg-zinc-800 rounded-lg p-2 border border-blue-500/50">
                        <textarea
                          autoFocus
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(comment.id);
                            }
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          className="w-full bg-transparent text-sm text-zinc-100 p-1 min-h-[60px] resize-none focus:outline-none"
                        />
                        <div className="flex justify-end gap-1 mt-2">
                          <button onClick={cancelEditing} className="px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 rounded transition">Cancel</button>
                          <button onClick={() => handleSaveEdit(comment.id)} className="px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded transition">Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className={`p-3 rounded-2xl text-sm group ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-sm' 
                          : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                      </div>
                    )}
                    
                    {/* Action Menu under the comment */}
                    {isMe && !isEditing && (
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-zinc-500">
                        <button 
                          onClick={() => startEditing(comment.id, comment.content)}
                          className="hover:text-blue-400 transition flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="hover:text-red-400 transition flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 bg-zinc-950/80 border-t border-zinc-800">
        <form onSubmit={handlePostComment} className="flex items-end gap-2">
          <div className="flex-1 bg-zinc-900 border border-zinc-700 focus-within:border-blue-500 rounded-xl overflow-hidden transition">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostComment(e);
                }
              }}
              placeholder="Write a comment... (Enter to send)"
              className="w-full bg-transparent text-sm text-zinc-100 p-3 max-h-[120px] min-h-[44px] resize-none focus:outline-none placeholder:text-zinc-500"
              rows={1}
            />
          </div>
          <button
            type="submit"
            disabled={!commentText.trim()}
            className="h-[44px] w-[44px] shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition shadow-lg shadow-blue-600/20"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
