# 🛡️ LogSentinal SOC Microservice — API Reference

**Base URL:** `http://localhost:8000`  
**Version:** 2.0

---

## Table of Contents

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | GET | `/health` | Service health check |
| 2 | POST | `/upload` | Upload & analyze a log file |
| 3 | POST | `/scans` | Trigger forensic scan from bucket or base64 |
| 4 | GET | `/scans` | List all scans |
| 5 | GET | `/scans/{scan_id}` | Get a single scan |
| 6 | DELETE | `/scans/{scan_id}` | Delete a scan |
| 7 | GET | `/scans/{scan_id}/categories` | Anomaly categories for a scan |
| 8 | GET | `/scans/{scan_id}/events` | Anomalous events (paginated, filterable) |
| 9 | GET | `/scans/{scan_id}/chains` | Attack chains for a scan |
| 10 | GET | `/scans/{scan_id}/travels` | Impossible travel detections |
| 11 | GET | `/scans/{scan_id}/summary` | AI executive briefing |
| 12 | POST | `/ask` | Ask a security question about a scan |
| 13 | GET | `/dashboard/stats` | Aggregate stats across all scans |
| 14 | POST | `/admin/cleanup` | Wipe all application data |
| 15 | GET | `/system/stats` | One-shot CPU + RAM snapshot |
| 16 | WS | `/ws/system-stats` | Live CPU + RAM stream (WebSocket) |

---

## 1. `GET /health`

Check that the service and database are online.

### Request
No body or params required.

### Response `200 OK`
```json
{
  "status": "online",
  "service": "LogSentinal SOC Microservice",
  "version": "2.0",
  "database": "connected"
}
```
> `database` can be `"connected"` or `"unreachable"`.

---

## 2. `POST /upload`

Upload a `.csv` or `.evtx` log file, run full forensic analysis, persist results to the database, and upload the raw file to storage.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `user_id` | UUID string | ✅ Yes | — | Owner UUID (`logs/{user_id}/...` storage path) |
| `persist_db` | boolean | No | `true` | Set `false` to skip DB writes |

### Request Body (`multipart/form-data`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ Yes | `.csv` or `.evtx` log file |

### Example (curl)
```bash
curl -X POST "http://localhost:8000/upload?user_id=356721c8-1559-4c00-9aec-8be06d861028" \
  -F "file=@/path/to/security_logs.csv"
```

