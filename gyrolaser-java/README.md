# GyroLaser Java (Optional)

Optional Spring Boot microservice skeleton for GyroLaser. Provides REST endpoints for sessions; can be integrated with the Node.js backend later.

## Endpoints

- `GET /sessions` — list sessions (in-memory)
- `POST /sessions` — create a session (returns `roomId`)

## Run

```bash
./mvnw spring-boot:run
```

Runs on port 8080 by default.

## Integration

Point the Node.js app at this service later if you want to create or list sessions via REST instead of (or in addition to) Socket.io.
