import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { motion } from "framer-motion"
import { AlertTriangle, Filter, X } from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import SeverityStats from "@/components/dashboard/SeverityStats"
import FindingCard from "@/components/dashboard/findings/FindingCard"
import Pagination from "@/components/dashboard/Pagination"
import EmptyState from "@/components/dashboard/EmptyState"
import { FindingsPageSkeleton } from "@/components/dashboard/Skeletons"
import { getScanEvents, getScanCategories } from "@/lib/api"

interface Finding {
  id: string
  severity: string
  title: string
  description?: string
  detection_type: string
  rule_id?: string
  mitre_techniques?: string[]
  mitre_tactics?: string[]
  affected_users?: string[]
  affected_hosts?: string[]
  source_ips?: string[]
  anomaly_score?: number
  ml_method?: string
  details?: Record<string, any>
  timestamp_start?: string
  timestamp_end?: string
}

interface FindingStats {
  total: number
  by_severity: Record<string, number>
  by_type: Record<string, number>
}

export default function FindingsPage() {
  const router = useRouter()
  const { id } = router.query
  const [findings, setFindings] = useState<Finding[]>([])
  const [stats, setStats] = useState<FindingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterSeverity, setFilterSeverity] = useState("")
  const [filterType, setFilterType] = useState("")
  const [totalFindings, setTotalFindings] = useState(0)

  const limit = 20

  useEffect(() => {
    if (id) loadData()
  }, [id, page, filterSeverity, filterType])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const scanId = id as string
      const offset = (page - 1) * limit
      
      const [eventsData, categoriesData] = await Promise.all([
        getScanEvents(scanId, { 
          category: filterType, // Mapping 'type' filter to category for now
          limit, 
          offset 
        }),
        getScanCategories(scanId),
      ])

      // Map event fields to Finding interface
      const mappedFindings: Finding[] = (eventsData.events || []).map((ev: any) => ({
        id: ev.event_id,
        severity: "high", // Mocked for visual consistency
        title: ev.category,
        detection_type: "ml_anomaly",
        affected_users: ev.user_account ? [ev.user_account] : [],
        affected_hosts: ev.computer ? [ev.computer] : [],
        timestamp_start: ev.time_logged,
        details: ev
      }))

      setFindings(mappedFindings)
      setTotalFindings(eventsData.total || 0)
      setTotalPages(Math.ceil((eventsData.total || 0) / limit))

      // Transform categories to stats for the SeverityStats component
      const bySeverity: Record<string, number> = {}
      categoriesData.categories?.forEach((cat: any) => {
        const severity = cat.risk_score >= 9 ? "critical" : cat.risk_score >= 7 ? "high" : cat.risk_score >= 4 ? "medium" : "low"
        bySeverity[severity] = (bySeverity[severity] || 0) + 1 // Count categories of this severity
      })
      
      setStats({
        total: categoriesData.count || 0,
        by_severity: bySeverity,
        by_type: {}
      })

    } catch (err) {
      console.error("Failed to load findings:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (type: "severity" | "type", value: string) => {
    setPage(1)
    if (type === "severity") setFilterSeverity(value)
    else setFilterType(value)
  }

  const clearFilters = () => {
    setPage(1)
    setFilterSeverity("")
    setFilterType("")
  }

  const hasFilters = filterSeverity || filterType

  if (loading && !findings.length) {
    return (
      <DashboardLayout analysisId={id as string}>
        <FindingsPageSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout analysisId={id as string}>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 flex items-center justify-center" style={{ borderRadius: "6px" }}>
              <AlertTriangle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Findings</h1>
              <p className="text-xs text-zinc-500">
                {totalFindings} detections found
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Filter className="w-3.5 h-3.5" />
              Filter:
            </div>

            <select
              value={filterSeverity}
              onChange={(e) => handleFilterChange("severity", e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 px-3 py-1.5 outline-none focus:border-zinc-600 transition-colors cursor-pointer"
              style={{ borderRadius: "4px" }}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => handleFilterChange("type", e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 px-3 py-1.5 outline-none focus:border-zinc-600 transition-colors cursor-pointer"
              style={{ borderRadius: "4px" }}
            >
              <option value="">All Types</option>
              <option value="rule">Rule-Based</option>
              <option value="ml_anomaly">ML Anomaly</option>
              <option value="impossible_travel">Travel</option>
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400 px-2 py-1.5 hover:bg-red-500/10 transition-colors"
                style={{ borderRadius: "4px" }}
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Severity Stats */}
        {stats && <SeverityStats stats={stats.by_severity} />}

        {/* Findings List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="bg-zinc-900 border border-zinc-800 h-16"
                style={{ borderRadius: "6px" }}
              />
            ))}
          </div>
        ) : findings.length === 0 ? (
          <EmptyState type={hasFilters ? "no-results" : "no-findings"} />
        ) : (
          <div className="space-y-3">
            {findings.map((finding, index) => (
              <FindingCard key={finding.id} finding={finding} index={index} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </DashboardLayout>
  )
}
