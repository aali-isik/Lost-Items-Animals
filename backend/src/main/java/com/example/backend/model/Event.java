package com.example.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "event_date", nullable = false)
    private LocalDateTime eventDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_kind", length = 20)
    private ListingKind listingKind;

    @Enumerated(EnumType.STRING)
    @Column(name = "listing_category", length = 20)
    private ListingCategory listingCategory;

    /** Kullanıcının girdiği yer / adres ipucu (konum bazlı arama için). */
    @Column(name = "location_label", length = 300)
    private String locationLabel;

    /** Public URL path served under /api/uploads/events/ (optional). */
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /** İlanı oluşturan kullanıcı (düzenleme / silme için). */
    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.listingKind == null) {
            this.listingKind = ListingKind.LOST;
        }
        if (this.listingCategory == null) {
            this.listingCategory = ListingCategory.ITEM;
        }
    }
}
