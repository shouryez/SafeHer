import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/AuthContext';
import { Colors, Spacing, BorderRadius } from '../src/theme';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    if (!isLogin && !name) { setError('Name is required'); return; }
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password, phone);
      }
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="auth-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.title}>SafeHer</Text>
            <Text style={styles.subtitle}>{isLogin ? 'Welcome back' : 'Create your account'}</Text>
          </View>

          {error ? (
            <View style={styles.errorBox} testID="auth-error">
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isLogin && (
            <View style={styles.inputWrap}>
              <Ionicons name="person" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                testID="name-input"
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputWrap}>
            <Ionicons name="mail" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              testID="email-input"
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              testID="password-input"
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {!isLogin && (
            <View style={styles.inputWrap}>
              <Ionicons name="call" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                testID="phone-input"
                style={styles.input}
                placeholder="Phone (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          )}

          <TouchableOpacity
            testID="auth-submit-btn"
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.btnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity testID="auth-toggle-btn" onPress={() => { setIsLogin(!isLogin); setError(''); }} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleHighlight}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.l },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.m,
    shadowColor: Colors.primary, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 1.5 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: Spacing.s },
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.12)', padding: Spacing.m,
    borderRadius: BorderRadius.m, marginBottom: Spacing.m,
  },
  errorText: { color: Colors.danger, marginLeft: Spacing.s, fontSize: 14 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.m,
    marginBottom: Spacing.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  inputIcon: { paddingLeft: Spacing.m },
  input: {
    flex: 1, height: 56, paddingHorizontal: Spacing.m,
    color: Colors.textPrimary, fontSize: 16,
  },
  btn: {
    height: 56, borderRadius: 28, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: Spacing.s,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.background, fontSize: 17, fontWeight: '700' },
  toggleBtn: { alignItems: 'center', marginTop: Spacing.l },
  toggleText: { color: Colors.textSecondary, fontSize: 15 },
  toggleHighlight: { color: Colors.primary, fontWeight: '600' },
});
