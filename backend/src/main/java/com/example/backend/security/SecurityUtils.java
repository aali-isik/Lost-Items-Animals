package com.example.backend.security;

import com.example.backend.model.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("Not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        throw new IllegalStateException("Unexpected principal type");
    }
}