### Response `200 OK`
```json
{
  "message": "Uploaded security_logs.csv and analysis completed",
  "file_type": "CSV",
  "bytes_received": 204800,
  "persist_db": true,
  "processing": "in-memory analysis; CSV copy in Storage when configured",
  "bucket": "log-bucket",
  "bucket_path": "logs/356721c8-1559-4c00-9aec-8be06d861028/abc123_security_logs.csv",
  "storage_ok": true,
  "storage_error": null,
  "analysis": {
    "scan_id": "a1b2c3d4-0000-0000-0000-000000000000",
    "status": "completed",
    "persisted_to_database": true,
    "total_logs": 50000,
    "total_threats": 1234,
    "risk_score": 9800
  }
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| `400` | Missing `user_id`, invalid UUID, unsupported file type, or empty file |

---

## 3. `POST /scans`

Trigger forensic scan from a storage bucket path **or** inline base64 file content.

### Request Body (`application/json`)

**Option A — From Storage Bucket:**
```json
{
  "bucket_path": "logs/356721c8-1559-4c00-9aec-8be06d861028/abc123_security_logs.csv",
  "user_id": "356721c8-1559-4c00-9aec-8be06d861028",
  "background": false,
  "persist_db": true
}
```

**Option B — From Base64 File Content:**
```json
{
  "file_content": "<base64-encoded-file>",
  "filename": "security_logs.csv",
  "user_id": "356721c8-1559-4c00-9aec-8be06d861028",
  "background": false,
  "persist_db": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `bucket_path` | string | ✅ (or `file_content`) | Storage object key |
| `file_content` | string (base64) | ✅ (or `bucket_path`) | Base64-encoded file bytes |
| `filename` | string | ✅ with `file_content` | Original file name |
| `user_id` | UUID string | ✅ Yes | Owner UUID |
| `background` | boolean | No | `false` = sync, `true` = async background task |
| `persist_db` | boolean | No | `true` = save to database |

### Response `200 OK` — Synchronous (background: false)
```json
{
  "status": "completed",
  "analyzing": "security_logs.csv",
  "user_id": "356721c8-1559-4c00-9aec-8be06d861028",
  "persist_db": true,
  "scan_id": "a1b2c3d4-0000-0000-0000-000000000000",
  "total_logs": 50000,
  "total_threats": 1234,
  "risk_score": 9800
}
```

### Response `200 OK` — Async (background: true)
```json
{
  "status": "started",
  "analyzing": "security_logs.csv",
  "user_id": "356721c8-1559-4c00-9aec-8be06d861028",
  "persist_db": true,
  "message": "Pipeline running in background. Poll GET /scans/{scan_id} when persist_db is true."
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| `400` | Missing/invalid `user_id`, missing file data, invalid base64 |
| `404` | `bucket_path` not found in storage |

---

## 4. `GET /scans`

List all scans, newest first (paginated).

### Query Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `limit` | integer | `20` | 1–100 | Max results to return |
| `offset` | integer | `0` | ≥ 0 | Pagination offset |

### Example
```
GET /scans?limit=10&offset=0
```

### Response `200 OK`
```json
{
  "total": 42,
  "limit": 10,
  "offset": 0,
  "scans": [
    {
      "scan_id": "a1b2c3d4-0000-0000-0000-000000000000",
      "generated_at": "2026-03-26T12:00:00",
      "file_name": "security_logs.csv",
      "total_logs": 50000,
      "total_threats": 1234,
      "risk_score": 9800,
      "threat_density": 196.0,
      "normalized_density": 32.67,
      "active_rules": 6,
      "rule_ml_agreement": 88.5,
      "log_platform": "windows"
    }
  ]
}
```

---

## 5. `GET /scans/{scan_id}`

Get full detail for a single scan including categories, counts of chains, travel, and Android logs.

### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `scan_id` | UUID **or** the literal string `"latest"` |

### Response `200 OK`
```json
{
  "scan_id": "a1b2c3d4-0000-0000-0000-000000000000",
  "generated_at": "2026-03-26T12:00:00",
  "file_name": "security_logs.csv",
  "total_logs": 50000,
  "total_threats": 1234,
  "risk_score": 9800,
  "threat_density": 196.0,
  "normalized_density": 32.67,
  "active_rules": 6,
  "rule_ml_agreement": 88.5,
  "log_platform": "windows",
  "terminal_summary": "...full terminal output...",
  "categories": [
    {
      "category_id": "...",
      "category_name": "Ransomware — Encryption",
      "mitre_id": "T1486",
      "tactic": "Impact",
      "risk_score": 10,
      "event_count": 45,
      "ai_summary": "..."
    }
  ],
  "attack_chain_count": 3,
  "impossible_travel_count": 2,
  "android_log_count": 0
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| `400` | Invalid UUID format |
| `404` | Scan not found |

---

## 6. `DELETE /scans/{scan_id}`

Delete a scan and all its cascaded data (categories, events, chains, travels).

### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `scan_id` | UUID of the scan to delete |

### Response `200 OK`
```json
{
  "deleted": "a1b2c3d4-0000-0000-0000-000000000000"
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| `400` | Invalid UUID format |
| `404` | Scan not found |

---

## 7. `GET /scans/{scan_id}/categories`

Get all anomaly categories for a scan, ranked by risk score (highest first).

### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `scan_id` | UUID or `"latest"` |

### Response `200 OK`
```json
{
  "count": 6,
  "categories": [
    {
      "category_id": "...",
      "category_name": "Ransomware — Encryption",
      "mitre_id": "T1486",
      "tactic": "Impact",
      "risk_score": 10,
      "event_count": 45,
      "ai_summary": "AI-generated summary of this attack category..."
    },
    {
      "category_name": "Brute Force",
      "mitre_id": "T1110",
      "tactic": "Credential Access",
      "risk_score": 6,
      "event_count": 320,
      "ai_summary": null
    }
  ]
}
```

---

## 8. `GET /scans/{scan_id}/events`

Get paginated anomalous events for a scan with optional filters.

### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `scan_id` | UUID or `"latest"` |

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | — | Filter by attack category name |
| `computer` | string | — | Filter by computer/host name |
| `user` | string | — | Filter by user account |
| `limit` | integer | `200` | Max results (1–5000) |
| `offset` | integer | `0` | Pagination offset |

### Example
```
GET /scans/latest/events?category=Brute+Force&limit=50&offset=0
```

### Response `200 OK`
```json
{
  "total": 320,
  "limit": 50,
  "offset": 0,
  "events": [
    {
      "event_id": "...",
      "category": "Brute Force",
      "time_logged": "2026-03-26T11:45:00",
      "windows_event_id": 4625,
      "user_account": "CORP\\jdoe",
      "computer": "WORKSTATION-01",
      "task_category": "Logon"
    }
  ]
}
```

---

## 9. `GET /scans/{scan_id}/chains`

Get all multi-stage attack chains detected in a scan.

### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `scan_id` | UUID or `"latest"` |

### Response `200 OK`
```json
{
  "count": 2,
  "chains": [
    {
      "chain_id": "...",
      "computer": "WORKSTATION-01",
      "chain_sequence": "[11:00] Brute Force → [11:05] Privilege Escalation → [11:12] Lateral Movement → [11:45] Ransomware — Encryption"
    }
  ]
}
```

---

## 10. `GET /scans/{scan_id}/travels`

Get all impossible travel detections (same user, different host, within 5 minutes).

### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `scan_id` | UUID or `"latest"` |

### Response `200 OK`
```json
{
  "count": 1,
  "travels": [
    {
      "travel_id": "...",
      "user_account": "CORP\\jdoe",
      "host_a": "WORKSTATION-01",
      "time_a": "2026-03-26T11:00:00",
      "host_b": "SERVER-DC01",
      "time_b": "2026-03-26T11:03:00",
      "gap_minutes": 3.0
    }
  ]
}
```

---

## 11. `GET /scans/{scan_id}/summary`

Get the AI-generated executive briefing for a scan. If one doesn't exist yet, it is generated on the fly.

### Path Parameter

| Parameter | Description |
|-----------|-------------|
| `scan_id` | UUID or `"latest"` |

### Response `200 OK`
```json
{
  "scan_id": "a1b2c3d4-0000-0000-0000-000000000000",
  "generated_at": "2026-03-26T12:00:00",
  "scan_meta": {
    "scan_id": "...",
    "file_name": "security_logs.csv",
    "total_logs": 50000,
    "total_threats": 1234,
    "risk_score": 9800,
    "log_platform": "windows"
  },
  "executive_briefing": "This scan identified 1,234 threats across 6 attack categories..."
}
```

---

## 12. `POST /ask`

Ask a natural language security question about a specific scan. The AI answers based on database data.

### Request Body (`application/json`)

```json
{
  "scan_id": "a1b2c3d4-0000-0000-0000-000000000000",
  "question": "Which computers were most affected by lateral movement?"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scan_id` | UUID string | ✅ Yes | UUID of the scan to query |
| `question` | string | ✅ Yes | Security question to ask |

### Response `200 OK`
```json
{
  "scan_id": "a1b2c3d4-0000-0000-0000-000000000000",
  "question": "Which computers were most affected by lateral movement?",
  "answer": "The top affected hosts were WORKSTATION-01 (34 events) and SERVER-DC01 (12 events)..."
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| `400` | Missing `scan_id` or `question`, invalid UUID format |
| `404` | Scan not found |

---

## 13. `GET /dashboard/stats`

Aggregate statistics across **all** scans in the database.

### Request
No body or params required.

### Response `200 OK` (with data)
```json
{
  "total_scans": 15,
  "total_logs_analyzed": 750000,
  "total_threats_detected": 18500,
  "average_risk_score": 7234.5,
  "highest_risk_score": 42000
}
```

### Response `200 OK` (no data yet)
```json
{
  "total_scans": 0
}
```

---

## 14. `POST /admin/cleanup`

⚠️ **Destructive.** Truncates all application tables (except `users`) and empties the storage bucket. Schema is preserved.

### Request
No body required.

### Response `200 OK`
```json
{
  "status": "success",
  "message": "Application data cleared (users preserved, schema unchanged); bucket empty attempted."
}
```

### Error Responses

| Status | Reason |
|--------|--------|
| `500` | Database or storage cleanup failed |

---

## 15. `GET /system/stats`

One-shot snapshot of current server CPU and RAM usage.

### Request
No body or params required.

### Response `200 OK`
```json
{
  "timestamp": "2026-03-26T13:16:33Z",
  "cpu": {
    "percent": 14.3,
    "cores": 8
  },
  "ram": {
    "total_gb": 16.0,
    "used_gb": 9.4,
    "available_gb": 6.6,
    "percent": 58.7
  }
}
```

---

## 16. `WS /ws/system-stats`

WebSocket endpoint — streams live CPU + RAM data every **2 seconds**.

### Connect
```
ws://localhost:8000/ws/system-stats
```

### Each Message (JSON frame)
```json
{
  "timestamp": "2026-03-26T13:16:33Z",
  "cpu": {
    "percent": 22.1,
    "cores": 8
  },
  "ram": {
    "total_gb": 16.0,
    "used_gb": 10.1,
    "available_gb": 5.9,
    "percent": 63.2
  }
}
```

> The connection streams indefinitely. The server closes the socket on any internal error.

---

## Threat Categories Reference

These are the attack categories the forensic engine can detect:

| Category | MITRE ID | Tactic | Risk Score |
|----------|----------|--------|-----------|
| Ransomware — Encryption | T1486 | Impact | 10 |
| Ransomware — Anti-Recovery | T1490 | Impact | 10 |
| Malware — Mimikatz | T1003 | Credential Access | 10 |
| Log Tampering | T1070 | Defense Evasion | 10 |
| Malware — Suspicious Execution | T1204 | Execution | 9 |
| Privilege Escalation | T1078 | Privilege Escalation | 9 |
| Bluetooth Exfiltration | T1011 | Exfiltration | 9 |
| Service Installation | T1543 | Persistence | 8 |
| Lateral Movement | T1021 | Lateral Movement | 8 |
| Suspicious Process Exec | T1059 | Execution | 7 |
| Suspicious DNS Query | T1071 | Command & Control | 7 |
| Brute Force | T1110 | Credential Access | 6 |
| Network Recon | T1046 | Discovery | 5 |
| Normal | — | — | 0 |

---

## Supported File Types

| Extension | Platform | Detection Notes |
|-----------|----------|----------------|
| `.csv` | Windows / Android | Auto-detected by header columns |
| `.evtx` | Windows Event Log | Parsed via `evtx_parser` |

> Android CSVs are auto-detected when the header contains `score`, `root`, and `ram` columns.
