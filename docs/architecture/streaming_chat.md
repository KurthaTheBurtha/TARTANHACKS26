# Streaming Chat Architecture

## Overview

The streaming chat endpoint enables real-time, token-by-token (or chunk-by-chunk) responses using Server-Sent Events (SSE). This provides a better user experience with immediate feedback and progressive rendering.

## Endpoint

### `POST /v1/chat/sessions/{session_id}/messages/stream`

**Request Body:**
```json
{
  "text": "Why do I owe this much?",
  "policy_doc_id": "policy_001"  // optional
}
```

**Response:** `text/event-stream` with SSE events

## Event Types

### 1. Meta Event (once, first)

Sent immediately after retrieving policy chunks, before streaming text.

```json
{
  "session_id": "chat_abc",
  "message_id": "msg_010",
  "citations": [
    {
      "doc_id": "policy_001",
      "chunk_id": "chunk_12",
      "label": "Summary of Benefits — Deductible"
    }
  ]
}
```

**SSE Format:**
```
event: meta
data: {"session_id":"chat_abc","message_id":"msg_010","citations":[...]}

```

### 2. Delta Events (many)

Incremental text chunks as they're generated.

```json
{
  "text": "Based on your plan, "
}
```

**SSE Format:**
```
event: delta
data: {"text":"Based on your plan, "}

```

### 3. Final Event (once, last)

Complete response with all metadata.

```json
{
  "text": "Based on your plan, in-network office visits apply to the deductible first. If your deductible isn't met, you may owe the allowed amount.",
  "confidence": 0.74,
  "citations": [...],
  "disclaimer": "I'm not a lawyer or your insurer; verify with your plan documents or insurer."
}
```

**SSE Format:**
```
event: final
data: {"text":"...","confidence":0.74,"citations":[...],"disclaimer":"..."}

```

### 4. Error Event (optional)

Sent if an error occurs during streaming.

```json
{
  "error": "Streaming failed"
}
```

**SSE Format:**
```
event: error
data: {"error":"Streaming failed"}

```

## Streaming Modes

### LLM Streaming (OpenAI configured)

- Uses OpenAI's streaming API (`stream=True`)
- Yields tokens as they're generated
- Provides real-time response generation
- Falls back to stub mode if streaming fails

### Stub Streaming (OpenAI not configured)

- Breaks deterministic response into 5-10 chunks
- Uses word-based chunking (~15 words per chunk)
- Provides consistent streaming experience
- Final event matches non-stream contract exactly

## Message Persistence

1. **User Message:** Persisted immediately when stream starts
2. **Assistant Message:** Persisted after final event with:
   - Full text
   - Citations
   - Confidence
   - Disclaimer

## Headers

Response includes:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no` (prevents proxy buffering)

## Mobile Integration

### EventSource API (JavaScript)

```javascript
const eventSource = new EventSource(
  `/v1/chat/sessions/${sessionId}/messages/stream`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

eventSource.addEventListener('meta', (e) => {
  const data = JSON.parse(e.data);
  // Display citations immediately
  displayCitations(data.citations);
});

eventSource.addEventListener('delta', (e) => {
  const data = JSON.parse(e.data);
  // Append text incrementally
  appendText(data.text);
});

eventSource.addEventListener('final', (e) => {
  const data = JSON.parse(e.data);
  // Finalize response
  finalizeResponse(data);
  eventSource.close();
});

eventSource.addEventListener('error', (e) => {
  const data = JSON.parse(e.data);
  // Handle error
  showError(data.error);
  eventSource.close();
});
```

### React Native

Use `react-native-sse` or similar library:

```typescript
import { useSSE } from 'react-native-sse';

const { data, error } = useSSE(
  `/v1/chat/sessions/${sessionId}/messages/stream`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

// Parse events from data stream
```

## Error Handling

- Network errors: Client should reconnect or show error
- Stream errors: Server sends `error` event before closing
- Timeout: Client should handle gracefully (no final event received)

## Performance Considerations

- **Latency:** Meta event sent immediately (citations visible early)
- **Throughput:** Delta events sent as soon as tokens available
- **Bandwidth:** Small chunks reduce perceived latency
- **Buffering:** `X-Accel-Buffering: no` prevents proxy buffering

## Contract Guarantees

- Final event JSON matches non-stream endpoint response shape
- Citations in meta event match citations in final event
- Confidence score is between 0.0 and 1.0
- All required fields present in final event

## Testing

Contract tests validate:
- Response is `text/event-stream`
- Meta event contains required fields
- Final event matches contract shape
- At least one delta or final event present
