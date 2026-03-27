// Updated to use LogSentinal SOC Microservice — API v2.0
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const DEFAULT_USER_ID = "356721c8-1559-4c00-9aec-8be06d861028"

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail || "Request failed")
  }

  return res.json()
}

/**
 * POST /upload
 * Uploads a .csv or .evtx log file and runs forensic analysis.
 */
export async function uploadFile(file: File, userId: string = DEFAULT_USER_ID) {
  const formData = new FormData()
  formData.append("file", file)

  // According to specification: POST /upload?user_id={userId}&persist_db=true
  const res = await fetch(`${API_URL}/upload?user_id=${userId}&persist_db=true`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Upload failed" }))
    throw new Error(error.detail || "Upload failed")
  }

  return res.json()
}

/**
 * POST /scans
 * Trigger forensic scan from a storage bucket path or inline base64 file content.
 */
export async function triggerScan(payload: {
  bucket_path?: string
  file_content?: string
  filename?: string
  user_id?: string
  background?: boolean
  persist_db?: boolean
}) {
  const res = await fetch(`${API_URL}/scans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: DEFAULT_USER_ID,
      persist_db: true,
      background: false,
      ...payload,
    }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Scan trigger failed" }))
    throw new Error(error.detail || "Scan trigger failed")
  }

  return res.json()
}

/**
 * GET /scans
 * List all scans, newest first.
 */
export async function listScans(limit: number = 20, offset: number = 0) {
  const res = await fetch(`${API_URL}/scans?limit=${limit}&offset=${offset}`)

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to list scans" }))
    throw new Error(error.detail || "Failed to list scans")
  }

  return res.json()
}

/**
 * GET /scans/{scan_id}
 */
export async function getScan(scanId: string) {
  return apiFetch(`/scans/${scanId}`)
}

/**
 * GET /scans/{scan_id}/categories
 */
export async function getScanCategories(scanId: string) {
  return apiFetch(`/scans/${scanId}/categories`)
}

/**
 * GET /scans/{scan_id}/events
 */
export async function getScanEvents(scanId: string, params: {
  category?: string
  computer?: string
  user?: string
  limit?: number
  offset?: number
} = {}) {
  const queryParams = new URLSearchParams()
  if (params.category) queryParams.append("category", params.category)
  if (params.computer) queryParams.append("computer", params.computer)
  if (params.user) queryParams.append("user", params.user)
  if (params.limit) queryParams.append("limit", params.limit.toString())
  if (params.offset) queryParams.append("offset", params.offset.toString())
  
  const queryString = queryParams.toString()
  return apiFetch(`/scans/${scanId}/events${queryString ? `?${queryString}` : ""}`)
}

/**
 * GET /scans/{scan_id}/chains
 */
export async function getScanChains(scanId: string) {
  return apiFetch(`/scans/${scanId}/chains`)
}

/**
 * GET /scans/{scan_id}/travels
 */
export async function getScanTravels(scanId: string) {
  return apiFetch(`/scans/${scanId}/travels`)
}

/**
 * GET /scans/{scan_id}/summary
 */
export async function getScanSummary(scanId: string) {
  return apiFetch(`/scans/${scanId}/summary`)
}

/**
 * WS /ws/system-stats
 * Streams live CPU + RAM data.
 */
export function connectSystemStatsWebSocket(onMessage: (data: any) => void) {
  const wsUrl = API_URL.replace("http", "ws")
  const ws = new WebSocket(`${wsUrl}/ws/system-stats`)

  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data))
  }

  ws.onerror = () => {
    console.error("System Stats WebSocket error")
  }

  return ws
}

// Keeping a compatible version of connectWebSocket for existing references
export function connectWebSocket(analysisId: string, onMessage: (data: any) => void) {
  // Map old websocket path to current specification if needed, 
  // though the new spec uses different paths for live stats.
  const wsUrl = API_URL.replace("http", "ws")
  const ws = new WebSocket(`${wsUrl}/api/v1/ws/analyses/${analysisId}`)

  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data))
  }

  return ws
}
