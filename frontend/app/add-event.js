import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createEventWithImage } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';

const STEPS = [
  { key: 'kind', title: 'İlan türü', subtitle: 'Kayıp mı, buluntu mu?' },
  { key: 'category', title: 'Kategori', subtitle: 'Eşya veya hayvan' },
  { key: 'whenWhere', title: 'Tarih ve konum', subtitle: 'Ne zaman; yer bilgisi (isteğe bağlı)' },
  { key: 'details', title: 'Detaylar', subtitle: 'Başlık, açıklama ve fotoğraf' },
  { key: 'summary', title: 'Özet', subtitle: 'Kontrol edip yayınlayın' },
];

function toNoonUtcIso(date) {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  return d.toISOString();
}

function formatTrDate(d) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(d));
  } catch {
    return String(d);
  }
}

export default function AddEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const coordinate = useMemo(
    () => ({
      latitude: parseFloat(params.lat),
      longitude: parseFloat(params.lng),
    }),
    [params.lat, params.lng]
  );

  const [step, setStep] = useState(0);
  const [listingKind, setListingKind] = useState(null);
  const [listingCategory, setListingCategory] = useState(null);
  const [lostFoundDate, setLostFoundDate] = useState(() => new Date());
  const [webDateStr, setWebDateStr] = useState(() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageAsset, setImageAsset] = useState(null);
  const [loading, setLoading] = useState(false);

  const coordsOk = Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude);

  const effectiveDate = useMemo(() => {
    if (Platform.OS === 'web') {
      const [y, m, d] = webDateStr.split('-').map((x) => parseInt(x, 10));
      if (!y || !m || !d) return new Date();
      return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    }
    return lostFoundDate;
  }, [lostFoundDate, webDateStr]);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeriden fotoğraf seçmek için erişim izni verin.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageAsset(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Fotoğraf çekmek için kamera izni verin.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageAsset(result.assets[0]);
    }
  };

  const showImageOptions = () => {
    Alert.alert('İlan görseli', 'Nasıl eklemek istersiniz?', [
      { text: 'Galeri', onPress: pickFromLibrary },
      { text: 'Kamera', onPress: takePhoto },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const canGoNext = () => {
    switch (step) {
      case 0:
        return listingKind != null;
      case 1:
        return listingCategory != null;
      case 2:
        if (!coordsOk) return false;
        if (Platform.OS === 'web') {
          return /^\d{4}-\d{2}-\d{2}$/.test(webDateStr.trim());
        }
        return true;
      case 3:
        return title.trim().length > 0 && description.trim().length > 0;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!canGoNext()) {
      if (step === 2 && !coordsOk) {
        Alert.alert('Konum', 'Haritada uzun basarak konum seçin.');
        return;
      }
      Alert.alert('Eksik bilgi', 'Bu adımı tamamlamadan devam edemezsiniz.');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const onNativeDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && date) {
      setLostFoundDate(date);
    }
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handlePublish = async () => {
    if (!listingKind || !listingCategory || !coordsOk) {
      Alert.alert('Hata', 'Eksik bilgi var.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      Alert.alert('Eksik bilgi', 'Başlık ve açıklama zorunludur.');
      return;
    }

    setLoading(true);
    try {
      await createEventWithImage({
        title: title.trim(),
        description: description.trim(),
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        eventDate: toNoonUtcIso(effectiveDate),
        listingKind,
        listingCategory,
        locationLabel: locationLabel.trim() || undefined,
        imageAsset,
      });
      Alert.alert('Başarılı', 'İlanınız kaydedildi.', [{ text: 'Tamam', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Error creating listing:', error);
      Alert.alert('Hata', 'Kayıt başarısız. Sunucunun çalıştığından emin olun.');
    } finally {
      setLoading(false);
    }
  };

  const kindLabel = listingKind === 'FOUND' ? 'Buluntu bildirimi' : listingKind === 'LOST' ? 'Kayıp ilanı' : '—';
  const catLabel =
    listingCategory === 'ANIMAL' ? 'Hayvan' : listingCategory === 'ITEM' ? 'Eşya' : '—';

  const renderStepBody = () => {
    const meta = STEPS[step];

    if (step === 0) {
      return (
        <View>
          <Text style={styles.stepMeta}>{meta.subtitle}</Text>
          <TouchableOpacity
            style={[styles.choiceCard, listingKind === 'LOST' && styles.choiceCardActive]}
            onPress={() => setListingKind('LOST')}
            activeOpacity={0.85}
          >
            <Ionicons name="sad-outline" size={28} color={listingKind === 'LOST' ? '#6366f1' : '#64748b'} />
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceTitle}>Kayıp ilanı</Text>
              <Text style={styles.choiceHint}>Kayıp eşya veya hayvan için ilan oluşturun.</Text>
            </View>
            {listingKind === 'LOST' ? <Ionicons name="checkmark-circle" size={24} color="#6366f1" /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceCard, listingKind === 'FOUND' && styles.choiceCardActive]}
            onPress={() => setListingKind('FOUND')}
            activeOpacity={0.85}
          >
            <Ionicons name="happy-outline" size={28} color={listingKind === 'FOUND' ? '#6366f1' : '#64748b'} />
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceTitle}>Buluntu bildirimi</Text>
              <Text style={styles.choiceHint}>Bulunan eşya veya hayvanı bildirin.</Text>
            </View>
            {listingKind === 'FOUND' ? <Ionicons name="checkmark-circle" size={24} color="#6366f1" /> : null}
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View>
          <Text style={styles.stepMeta}>{meta.subtitle}</Text>
          <TouchableOpacity
            style={[styles.choiceCard, listingCategory === 'ITEM' && styles.choiceCardActive]}
            onPress={() => setListingCategory('ITEM')}
            activeOpacity={0.85}
          >
            <Ionicons name="bag-handle-outline" size={28} color={listingCategory === 'ITEM' ? '#6366f1' : '#64748b'} />
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceTitle}>Eşya</Text>
              <Text style={styles.choiceHint}>Cüzdan, telefon, anahtar vb.</Text>
            </View>
            {listingCategory === 'ITEM' ? <Ionicons name="checkmark-circle" size={24} color="#6366f1" /> : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceCard, listingCategory === 'ANIMAL' && styles.choiceCardActive]}
            onPress={() => setListingCategory('ANIMAL')}
            activeOpacity={0.85}
          >
            <Ionicons name="paw-outline" size={28} color={listingCategory === 'ANIMAL' ? '#6366f1' : '#64748b'} />
            <View style={styles.choiceTextWrap}>
              <Text style={styles.choiceTitle}>Hayvan</Text>
              <Text style={styles.choiceHint}>Evcil hayvan veya diğer hayvanlar.</Text>
            </View>
            {listingCategory === 'ANIMAL' ? <Ionicons name="checkmark-circle" size={24} color="#6366f1" /> : null}
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View>
          <Text style={styles.stepMeta}>{meta.subtitle}</Text>
          <Text style={styles.fieldLabel}>Kayıp / buluntu tarihi</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={styles.input}
              value={webDateStr}
              onChangeText={setWebDateStr}
              placeholder="Örn: 2026-05-13 (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          ) : (
            <>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
                <Ionicons name="calendar-outline" size={22} color="#6366f1" />
                <Text style={styles.dateButtonText}>{formatTrDate(lostFoundDate)}</Text>
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
                <TouchableOpacity style={styles.iosDateDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.iosDateDoneText}>Tamam</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Harita konumu</Text>
          <View style={styles.locationCard}>
            <View style={styles.locationIconContainer}>
              <Ionicons name="map" size={22} color="#6366f1" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>Seçilen koordinat</Text>
              <Text style={styles.locationCoords}>
                {coordsOk
                  ? `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`
                  : 'Geçersiz — haritadan tekrar seçin'}
              </Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Yer / adres (isteğe bağlı)</Text>
          <TextInput
            style={styles.input}
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Örn: Kadıköy sahil, AVM önü"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.hintSmall}>İlanları konum metnine göre aramak için kullanılır.</Text>
        </View>
      );
    }

    if (step === 3) {
      return (
        <View>
          <Text style={styles.stepMeta}>{meta.subtitle}</Text>
          <Text style={styles.fieldLabel}>Başlık</Text>
          <TextInput
            style={styles.input}
            placeholder="Kısa ve net bir başlık"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.fieldLabel}>Açıklama</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Renk, işaret, son görülme vb."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Text style={styles.fieldLabel}>Fotoğraf (isteğe bağlı)</Text>
          {imageAsset?.uri ? (
            <View style={styles.photoPickerCard}>
              <Image source={{ uri: imageAsset.uri }} style={styles.photoPreview} contentFit="cover" />
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoActionBtn} onPress={showImageOptions}>
                  <Ionicons name="image-outline" size={18} color="#6366f1" />
                  <Text style={styles.photoActionText}>Değiştir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoActionBtn, styles.photoRemoveBtn]}
                  onPress={() => setImageAsset(null)}
                >
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  <Text style={[styles.photoActionText, styles.photoRemoveText]}>Kaldır</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoPickerCard} onPress={showImageOptions} activeOpacity={0.85}>
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconWrap}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#6366f1" />
                </View>
                <Text style={styles.photoPlaceholderTitle}>Fotoğraf ekle</Text>
                <Text style={styles.photoPlaceholderHint}>Galeri veya kamera</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.stepMeta}>Aşağıdaki bilgileri kontrol edin.</Text>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Tür: </Text>
            {kindLabel}
          </Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Kategori: </Text>
            {catLabel}
          </Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Tarih: </Text>
            {formatTrDate(effectiveDate)}
          </Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Konum: </Text>
            {coordsOk ? `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}` : '—'}
          </Text>
          {locationLabel.trim() ? (
            <Text style={styles.summaryLine}>
              <Text style={styles.summaryKey}>Yer: </Text>
              {locationLabel.trim()}
            </Text>
          ) : null}
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Başlık: </Text>
            {title.trim() || '—'}
          </Text>
          <Text style={styles.summaryMultiline}>{description.trim() || '—'}</Text>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryKey}>Fotoğraf: </Text>
            {imageAsset?.uri ? 'Eklendi' : 'Yok'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
          <Text style={styles.backBtnText}>{step === 0 ? 'Haritaya dön' : 'Geri'}</Text>
        </TouchableOpacity>
        <Text style={styles.stepBadge}>
          Adım {step + 1} / {STEPS.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerTitle}>{STEPS[step].title}</Text>
        <View style={styles.progressRow}>
          {STEPS.map((_, i) => (
            <View key={_.key} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        <View style={styles.formContainer}>{renderStepBody()}</View>

        {step < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.button, !canGoNext() && styles.buttonDisabled]}
            onPress={goNext}
            disabled={!canGoNext()}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>İleri</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePublish}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>İlanı yayınla</Text>
                <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 8,
    backgroundColor: '#f8fafc',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '600',
  },
  stepBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
  },
  progressDotActive: {
    backgroundColor: '#6366f1',
  },
  formContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  stepMeta: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 16,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
    gap: 12,
  },
  choiceCardActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  choiceTextWrap: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  choiceHint: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 120,
  },
  hintSmall: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  iosDateDone: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iosDateDoneText: {
    color: '#6366f1',
    fontWeight: '700',
    fontSize: 16,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 16,
  },
  locationIconContainer: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  photoPickerCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  photoPlaceholder: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  photoIconWrap: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  photoPlaceholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  photoPlaceholderHint: {
    fontSize: 13,
    color: '#64748b',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#e2e8f0',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
  },
  photoRemoveBtn: {
    backgroundColor: '#fef2f2',
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  photoRemoveText: {
    color: '#dc2626',
  },
  summaryBlock: {
    gap: 8,
  },
  summaryLine: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 4,
  },
  summaryKey: {
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryMultiline: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginTop: 4,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
