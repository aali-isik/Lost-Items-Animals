import React from 'react';
import { View } from 'react-native';
import { MapContainer, TileLayer, Marker as LeafletMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to handle long press (contextmenu on web)
function MapEvents({ onLongPress }) {
  useMapEvents({
    contextmenu(e) {
      if (onLongPress) {
        onLongPress({
          nativeEvent: {
            coordinate: {
              latitude: e.latlng.lat,
              longitude: e.latlng.lng,
            }
          }
        });
      }
    },
  });
  return null;
}

const CustomMapWeb = ({ initialRegion, onLongPress, children, style }) => {
  if (!initialRegion) return null;
  const position = [initialRegion.latitude, initialRegion.longitude];
  const userLocationIcon = L.divIcon({
    html: `<div style="width:18px; height:18px; border-radius:50%; background:#2563eb; border:3px solid white; box-shadow:0 0 0 8px rgba(37,99,235,0.18), 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: 'user-location-icon',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

  return (
    <View style={style}>
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', position: 'absolute' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LeafletMarker position={position} icon={userLocationIcon} />
        {onLongPress && <MapEvents onLongPress={onLongPress} />}
        {children}
      </MapContainer>
    </View>
  );
};

export const Marker = ({ coordinate, title, description, children, onPress }) => {
  if (!coordinate) return null;
  const position = [coordinate.latitude, coordinate.longitude];

  // Custom HTML Icon for Web Marker to look similar to native
  const iconOptions = {
    icon: L.divIcon({
      html: `<div style="background:#6366f1; width:24px; height:24px; border-radius:50%; border:3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
               <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #6366f1; position: absolute; bottom: -8px;"></div>
             </div>`,
      className: 'custom-leaflet-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 28] // Anchor at the bottom tip
    })
  };

  return (
    <LeafletMarker
      position={position}
      {...iconOptions}
      eventHandlers={onPress ? { click: () => onPress() } : {}}
    >
      {children}
    </LeafletMarker>
  );
};

export default CustomMapWeb;
