import { useState } from 'react';
import { MessageSquare, Send, X, Users, Trash2, CheckCircle2 } from 'lucide-react';

export interface CommentItem {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: string;
}

export interface TaskCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  taskId: string;
}

export function TaskCommentsDrawer({ isOpen, onClose, taskTitle }: TaskCommentsDrawerProps) {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: 'c-1',
      authorName: 'Sarah Lin',
      authorEmail: 'sarah.dev@company.com',
      content: 'I verified the PowerSync stream parameters for collaborative projects. Syncing works cleanly with zero lag.',
      createdAt: '10 mins ago',
    },
    {
      id: 'c-2',
      authorName: 'Alex Rivera',
      authorEmail: 'alex.design@company.com',
      content: 'Looking great! Added the dark theme tokens for the Eisenhower quadrant borders.',
      createdAt: 'Just now',
    },
  ]);

  // Simulated live viewers on this task
  const liveViewers = [
    { name: 'Sarah Lin', initial: 'S', color: 'bg-emerald-600' },
    { name: 'Alex Rivera', initial: 'A', color: 'bg-purple-600' },
  ];

  if (!isOpen) return null;

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: CommentItem = {
      id: crypto.randomUUID(),
      authorName: 'You (Alex)',
      authorEmail: 'you@company.com',
      content: commentText.trim(),
      createdAt: 'Just now',
    };

    setComments([...comments, newComment]);
    setCommentText('');
  };

  const handleDeleteComment = (id: string) => {
    setComments(comments.filter(c => c.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-end z-50">
      <div className="bg-zinc-900 border-l border-zinc-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-800 flex items-start justify-between">
          <div className="space-y-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 text-xs text-blue-400 font-mono font-semibold">
              <MessageSquare className="h-3.5 w-3.5" /> Task Discussion
            </div>
            <h3 className="text-base font-bold text-zinc-100 truncate">{taskTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 transition shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Presence Bar */}
        <div className="px-5 py-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between">
          <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
            <Users className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> Active Viewers:
          </span>
          <div className="flex items-center -space-x-1.5">
            {liveViewers.map((viewer) => (
              <div
                key={viewer.name}
                title={`${viewer.name} is currently viewing this task`}
                className={`h-6 w-6 rounded-full ${viewer.color} border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white shadow`}
              >
                {viewer.initial}
              </div>
            ))}
            <span className="text-[11px] text-emerald-400 font-mono ml-3 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Live
            </span>
          </div>
        </div>

        {/* Comments Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold">
                    {c.authorName.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-zinc-200">{c.authorName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">{c.createdAt}</span>
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition p-0.5"
                    title="Delete comment"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>

        {/* Post Comment Input */}
        <form onSubmit={handlePostComment} className="p-4 border-t border-zinc-800 bg-zinc-950">
          <div className="relative flex items-center">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Leave a comment or update..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-10 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="absolute right-2 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded-lg transition"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
