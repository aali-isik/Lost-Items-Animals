import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { getEvent, resolveEventImageUrl, updateEvent, updateEventWithImage } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

function toNoonUtcIso(date) {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

function parseServerDate(v) {
  if (!v) return new Date();
  if (typeof v === 'string') return new Date(v);
  if (Array.isArray(v)) {
    const [y, mon, day, h = 0, mi = 0, s = 0] = v;
    return new Date(y, mon - 1, day, h, mi, s);
  }
  return new Date(v);
}

function ymdFromDate(d) {
  const t = new Date(d);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function EditEventScreen() {
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [original, setOriginal] = useState(null);

  const [listingKind, setListingKind] = useState('LOST');
  const [listingCategory, setListingCategory] = useState('ITEM');
  const [lostFoundDate, setLostFoundDate] = useState(new Date());
  const [webDateStr, setWebDateStr] = useState(ymdFromDate(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [latStr, setLatStr] = useState('');
  const [lngStr, setLngStr] = useState('');
  const [imageAsset, setImageAsset] = useState(null);

  const effectiveDate = useMemo(() => {
    if (Platform.OS === 'web') {
      const [y, m, d] = webDateStr.split('-').map((x) => parseInt(x, 10));
      if (!y || !m || !d) return new Date();
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }
    return lostFoundDate;
  }, [lostFoundDate, webDateStr]);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const e = await getEvent(id);

      if (user?.userId == null) {
        Alert.alert('Oturum', 'Düzenlemek için tekrar giriş yapın (kullanıcı kimliği eksik).', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }
      if (e.ownerId == null) {
        Alert.alert('Düzenlenemez', 'Bu ilanın sahip kaydı yok (eski veri).', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }
      if (Number(user.userId) !== Number(e.ownerId)) {
        Alert.alert('Yetki yok', 'Bu ilanı yalnızca sahibi düzenleyebilir.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
        return;
      }

      setOriginal(e);
      setListingKind(e.listingKind || 'LOST');
      setListingCategory(e.listingCategory || 'ITEM');
      const parsed = parseServerDate(e.eventDate);
      setLostFoundDate(parsed);
      setWebDateStr(ymdFromDate(parsed));
      setLocationLabel(e.locationLabel || '');
      setTitle(e.title || '');
      setDescription(e.description || '');
      setLatStr(String(e.latitude ?? ''));
      setLngStr(String(e.longitude ?? ''));
      setImageAsset(null);
    } catch {
      Alert.alert('Hata', 'İlan yüklenemedi.', [{ text: 'Tamam', onPress: () => router.back() }]);
    } finally {
      setLoading(false);
    }
  }, [id, router, user]);

  useEffect(() => {
    load();
  }, [load]);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeri izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) setImageAsset(result.assets[0]);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Kamera izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) setImageAsset(result.assets[0]);
  };

  const showImageOptions = () => {
    Alert.alert('Görsel', null, [
      { text: 'Galeri', onPress: pickFromLibrary },
      { text: 'Kamera', onPress: takePhoto },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const onNativeDateChange = (event, date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && date) setLostFoundDate(date);
    if (Platform.OS === 'ios' && event.type === 'dismissed') setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik', 'Başlık ve açıklama zorunlu.');
      return;
    }
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert('Konum', 'Enlem ve boylam sayı olmalı.');
      return;
    }
    if (Platform.OS === 'web' && !/^\d{4}-\d{2}-\d{2}$/.test(webDateStr.trim())) {
      Alert.alert('Tarih', 'Web için YYYY-MM-DD formatında girin.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      latitude: lat,
      longitude: lng,
      eventDate: toNoonUtcIso(effectiveDate),
      listingKind,
      listingCategory,
      locationLabel: locationLabel.trim() || undefined,
    };

    setSaving(true);
    try {
      if (imageAsset?.uri) {
        await updateEventWithImage(id, { ...payload, imageAsset });
      } else {
        await updateEvent(id, {
          ...payload,
          imageUrl: original?.imageUrl ?? null,
        });
      }
      Alert.alert('Kaydedildi', 'İlan güncellendi.', [{ text: 'Tamam', onPress: () => router.back() }]);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) {
        Alert.alert('Yetki yok', 'Bu ilanı güncelleme izniniz yok.');
      } else {
        console.error(e);
        Alert.alert('Hata', 'Güncelleme başarısız.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </KeyboardAvoidingView>
    );
  }

  const existingImg = original?.imageUrl ? resolveEventImageUrl(original.imageUrl) : null;
  const previewUri = imageAsset?.uri || existingImg;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Tür</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.chip, listingKind === 'LOST' && styles.chipOn]}
                onPress={() => setListingKind('LOST')}
              >
                <Text style={[styles.chipTxt, listingKind === 'LOST' && styles.chipTxtOn]}>Kayıp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, listingKind === 'FOUND' && styles.chipOn]}
                onPress={() => setListingKind('FOUND')}
              >
                <Text style={[styles.chipTxt, listingKind === 'FOUND' && styles.chipTxtOn]}>Buluntu</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Kategori</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.chip, listingCategory === 'ITEM' && styles.chipOn]}
                onPress={() => setListingCategory('ITEM')}
              >
                <Text style={[styles.chipTxt, listingCategory === 'ITEM' && styles.chipTxtOn]}>Eşya</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, listingCategory === 'ANIMAL' && styles.chipOn]}
                onPress={() => setListingCategory('ANIMAL')}
              >
                <Text style={[styles.chipTxt, listingCategory === 'ANIMAL' && styles.chipTxtOn]}>Hayvan</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Tarih</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={webDateStr}
                onChangeText={setWebDateStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
              />
            ) : (
              <>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                  <Text style={styles.dateBtnTxt}>
                    {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(lostFoundDate)}
                  </Text>
                </TouchableOpacity>
                {showDatePicker ? (
                  <DateTimePicker
                    value={lostFoundDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onNativeDateChange}
                    maximumDate={new Date()}
                  />
                ) : null}
                {Platform.OS === 'ios' && showDatePicker ? (
                  <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.iosOk}>
                    <Text style={styles.iosOkTxt}>Tamam</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}

            <Text style={styles.label}>Enlem / boylam</Text>
            <View style={styles.coordRow}>
              <TextInput
                style={[styles.input, styles.coordInput]}
                value={latStr}
                onChangeText={setLatStr}
                keyboardType="decimal-pad"
                placeholder="Enlem"
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                style={[styles.input, styles.coordInput]}
                value={lngStr}
                onChangeText={setLngStr}
                keyboardType="decimal-pad"
                placeholder="Boylam"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Text style={styles.label}>Yer / adres (isteğe bağlı)</Text>
            <TextInput
              style={styles.input}
              value={locationLabel}
              onChangeText={setLocationLabel}
              placeholder="Örn: Kadıköy"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Başlık</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor="#94a3b8" />

            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={[styles.input, styles.area]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Görsel</Text>
            {previewUri ? (
              <View style={styles.imgCard}>
                <Image source={{ uri: previewUri }} style={styles.preview} contentFit="cover" />
                <TouchableOpacity style={styles.imgBtn} onPress={showImageOptions}>
                  <Text style={styles.imgBtnTxt}>Görseli değiştir</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imgEmpty} onPress={showImageOptions}>
                <Ionicons name="image-outline" size={28} color="#6366f1" />
                <Text style={styles.imgEmptyTxt}>Görsel ekle</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnOff]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Kaydet</Text>}
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  scroll: { padding: 20, paddingBottom: 40, backgroundColor: '#f8fafc' },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipOn: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  chipTxt: { fontWeight: '700', color: '#475569' },
  chipTxtOn: { color: '#4f46e5' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  area: { minHeight: 100 },
  coordRow: { flexDirection: 'row', gap: 10 },
  coordInput: { flex: 1 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  dateBtnTxt: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  iosOk: { alignSelf: 'flex-end', padding: 8 },
  iosOkTxt: { color: '#6366f1', fontWeight: '700', fontSize: 16 },
  imgCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  preview: { width: '100%', height: 180, backgroundColor: '#e2e8f0' },
  imgBtn: { padding: 12, backgroundColor: '#fff', alignItems: 'center' },
  imgBtnTxt: { color: '#6366f1', fontWeight: '700' },
  imgEmpty: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  imgEmptyTxt: { marginTop: 8, color: '#6366f1', fontWeight: '600' },
  saveBtn: {
    marginTop: 24,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.7 },
  saveBtnTxt: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
