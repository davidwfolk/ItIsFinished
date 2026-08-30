import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Trash2, ArrowLeft, ShieldCheck, Globe, Layout, Calendar as CalendarIcon } from 'lucide-react';
import { supabase, powersync } from '../lib/powersync';
import { useAuth } from '../hooks/useAuth';
import { MfaSetupModal } from '../components/MfaSetupModal';
import { useQuery } from '@powersync/react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, hasMfa, signOut, mfaFactors, refreshAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'preferences'>('account');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  const [mfaModalOpen, setMfaModalOpen] = useState(false);

  const { data: profiles = [] } = useQuery(`SELECT * FROM profiles WHERE id = ?`, [user?.id || '']);
  const profile = profiles[0] || {};

  const handleUpdateProfile = async (field: string, value: string | number) => {
    if (!user?.id) return;
    try {
      const now = new Date().toISOString();
      await powersync.execute(
        `UPDATE profiles SET ${field} = ?, updated_at = ? WHERE id = ?`,
        [value, now, user.id]
      );
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
    }
  };

  if (!user) return null;

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    
    setIsDeleting(true);
    setDeleteError(null);
    try {
      // Delete from Supabase Auth
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;

      // Nuke local SQLite database completely
      await powersync.disconnectAndClear();
      
      // Sign out
      await signOut();
      window.location.href = '/';
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      setDeleteError(err.message || 'Failed to delete account. Ensure the database function exists.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center px-6 gap-4">
        <button 
          onClick={() => navigate('/app')}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-zinc-100">Settings</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-zinc-900/30 border-r border-zinc-800 p-4 flex flex-col gap-1">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition ${activeTab === 'account' ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            Account
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition ${activeTab === 'security' ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition ${activeTab === 'preferences' ? 'bg-blue-600/10 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
          >
            Preferences
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl">
            {activeTab === 'account' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100 mb-1">Account Settings</h2>
                  <p className="text-sm text-zinc-500">Manage your profile and account details.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-300">Email Address</p>
                      <p className="text-sm font-mono text-zinc-500 mt-1">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-zinc-800/80">
                  <h4 className="text-sm font-bold text-red-400 mb-4">Danger Zone</h4>
                  {!showDeleteConfirm ? (
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-400">Delete Account</p>
                        <p className="text-xs text-zinc-500 mt-1">Permanently remove your account and all data.</p>
                      </div>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition"
                      >
                        Delete Account
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 space-y-4 animate-in zoom-in-95 duration-200">
                      <div className="flex items-start gap-3 text-red-400">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold">Are you absolutely sure?</p>
                          <p className="text-xs text-red-400/80 mt-1 max-w-md">
                            This action cannot be undone. All tasks, habits, and projects will be permanently wiped from the cloud and this device.
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-2 max-w-md">
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

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteInput('');
                            setDeleteError(null);
                          }}
                          className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteInput !== 'DELETE' || isDeleting}
                          className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                        >
                          {isDeleting ? 'Deleting...' : <><Trash2 className="h-4 w-4" /> Permanently Delete</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100 mb-1">Security</h2>
                  <p className="text-sm text-zinc-500">Manage 2FA and sessions.</p>
                </div>
                
                <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Two-Factor Authentication (2FA)
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Add an extra layer of security to your account.</p>
                  </div>
                  <button
                    onClick={() => setMfaModalOpen(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      hasMfa ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {hasMfa ? 'Manage 2FA' : 'Enable 2FA'}
                  </button>
                </div>
                
                <MfaSetupModal isOpen={mfaModalOpen} onClose={() => setMfaModalOpen(false)} factors={mfaFactors} onMfaChanged={refreshAuth} />
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100 mb-1">Preferences</h2>
                  <p className="text-sm text-zinc-500">Customize your app experience.</p>
                </div>
                
                <div className="space-y-6">
                  {/* Time Zone */}
                  <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-400" />
                        Time Zone
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Used for syncing due dates correctly.</p>
                    </div>
                    <select
                      value={profile.timezone || 'UTC'}
                      onChange={(e) => handleUpdateProfile('timezone', e.target.value)}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500"
                    >
                      <option value="UTC">UTC (Default)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                    </select>
                  </div>

                  {/* Default View */}
                  <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Layout className="h-4 w-4 text-purple-400" />
                        Default Start View
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Which view to show when you open the app.</p>
                    </div>
                    <select
                      value={profile.default_view || 'today'}
                      onChange={(e) => handleUpdateProfile('default_view', e.target.value)}
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="today">Today</option>
                      <option value="all">Inbox (All)</option>
                      <option value="matrix">Eisenhower Matrix</option>
                      <option value="calendar">Time-Blocking Grid</option>
                    </select>
                  </div>

                  {/* Start of Week */}
                  <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-emerald-400" />
                        Start of Week
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Used for weekly calendar grids.</p>
                    </div>
                    <div className="flex bg-zinc-950 rounded-lg border border-zinc-700 overflow-hidden">
                      <button
                        onClick={() => handleUpdateProfile('start_of_week', 0)}
                        className={`px-4 py-2 text-sm transition ${
                          (profile.start_of_week === 0 || profile.start_of_week == null)
                            ? 'bg-emerald-600 text-white font-medium'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        Sunday
                      </button>
                      <button
                        onClick={() => handleUpdateProfile('start_of_week', 1)}
                        className={`px-4 py-2 text-sm transition border-l border-zinc-700 ${
                          profile.start_of_week === 1
                            ? 'bg-emerald-600 text-white font-medium border-l-transparent'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        Monday
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
