package com.example.backend.service;

import com.example.backend.dto.CommentRequest;
import com.example.backend.dto.CommentResponse;
import com.example.backend.model.Comment;
import com.example.backend.model.Event;
import com.example.backend.model.User;
import com.example.backend.repository.CommentRepository;
import com.example.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final EventRepository eventRepository;

    public CommentResponse createComment(CommentRequest request, User user) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        Comment comment = Comment.builder()
                .event(event)
                .user(user)
                .content(request.getContent())
                .build();

        Comment savedComment = commentRepository.save(comment);

        return mapToResponse(savedComment);
    }

    public List<CommentResponse> getCommentsForEvent(Long eventId) {
        List<Comment> comments = commentRepository.findByEventIdOrderByCreatedAtDesc(eventId);
        return comments.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteComment(Long commentId, User user) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You do not have permission to delete this comment");
        }

        commentRepository.delete(comment);
    }

    private CommentResponse mapToResponse(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .eventId(comment.getEvent().getId())
                .authorId(comment.getUser().getId())
                .authorName(comment.getUser().getFullName() != null ? comment.getUser().getFullName() : comment.getUser().getUsername())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
