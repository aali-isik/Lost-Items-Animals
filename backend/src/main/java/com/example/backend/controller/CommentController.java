package com.example.backend.controller;

import com.example.backend.dto.CommentRequest;
import com.example.backend.dto.CommentResponse;
import com.example.backend.model.User;
import com.example.backend.security.SecurityUtils;
import com.example.backend.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentResponse> createComment(@RequestBody CommentRequest request) {
        User user = SecurityUtils.currentUser();
        CommentResponse response = commentService.createComment(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<CommentResponse>> getCommentsForEvent(@PathVariable Long eventId) {
        List<CommentResponse> comments = commentService.getCommentsForEvent(eventId);
        return ResponseEntity.ok(comments);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        try {
            User user = SecurityUtils.currentUser();
            commentService.deleteComment(id, user);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }
}
