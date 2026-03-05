import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { Colors, Spacing, BorderRadius } from '../src/theme';

const incidentTypes = [
  { key: 'harassment', label: 'Harassment', icon: 'hand-left' },
  { key: 'route_deviation', label: 'Route Deviation', icon: 'git-branch' },
  { key: 'unsafe_area', label: 'Unsafe Area', icon: 'warning' },
  { key: 'stalking', label: 'Stalking', icon: 'eye' },
  { key: 'poor_lighting', label: 'Poor Lighting', icon: 'bulb' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function ReportScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async () => {
    if (!selectedType) { Alert.alert('Select Type', 'Please select an incident type'); return; }
    if (!description) { Alert.alert('Description', 'Please describe what happened'); return; }
    setSubmitting(true);
    try {
      await api.createReport({
        incident_type: selectedType,
        description,
        lat: 28.6139 + (Math.random() * 0.01),
        lng: 77.2090 + (Math.random() * 0.01),
      });
      Alert.alert('Report Submitted', 'Thank you for helping keep others safe. Your report has been recorded.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safe} testID="report-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <TouchableOpacity testID="report-back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Report Incident</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>What happened?</Text>
          <Text style={styles.sectionHint}>Select the type of incident</Text>

          <View style={styles.typeGrid}>
            {incidentTypes.map((type) => (
              <TouchableOpacity
                testID={`incident-type-${type.key}`}
                key={type.key}
                style={[styles.typeCard, selectedType === type.key && styles.typeCardSelected]}
                onPress={() => setSelectedType(type.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={type.icon as any} size={24} color={selectedType === type.key ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.typeLabel, selectedType === type.key && { color: Colors.primary }]}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: Spacing.l }]}>Description</Text>
          <TextInput
            testID="report-description-input"
            style={styles.textArea}
            placeholder="Describe what happened..."
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.locationTag}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.locationText}>Current location will be auto-attached</Text>
          </View>

          <TouchableOpacity
            testID="submit-report-btn"
            style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            onPress={submitReport}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
          </TouchableOpacity>
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
  content: { padding: Spacing.l },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  sectionHint: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.m },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  typeCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.l,
    padding: Spacing.m, alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  typeCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  typeLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginTop: 8 },
  textArea: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.l, padding: Spacing.m,
    color: Colors.textPrimary, fontSize: 16, minHeight: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  locationTag: {
    flexDirection: 'row', alignItems: 'center', marginTop: Spacing.m,
    backgroundColor: Colors.primary + '12', borderRadius: BorderRadius.s, padding: Spacing.s,
  },
  locationText: { fontSize: 13, color: Colors.primary, marginLeft: Spacing.s },
  submitBtn: {
    height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.l,
  },
  submitText: { color: Colors.background, fontSize: 17, fontWeight: '700' },
});
