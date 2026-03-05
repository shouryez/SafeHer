import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { Colors, Spacing, BorderRadius } from '../../src/theme';

interface Trip {
  id: string;
  mode: string;
  origin_name: string;
  destination_name: string;
  start_time: string;
  end_time?: string;
  safety_rating?: number;
  status: string;
}

const modeIcons: Record<string, any> = { cab: 'car-sport', transport: 'bus', walk: 'walk' };
const modeColors: Record<string, string> = { cab: '#4F8EF7', transport: '#FF9500', walk: Colors.primary };

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTrips(); }, []);

  const loadTrips = async () => {
    try {
      const data = await api.getTrips();
      setTrips(data);
    } catch {} finally { setLoading(false); }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return <Text style={styles.noRating}>Not rated</Text>;
    return (
      <View style={styles.stars}>
        {[1,2,3,4,5].map(i => (
          <Ionicons key={i} name={i <= rating ? 'star' : 'star-outline'} size={14} color={Colors.warning} />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} testID="trips-screen">
      <View style={styles.header}>
        <Text style={styles.title}>Trip History</Text>
        <Text style={styles.subtitle}>{trips.length} trips recorded</Text>
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={loadTrips}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="navigate" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No trips yet</Text>
              <Text style={styles.emptyHint}>Start a trip from the home screen</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.tripCard} testID={`trip-${item.id}`}>
              <View style={styles.tripHeader}>
                <View style={[styles.modeIcon, { backgroundColor: (modeColors[item.mode] || Colors.primary) + '20' }]}>
                  <Ionicons name={modeIcons[item.mode] || 'navigate'} size={24} color={modeColors[item.mode] || Colors.primary} />
                </View>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripMode}>{item.mode.charAt(0).toUpperCase() + item.mode.slice(1)}</Text>
                  <Text style={styles.tripDate}>{formatDate(item.start_time)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? Colors.primary + '20' : Colors.surfaceHighlight }]}>
                  <Text style={[styles.statusText, { color: item.status === 'active' ? Colors.primary : Colors.textSecondary }]}>
                    {item.status === 'active' ? 'Active' : 'Completed'}
                  </Text>
                </View>
              </View>
              <View style={styles.tripRoute}>
                <View style={styles.routeDot} />
                <Text style={styles.routeText} numberOfLines={1}>{item.origin_name}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.tripRoute}>
                <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.routeText} numberOfLines={1}>{item.destination_name}</Text>
              </View>
              <View style={styles.tripFooter}>
                <Text style={styles.ratingLabel}>Safety Rating:</Text>
                {renderStars(item.safety_rating)}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.l, paddingTop: Spacing.m },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  list: { padding: Spacing.l },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600', marginTop: Spacing.m },
  emptyHint: { color: Colors.textSecondary, fontSize: 14, marginTop: 4 },
  tripCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.l, padding: Spacing.m,
    marginBottom: Spacing.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  tripHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.m },
  modeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tripInfo: { flex: 1, marginLeft: Spacing.m },
  tripMode: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  tripDate: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  tripRoute: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.textSecondary, marginRight: Spacing.s },
  routeLine: { width: 2, height: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginLeft: 4 },
  routeText: { fontSize: 14, color: Colors.textPrimary, flex: 1 },
  tripFooter: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.m, paddingTop: Spacing.s, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  ratingLabel: { fontSize: 13, color: Colors.textSecondary, marginRight: Spacing.s },
  stars: { flexDirection: 'row', gap: 2 },
  noRating: { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic' },
});
