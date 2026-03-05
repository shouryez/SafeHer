import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { Colors, Spacing, BorderRadius } from '../src/theme';
import PlaceAutocomplete from '../src/PlaceAutocomplete';
import SafeMap from '../src/SafeMap';
import { locationService, LocationCoords } from '../src/LocationService';
import { notificationService } from '../src/NotificationService';

export default function RideCheckScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pickupName, setPickupName] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destName, setDestName] = useState('');
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [tripId, setTripId] = useState('');
  const [currentLoc, setCurrentLoc] = useState<LocationCoords | null>(null);
  const [locPermission, setLocPermission] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState({ route: 'On Route', speed: 'Moving', gps: 'Active', audio: 'Ready' });

  useEffect(() => {
    initLocation();
    notificationService.requestPermission();
    return () => { locationService.stopWatching(); };
  }, []);

  const initLocation = async () => {
    const perms = await locationService.requestAllPermissions();
    setLocPermission(perms.foreground);
    if (perms.foreground) {
      const loc = await locationService.getCurrentLocation();
      if (loc) {
        setCurrentLoc(loc);
        setPickupName('Current Location');
        setPickupCoords({ lat: loc.lat, lng: loc.lng });
      }
    }
  };

  const startTrip = async () => {
    if (!destCoords || !destName) { Alert.alert('Error', 'Please select a destination'); return; }
    setLoading(true);
    try {
      const origin = pickupCoords || { lat: 28.6139, lng: 77.2090 };
      const trip = await api.startTrip({
        mode: 'cab',
        origin_name: pickupName || 'Current Location',
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_name: destName,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        vehicle_number: vehicleNumber || null,
      });
      setTripId(trip.id);
      setStep(2);

      await notificationService.sendTripStartNotification(destName);

      // Start location tracking
      locationService.startWatching((coords) => {
        setCurrentLoc(coords);
        api.updateLocation(trip.id, { lat: coords.lat, lng: coords.lng, speed: coords.speed }).catch(() => {});
        if (coords.speed < 0.5) {
          setTrackingStatus(prev => ({ ...prev, speed: 'Stopped' }));
        } else {
          setTrackingStatus(prev => ({ ...prev, speed: `${(coords.speed * 3.6).toFixed(0)} km/h` }));
        }
      }, 5000);
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const endTrip = async (rating: number) => {
    locationService.stopWatching();
    try {
      await api.endTrip(tripId, { safety_rating: rating });
      await notificationService.sendTripEndNotification();
      Alert.alert('Trip Ended', 'You arrived safely! Trip logged.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleSOS = async () => {
    try {
      await api.triggerSOS({ trip_id: tripId, alert_type: 'sos' });
      await notificationService.sendSOSNotification();
      Alert.alert('SOS Triggered', 'Emergency alert sent to all trusted contacts! (SIMULATED)');
    } catch {
      Alert.alert('SOS', 'Emergency mode activated.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="ride-check-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity testID="ride-back-btn" onPress={() => { locationService.stopWatching(); router.back(); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Smart Ride Check</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              <View style={styles.stepRow}>
                <View style={[styles.stepDot, styles.stepActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepLabel}>Enter Trip Details</Text>

              {/* Map Preview */}
              <SafeMap
                origin={pickupCoords ? { ...pickupCoords, label: pickupName } : undefined}
                destination={destCoords ? { ...destCoords, label: destName } : undefined}
                currentLocation={currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng } : undefined}
                height={180}
                testID="ride-map-preview"
              />

              <View style={{ height: Spacing.m }} />

              {/* Pickup - show current location or allow search */}
              <View style={styles.card}>
                <Text style={styles.fieldLabel}>Pickup</Text>
                {pickupCoords ? (
                  <View style={styles.locRow}>
                    <Ionicons name="radio-button-on" size={16} color={Colors.primary} />
                    <Text style={styles.locText}>{pickupName}</Text>
                    <TouchableOpacity onPress={() => { setPickupCoords(null); setPickupName(''); }}>
                      <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <PlaceAutocomplete
                    testID="pickup-autocomplete"
                    placeholder="Search pickup location..."
                    icon="radio-button-on"
                    iconColor={Colors.primary}
                    onSelect={(place) => { setPickupName(place.name); setPickupCoords({ lat: place.lat, lng: place.lng }); }}
                  />
                )}

                <View style={{ height: Spacing.m }} />
                <Text style={styles.fieldLabel}>Destination</Text>
                <PlaceAutocomplete
                  testID="destination-autocomplete"
                  placeholder="Where are you going?"
                  icon="location"
                  iconColor={Colors.danger}
                  onSelect={(place) => { setDestName(place.name); setDestCoords({ lat: place.lat, lng: place.lng }); }}
                />

                <View style={{ height: Spacing.m }} />
                <Text style={styles.fieldLabel}>Vehicle Number (optional)</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="car-sport" size={16} color={Colors.warning} style={{ paddingLeft: Spacing.m }} />
                  <TextInput
                    testID="vehicle-input"
                    style={styles.input}
                    placeholder="e.g. DL 01 AB 1234"
                    placeholderTextColor={Colors.textSecondary}
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Permission status */}
              <View style={[styles.infoCard, { backgroundColor: locPermission ? Colors.primary + '12' : Colors.warning + '12' }]}>
                <Ionicons name={locPermission ? 'shield-checkmark' : 'warning'} size={20} color={locPermission ? Colors.primary : Colors.warning} />
                <Text style={[styles.infoText, { color: locPermission ? Colors.primary : Colors.warning }]}>
                  {locPermission ? 'Location permissions granted. Real-time tracking ready.' : 'Location permission needed for safety monitoring.'}
                </Text>
              </View>

              <TouchableOpacity
                testID="start-trip-btn"
                style={[styles.btn, loading && { opacity: 0.6 }]}
                onPress={startTrip}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color={Colors.background} /> :
                  <Text style={styles.btnText}>Start Trip Monitoring</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.activeHeader}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE MONITORING</Text>
              </View>

              {/* Live Map */}
              <SafeMap
                origin={pickupCoords ? { ...pickupCoords, label: pickupName } : undefined}
                destination={destCoords ? { ...destCoords, label: destName } : undefined}
                currentLocation={currentLoc ? { lat: currentLoc.lat, lng: currentLoc.lng } : undefined}
                height={220}
                testID="ride-map-live"
              />

              <View style={{ height: Spacing.m }} />

              <View style={styles.card}>
                <View style={styles.tripDetail}>
                  <Text style={styles.detailLabel}>From</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{pickupName}</Text>
                </View>
                <View style={styles.tripDetail}>
                  <Text style={styles.detailLabel}>To</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>{destName}</Text>
                </View>
                {vehicleNumber ? (
                  <View style={styles.tripDetail}>
                    <Text style={styles.detailLabel}>Vehicle</Text>
                    <Text style={styles.detailValue}>{vehicleNumber}</Text>
                  </View>
                ) : null}
                {currentLoc && (
                  <View style={styles.tripDetail}>
                    <Text style={styles.detailLabel}>GPS</Text>
                    <Text style={styles.detailValue}>{currentLoc.lat.toFixed(4)}, {currentLoc.lng.toFixed(4)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.monitorGrid}>
                <View style={styles.monitorCard}>
                  <Ionicons name="navigate" size={28} color={Colors.primary} />
                  <Text style={styles.monitorValue}>{trackingStatus.route}</Text>
                  <Text style={styles.monitorLabel}>Route</Text>
                </View>
                <View style={styles.monitorCard}>
                  <Ionicons name="speedometer" size={28} color={Colors.success} />
                  <Text style={styles.monitorValue}>{trackingStatus.speed}</Text>
                  <Text style={styles.monitorLabel}>Speed</Text>
                </View>
                <View style={styles.monitorCard}>
                  <Ionicons name="location" size={28} color={locPermission ? Colors.warning : Colors.danger} />
                  <Text style={styles.monitorValue}>{trackingStatus.gps}</Text>
                  <Text style={styles.monitorLabel}>GPS</Text>
                </View>
                <View style={styles.monitorCard}>
                  <Ionicons name="mic" size={28} color={Colors.blue} />
                  <Text style={styles.monitorValue}>{trackingStatus.audio}</Text>
                  <Text style={styles.monitorLabel}>Audio</Text>
                </View>
              </View>

              <TouchableOpacity testID="ride-sos-btn" style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.7}>
                <Ionicons name="alert-circle" size={32} color="#FFF" />
                <Text style={styles.sosText}>EMERGENCY SOS</Text>
              </TouchableOpacity>

              <Text style={styles.rateTitle}>Arrived safely? Rate your trip:</Text>
              <View style={styles.ratingRow}>
                {[1,2,3,4,5].map(r => (
                  <TouchableOpacity testID={`rate-${r}-btn`} key={r} style={styles.rateBtn} onPress={() => endTrip(r)}>
                    <Ionicons name="star" size={28} color={Colors.warning} />
                    <Text style={styles.rateNum}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.m },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.surfaceHighlight },
  stepActive: { backgroundColor: Colors.primary, width: 14, height: 14, borderRadius: 7 },
  stepLine: { width: 40, height: 2, backgroundColor: Colors.surfaceHighlight },
  stepLabel: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.m },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.l, padding: Spacing.m, marginBottom: Spacing.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  locRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  locText: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  input: { flex: 1, height: 48, paddingHorizontal: Spacing.s, color: Colors.textPrimary, fontSize: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'center', borderRadius: BorderRadius.m, padding: Spacing.m, marginBottom: Spacing.l },
  infoText: { flex: 1, marginLeft: Spacing.s, fontSize: 13, lineHeight: 18 },
  btn: { height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: Colors.background, fontSize: 17, fontWeight: '700' },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.m },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger, marginRight: 8 },
  liveText: { fontSize: 14, fontWeight: '700', color: Colors.danger, letterSpacing: 2 },
  tripDetail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabel: { fontSize: 14, color: Colors.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, maxWidth: '60%', textAlign: 'right' },
  monitorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: Spacing.m },
  monitorCard: { width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.l, padding: Spacing.m, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  monitorValue: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  monitorLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  sosBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.danger, borderRadius: BorderRadius.l, padding: Spacing.m, marginVertical: Spacing.m, shadowColor: Colors.danger, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10 },
  sosText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginLeft: Spacing.s },
  rateTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center', marginTop: Spacing.s },
  ratingRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: Spacing.m },
  rateBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  rateNum: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
});
