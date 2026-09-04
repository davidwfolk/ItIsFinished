import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePowerSync, useQuery } from '@powersync/react';
import { useWorkspace } from '../../src/lib/WorkspaceContext';

interface ScheduledBlock {
  id: string;
  title: string;
  startTime: string; // "09:00"
  durationMinutes: number; // 15, 30, 45, 60, 90
  priority: 1 | 2 | 3 | 4;
  project: string;
  assignedMember?: {
    id: string;
    name: string;
    color: string;
  };
}

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00'
];

function formatHourLabel(timeStr: string): string {
  const h = parseInt(timeStr.split(':')[0], 10);
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function formatTimeTo12h(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

export default function CalendarScreen() {
  const { activeWorkspaceId } = useWorkspace();

  const [selectedDay, setSelectedDay] = useState(0); // 0 = Today, 1 = Tomorrow, 2 = Next
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  // ---------------------------------------------------------------------------
  // DYNAMIC 3-DAY TIMELINE
  // ---------------------------------------------------------------------------
  const days = useMemo(() => {
    const list: { label: string; dateStr: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      list.push({ label, dateStr });
    }
    return list;
  }, []);

  const currentDateStr = days[selectedDay]?.dateStr || days[0].dateStr;

  // ---------------------------------------------------------------------------
  // LIVE SQLITE QUERIES
  // ---------------------------------------------------------------------------
  const { data: rawTimeBlocks = [] } = useQuery<{
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    priority: number;
    project: string;
    member_id?: string | null;
    member_name?: string | null;
  }>(
    `SELECT 
       tb.id, 
       COALESCE(t.title, 'Scheduled Block') as title,
       tb.start_time,
       tb.end_time,
       COALESCE(t.priority, 4) as priority,
       COALESCE(p.name, 'General') as project,
       prof.id as member_id,
       prof.display_name as member_name
     FROM time_blocks tb
     LEFT JOIN tasks t ON tb.task_id = t.id
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN profiles prof ON t.assigned_to = prof.id
     WHERE tb.date = ? AND (tb.workspace_id = ? OR tb.workspace_id IS NULL)`,
    [currentDateStr, activeWorkspaceId]
  );

  const { data: rawScheduledTasks = [] } = useQuery<{
    id: string;
    title: string;
    due_time: string;
    estimated_minutes?: number | null;
    priority: number;
    project: string;
    member_id?: string | null;
    member_name?: string | null;
  }>(
    `SELECT 
       t.id,
       t.title,
       t.due_time,
       t.estimated_minutes,
       t.priority,
       COALESCE(p.name, 'General') as project,
       prof.id as member_id,
       prof.display_name as member_name
     FROM tasks t
     LEFT JOIN projects p ON t.project_id = p.id
     LEFT JOIN profiles prof ON t.assigned_to = prof.id
     WHERE t.deleted_at IS NULL AND t.due_date = ? AND t.due_time IS NOT NULL AND t.workspace_id = ?`,
    [currentDateStr, activeWorkspaceId]
  );

  const { data: rawMembers = [] } = useQuery<{ id: string; name: string; role: string }>(
    `SELECT p.id, p.display_name as name, wm.role 
     FROM workspace_members wm 
     JOIN profiles p ON p.id = wm.user_id 
     WHERE wm.workspace_id = ?`,
    [activeWorkspaceId]
  );

  const teamMembers = useMemo(() => {
    const defaultAll = [{ id: 'all', name: 'Everyone', color: '#3B82F6' }];
    const members = rawMembers.map((m, i) => ({
      id: m.id,
      name: m.name || 'Member',
      color: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'][i % 5],
    }));
    return [...defaultAll, ...members];
  }, [rawMembers]);

  const blocks: ScheduledBlock[] = useMemo(() => {
    const results: ScheduledBlock[] = [];
    const seenTaskIds = new Set<string>();

    // 1. Process explicit time_blocks
    for (const b of rawTimeBlocks) {
      let duration = 60;
      if (b.start_time && b.end_time) {
        const [sh, sm] = b.start_time.split(':').map(Number);
        const [eh, em] = b.end_time.split(':').map(Number);
        duration = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));
      }

      results.push({
        id: b.id,
        title: b.title,
        startTime: b.start_time?.slice(0, 5) || '09:00',
        durationMinutes: duration,
        priority: (b.priority || 4) as 1 | 2 | 3 | 4,
        project: b.project,
        assignedMember: b.member_id ? {
          id: b.member_id,
          name: b.member_name || 'Member',
          color: '#3B82F6',
        } : undefined,
      });
      seenTaskIds.add(b.id);
    }

    // 2. Process tasks scheduled for this day with a due_time
    for (const t of rawScheduledTasks) {
      if (!seenTaskIds.has(t.id)) {
        results.push({
          id: t.id,
          title: t.title,
          startTime: t.due_time.slice(0, 5),
          durationMinutes: t.estimated_minutes || 45,
          priority: (t.priority || 4) as 1 | 2 | 3 | 4,
          project: t.project,
          assignedMember: t.member_id ? {
            id: t.member_id,
            name: t.member_name || 'Member',
            color: '#8B5CF6',
          } : undefined,
        });
      }
    }

    return results;
  }, [rawTimeBlocks, rawScheduledTasks]);

  const priorityColors = {
    1: { bg: '#7F1D1D40', border: '#EF4444', text: '#FCA5A5' },
    2: { bg: '#7C2D1240', border: '#F97316', text: '#FDBA74' },
    3: { bg: '#1E3A8A40', border: '#3B82F6', text: '#93C5FD' },
    4: { bg: '#27272A80', border: '#71717A', text: '#D4D4D8' },
  };

  const getTopOffsetForTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const startHour = 8;
    const hourHeight = 60; // 60px per hour
    const minutesFromStart = (h - startHour) * 60 + m;
    return (minutesFromStart / 60) * hourHeight;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Time Blocking</Text>
            <Text style={styles.headerSubtitle}>Calendar Grid & Workload</Text>
          </View>

          {/* Day Selector */}
          <View style={styles.daySelector}>
            {days.map((d, idx) => (
              <TouchableOpacity
                key={d.dateStr}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDay(idx);
                }}
                style={[styles.dayTab, selectedDay === idx && styles.dayTabActive]}
              >
                <Text style={[styles.dayTabText, selectedDay === idx && styles.dayTabTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Team Member Filter Bar */}
        <View style={styles.memberFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberFilterScroll}>
            {teamMembers.map((member) => {
              const isSelected = selectedMemberId === member.id;
              return (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedMemberId(member.id);
                  }}
                  style={[
                    styles.memberFilterChip,
                    isSelected && styles.activeMemberFilterChip,
                  ]}
                >
                  <View style={[styles.memberDot, { backgroundColor: member.color }]} />
                  <Text
                    style={[
                      styles.memberFilterText,
                      isSelected && styles.activeMemberFilterText,
                    ]}
                  >
                    {member.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Scrollable Time Grid */}
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainer}>
            {/* Hour Axis (12-Hour AM/PM) */}
            <View style={styles.hourAxis}>
              {HOURS.map((hour) => (
                <View key={hour} style={styles.hourRow}>
                  <Text style={styles.hourText}>{formatHourLabel(hour)}</Text>
                </View>
              ))}
            </View>

            {/* Grid Lines & Task Block Canvas */}
            <View style={styles.canvas}>
              {HOURS.map((hour) => (
                <View key={hour} style={styles.gridLine} />
              ))}

              {/* Scheduled Blocks */}
              {blocks
                .filter((b) => {
                  if (selectedMemberId === 'all') return true;
                  return b.assignedMember?.id === selectedMemberId;
                })
                .map((block) => {
                  const top = getTopOffsetForTime(block.startTime);
                  const height = (block.durationMinutes / 60) * 60;
                  const colors = priorityColors[block.priority];
                  const isCompact = block.durationMinutes <= 35; // 15m and 30m

                  return (
                    <TouchableOpacity
                      key={block.id}
                      activeOpacity={0.85}
                      style={[
                        styles.taskBlock,
                        {
                          top,
                          height: Math.max(16, height - 2),
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                          padding: isCompact ? 3 : 8,
                        },
                      ]}
                    >
                      {isCompact ? (
                        <View style={styles.ultraCompactRow}>
                          <Text style={[styles.blockTitle, { fontSize: 10, color: colors.text, flex: 1 }]} numberOfLines={1}>
                            {block.title}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.ultraCompactTime}>
                              {formatTimeTo12h(block.startTime)}
                            </Text>
                            <Text style={[styles.durationText, { fontSize: 8 }]}>
                              {block.durationMinutes}m
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                          <View style={styles.blockHeader}>
                            <Text style={[styles.blockTitle, { color: colors.text }]} numberOfLines={1}>
                              {block.title}
                            </Text>
                            {block.assignedMember && (
                              <View
                                style={[
                                  styles.assigneeAvatar,
                                  { backgroundColor: block.assignedMember.color },
                                ]}
                              >
                                <Text style={styles.assigneeText}>
                                  {block.assignedMember.name[0]}
                                </Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.blockFooter}>
                            <View style={styles.timeTag}>
                              <Ionicons name="time-outline" size={10} color="#A1A1AA" />
                              <Text style={styles.timeText}>{formatTimeTo12h(block.startTime)}</Text>
                            </View>
                            <Text style={styles.projectText}>#{block.project}</Text>
                            <Text style={styles.durationText}>{block.durationMinutes}m</Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

              {blocks.length === 0 && (
                <View style={styles.canvasEmptyHint}>
                  <Text style={styles.canvasEmptyText}>No time blocks scheduled for this day</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  container: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 1,
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  dayTab: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayTabActive: {
    backgroundColor: '#2563EB',
  },
  dayTabText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  dayTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  memberFilterBar: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  memberFilterScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  memberFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  activeMemberFilterChip: {
    backgroundColor: '#27272A',
    borderColor: '#3B82F6',
  },
  memberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  memberFilterText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '500',
  },
  activeMemberFilterText: {
    color: '#FAFAFA',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    minHeight: 780,
  },
  hourAxis: {
    width: 58,
    borderRightWidth: 1,
    borderRightColor: '#27272A',
    backgroundColor: '#09090B',
  },
  hourRow: {
    height: 60,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingTop: 4,
  },
  hourText: {
    fontSize: 10,
    color: '#71717A',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  taskBlock: {
    position: 'absolute',
    left: 6,
    right: 8,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  ultraCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
    paddingHorizontal: 4,
  },
  ultraCompactTime: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: '#A1A1AA',
    marginLeft: 4,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  blockTitle: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  assigneeAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  blockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 2,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#A1A1AA',
  },
  projectText: {
    fontSize: 9,
    color: '#71717A',
    flex: 1,
  },
  durationText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#C084FC',
    fontWeight: '700',
  },
  canvasEmptyHint: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasEmptyText: {
    fontSize: 12,
    color: '#52525B',
    fontStyle: 'italic',
  },
});
