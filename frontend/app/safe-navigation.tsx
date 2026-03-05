import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { Colors, Spacing, BorderRadius } from '../src/theme';
import PlaceAutocomplete from '../src/PlaceAutocomplete';
import SafeMap from '../src/SafeMap';
import { locationService, LocationCoords } from '../src/LocationService';
import { notificationService } from '../src/NotificationService';

interface RouteOption {
  id: string;
  label: string;
  duration_min: number;
  safety_score: number;
  recommended: boolean;
  description: string;
  warnings: string[];
}

const getScoreColor = (score: number) => {
  if (score < 40) return Colors.danger;
  if (score < 70) return Colors.warning;
  return Colors.success;
};

const getLabelIcon = (label: string) => {
  if (label.toLowerCase().includes('fast')) return 'flash';
  if (label.toLowerCase().includes('safe')) return 'shield-checkmark';
  return 'swap-horizontal';
};

export default function SafeNavigationScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [destName, setDestName] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentLoc, setCurrentLoc] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [locPermission, setLocPermission] = useState(false);

  useEffect(() => {
    initLocation();
    notificationService.requestPermission();
  }, []);

  const initLocation = async () => {
    const perms = await locationService.requestAllPermissions();
    setLocPermission(perms.foreground);
    if (perms.foreground) {
      const loc = await locationService.getCurrentLocation();
      if (loc) setCurrentLoc(loc);
    }
  };

  const analyzeRoutes = async () => {
    if (!destCoords || !destName) { Alert.alert('Error', 'Please select a destination'); return; }
    setLoading(true);
    try {
      const hour = new Date().getHours();
      const timeOfDay = hour < 6 ? 'late_night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
      const origin = currentLoc || { lat: 28.6139, lng: 77.2090 };
      const data = await api.analyzeRoute({
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        time_of_day: timeOfDay,
        mode: 'walk',
      });
      setRoutes(data.routes);
      setStep(2);
    } catch {
      Alert.alert('Error', 'Failed to analyze routes. Please try again.');
    } finally { setLoading(false); }
  };

  const startNavigation = async () => {
    if (!selectedRoute) { Alert.alert('Select Route', 'Please choose a route'); return; }
    const route = routes.find(r => r.id === selectedRoute);
    try {
      const origin = currentLoc || { lat: 28.6139, lng: 77.2090 };
      const trip = await api.startTrip({
        mode: 'walk',
        origin_name: 'Current Location',
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destName,
        destination_lat: destCoords!.lat,
        destination_lng: destCoords!.lng,
      });
      await notificationService.sendTripStartNotification(destName);

      // Start background location tracking
      locationService.startWatching((coords) => {
        setCurrentLoc(coords);
        api.updateLocation(trip.id, { lat: coords.lat, lng: coords.lng, speed: coords.speed }).catch(() => {});
      }, 5000);

      setStep(3);
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} testID="safe-navigation-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity testID="nav-back-btn" onPress={() => { locationService.stopWatching(); step > 1 ? setStep(step - 1) : router.back(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>AI Safe Navigation</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <View style={styles.heroSection}>
                <View style={styles.aiIconWrap}>
                  <Ionicons name="sparkles" size={40} color={Colors.primary} />
                </View>
                <Text style={styles.heroTitle}>Find Your Safest Route</Text>
                <Text style={styles.heroSubtitle}>AI analyzes safety data, lighting, crowd density and crime reports</Text>
              </View>

              {/* Map with current location */}
              <SafeMap
                currentLocation={currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng, label: 'You' } : undefined}
                destination={destCoords ? { ...destCoords, label: destName } : undefined}
                height={180}
                testID="nav-map-preview"
              />
              <View style={{ height: Spacing.m }} />

              <View style={styles.inputCard}>
                <View style={styles.originRow}>
                  <Ionicons name="radio-button-on" size={16} color={Colors.primary} />
                  <Text style={styles.originText}>
                    {currentLoc ? `Current Location (${currentLoc.lat.toFixed(3)}, ${currentLoc.lng.toFixed(3)})` : 'Current Location (GPS)'}
                  </Text>
                </View>
                <View style={styles.inputDivider} />
                <Text style={styles.fieldLabel}>Destination</Text>
                <PlaceAutocomplete
                  testID="nav-destination-autocomplete"
                  placeholder="Where are you walking to?"
                  icon="location"
                  iconColor={Colors.danger}
                  onSelect={(place) => { setDestName(place.name); setDestCoords({ lat: place.lat, lng: place.lng }); }}
                />
              </View>

              {/* Permission status */}
              <View style={[styles.permBadge, { backgroundColor: locPermission ? Colors.primary + '12' : Colors.warning + '12' }]}>
                <Ionicons name={locPermission ? 'location' : 'warning'} size={16} color={locPermission ? Colors.primary : Colors.warning} />
                <Text style={[styles.permText, { color: locPermission ? Colors.primary : Colors.warning }]}>
                  {locPermission ? 'Background location tracking enabled' : 'Grant location for safety tracking'}
                </Text>
              </View>

              <TouchableOpacity
                testID="analyze-routes-btn"
                style={[styles.analyzeBtn, loading && { opacity: 0.6 }]}
                onPress={analyzeRoutes}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color={Colors.background} />
                    <Text style={styles.analyzeBtnText}>  AI Analyzing...</Text>
                  </View>
                ) : (
                  <View style={styles.loadingRow}>
                    <Ionicons name="sparkles" size={20} color={Colors.background} />
                    <Text style={styles.analyzeBtnText}>  Analyze Routes with AI</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : step === 2 ? (
            <>
              <Text style={styles.resultsTitle}>Routes to {destName}</Text>
              <Text style={styles.resultsHint}>AI-powered safety scoring • Tap to select</Text>

              <SafeMap
                origin={currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng, label: 'You' } : undefined}
                destination={destCoords ? { ...destCoords, label: destName } : undefined}
                height={160}
                testID="nav-map-routes"
              />
              <View style={{ height: Spacing.m }} />

              {routes.map((route) => (
                <TouchableOpacity
                  testID={`route-option-${route.id}`}
                  key={route.id}
                  style={[styles.routeCard, selectedRoute === route.id && styles.routeCardSelected, route.recommended && styles.routeCardRecommended]}
                  onPress={() => setSelectedRoute(route.id)}
                  activeOpacity={0.8}
                >
                  {route.recommended && (
                    <View style={styles.recommendedBadge}>
                      <Ionicons name="star" size={12} color={Colors.background} />
                      <Text style={styles.recommendedText}> RECOMMENDED</Text>
                    </View>
                  )}
                  <View style={styles.routeHeader}>
                    <View style={[styles.routeIconWrap, { backgroundColor: getScoreColor(route.safety_score) + '20' }]}>
                      <Ionicons name={getLabelIcon(route.label) as any} size={24} color={getScoreColor(route.safety_score)} />
                    </View>
                    <View style={styles.routeInfo}>
                      <Text style={styles.routeLabel}>{route.label}</Text>
                      <Text style={styles.routeDesc}>{route.description}</Text>
                    </View>
                  </View>
                  <View style={styles.routeStats}>
                    <View style={styles.routeStat}>
                      <Ionicons name="time" size={14} color={Colors.textSecondary} />
                      <Text style={styles.routeStatText}>{route.duration_min} min</Text>
                    </View>
                    <View style={styles.routeStat}>
                      <Ionicons name="shield-checkmark" size={14} color={getScoreColor(route.safety_score)} />
                      <Text style={[styles.routeStatText, { color: getScoreColor(route.safety_score), fontWeight: '700' }]}>
                        {route.safety_score}/100
                      </Text>
                    </View>
                  </View>
                  {route.warnings.length > 0 && (
                    <View style={styles.warningsWrap}>
                      {route.warnings.map((w, i) => (
                        <View key={i} style={styles.warningRow}>
                          <Ionicons name="warning" size={12} color={Colors.warning} />
                          <Text style={styles.warningText}>{w}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {selectedRoute && (
                <TouchableOpacity testID="start-navigation-btn" style={styles.startNavBtn} onPress={startNavigation} activeOpacity={0.8}>
                  <Ionicons name="navigate" size={20} color={Colors.background} />
                  <Text style={styles.startNavText}>Start Navigation</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              {/* Step 3: Active Navigation */}
              <View style={styles.activeHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>NAVIGATING</Text>
              </View>

              <SafeMap
                origin={currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng, label: 'You' } : undefined}
                destination={destCoords ? { ...destCoords, label: destName } : undefined}
                currentLocation={currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng } : undefined}
                height={250}
                testID="nav-map-active"
              />

              <View style={styles.navInfo}>
                <View style={styles.navInfoRow}>
                  <Ionicons name="walk" size={20} color={Colors.primary} />
                  <Text style={styles.navInfoText}>Walking to {destName}</Text>
                </View>
                {currentLoc && (
                  <Text style={styles.navCoords}>GPS: {currentLoc.lat.toFixed(4)}, {currentLoc.lng.toFixed(4)}</Text>
                )}
                <Text style={styles.navStatus}>Location tracking active • Contacts can track you</Text>
              </View>

              <TouchableOpacity
                testID="nav-sos-btn"
                style={styles.sosBtn}
                onPress={async () => {
                  await api.triggerSOS({ alert_type: 'sos' });
                  await notificationService.sendSOSNotification();
                  Alert.alert('SOS Triggered', 'Emergency alert sent! (SIMULATED)');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="alert-circle" size={32} color="#FFF" />
                <Text style={styles.sosText}>EMERGENCY SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="arrived-safely-btn"
                style={styles.arrivedBtn}
                onPress={async () => {
                  locationService.stopWatching();
                  await notificationService.sendTripEndNotification();
                  Alert.alert('Arrived!', 'Glad you made it safely!', [{ text: 'OK', onPress: () => router.back() }]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={22} color={Colors.background} />
                <Text style={styles.arrivedText}>I Arrived Safely</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.m, paddingVertical: Spacing.s },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  content: { padding: Spacing.l, paddingBottom: 40 },
  heroSection: { alignItems: 'center', marginBottom: Spacing.l },
  aiIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.m },
  heroTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.s, lineHeight: 20 },
  inputCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.l, padding: Spacing.m, marginBottom: Spacing.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  originRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  originText: { marginLeft: Spacing.s, color: Colors.textSecondary, fontSize: 14 },
  inputDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: Spacing.s },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  permBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.s, padding: Spacing.s, marginBottom: Spacing.m },
  permText: { fontSize: 12, marginLeft: Spacing.s },
  analyzeBtn: { height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  analyzeBtnText: { color: Colors.background, fontSize: 17, fontWeight: '700' },
  resultsTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  resultsHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.m },
  routeCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.l, padding: Spacing.m, marginBottom: Spacing.m, borderWidth: 2, borderColor: 'transparent' },
  routeCardSelected: { borderColor: Colors.primary },
  routeCardRecommended: { borderColor: Colors.primary + '40' },
  recommendedBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: Spacing.s },
  recommendedText: { fontSize: 10, fontWeight: '800', color: Colors.background, letterSpacing: 1 },
  routeHeader: { flexDirection: 'row', alignItems: 'center' },
  routeIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  routeInfo: { flex: 1, marginLeft: Spacing.m },
  routeLabel: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  routeDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  routeStats: { flexDirection: 'row', gap: 16, marginTop: Spacing.m, paddingTop: Spacing.s, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  routeStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeStatText: { fontSize: 14, color: Colors.textSecondary },
  warningsWrap: { marginTop: Spacing.s },
  warningRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  warningText: { fontSize: 12, color: Colors.warning, marginLeft: 4 },
  startNavBtn: { flexDirection: 'row', height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.s },
  startNavText: { color: Colors.background, fontSize: 17, fontWeight: '700' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.m },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success, marginRight: 8 },
  liveText: { fontSize: 14, fontWeight: '700', color: Colors.success, letterSpacing: 2 },
  navInfo: { backgroundColor: Colors.surface, borderRadius: BorderRadius.l, padding: Spacing.m, marginTop: Spacing.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  navInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navInfoText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  navCoords: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  navStatus: { fontSize: 12, color: Colors.primary, marginTop: 8 },
  sosBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.danger, borderRadius: BorderRadius.l, padding: Spacing.m, marginTop: Spacing.m, shadowColor: Colors.danger, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  sosText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginLeft: Spacing.s },
  arrivedBtn: { flexDirection: 'row', height: 56, borderRadius: 28, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.m },
  arrivedText: { color: Colors.background, fontSize: 17, fontWeight: '700' },
});
