import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/powersync';
import { useAuth } from '../hooks/useAuth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'preferences'>('account');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;

      await signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      setDeleteError(err.message || 'Failed to delete account. Ensure the database function exists.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[400px]">
        <div className="w-full md:w-48 bg-zinc-900/50 border-b md:border-b-0 md:border-r border-zinc-800 p-4 flex flex-row md:flex-col gap-2">
          <h2 className="text-sm font-bold text-zinc-100 mb-2 px-2 hidden md:block">Settings</h2>
          <button
            onClick={() => setActiveTab('account')}
            className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition ${activeTab === 'account' ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition ${activeTab === 'preferences' ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            Preferences
          </button>
        </div>

        <div className="flex-1 flex flex-col relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-8 flex-1 overflow-y-auto">
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-1">Account Settings</h3>
                  <p className="text-sm text-zinc-500">Manage your profile and account security.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-300">Email Address</p>
                      <p className="text-sm font-mono text-zinc-500 mt-1">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-800/80">
                  <h4 className="text-sm font-bold text-red-400 mb-2">Danger Zone</h4>
                  {!showDeleteConfirm ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-400">Delete Account</p>
                        <p className="text-xs text-zinc-500 mt-1">Permanently remove your account and all data.</p>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/30 space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex items-start gap-3 text-red-400">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold">Are you absolutely sure?</p>
                          <p className="text-xs text-red-400/80 mt-1">
                            This action cannot be undone. All tasks, habits, and projects will be permanently wiped from the database.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-medium text-zinc-400 block">
                          Please type <span className="font-mono text-red-400 font-bold bg-zinc-900 px-1 rounded">DELETE</span> to confirm.
                        </label>
                        <input
                          type="text"
                          value={deleteInput}
                          onChange={(e) => setDeleteInput(e.target.value)}
                          placeholder="DELETE"
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500"
                        />
                      </div>

                      {deleteError && (
                        <p className="text-xs text-red-400 font-medium">{deleteError}</p>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteInput('');
                            setDeleteError(null);
                          }}
                          className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteInput !== 'DELETE' || isDeleting}
                          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center justify-center gap-2"
                        >
                          {isDeleting ? 'Deleting...' : <><Trash2 className="h-4 w-4" /> Delete Forever</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-1">Preferences</h3>
                  <p className="text-sm text-zinc-500">Customize your app experience.</p>
                </div>
                <div className="p-8 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 text-sm bg-zinc-900/30">
                  More settings coming soon!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
