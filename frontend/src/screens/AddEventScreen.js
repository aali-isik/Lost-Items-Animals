import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { createEvent } from '../services/api';

export default function AddEventScreen({ route, navigation }) {
  const { coordinate } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation Error', 'Please fill in both title and description.');
      return;
    }

    setLoading(true);
    
    const newEvent = {
      title,
      description,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      eventDate: new Date().toISOString(), // Defaulting to current time for simplicity
    };

    try {
      await createEvent(newEvent);
      Alert.alert('Success', 'Event created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to save the event. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Event Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter event title"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Enter event description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordText}>Selected Location:</Text>
        <Text style={styles.coordValue}>Lat: {coordinate.latitude.toFixed(4)}</Text>
        <Text style={styles.coordValue}>Lng: {coordinate.longitude.toFixed(4)}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Event</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  coordinatesContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  coordText: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  coordValue: {
    fontFamily: 'monospace',
    color: '#555',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
