import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

const tr = {
  warning: 'Uyar\u0131',
  error: 'Hata',
  fillAll: 'L\u00fctfen t\u00fcm alanlar\u0131 doldurun.',
  mismatch: '\u015eifreler e\u015fle\u015fmiyor.',
  minPassword: '\u015eifre en az 6 karakter olmal\u0131d\u0131r.',
  failed: 'Kay\u0131t ba\u015far\u0131s\u0131z. Bilgilerinizi kontrol edin.',
  title: 'Hesap Olu\u015ftur',
  subtitle: 'Bulio ile kay\u0131p ve buluntu ilanlar\u0131n\u0131 takip edin',
  fullName: 'Ad Soyad',
  username: 'Kullan\u0131c\u0131 ad\u0131',
  email: 'E-posta adresiniz',
  password: '\u015eifre (min. 6 karakter)',
  confirmPassword: '\u015eifreyi tekrar girin',
  register: 'Kay\u0131t Ol',
  hasAccount: 'Zaten hesab\u0131n\u0131z var m\u0131?',
  login: 'Giri\u015f Yap',
};

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      Alert.alert(tr.warning, tr.fillAll);
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(tr.warning, tr.mismatch);
      return;
    }
    if (password.length < 6) {
      Alert.alert(tr.warning, tr.minPassword);
      return;
    }

    setLoading(true);
    try {
      await register(fullName.trim(), username.trim(), email.trim(), password);
    } catch (error) {
      console.error('Register error:', error);
      const message = error?.response?.data?.message || tr.failed;
      Alert.alert(tr.error, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#818cf8" />
          </TouchableOpacity>
          <View style={styles.logoSmall}>
            <Image source={require('../assets/images/bulio-logo.png')} style={styles.logoImage} />
          </View>
          <Text style={styles.headerTitle}>{tr.title}</Text>
          <Text style={styles.headerSubtitle}>{tr.subtitle}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={tr.fullName}
              placeholderTextColor="#94a3b8"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="at-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={tr.username}
              placeholderTextColor="#94a3b8"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={tr.email}
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={tr.password}
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={tr.confirmPassword}
              placeholderTextColor="#94a3b8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>{tr.register}</Text>
                <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>
              {tr.hasAccount} <Text style={styles.loginLink}>{tr.login}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  bgCircle1: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -50,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
  },
  logoSmall: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    marginBottom: 14,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#e2e8f0',
    height: '100%',
  },
  eyeIcon: {
    padding: 6,
  },
  button: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loginText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  loginLink: {
    color: '#a78bfa',
    fontWeight: '700',
  },
});