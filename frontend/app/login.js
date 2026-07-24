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
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

const { width, height } = Dimensions.get('window');

const tr = {
  warning: 'Uyar\u0131',
  error: 'Hata',
  fillEmailPassword: 'L\u00fctfen e-posta ve \u015fifrenizi girin.',
  loginFailed: 'Giri\u015f ba\u015far\u0131s\u0131z. E-posta veya \u015fifrenizi kontrol edin.',
  login: 'Giri\u015f Yap',
  subtitle: 'Hesab\u0131n\u0131za giri\u015f yap\u0131n',
  tagline: 'Kay\u0131p ve buluntu ilanlar\u0131n\u0131 ke\u015ffet',
  email: 'E-posta adresiniz',
  password: '\u015eifreniz',
  divider: 'veya',
  noAccount: 'Hesab\u0131n\u0131z yok mu?',
  register: 'Kay\u0131t Ol',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(tr.warning, tr.fillEmailPassword);
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      console.error('Login error:', error);
      const message = error?.response?.data?.message || tr.loginFailed;
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
      >
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
        <View style={styles.bgCircle3} />

        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Image source={require('../assets/images/bulio-logo.png')} style={styles.logoImage} />
          </View>
          <Text style={styles.appName}>Bulio</Text>
          <Text style={styles.appTagline}>{tr.tagline}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{tr.login}</Text>
          <Text style={styles.cardSubtitle}>{tr.subtitle}</Text>

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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>{tr.login}</Text>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{tr.divider}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/register')}
            activeOpacity={0.7}
          >
            <Text style={styles.registerText}>
              {tr.noAccount} <Text style={styles.registerLink}>{tr.register}</Text>
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
    top: -80,
    right: -60,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  bgCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  bgCircle3: {
    position: 'absolute',
    top: height * 0.35,
    left: width * 0.6,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 92,
    height: 92,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f1f5f9',
    letterSpacing: 1,
  },
  appTagline: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '400',
  },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 54,
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
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 13,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  registerButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  registerText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  registerLink: {
    color: '#818cf8',
    fontWeight: '700',
  },
});