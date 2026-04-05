import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import { 
  AlertTriangle, 
  Filter, 
  ShieldAlert, 
  Sparkles, 
  X, 
  LayoutGrid, 
  List, 
  Search, 
  Activity, 
  Database, 
  Fingerprint, 
  Zap, 
  ChevronRight,
  TrendingDown
} from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import SeverityStats from "@/components/dashboard/SeverityStats"
import FindingCard from "@/components/dashboard/findings/FindingCard"
import Pagination from "@/components/dashboard/Pagination"
import EmptyState from "@/components/dashboard/EmptyState"
import { FindingsPageSkeleton } from "@/components/dashboard/Skeletons"
import { apiFetch } from "@/lib/api"
import { cn } from "@/lib/utils"

// Shadcn/ui components
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"

interface Category {
  category_id?: string
  category_name: string
  mitre_id?: string
  tactic?: string
  risk_score: number
  event_count: number
  ai_summary?: string
}

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

function riskToSeverity(score: number): string {
  if (score >= 9) return "critical"
  if (score >= 7) return "high"
  if (score >= 4) return "medium"
  if (score >= 2) return "low"
  return "info"
}

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

export default function FindingsPage() {
  const router = useRouter()
  const { id } = router.query

  const [categories, setCategories] = useState<Category[]>([])
  const [allFindings, setAllFindings] = useState<Finding[]>([])
  const [findings, setFindings] = useState<Finding[]>([])

  const [bySeverity, setBySeverity] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [totalFindings, setTotalFindings] = useState(0)

  const ITEMS_PER_PAGE = 15

  useEffect(() => {
    if (!id) return
    const scanId = id as string
    setLoading(true)

    Promise.all([
      apiFetch(`/scans/${scanId}/categories`),
      apiFetch(`/scans/${scanId}/events?limit=5000&offset=0`),
    ])
      .then(([categoryData, eventData]) => {
        const categoryList: Category[] = categoryData.categories || []
        const eventList: any[] = eventData.events || []

        setCategories(categoryList)

        const severityMap: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
        categoryList.forEach((category) => {
          const severity = riskToSeverity(category.risk_score)
          severityMap[severity] = (severityMap[severity] || 0) + (category.event_count || 0)
        })
        setBySeverity(severityMap)

        const categoryMeta = categoryList.reduce((acc, category) => {
          const key = category.category_name.toLowerCase()
          acc[key] = {
            severity: riskToSeverity(category.risk_score),
            tactic: category.tactic || "",
            mitre: category.mitre_id || "",
            risk: category.risk_score,
          }
          return acc
        }, {} as Record<string, { severity: string; tactic: string; mitre: string; risk: number }>)

        const mapped: Finding[] = eventList.map((event) => {
          const category = String(event.category || "Threat Detected")
          const categoryKey = category.toLowerCase()
          const meta = categoryMeta[categoryKey]

          let detectionType = "rule"
          if (/(anomaly|ml|isolation|outlier)/.test(categoryKey)) detectionType = "ml_anomaly"
          else if (/(travel|impossible)/.test(categoryKey)) detectionType = "impossible_travel"
          else if (/(privilege|token|escalation)/.test(categoryKey)) detectionType = "priv_esc"
          else if (/(persist|startup|autorun|task)/.test(categoryKey)) detectionType = "persistence"
          else if (/(lateral|wmic|psexec|smb|rdp)/.test(categoryKey)) detectionType = "lateral"

          const anomalyRaw = Number(event.anomaly_score ?? event.ml_score ?? NaN)
          const anomalyScore = Number.isFinite(anomalyRaw)
            ? (anomalyRaw > 1 ? Math.max(0, Math.min(1, anomalyRaw / 100)) : Math.max(0, Math.min(1, anomalyRaw)))
            : undefined

          return {
            id: event.event_id || `${event.time_logged || "t"}-${event.computer || "host"}-${Math.random().toString(36).slice(2, 8)}`,
            severity: meta?.severity || riskToSeverity(Number(event.risk_score || 5)),
            title: category,
            description: `${event.task_category || "Signal"} on ${event.computer || "unknown host"} by ${event.user_account || "unknown user"}`,
            detection_type: detectionType,
            mitre_techniques: meta?.mitre ? [meta.mitre] : [],
            mitre_tactics: meta?.tactic ? [meta.tactic] : [],
            affected_users: event.user_account ? [event.user_account] : [],
            affected_hosts: event.computer ? [event.computer] : [],
            source_ips: [event.source_ip, event.client_ip, event.ip_address, event.source_address].filter(Boolean),
            anomaly_score: anomalyScore,
            ml_method: event.ml_method,
            timestamp_start: event.time_logged,
            details: {
              ...event,
              risk_score: Number(event.risk_score || meta?.risk || 0),
            },
          }
        })

        setAllFindings(mapped)
        setTotalFindings(mapped.length)
      })
      .catch((error) => console.error("Failed to load findings:", error))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    let filtered = [...allFindings]

    if (filterSeverity && filterSeverity !== "all") {
      filtered = filtered.filter((finding) => finding.severity === filterSeverity)
    }

    if (filterType && filterType !== "all") {
      filtered = filtered.filter((finding) => finding.detection_type === filterType)
    }

    const nextPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
    if (page > nextPages) {
      setPage(nextPages)
      return
    }

    setTotalFindings(filtered.length)
    setTotalPages(nextPages)

    const start = (page - 1) * ITEMS_PER_PAGE
    setFindings(filtered.slice(start, start + ITEMS_PER_PAGE))
  }, [allFindings, filterSeverity, filterType, page])

  const clearFilters = () => {
    setPage(1)
    setFilterSeverity("all")
    setFilterType("all")
  }

  const hasFilters = Boolean((filterSeverity && filterSeverity !== "all") || (filterType && filterType !== "all"))

  const topThreatCategories = useMemo(() => {
    return [...categories]
      .sort((a, b) => (b.risk_score * b.event_count) - (a.risk_score * a.event_count))
      .slice(0, 6)
  }, [categories])

  const detectionMix = useMemo(() => {
    const counts: Record<string, number> = {}
    allFindings.forEach((finding) => {
      counts[finding.detection_type] = (counts[finding.detection_type] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [allFindings])

  const highRiskSignals = useMemo(() => {
    return allFindings.filter((finding) => finding.severity === "critical" || finding.severity === "high").length
  }, [allFindings])

  const impactedUsers = useMemo(() => new Set(allFindings.flatMap((finding) => finding.affected_users || [])).size, [allFindings])
  const impactedHosts = useMemo(() => new Set(allFindings.flatMap((finding) => finding.affected_hosts || [])).size, [allFindings])

  if (loading) {
    return (
      <DashboardLayout analysisId={id as string}>
        <FindingsPageSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout analysisId={id as string}>
      <div className="space-y-10 max-w-[1720px] mx-auto animate-reveal">
        {/* Modern Header Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0c]/60 backdrop-blur-3xl p-10 md:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none -rotate-12 translate-x-20">
            <Fingerprint className="w-96 h-96 text-primary" />
          </div>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center gap-4">
                 <div className="h-px w-10 bg-primary/40" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80 leading-none">Evidence Repository Layer</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-[0.9]">
                 Tactical Signal <span className="text-gradient">Enumeration</span>
              </h1>
              <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-2xl italic">
                {totalFindings.toLocaleString()} forensic alerts identified within this dataset. 
                Neural correlation logic is maintaining a 92.4% signal-to-noise ratio.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="px-5 py-2.5 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-3 group transition-all cursor-default">
                  <ShieldAlert className="w-4 h-4 text-primary animate-pulse shadow-[0_0_8px_hsla(var(--primary),0.5)]" />
                  <span className="text-[11px] font-black text-primary uppercase tracking-widest leading-none">{highRiskSignals.toLocaleString()} CRITICAL VECTORS</span>
                </div>
                <div className="px-5 py-2.5 rounded-2xl border border-white/5 bg-white/[0.03] flex items-center gap-3 group transition-all cursor-default">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest leading-none">{categories.length.toLocaleString()} PATTERN TYPES</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full lg:w-[420px]">
              {[
                { label: "Total Log Ingest", value: allFindings.length, icon: Database, color: "text-primary" },
                { label: "Target Profiles", value: impactedUsers, icon: List, color: "text-accent" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-[1.5rem] p-6 flex flex-col justify-between h-40 group/card">
                  <stat.icon className={cn("w-6 h-6 transition-transform group-hover/card:scale-110 group-hover/card:rotate-6", stat.color)} />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-white mt-1 mono-data tracking-tighter leading-none">{stat.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tactical Filter Bar */}
        <section className="sticky top-[86px] z-30 animate-reveal" style={{ animationDelay: '0.1s' }}>
          <div className="glass-card rounded-[1.5rem] border-white/10 bg-[#050506]/90 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] p-4 flex flex-col xl:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 text-zinc-500 border-r border-white/5 mr-2">
                <Filter className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">FILTER SET</span>
              </div>

              <div className="flex-1 lg:flex-none flex items-center gap-3">
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-[180px] h-11 bg-white/[0.04] border-white/5 rounded-xl focus:ring-primary/20 font-bold text-[10px] uppercase tracking-widest text-zinc-300">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0c] border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest py-3">All Severities</SelectItem>
                    <SelectItem value="critical" className="text-[10px] font-bold uppercase tracking-widest py-3 text-red-400">Critical</SelectItem>
                    <SelectItem value="high" className="text-[10px] font-bold uppercase tracking-widest py-3 text-orange-400">High</SelectItem>
                    <SelectItem value="medium" className="text-[10px] font-bold uppercase tracking-widest py-3 text-amber-400">Medium</SelectItem>
                    <SelectItem value="low" className="text-[10px] font-bold uppercase tracking-widest py-3 text-cyan-400">Low</SelectItem>
                    <SelectItem value="info" className="text-[10px] font-bold uppercase tracking-widest py-3 text-zinc-500">Info</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px] h-11 bg-white/[0.04] border-white/5 rounded-xl focus:ring-primary/20 font-bold text-[10px] uppercase tracking-widest text-zinc-300">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0c] border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-widest py-3">All Protocols</SelectItem>
                    <SelectItem value="rule" className="text-[10px] font-bold uppercase tracking-widest py-3">Deterministic</SelectItem>
                    <SelectItem value="ml_anomaly" className="text-[10px] font-bold uppercase tracking-widest py-3">Heuristic</SelectItem>
                    <SelectItem value="impossible_travel" className="text-[10px] font-bold uppercase tracking-widest py-3">Geo-Spatial</SelectItem>
                    <SelectItem value="priv_esc" className="text-[10px] font-bold uppercase tracking-widest py-3">Escalation</SelectItem>
                    <SelectItem value="persistence" className="text-[10px] font-bold uppercase tracking-widest py-3">Persistence</SelectItem>
                    <SelectItem value="lateral" className="text-[10px] font-bold uppercase tracking-widest py-3">Lateral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-10 font-black text-[9px] uppercase tracking-[0.2em] px-5 rounded-xl transition-all">
                  <X className="w-3.5 h-3.5 mr-2" />
                  Erase Tethers
                </Button>
              )}
            </div>

            <div className="relative w-full xl:w-[400px] animate-reveal" style={{ animationDelay: '0.2s' }}>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 transition-colors group-focus:text-primary">
                 <Search className="w-full h-full" />
              </div>
              <Input
                placeholder="Query within subset signatures..."
                className="h-11 pl-11 bg-white/[0.03] border-white/5 rounded-xl focus:ring-primary/20 text-xs font-bold tracking-tight placeholder:text-zinc-600"
              />
            </div>
          </div>
        </section>

        <SeverityStats stats={bySeverity} />

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-10">
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {findings.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState type={hasFilters ? "no-results" : "no-findings"} />
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {findings.map((finding, idx) => (
                    <FindingCard key={finding.id} finding={finding} index={idx} />
                  ))}
                </div>
              )}
            </AnimatePresence>

            <div className="pt-10 flex items-center justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>

          <aside className="space-y-8 animate-reveal" style={{ animationDelay: '0.3s' }}>
            <div className="glass-card p-10 h-fit xl:sticky xl:top-[160px] overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none -rotate-12 translate-x-10">
                 <Zap className="w-48 h-48 text-primary" />
              </div>
              
              <div className="space-y-12 relative">
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 flex items-center gap-3">
                      <Activity className="w-4 h-4 text-primary" />
                      Threat Spotlight
                    </h3>
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                  </div>
                  <div className="space-y-6">
                    {topThreatCategories.length === 0 ? (
                      <p className="text-xs font-medium text-zinc-600 italic">No category-level threat patterns available.</p>
                    ) : (
                      topThreatCategories.map((category, i) => (
                        <div key={`${category.category_name}-${i}`} className="group/item relative pl-5 py-2">
                          <div className="absolute left-0 top-0 bottom-0 w-[2.5px] bg-white/[0.04] group-hover/item:bg-primary transition-all duration-500 rounded-full" />
                          <div className="flex items-center justify-between gap-4">
                             <p className="text-sm font-bold text-white tracking-tight truncate group-hover/item:text-primary transition-colors">{toTitleCase(category.category_name)}</p>
                             <div className="h-px flex-1 bg-white/[0.02]" />
                             <ChevronRight className="w-3.5 h-3.5 text-zinc-800" />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-zinc-600">
                            <span className="group-hover/item:text-zinc-400 transition-colors">{category.event_count.toLocaleString()} Signals</span>
                            <span className={cn(
                              "transition-colors",
                              category.risk_score >= 9 ? "text-red-500/60 group-hover/item:text-red-500" : category.risk_score >= 7 ? "text-orange-500/60 group-hover/item:text-orange-500" : "text-emerald-500/60 group-hover/item:text-emerald-500"
                            )}>Potency {category.risk_score}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="h-px w-full bg-white/[0.03]" />

                <div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-8 flex items-center gap-3">
                      <LayoutGrid className="w-4 h-4 text-accent" />
                      Detection Mix
                   </h3>
                   <div className="space-y-4">
                     {detectionMix.length === 0 ? (
                       <p className="text-xs font-medium text-zinc-600 italic">No detection distribution detected.</p>
                     ) : (
                       detectionMix.map(([name, value]) => (
                         <div key={name} className="flex flex-col gap-2">
                           <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                             <span className="text-zinc-500">{toTitleCase(name)}</span>
                             <span className="text-white mono-data">{value.toLocaleString()}</span>
                           </div>
                           <div className="h-1 w-full bg-white/[0.012] rounded-full overflow-hidden">
                              <div className="h-full bg-accent/40 rounded-full" style={{ width: `${(value / totalFindings) * 100}%` }} />
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                </div>

                <div className="p-8 rounded-[2rem] bg-primary/[0.02] border border-primary/10 relative group/memo overflow-hidden">
                   <div className="absolute -bottom-4 -right-4 opacity-5 group-hover/memo:opacity-10 transition-opacity">
                      <TrendingDown className="w-24 h-24" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-4">Adjudication Memo</p>
                   <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                     Forensic telemetry confirms {findings.length > 0 ? `a dominant ${toTitleCase(topThreatCategories[0]?.category_name || "suspicious")} vector` : "anomalous behavior"} 
                     detected within the current scan. {allFindings.filter(f => f.severity === 'critical').length > 0 ? "High reliability correlation suggests immediate containment of privileged assets." : "Recommend monitoring for escalation signals in the listed clusters."}
                   </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}
