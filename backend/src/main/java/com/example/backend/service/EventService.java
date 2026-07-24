package com.example.backend.service;

import com.example.backend.model.Event;
import com.example.backend.model.ListingCategory;
import com.example.backend.model.ListingKind;
import com.example.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final FileStorageService fileStorageService;

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public List<Event> findEventsFiltered(
            ListingKind listingKind,
            ListingCategory listingCategory,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            String locationContains
    ) {
        String loc = StringUtils.hasText(locationContains) ? locationContains.trim().toLowerCase() : null;
        return eventRepository.findAll().stream()
                .filter(e -> listingKind == null || listingKind.equals(
                        e.getListingKind() != null ? e.getListingKind() : ListingKind.LOST))
                .filter(e -> listingCategory == null || listingCategory.equals(
                        e.getListingCategory() != null ? e.getListingCategory() : ListingCategory.ITEM))
                .filter(e -> fromDate == null || !e.getEventDate().isBefore(fromDate))
                .filter(e -> toDate == null || !e.getEventDate().isAfter(toDate))
                .filter(e -> loc == null
                        || (e.getLocationLabel() != null && e.getLocationLabel().toLowerCase().contains(loc)))
                .sorted(Comparator.comparing(Event::getEventDate, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();
    }

    public Optional<Event> getEventById(Long id) {
        return eventRepository.findById(id);
    }

    public Event createEvent(Event event) {
        return eventRepository.save(event);
    }

    public Event updateEvent(Long id, Event eventDetails) {
        return eventRepository.findById(id).map(existingEvent -> {
            existingEvent.setTitle(eventDetails.getTitle());
            existingEvent.setDescription(eventDetails.getDescription());
            existingEvent.setLatitude(eventDetails.getLatitude());
            existingEvent.setLongitude(eventDetails.getLongitude());
            existingEvent.setEventDate(eventDetails.getEventDate());
            if (eventDetails.getImageUrl() != null) {
                existingEvent.setImageUrl(eventDetails.getImageUrl());
            }
            if (eventDetails.getListingKind() != null) {
                existingEvent.setListingKind(eventDetails.getListingKind());
            }
            if (eventDetails.getListingCategory() != null) {
                existingEvent.setListingCategory(eventDetails.getListingCategory());
            }
            existingEvent.setLocationLabel(
                    eventDetails.getLocationLabel() != null && !eventDetails.getLocationLabel().isBlank()
                            ? eventDetails.getLocationLabel().trim()
                            : null);
            return eventRepository.save(existingEvent);
        }).orElseThrow(() -> new RuntimeException("Event not found with id: " + id));
    }

    public Event updateEventMultipart(
            Long id,
            String title,
            String description,
            Double latitude,
            Double longitude,
            LocalDateTime eventDate,
            ListingKind listingKind,
            ListingCategory listingCategory,
            String locationLabel,
            MultipartFile image
    ) throws IOException {
        Event existing = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + id));
        existing.setTitle(title);
        existing.setDescription(description);
        existing.setLatitude(latitude);
        existing.setLongitude(longitude);
        existing.setEventDate(eventDate);
        existing.setListingKind(listingKind);
        existing.setListingCategory(listingCategory);
        existing.setLocationLabel(StringUtils.hasText(locationLabel) ? locationLabel.trim() : null);
        if (image != null && !image.isEmpty()) {
            existing.setImageUrl(fileStorageService.storeEventImage(image));
        }
        return eventRepository.save(existing);
    }

    public void deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new RuntimeException("Event not found with id: " + id);
        }
        eventRepository.deleteById(id);
    }
}
