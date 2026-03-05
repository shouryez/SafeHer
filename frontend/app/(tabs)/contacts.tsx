import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { Colors, Spacing, BorderRadius } from '../../src/theme';

interface Contact { id: string; user_id: string; name: string; phone: string; priority: number; }

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch {} finally { setLoading(false); }
  };

  const addContact = async () => {
    if (!name || !phone) { Alert.alert('Error', 'Name and phone required'); return; }
    try {
      await api.addContact({ name, phone, priority: contacts.length + 1 });
      setName(''); setPhone(''); setShowAdd(false);
      loadContacts();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const deleteContact = async (id: string) => {
    Alert.alert('Remove Contact', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await api.deleteContact(id);
        loadContacts();
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} testID="contacts-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>Trusted Contacts</Text>
          <Text style={styles.subtitle}>Up to 3 emergency contacts</Text>
        </View>

        {loading ? <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} /> : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people" size={48} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No trusted contacts yet</Text>
                <Text style={styles.emptyHint}>Add contacts who will receive your emergency alerts</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.contactCard} testID={`contact-${item.id}`}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityText}>#{item.priority}</Text>
                </View>
                <TouchableOpacity testID={`delete-contact-${item.id}`} onPress={() => deleteContact(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash" size={20} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        {showAdd ? (
          <View style={styles.addForm}>
            <TextInput testID="contact-name-input" style={styles.input} placeholder="Contact Name" placeholderTextColor={Colors.textSecondary} value={name} onChangeText={setName} />
            <TextInput testID="contact-phone-input" style={styles.input} placeholder="Phone Number" placeholderTextColor={Colors.textSecondary} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={styles.addBtns}>
              <TouchableOpacity testID="cancel-add-btn" style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-contact-btn" style={styles.saveBtn} onPress={addContact}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : contacts.length < 3 ? (
          <TouchableOpacity testID="add-contact-btn" style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.addBtnText}>Add Trusted Contact</Text>
          </TouchableOpacity>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.l, paddingTop: Spacing.m },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  list: { padding: Spacing.l },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600', marginTop: Spacing.m },
  emptyHint: { color: Colors.textSecondary, fontSize: 14, marginTop: 4, textAlign: 'center' },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.l, padding: Spacing.m, marginBottom: Spacing.m,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  contactAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  contactInfo: { flex: 1, marginLeft: Spacing.m },
  contactName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  contactPhone: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  priorityBadge: {
    backgroundColor: Colors.surfaceHighlight, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12, marginRight: Spacing.s,
  },
  priorityText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  deleteBtn: { padding: 8 },
  addForm: { padding: Spacing.l, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  input: {
    height: 52, backgroundColor: Colors.surface, borderRadius: BorderRadius.m,
    paddingHorizontal: Spacing.m, color: Colors.textPrimary, fontSize: 16,
    marginBottom: Spacing.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  addBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, height: 48, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: Colors.background, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: Spacing.m, marginHorizontal: Spacing.l, marginBottom: Spacing.l,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.l,
    borderWidth: 1, borderColor: Colors.primary + '40', borderStyle: 'dashed',
  },
  addBtnText: { color: Colors.primary, fontWeight: '600', marginLeft: Spacing.s },
});
