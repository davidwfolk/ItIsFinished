import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  onlineAt: string;
  currentTaskId?: string;
  isTyping?: boolean;
}

/**
 * Manages ephemeral live presence avatars and typing status on shared projects.
 */
export class PresenceTracker {
  private channel: RealtimeChannel | null = null;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  joinProjectPresence(
    projectId: string,
    currentUser: PresenceUser,
    onPresenceSync: (users: PresenceUser[]) => void
  ): () => void {
    const channelName = `project-presence:${projectId}`;
    this.channel = this.supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser.userId,
        },
      },
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState() || {};
        const presenceList: PresenceUser[] = [];
        for (const key of Object.keys(state)) {
          const userState = state[key][0] as unknown as PresenceUser;
          if (userState) {
            presenceList.push(userState);
          }
        }
        onPresenceSync(presenceList);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel?.track(currentUser);
        }
      });

    // Cleanup function
    return () => {
      if (this.channel) {
        this.channel.unsubscribe();
        this.channel = null;
      }
    };
  }

  async updateTypingStatus(isTyping: boolean, currentTaskId?: string) {
    if (this.channel) {
      await this.channel.track({
        isTyping,
        currentTaskId,
        onlineAt: new Date().toISOString(),
      });
    }
  }
}
