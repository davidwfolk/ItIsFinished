import React, { useState } from 'react';
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
  const [selectedDay, setSelectedDay] = useState(0); // 0 = Today, 1 = Tomorrow, 2 = Next
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  const teamMembers = [
    { id: 'all', name: 'Everyone', color: '#3B82F6' },
    { id: 'user-alex', name: 'Alex (You)', color: '#3B82F6' },
    { id: 'user-sarah', name: 'Sarah K.', color: '#8B5CF6' },
    { id: 'user-david', name: 'David W.', color: '#10B981' },
  ];

  const [blocks] = useState<ScheduledBlock[]>([
    {
      id: '1',
      title: 'Deep Work: Core Sync Engine',
      startTime: '09:00',
      durationMinutes: 90,
      priority: 1,
      project: 'Core Architecture',
      assignedMember: { id: 'user-alex', name: 'Alex M.', color: '#3B82F6' },
    },
    {
      id: '2',
      title: 'Client Demo & Roadmap Review',
      startTime: '10:30',
      durationMinutes: 60,
      priority: 2,
      project: 'Product',
      assignedMember: { id: 'user-sarah', name: 'Sarah K.', color: '#8B5CF6' },
    },
    {
      id: '3',
      title: 'Review Storage RLS & Policies',
      startTime: '11:30',
      durationMinutes: 30,
      priority: 2,
      project: 'Security',
      assignedMember: { id: 'user-alex', name: 'Alex M.', color: '#3B82F6' },
    },
    {
      id: '4',
      title: 'Database Migration & Benchmarking',
      startTime: '13:00',
      durationMinutes: 60,
      priority: 1,
      project: 'Core Architecture',
      assignedMember: { id: 'user-david', name: 'David W.', color: '#10B981' },
    },
    {
      id: '5',
      title: 'Team Standup Sync',
      startTime: '14:30',
      durationMinutes: 15,
      priority: 3,
      project: 'General',
      assignedMember: { id: 'user-alex', name: 'Alex M.', color: '#3B82F6' },
    },
    {
      id: '6',
      title: 'Time-Blocking Drag & Drop Polish',
      startTime: '16:00',
      durationMinutes: 60,
      priority: 1,
      project: 'Mobile UX',
      assignedMember: { id: 'user-alex', name: 'Alex M.', color: '#3B82F6' },
    },
  ]);

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
            {['Today', 'Tomorrow', 'Friday'].map((day, idx) => (
              <TouchableOpacity
                key={day}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDay(idx);
                }}
                style={[styles.dayTab, selectedDay === idx && styles.dayTabActive]}
              >
                <Text style={[styles.dayTabText, selectedDay === idx && styles.dayTabTextActive]}>
                  {day}
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
});

