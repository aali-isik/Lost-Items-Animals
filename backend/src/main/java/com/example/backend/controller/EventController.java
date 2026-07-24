package com.example.backend.controller;

import com.example.backend.model.Event;
import com.example.backend.model.ListingCategory;
import com.example.backend.model.ListingKind;
import com.example.backend.model.User;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.EventService;
import com.example.backend.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EventController {

    private final EventService eventService;
    private final FileStorageService fileStorageService;

    private boolean currentUserOwns(Event event) {
        Long ownerId = event.getOwnerId();
        if (ownerId == null) {
            return false;
        }
        User user = SecurityUtils.currentUser();
        return ownerId.equals(user.getId());
    }

    @GetMapping
    public ResponseEntity<List<Event>> getAllEvents(
            @RequestParam(required = false) ListingKind listingKind,
            @RequestParam(required = false) ListingCategory listingCategory,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @RequestParam(required = false) String locationContains
    ) {
        boolean anyFilter = listingKind != null || listingCategory != null
                || fromDate != null || toDate != null || StringUtils.hasText(locationContains);
        if (!anyFilter) {
            return ResponseEntity.ok(eventService.getAllEvents());
        }
        return ResponseEntity.ok(eventService.findEventsFiltered(
                listingKind, listingCategory, fromDate, toDate, locationContains));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getEventById(@PathVariable Long id) {
        return eventService.getEventById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Event> createEvent(@RequestBody Event event) {
        User user = SecurityUtils.currentUser();
        event.setOwnerId(user.getId());
        Event createdEvent = eventService.createEvent(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdEvent);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Event> createEventMultipart(
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam String eventDate,
            @RequestParam ListingKind listingKind,
            @RequestParam ListingCategory listingCategory,
            @RequestParam(required = false) String locationLabel,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        try {
            String imageUrl = fileStorageService.storeEventImage(image);
            LocalDateTime parsedDate = Instant.parse(eventDate).atZone(ZoneOffset.UTC).toLocalDateTime();
            String label = StringUtils.hasText(locationLabel) ? locationLabel.trim() : null;
            User user = SecurityUtils.currentUser();
            Event event = Event.builder()
                    .title(title)
                    .description(description)
                    .latitude(latitude)
                    .longitude(longitude)
                    .eventDate(parsedDate)
                    .listingKind(listingKind)
                    .listingCategory(listingCategory)
                    .locationLabel(label)
                    .imageUrl(imageUrl)
                    .ownerId(user.getId())
                    .build();
            Event createdEvent = eventService.createEvent(event);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdEvent);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Event> updateEventJson(@PathVariable Long id, @RequestBody Event event) {
        var existingOpt = eventService.getEventById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!currentUserOwns(existingOpt.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            return ResponseEntity.ok(eventService.updateEvent(id, event));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Event> updateEventMultipart(
            @PathVariable Long id,
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam String eventDate,
            @RequestParam ListingKind listingKind,
            @RequestParam ListingCategory listingCategory,
            @RequestParam(required = false) String locationLabel,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        var existingOpt = eventService.getEventById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!currentUserOwns(existingOpt.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            LocalDateTime parsedDate = Instant.parse(eventDate).atZone(ZoneOffset.UTC).toLocalDateTime();
            Event updated = eventService.updateEventMultipart(
                    id, title, description, latitude, longitude, parsedDate,
                    listingKind, listingCategory, locationLabel, image);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        var existingOpt = eventService.getEventById(id);
        if (existingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!currentUserOwns(existingOpt.get())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        try {
            eventService.deleteEvent(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
