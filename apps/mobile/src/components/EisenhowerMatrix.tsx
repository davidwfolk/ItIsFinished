import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type TaskItemProps } from './SwipeableTaskItem';

interface EisenhowerMatrixProps {
  tasks: TaskItemProps[];
  onToggleTask: (id: string) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({ tasks, onToggleTask }) => {
  const p1Tasks = tasks.filter(t => t.priority === 1 && !t.completed);
  const p2Tasks = tasks.filter(t => t.priority === 2 && !t.completed);
  const p3Tasks = tasks.filter(t => t.priority === 3 && !t.completed);
  const p4Tasks = tasks.filter(t => t.priority === 4 && !t.completed);

  const renderQuadrant = (
    title: string,
    subtitle: string,
    color: string,
    icon: any,
    items: TaskItemProps[]
  ) => (
    <View style={[styles.quadrant, { borderColor: color + '40' }]}>
      <View style={styles.quadrantHeader}>
        <View style={styles.quadrantTitleRow}>
          <Ionicons name={icon} size={14} color={color} />
          <Text style={[styles.quadrantTitle, { color }]}>{title}</Text>
        </View>
        <Text style={styles.quadrantCount}>{items.length}</Text>
      </View>
      <Text style={styles.quadrantSubtitle}>{subtitle}</Text>

      <ScrollView style={styles.quadrantList} showsVerticalScrollIndicator={false}>
        {items.map(task => (
          <Pressable 
            key={task.id} 
            onPress={() => onToggleTask(task.id)}
            style={styles.taskMiniItem}
          >
            <Ionicons name="ellipse-outline" size={14} color={color} />
            <Text style={styles.taskMiniTitle} numberOfLines={1}>
              {task.title}
            </Text>
          </Pressable>
        ))}
        {items.length === 0 && (
          <Text style={styles.emptyText}>No tasks</Text>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {renderQuadrant('Do First', 'Urgent & Important (P1)', '#EF4444', 'flame', p1Tasks)}
        {renderQuadrant('Schedule', 'Important, Not Urgent (P2)', '#F97316', 'calendar', p2Tasks)}
      </View>
      <View style={styles.row}>
        {renderQuadrant('Delegate', 'Urgent, Not Important (P3)', '#3B82F6', 'people', p3Tasks)}
        {renderQuadrant('Eliminate', 'Neither (P4 / Backlog)', '#71717A', 'trash-outline', p4Tasks)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    gap: 12,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  quadrant: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  quadrantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quadrantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quadrantTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  quadrantCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A1A1AA',
    fontFamily: 'monospace',
  },
  quadrantSubtitle: {
    fontSize: 10,
    color: '#71717A',
    marginTop: 2,
    marginBottom: 8,
  },
  quadrantList: {
    flex: 1,
  },
  taskMiniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  taskMiniTitle: {
    fontSize: 12,
    color: '#E4E4E7',
    flex: 1,
  },
  emptyText: {
    fontSize: 11,
    color: '#52525B',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
});
