import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { api } from '../../src/api';
import { Colors, Spacing, BorderRadius } from '../../src/theme';
import { locationService } from '../../src/LocationService';
import { notificationService } from '../../src/NotificationService';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [greeting, setGreeting] = useState('');

  const [locStatus, setLocStatus] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Seed data on first load
    api.seed().catch(() => {});

    // Initialize permissions
    initPermissions();

    // SOS pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const initPermissions = async () => {
    // Request notification permission
    await notificationService.requestPermission();

    // Request location permissions (foreground + background)
    const perms = await locationService.requestAllPermissions();
    if (perms.foreground && perms.background) {
      setLocStatus('Full tracking enabled');
    } else if (perms.foreground) {
      setLocStatus('Foreground only');
    } else {
      setLocStatus('Location denied');
    }
  };

  const handleSOS = async () => {
    try {
      await api.triggerSOS({ alert_type: 'sos' });
      await notificationService.sendSOSNotification();
      Alert.alert('SOS Triggered', 'Emergency alert sent to your trusted contacts. (SIMULATED - SMS mocked)');
    } catch {
      Alert.alert('SOS Triggered', 'Emergency mode activated. Contacts would be notified.');
    }
  };

  const handleSuspicious = async () => {
    try {
      await api.triggerSOS({ alert_type: 'suspicious' });
      await notificationService.sendSuspiciousNotification();
      Alert.alert('Suspicious Alert', 'Silent monitoring started. Trusted contacts notified. (SIMULATED)');
    } catch {
      Alert.alert('Alert Sent', 'Monitoring mode activated.');
    }
  };

  const modes = [
    { key: 'cab', icon: 'car-sport' as const, label: 'Cab / Auto / Taxi', desc: 'Smart Ride Check', route: '/ride-check', color: '#4F8EF7' },
    { key: 'transport', icon: 'bus' as const, label: 'Public Transport', desc: 'Safety Score Check', route: '/transport-safety', color: '#FF9500' },
    { key: 'walk', icon: 'walk' as const, label: 'Walking / Solo', desc: 'AI Safe Navigation', route: '/safe-navigation', color: Colors.primary },
  ];

  return (
    <SafeAreaView style={styles.safe} testID="home-screen">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting} testID="home-greeting">{greeting}, {user?.name?.split(' ')[0] || 'there'}.</Text>
            <Text style={styles.subtitle}>How are you commuting today?</Text>
          </View>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.primary} />
          </View>
        </View>

        {/* Travel Mode Cards */}
        <View style={styles.modesSection}>
          {modes.map((mode) => (
            <TouchableOpacity
              testID={`mode-${mode.key}-btn`}
              key={mode.key}
              style={styles.modeCard}
              activeOpacity={0.8}
              onPress={() => router.push(mode.route as any)}
            >
              <View style={[styles.modeIconWrap, { backgroundColor: mode.color + '20' }]}>
                <Ionicons name={mode.icon} size={32} color={mode.color} />
              </View>
              <View style={styles.modeText}>
                <Text style={styles.modeLabel}>{mode.label}</Text>
                <Text style={styles.modeDesc}>{mode.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <Text style={styles.sectionTitle}>Quick Emergency</Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              testID="sos-btn"
              style={styles.sosBtn}
              activeOpacity={0.7}
              onPress={handleSOS}
            >
              <Ionicons name="alert-circle" size={48} color="#FFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.sosHint}>Tap to alert all contacts</Text>
        </View>

        {/* Permission Status */}
        {locStatus ? (
          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Ionicons name="location" size={14} color={locStatus.includes('Full') ? Colors.success : Colors.warning} />
              <Text style={styles.statusText}>{locStatus}</Text>
            </View>
            <View style={styles.statusItem}>
              <Ionicons name="notifications" size={14} color={Colors.primary} />
              <Text style={styles.statusText}>Notifications active</Text>
            </View>
          </View>
        ) : null}

        {/* Spacer for action bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar} testID="action-bar">
        <TouchableOpacity testID="action-sos-btn" style={[styles.actionBtn, styles.actionSOS]} onPress={handleSOS}>
          <Ionicons name="alert-circle" size={22} color="#FFF" />
          <Text style={styles.actionLabel}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-suspicious-btn" style={[styles.actionBtn, styles.actionSuspicious]} onPress={handleSuspicious}>
          <Ionicons name="eye" size={22} color="#FFF" />
          <Text style={styles.actionLabel}>Suspicious</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-report-btn" style={[styles.actionBtn, styles.actionReport]} onPress={() => router.push('/report' as any)}>
          <Ionicons name="megaphone" size={22} color="#FFF" />
          <Text style={styles.actionLabel}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="action-call-btn" style={[styles.actionBtn, styles.actionCall]} onPress={() => Alert.alert('Call Contact', 'Would dial your #1 trusted contact (SIMULATED)')}>
          <Ionicons name="call" size={22} color="#FFF" />
          <Text style={styles.actionLabel}>Call</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1, paddingHorizontal: Spacing.l },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: Spacing.m, marginBottom: Spacing.l,
  },
  greeting: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  shieldBadge: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  modesSection: { marginBottom: Spacing.l },
  modeCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.l,
    padding: Spacing.m, marginBottom: Spacing.m,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  modeIconWrap: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  modeText: { flex: 1, marginLeft: Spacing.m },
  modeLabel: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  modeDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  sosSection: { alignItems: 'center', marginTop: Spacing.s },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.m, letterSpacing: 1, textTransform: 'uppercase' },
  sosBtn: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.danger, shadowOpacity: 0.7, shadowRadius: 24, elevation: 20,
  },
  sosText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 2 },
  sosHint: { color: Colors.textSecondary, fontSize: 12, marginTop: Spacing.s },
  statusBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginTop: Spacing.l, paddingVertical: Spacing.s,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 12, color: Colors.textSecondary },
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: Spacing.m, paddingBottom: Spacing.m, paddingTop: Spacing.s,
    backgroundColor: Colors.background,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, marginHorizontal: 3, borderRadius: BorderRadius.m,
  },
  actionLabel: { color: '#FFF', fontSize: 10, fontWeight: '600', marginTop: 3 },
  actionSOS: { backgroundColor: Colors.danger },
  actionSuspicious: { backgroundColor: Colors.orange },
  actionReport: { backgroundColor: Colors.warning },
  actionCall: { backgroundColor: Colors.blue },
});
