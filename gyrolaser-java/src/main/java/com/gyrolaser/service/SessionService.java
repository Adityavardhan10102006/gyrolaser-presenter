package com.gyrolaser.service;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Basic session service. In-memory for MVP; replace with DB when integrating.
 */
@Service
public class SessionService {

    private final List<Map<String, Object>> sessions = new ArrayList<>();

    public List<Map<String, Object>> listSessions() {
        return new ArrayList<>(sessions);
    }

    public Map<String, Object> createSession() {
        String roomId = generateRoomId();
        Map<String, Object> session = new HashMap<>();
        session.put("roomId", roomId);
        session.put("createdAt", System.currentTimeMillis());
        sessions.add(session);
        return session;
    }

    private static String generateRoomId() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random r = new Random();
        StringBuilder sb = new StringBuilder(6);
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(r.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
