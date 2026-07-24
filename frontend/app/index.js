import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ActivityIndicator, Dimensions, ScrollView, TextInput } from 'react-native';
import MapView, { Marker } from '../components/CustomMap';
import * as Location from 'expo-location';
import { useRouter, useFocusEffect } from 'expo-router';
import { getEvents } from '../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/context/AuthContext';

function buildListingFilters(f) {
  const out = {};
  if (f.kind) out.listingKind = f.kind;
  if (f.category) out.listingCategory = f.category;
  if (f.datePreset === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    out.fromDate = d.toISOString();
  } else if (f.datePreset === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    d.setHours(0, 0, 0, 0);
    out.fromDate = d.toISOString();
  }
  if (f.locationContains?.trim()) out.locationContains = f.locationContains.trim();
  return out;
}

function markerListingTitle(event) {
  const k = event.listingKind === 'FOUND' ? 'Buluntu' : 'Kayıp';
  const c = event.listingCategory === 'ANIMAL' ? 'Hayvan' : 'Eşya';
  return `${k} · ${c}`;
}

const { width } = Dimensions.get('window');
// A sleek silver/light modern map style
const customMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

export default function MapScreen() {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const [location, setLocation] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listFilters, setListFilters] = useState({
    kind: null,
    category: null,
    datePreset: 'all',
    locationContains: '',
  });
  const [locationDraft, setLocationDraft] = useState('');

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents(buildListingFilters(listFilters));
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        await logout();
        Alert.alert('Oturum yenilenmeli', 'Lutfen tekrar giris yapin.');
        return;
      }
      Alert.alert('Hata', 'Ilanlar sunucudan alinamadi.');
    }
  }, [listFilters, logout]);

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Permission to access location was denied');
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.0522,
        longitudeDelta: 0.0221,
      });
      setLoading(false);
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchEvents();
      }
    }, [token, fetchEvents])
  );

  useEffect(() => {
    if (!token) return;
    fetchEvents();
  }, [listFilters, token, fetchEvents]);

  const applyLocationSearch = () => {
    setListFilters((prev) => ({ ...prev, locationContains: locationDraft }));
  };

  const toggleKind = (kind) => {
    setListFilters((p) => ({ ...p, kind: p.kind === kind ? null : kind }));
  };

  const toggleCategory = (category) => {
    setListFilters((p) => ({ ...p, category: p.category === category ? null : category }));
  };

  const setDatePreset = (preset) => {
    setListFilters((p) => ({ ...p, datePreset: preset }));
  };

  const handleMapLongPress = (e) => {
    const coordinate = e.nativeEvent.coordinate;
    router.push({
      pathname: '/add-event',
      params: { lat: coordinate.latitude, lng: coordinate.longitude }
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Locating you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={location}
          showsUserLocation={true}
          showsMyLocationButton={true}
          customMapStyle={customMapStyle}
          onLongPress={handleMapLongPress}
        >
          {events.map((event) => {
            const found = event.listingKind === 'FOUND';
            const pinColor = found ? '#059669' : '#6366f1';
            const desc = [event.title, event.locationLabel].filter(Boolean).join(' · ');
            return (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
              title={markerListingTitle(event)}
              description={desc || event.description}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <View style={styles.customMarker}>
                <View style={[styles.markerInner, { backgroundColor: pinColor }]}>
                  <Ionicons name="location-sharp" size={24} color="#ffffff" />
                </View>
                <View style={[styles.markerTriangle, { borderTopColor: pinColor }]} />
              </View>
            </Marker>
          );})}
        </MapView>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <Text style={styles.errorText}>Location not available.</Text>
        </View>
      )}

      <View style={styles.filterContainer}>
        <Text style={styles.filterHeading}>Filtrele</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, listFilters.kind === 'LOST' && styles.chipActive]}
            onPress={() => toggleKind('LOST')}
          >
            <Text style={[styles.chipText, listFilters.kind === 'LOST' && styles.chipTextActive]}>Kayıp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, listFilters.kind === 'FOUND' && styles.chipActive]}
            onPress={() => toggleKind('FOUND')}
          >
            <Text style={[styles.chipText, listFilters.kind === 'FOUND' && styles.chipTextActive]}>Buluntu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, listFilters.category === 'ITEM' && styles.chipActive]}
            onPress={() => toggleCategory('ITEM')}
          >
            <Text style={[styles.chipText, listFilters.category === 'ITEM' && styles.chipTextActive]}>Eşya</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, listFilters.category === 'ANIMAL' && styles.chipActive]}
            onPress={() => toggleCategory('ANIMAL')}
          >
            <Text style={[styles.chipText, listFilters.category === 'ANIMAL' && styles.chipTextActive]}>Hayvan</Text>
          </TouchableOpacity>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, listFilters.datePreset === 'all' && styles.chipActive]}
            onPress={() => setDatePreset('all')}
          >
            <Text style={[styles.chipText, listFilters.datePreset === 'all' && styles.chipTextActive]}>Tüm tarihler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, listFilters.datePreset === '7d' && styles.chipActive]}
            onPress={() => setDatePreset('7d')}
          >
            <Text style={[styles.chipText, listFilters.datePreset === '7d' && styles.chipTextActive]}>Son 7 gün</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, listFilters.datePreset === '30d' && styles.chipActive]}
            onPress={() => setDatePreset('30d')}
          >
            <Text style={[styles.chipText, listFilters.datePreset === '30d' && styles.chipTextActive]}>Son 30 gün</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.locationFilterRow}>
          <TextInput
            style={styles.locationInput}
            placeholder="Konum / yer ara..."
            placeholderTextColor="#94a3b8"
            value={locationDraft}
            onChangeText={setLocationDraft}
            onSubmitEditing={applyLocationSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.locationSearchBtn} onPress={applyLocationSearch}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Modern Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>İlanlar</Text>
          {user?.fullName ? (
            <Text style={styles.headerGreeting}>Merhaba, {user.fullName} 👋</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color="#6366f1" />
        </TouchableOpacity>
      </View>
      
      {/* Sleek Floating Instruction Card */}
      <View style={styles.instructionContainer}>
        <Ionicons name="finger-print-outline" size={28} color="#6366f1" style={styles.iconStyle} />
        <View style={styles.instructionTextContainer}>
          <Text style={styles.instructionTitle}>Yeni ilan</Text>
          <Text style={styles.instructionText}>
            Yeni ilan: haritada uzun basın. Detay: pine dokunun.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
  filterContainer: {
    position: 'absolute',
    top: 118,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1,
  },
  filterHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#4f46e5',
  },
  locationFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  locationInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  locationSearchBtn: {
    backgroundColor: '#6366f1',
    padding: 10,
    borderRadius: 12,
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  headerGreeting: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  logoutButton: {
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 10,
    marginLeft: 12,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: width * 0.85,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconStyle: {
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 14,
    marginRight: 16,
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  instructionText: {
    color: '#64748b',
    fontSize: 13,
  },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    backgroundColor: '#6366f1',
    padding: 6,
    borderRadius: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 2,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#6366f1',
    marginTop: -2,
    zIndex: 1,
  }
});
