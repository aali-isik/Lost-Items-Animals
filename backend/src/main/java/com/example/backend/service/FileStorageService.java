package com.example.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "gif", "webp");

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    public String storeEventImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        if (ext == null) {
            ext = "jpg";
        }
        ext = ext.toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXT.contains(ext)) {
            ext = "jpg";
        }
        Path dir = Paths.get(uploadDir).resolve("events").toAbsolutePath().normalize();
        Files.createDirectories(dir);
        String name = UUID.randomUUID() + "." + ext;
        Path target = dir.resolve(name);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return "/api/uploads/events/" + name;
    }
}
