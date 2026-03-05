import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from './theme';

interface PlaceResult {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
}

interface Props {
  placeholder?: string;
  onSelect: (place: PlaceResult) => void;
  testID?: string;
  icon?: string;
  iconColor?: string;
}

export default function PlaceAutocomplete({ placeholder = 'Search location...', onSelect, testID, icon = 'location', iconColor = Colors.danger }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (text: string) => {
    if (text.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`https://photon.komoot.io/api?q=${encodeURIComponent(text)}&limit=5&lang=en`);
      const data = await res.json();
      const places: PlaceResult[] = (data.features || []).map((f: any, i: number) => {
        const p = f.properties || {};
        const coords = f.geometry?.coordinates || [0, 0];
        const parts = [p.name, p.street, p.city || p.county, p.state, p.country].filter(Boolean);
        return {
          id: `${i}-${coords[0]}-${coords[1]}`,
          name: p.name || 'Unknown',
          description: parts.join(', '),
          lat: coords[1],
          lng: coords[0],
        };
      });
      setResults(places);
      setShowResults(places.length > 0);
    } catch {
      setResults([]);
    } finally { setLoading(false); }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    setSelectedText('');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(text), 400);
  };

  const handleSelect = (place: PlaceResult) => {
    setSelectedText(place.name);
    setQuery(place.name);
    setShowResults(false);
    setResults([]);
    onSelect(place);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <Ionicons name={icon as any} size={16} color={iconColor} style={styles.icon} />
        <TextInput
          testID={testID}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textSecondary}
          value={selectedText || query}
          onChangeText={handleChangeText}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
        />
        {loading && <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />}
      </View>

      {showResults && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            renderItem={({ item }) => (
              <TouchableOpacity
                testID={`place-result-${item.id}`}
                style={styles.resultRow}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={18} color={Colors.primary} />
                <View style={styles.resultText}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.resultDesc} numberOfLines={1}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 100 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.m,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  icon: { paddingLeft: Spacing.m },
  input: {
    flex: 1, height: 48, paddingHorizontal: Spacing.s,
    color: Colors.textPrimary, fontSize: 16,
  },
  loader: { marginRight: Spacing.s },
  dropdown: {
    position: 'absolute', top: 52, left: 0, right: 0,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.m,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: 220, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 15,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: Spacing.m,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  resultText: { flex: 1, marginLeft: Spacing.s },
  resultName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  resultDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
});
