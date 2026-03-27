import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { motion } from "framer-motion"
import DashboardLayout from "@/components/layout/DashboardLayout"
import UploadZone from "@/components/dashboard/UploadZone"
import { CheckCircle, XCircle, Loader2, Trash2, BarChart3, AlertTriangle } from "lucide-react"
import { uploadFile, listScans, connectWebSocket, apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Analysis {
  scan_id: string
  file_name: string
  total_logs: number
  total_threats: number
  risk_score: number
  generated_at: string
  status?: string // Optional, default to 'completed' for now
}

export default function HomePage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      const data = await listScans()
      setAnalyses(data.scans || [])
    } catch (err) {
      console.error("Failed to load analyses:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      const result = await uploadFile(file)
      // Since new /upload is synchronous, we no longer need the websocket here
      // but we can still refresh the list to show the new item
      loadAnalyses()
      setUploading(false)
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this analysis?")) return
    try {
      await apiFetch(`/scans/${id}`, { method: "DELETE" })
      loadAnalyses()
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10" }
      case "failed":
        return { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" }
      default:
        return { icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10" }
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Upload and analyze Windows Event Logs with AI-powered threat detection
          </p>
        </div>

        {/* Upload Zone */}
        <UploadZone
          onUpload={handleUpload}
          uploading={uploading}
          progress={uploadProgress}
        />

        {/* Previous Analyses */}
        <div>
          <h2 className="text-sm font-semibold text-white mb-4">Previous Analyses</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12 bg-zinc-900 border border-zinc-800" style={{ borderRadius: "6px" }}>
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900 border border-zinc-800" style={{ borderRadius: "6px" }}>
              <BarChart3 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No analyses yet. Upload a CSV file to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analyses.map((analysis, index) => {
                const statusConfig = getStatusConfig(analysis.status || "completed")
                const StatusIcon = statusConfig.icon

                return (
                  <motion.div
                    key={analysis.scan_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    onClick={() => {
                      if (analysis.status !== "failed" && analysis.scan_id) {
                        router.push(`/analysis/${analysis.scan_id}`)
                      }
                    }}
                    className={cn(
                      "bg-zinc-900 border border-zinc-800 p-4 transition-colors duration-150",
                      analysis.status !== "failed"
                        ? "cursor-pointer hover:border-zinc-700"
                        : "cursor-default"
                    )}
                    style={{ borderRadius: "6px" }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div className={cn("w-10 h-10 flex items-center justify-center", statusConfig.bg)} style={{ borderRadius: "6px" }}>
                        <StatusIcon className={cn("w-5 h-5", statusConfig.color, analysis.status !== "completed" && analysis.status !== "failed" && "animate-spin")} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{analysis.file_name}</p>
                        <p className="text-xs text-zinc-500">
                          {analysis.total_logs.toLocaleString()} logs · {new Date(analysis.generated_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-sm font-medium text-white">{analysis.total_threats}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500">findings</p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "text-sm font-bold",
                            (analysis.risk_score || 0) >= 8000 ? "text-red-400" :
                            (analysis.risk_score || 0) >= 5000 ? "text-orange-400" : "text-green-400"
                          )}>
                            {Math.round((analysis.risk_score || 0) / 100)}%
                          </span>
                          <p className="text-[10px] text-zinc-500">risk</p>
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (analysis.scan_id) {
                            handleDelete(analysis.scan_id)
                          }
                        }}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        style={{ borderRadius: "6px" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
