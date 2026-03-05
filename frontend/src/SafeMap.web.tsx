import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from './theme';

interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  color?: string;
}

interface Props {
  origin?: MapPoint;
  destination?: MapPoint;
  currentLocation?: MapPoint;
  routePoints?: MapPoint[];
  height?: number;
  testID?: string;
}

export default function SafeMap({ origin, destination, currentLocation, routePoints, height = 250, testID }: Props) {
  // Web fallback - styled map representation
  return (
    <View style={[styles.fallback, { height }]} testID={testID || 'map-fallback'}>
      <View style={styles.fallbackGrid}>
        {/* Decorative grid lines */}
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 11}%` }]} />
        ))}
      </View>

      {/* Origin marker */}
      {origin && (
        <View style={[styles.markerWrap, { top: '30%', left: '20%' }]}>
          <View style={[styles.marker, { backgroundColor: Colors.primary }]}>
            <Ionicons name="radio-button-on" size={14} color="#FFF" />
          </View>
          {origin.label && <Text style={styles.markerLabel}>{origin.label}</Text>}
        </View>
      )}

      {/* Destination marker */}
      {destination && (
        <View style={[styles.markerWrap, { top: '60%', right: '15%' }]}>
          <View style={[styles.marker, { backgroundColor: Colors.danger }]}>
            <Ionicons name="location" size={14} color="#FFF" />
          </View>
          {destination.label && <Text style={styles.markerLabel}>{destination.label}</Text>}
        </View>
      )}

      {/* Current location pulse */}
      {currentLocation && (
        <View style={[styles.markerWrap, { top: '45%', left: '40%' }]}>
          <View style={styles.currentPulse} />
          <View style={styles.currentDot} />
        </View>
      )}

      {/* Route line */}
      {origin && destination && (
        <View style={styles.routeLine} />
      )}

      <View style={styles.fallbackBadge}>
        <Ionicons name="map" size={14} color={Colors.primary} />
        <Text style={styles.fallbackText}>Live Map</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#0D1340',
    borderRadius: BorderRadius.l,
    overflow: 'hidden',
    position: 'relative',
  },
  fallbackGrid: { ...StyleSheet.absoluteFillObject },
  gridLineH: {
    position: 'absolute', left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(0, 212, 170, 0.06)',
  },
  gridLineV: {
    position: 'absolute', top: 0, bottom: 0, width: 1,
    backgroundColor: 'rgba(0, 212, 170, 0.06)',
  },
  markerWrap: { position: 'absolute', alignItems: 'center' },
  marker: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 5,
  },
  markerLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, maxWidth: 80, textAlign: 'center' },
  currentPulse: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.blue + '30', position: 'absolute',
  },
  currentDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.blue, borderWidth: 2, borderColor: '#FFF',
  },
  routeLine: {
    position: 'absolute', top: '38%', left: '25%', width: '50%', height: 3,
    backgroundColor: Colors.primary + '60', borderRadius: 2,
    transform: [{ rotate: '25deg' }],
  },
  fallbackBadge: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface + 'E0', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  fallbackText: { fontSize: 11, color: Colors.primary, marginLeft: 4, fontWeight: '600' },
});
