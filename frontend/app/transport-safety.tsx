import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { Colors, Spacing, BorderRadius } from '../src/theme';

interface SafetyScore {
  id: string;
  route_id: string;
  area_name: string;
  score: number;
  lighting_score: number;
  crowd_score: number;
  cctv_available: boolean;
  time_of_day: string;
  best_time?: string;
  warning?: string;
}

const getScoreColor = (score: number) => {
  if (score < 4) return Colors.danger;
  if (score < 7) return Colors.warning;
  return Colors.success;
};

const getScoreEmoji = (score: number) => {
  if (score < 4) return '🔴';
  if (score < 7) return '🟡';
  return '🟢';
};

export default function TransportSafetyScreen() {
  const router = useRouter();
  const [scores, setScores] = useState<SafetyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      await api.seed();
      const data = await api.getTransportSafety();
      setScores(data);
    } catch {} finally { setLoading(false); }
  };

  const startJourney = async (score: SafetyScore) => {
    try {
      await api.startTrip({
        mode: 'transport',
        origin_name: 'Current Location',
        origin_lat: 28.6139,
        origin_lng: 77.2090,
        destination_name: score.area_name,
        destination_lat: 28.6280,
        destination_lng: 77.2190,
      });
      router.push('/ride-check');
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} testID="transport-safety-screen">
      <View style={styles.topBar}>
        <TouchableOpacity testID="transport-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Public Transport Safety</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Route Safety Scores</Text>
          <Text style={styles.sectionHint}>Based on user reports, lighting, CCTV, and crowd data</Text>

          {/* Comparison Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Route</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Score</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Status</Text>
          </View>

          {scores.map((score) => (
            <TouchableOpacity
              testID={`route-${score.route_id}`}
              key={score.id}
              style={[styles.routeCard, selected === score.id && styles.routeCardSelected]}
              onPress={() => setSelected(selected === score.id ? null : score.id)}
              activeOpacity={0.8}
            >
              <View style={styles.routeRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.routeName}>{score.area_name}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(score.score) + '20' }]}>
                    <Text style={[styles.scoreValue, { color: getScoreColor(score.score) }]}>
                      {score.score}/10
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Text style={styles.scoreEmoji}>{getScoreEmoji(score.score)}</Text>
                </View>
              </View>

              {selected === score.id && (
                <View style={styles.expanded}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Ionicons name="bulb" size={16} color={Colors.warning} />
                      <Text style={styles.detailLabel}>Lighting</Text>
                      <Text style={styles.detailValue}>{score.lighting_score}/10</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="people" size={16} color={Colors.blue} />
                      <Text style={styles.detailLabel}>Crowd</Text>
                      <Text style={styles.detailValue}>{score.crowd_score}/10</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons name="videocam" size={16} color={score.cctv_available ? Colors.success : Colors.danger} />
                      <Text style={styles.detailLabel}>CCTV</Text>
                      <Text style={styles.detailValue}>{score.cctv_available ? 'Yes' : 'No'}</Text>
                    </View>
                  </View>

                  {score.best_time && (
                    <View style={styles.tipRow}>
                      <Ionicons name="time" size={14} color={Colors.primary} />
                      <Text style={styles.tipText}>Best time: {score.best_time}</Text>
                    </View>
                  )}

                  {score.warning && (
                    <View style={[styles.tipRow, { backgroundColor: Colors.warning + '12' }]}>
                      <Ionicons name="warning" size={14} color={Colors.warning} />
                      <Text style={[styles.tipText, { color: Colors.warning }]}>{score.warning}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    testID={`start-journey-${score.route_id}`}
                    style={styles.startBtn}
                    onPress={() => startJourney(score)}
                  >
                    <Text style={styles.startBtnText}>Start Journey on this Route</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.m, paddingVertical: Spacing.s },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: Spacing.l },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  sectionHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.l },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: Spacing.m, paddingVertical: Spacing.s,
    marginBottom: Spacing.s,
  },
  tableHeaderText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  routeCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.l,
    padding: Spacing.m, marginBottom: Spacing.m,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  routeCardSelected: { borderColor: Colors.primary + '50' },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scoreValue: { fontSize: 14, fontWeight: '700' },
  scoreEmoji: { fontSize: 18 },
  expanded: { marginTop: Spacing.m, paddingTop: Spacing.m, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.m },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  detailValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  tipRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '12',
    borderRadius: BorderRadius.s, padding: Spacing.s, marginBottom: Spacing.s,
  },
  tipText: { fontSize: 13, color: Colors.primary, marginLeft: Spacing.s },
  startBtn: {
    backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 12,
    alignItems: 'center', marginTop: Spacing.s,
  },
  startBtnText: { color: Colors.background, fontWeight: '700', fontSize: 15 },
});
