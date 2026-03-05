import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/AuthContext';
import { Colors, Spacing, BorderRadius } from '../../src/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/auth');
      }},
    ]);
  };

  const menuItems = [
    { icon: 'people', label: 'Trusted Contacts', onPress: () => router.push('/(tabs)/contacts') },
    { icon: 'navigate', label: 'Trip History', onPress: () => router.push('/(tabs)/trips') },
    { icon: 'shield-checkmark', label: 'Safety Tips', onPress: () => Alert.alert('Safety Tips', '1. Always share your live location\n2. Keep trusted contacts updated\n3. Trust your instincts\n4. Use well-lit routes at night\n5. Keep your phone charged') },
    { icon: 'information-circle', label: 'About SafeHer', onPress: () => Alert.alert('SafeHer v1.0', 'AI-powered women\'s travel safety system.\n\nBuilt to protect every journey.') },
  ];

  return (
    <SafeAreaView style={styles.safe} testID="profile-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>Active</Text>
            <Text style={styles.statLabel}>Protection</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location" size={24} color={Colors.warning} />
            <Text style={styles.statValue}>GPS</Text>
            <Text style={styles.statLabel}>Tracking</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="notifications" size={24} color={Colors.blue} />
            <Text style={styles.statValue}>On</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} testID={`menu-${item.label.toLowerCase().replace(/\s/g, '-')}`} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
              <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out" size={22} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.l },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary + '30',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.m,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  phone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.xl },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.l,
    padding: Spacing.m, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  menu: { marginBottom: Spacing.xl },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.l, padding: Spacing.m, marginBottom: Spacing.s,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  menuLabel: { flex: 1, marginLeft: Spacing.m, fontSize: 16, color: Colors.textPrimary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: Spacing.m, borderRadius: BorderRadius.l,
    backgroundColor: Colors.danger + '15', borderWidth: 1, borderColor: Colors.danger + '30',
  },
  logoutText: { color: Colors.danger, fontWeight: '600', fontSize: 16, marginLeft: Spacing.s },
});
