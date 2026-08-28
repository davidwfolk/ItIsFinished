import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface FocusTimerProps {
  linkedTaskTitle?: string;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({ linkedTaskTitle }) => {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'whitenoise' | 'cafe'>('none');

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActive(false);
    setSecondsLeft(mode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    Haptics.selectionAsync();
    setMode(newMode);
    setIsActive(false);
    setSecondsLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <Pressable 
          onPress={() => switchMode('focus')}
          style={[styles.modeTab, mode === 'focus' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'focus' && styles.activeModeText]}>
            Focus (25m)
          </Text>
        </Pressable>
        <Pressable 
          onPress={() => switchMode('break')}
          style={[styles.modeTab, mode === 'break' && styles.activeModeTab]}
        >
          <Text style={[styles.modeText, mode === 'break' && styles.activeModeText]}>
            Short Break (5m)
          </Text>
        </Pressable>
      </View>

      {/* Linked Active Task */}
      <View style={styles.taskCard}>
        <Ionicons name="checkbox-outline" size={16} color="#60A5FA" />
        <Text style={styles.taskTitle} numberOfLines={1}>
          {linkedTaskTitle || 'Select a task to focus on...'}
        </Text>
      </View>

      {/* Circular Timer Display */}
      <View style={styles.timerCircle}>
        <Text style={styles.timerText}>{timeString}</Text>
        <Text style={styles.statusLabel}>{isActive ? 'SESSION IN PROGRESS' : 'PAUSED'}</Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity onPress={resetTimer} style={styles.secondaryButton}>
          <Ionicons name="refresh" size={20} color="#A1A1AA" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={toggleTimer} 
          style={[styles.primaryButton, isActive ? styles.pauseButton : styles.playButton]}
        >
          <Ionicons name={isActive ? "pause" : "play"} size={26} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => {
            Haptics.selectionAsync();
            const sounds: ('none' | 'rain' | 'whitenoise' | 'cafe')[] = ['none', 'rain', 'whitenoise', 'cafe'];
            const next = sounds[(sounds.indexOf(ambientSound) + 1) % sounds.length];
            setAmbientSound(next);
          }} 
          style={styles.secondaryButton}
        >
          <Ionicons 
            name={ambientSound === 'none' ? "volume-mute-outline" : "volume-high"} 
            size={20} 
            color={ambientSound === 'none' ? "#71717A" : "#60A5FA"} 
          />
        </TouchableOpacity>
      </View>

      {ambientSound !== 'none' && (
        <Text style={styles.soundIndicator}>
          Ambient Audio: {ambientSound.toUpperCase()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 20,
    alignItems: 'center',
    margin: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#27272A',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  modeTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  activeModeTab: {
    backgroundColor: '#3B82F6',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A1A1AA',
  },
  activeModeText: {
    color: '#FFFFFF',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27272A50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
    maxWidth: '90%',
  },
  taskTitle: {
    fontSize: 13,
    color: '#E4E4E7',
    fontWeight: '500',
  },
  timerCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 4,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    backgroundColor: '#1E3A8A10',
  },
  timerText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FAFAFA',
    fontFamily: 'monospace',
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 1,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 20,
  },
  primaryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#2563EB',
  },
  pauseButton: {
    backgroundColor: '#DC2626',
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIndicator: {
    fontSize: 11,
    color: '#60A5FA',
    marginTop: 14,
    fontFamily: 'monospace',
  },
});
