const API_URL = "/api/proxy"
const DEFAULT_USER_ID = "356721c8-1559-4c00-9aec-8be06d861028"

export async function apiFetch(path: string, options?: RequestInit) {
  const method = options?.method || "GET"
  
  try {
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
  } catch (err: any) {
    console.error(`[API Error] ${method} ${path}:`, err.message)
    throw err
  }
}

/**
 * POST /upload
 */
export async function uploadFile(file: File, userId: string = DEFAULT_USER_ID) {
  const formData = new FormData()
  formData.append("file", file)

  // Specification: /upload?user_id={userId}&persist_db=true
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
 * GET /scans
 */
export async function listScans(limit: number = 20, offset: number = 0) {
  const data = await apiFetch(`/scans?limit=${limit}&offset=${offset}`)
  // Backend returns result list directly or wrapped? 
  // If it returned data: [] before, I'll keep it compatible.
  return { scans: Array.isArray(data) ? data : (data.scans || data.data || []) }
}

/**
 * GET /scans/{id}
 */
export async function getScan(id: string) {
  return apiFetch(`/scans/${id}`)
}

/**
 * DELETE /scans/{id}
 */
export async function deleteAnalysis(id: string) {
  return apiFetch(`/scans/${id}`, { method: "DELETE" })
}

/**
 * GET /scans/{id}/events
 */
export async function getScanEvents(id: string, params: any = {}) {
  const query = new URLSearchParams()
  if (params.category) query.append("category", params.category)
  if (params.limit) query.append("limit", params.limit.toString())
  if (params.offset) query.append("offset", params.offset || "0")
  
  const queryString = query.toString()
  const data = await apiFetch(`/scans/${id}/events${queryString ? `?${queryString}` : ""}`)
  return { 
    events: data.events || data.data || data || []
  }
}

/**
 * GET /scans/{id}/categories
 */
export async function getScanCategories(id: string) {
  const data = await apiFetch(`/scans/${id}/categories`)
  return { categories: data.categories || data.data || data || [] }
}

/**
 * GET /scans/{id}/chains
 */
export async function getScanChains(id: string) {
  const data = await apiFetch(`/scans/${id}/chains`)
  return { chains: data.chains || data.data || data || [] }
}

/**
 * GET /scans/{id}/travels
 */
export async function getScanTravels(id: string) {
  const data = await apiFetch(`/scans/${id}/travels`)
  return { travels: data.travels || data.data || data || [] }
}

/**
 * GET /scans/{id}/summary
 */
export async function getScanSummary(id: string) {
  return apiFetch(`/scans/${id}/summary`)
}

/**
 * POST /api/reports/generate
 */
export async function generateForensicReportPdf(payload: Record<string, any>) {
  const res = await fetch("/api/reports/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to generate report PDF" }))
    throw new Error(error.detail || "Failed to generate report PDF")
  }

  return res
}

/**
 * WS /ws/analyses/{analysis_id}
 */
export function connectWebSocket(analysisId: string, onMessage: (data: any) => void) {
  const wsUrl = window.location.origin.replace("http", "ws")
  const ws = new WebSocket(`${wsUrl}/ws/analyses/${analysisId}`)

  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data))
  }

  return ws
}

export function connectSystemStatsWebSocket(onMessage: (data: any) => void) {
  const wsUrl = window.location.origin.replace("http", "ws")
  const ws = new WebSocket(`${wsUrl}/ws/system-stats`)

  ws.onmessage = (event) => {
    onMessage(JSON.parse(event.data))
  }

  return ws
}
