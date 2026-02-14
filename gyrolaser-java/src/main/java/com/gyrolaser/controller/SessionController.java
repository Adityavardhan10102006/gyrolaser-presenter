package com.gyrolaser.controller;

import com.gyrolaser.service.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for session-related endpoints.
 * Ready to integrate with Node.js backend later (e.g. list/create sessions).
 */
@RestController
@RequestMapping("/sessions")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listSessions() {
        return ResponseEntity.ok(sessionService.listSessions());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createSession() {
        return ResponseEntity.ok(sessionService.createSession());
    }
}
