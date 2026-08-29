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
  durationMinutes: number; // 60
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
      durationMinutes: 45,
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
      title: 'Team Sync & Product Review',
      startTime: '14:30',
      durationMinutes: 60,
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
            {/* Hour Axis */}
            <View style={styles.hourAxis}>
              {HOURS.map((hour) => (
                <View key={hour} style={styles.hourRow}>
                  <Text style={styles.hourText}>{hour}</Text>
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

                  return (
                    <TouchableOpacity
                      key={block.id}
                      activeOpacity={0.85}
                      style={[
                        styles.taskBlock,
                        {
                          top,
                          height: Math.max(38, height),
                          backgroundColor: colors.bg,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.blockHeader}>
                        <Text style={[styles.blockTitle, { color: colors.text }]} numberOfLines={1}>
                          {block.title}
                        </Text>
                        <Text style={styles.blockDuration}>{block.durationMinutes}m</Text>
                      </View>
                      
                      <View style={styles.blockFooter}>
                        <Text style={styles.blockProject} numberOfLines={1}>
                          {block.startTime} • #{block.project}
                        </Text>
                        {block.assignedMember && (
                          <View
                            style={[
                              styles.cardAssigneeBadge,
                              { backgroundColor: block.assignedMember.color },
                            ]}
                          >
                            <Text style={styles.cardAssigneeText}>
                              {block.assignedMember.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: 'monospace',
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  dayTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayTabActive: {
    backgroundColor: '#2563EB',
  },
  dayTabText: {
    fontSize: 11,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },
  memberFilterBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B',
    backgroundColor: '#09090B',
  },
  memberFilterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  memberFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  activeMemberFilterChip: {
    backgroundColor: '#2563EB20',
    borderColor: '#3B82F6',
  },
  memberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberFilterText: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  activeMemberFilterText: {
    color: '#60A5FA',
  },
  scrollArea: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 40,
  },
  hourAxis: {
    width: 60,
    alignItems: 'center',
  },
  hourRow: {
    height: 60,
    justifyContent: 'flex-start',
  },
  hourText: {
    fontSize: 11,
    color: '#71717A',
    fontFamily: 'monospace',
  },
  canvas: {
    flex: 1,
    position: 'relative',
    marginRight: 16,
  },
  gridLine: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#18181B',
  },
  taskBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    justifyContent: 'space-between',
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  blockDuration: {
    fontSize: 10,
    color: '#A1A1AA',
    fontFamily: 'monospace',
    marginLeft: 6,
  },
  blockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  blockProject: {
    fontSize: 10,
    color: '#A1A1AA',
    flex: 1,
  },
  cardAssigneeBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  cardAssigneeText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
