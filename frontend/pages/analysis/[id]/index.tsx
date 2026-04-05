import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { motion } from "framer-motion"
import { Activity, AlertTriangle, GitBranch, Loader2, Radar, ShieldAlert, Cpu, Network, History } from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import FindingsTable from "@/components/dashboard/findings/FindingsTable"
import AttackChains from "@/components/dashboard/attack-chains/AttackChains"
import Charts from "@/components/dashboard/Charts"
import { getScan, getScanCategories, getScanEvents, getScanChains } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Analysis {
  scan_id: string
  file_name: string
  generated_at: string
  total_logs: number
  total_threats: number
  attack_chain_count: number
  risk_score: number
}

interface FindingStats {
  total: number
  by_severity: Record<string, number>
  by_type: Record<string, number>
}

interface Finding {
  id: string
  severity: string
  title: string
  detection_type: string
  rule_id?: string
  mitre_techniques?: string[]
  affected_users?: string[]
}

interface Chain {
  id: string
  chain_index: number
  title: string
  chain_confidence: number
  kill_chain_phases: string[]
  affected_users: string[]
  affected_hosts: string[]
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
}

const TYPE_LABELS: Record<string, string> = {
  rule: "Deterministic Protocol",
  ml_anomaly: "Neural Heuristic",
  impossible_travel: "Geo-Spatial Velocity",
}

function riskToSeverity(score: number): string {
  if (score >= 9) return "critical"
  if (score >= 7) return "high"
  if (score >= 4) return "medium"
  return "low"
}

export default function DashboardPage() {
  const router = useRouter()
  const { id } = router.query

  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [stats, setStats] = useState<FindingStats | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return

    try {
      const scanId = id as string
      const [analysisData, categoriesData, eventsData, chainsData] = await Promise.all([
        getScan(scanId),
        getScanCategories(scanId),
        getScanEvents(scanId, { limit: 20 }),
        getScanChains(scanId),
      ])

      setAnalysis(analysisData)

      const bySeverity: Record<string, number> = {}
      const byType: Record<string, number> = {}

        ; (categoriesData.categories || []).forEach((category: any) => {
          const severity = riskToSeverity(category.risk_score || 0)
          bySeverity[severity] = (bySeverity[severity] || 0) + (category.event_count || 0)
          byType[category.tactic || "rule"] = (byType[category.tactic || "rule"] || 0) + (category.event_count || 0)
        })

      setStats({
        total: analysisData.total_threats || 0,
        by_severity: bySeverity,
        by_type: byType,
      })

      setFindings(
        (eventsData.events || []).map((event: any) => ({
          id: event.event_id,
          severity: riskToSeverity(Number(event.risk_score || event.anomaly_score || 6)),
          title: event.category || "Threat Signal",
          detection_type: event.category?.toLowerCase().includes("travel") ? "impossible_travel" : "ml_anomaly",
          affected_users: event.user_account ? [event.user_account] : [],
        }))
      )

      setChains(
        (chainsData.chains || []).map((chain: any, index: number) => {
          const confidenceRaw = Number(chain.chain_confidence ?? chain.confidence ?? 0.78)
          const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw
          return {
            id: chain.chain_id,
            chain_index: index + 1,
            title: chain.chain_sequence,
            chain_confidence: Math.max(0, Math.min(1, confidence)),
            kill_chain_phases: (chain.chain_sequence || "")
              .split(/\s*(?:→|->|=>)\s*/)
              .map((item: string) => item.toLowerCase().replace(/\s+/g, "-").trim())
              .filter(Boolean),
            affected_users: chain.user_account ? [chain.user_account] : [],
            affected_hosts: chain.computer ? [chain.computer] : [],
          }
        })
      )
    } catch (error) {
      console.error("Failed to load analysis data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout analysisId={id as string}>
        <div className="h-[50vh] flex flex-col items-center justify-center gap-6">
          <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
             <Loader2 className="w-12 h-12 text-primary animate-spin relative" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600">Reconstructing Matrix...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!analysis) {
    return (
      <DashboardLayout analysisId={id as string}>
        <div className="glass-card p-12 text-center text-zinc-400 italic font-medium">Node signature not found in central archive.</div>
      </DashboardLayout>
    )
  }

  const severityData = Object.entries(stats?.by_severity || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: SEVERITY_COLORS[name] || "#6b7280",
  }))

  const typeData = Object.entries(stats?.by_type || {}).map(([name, value]) => ({
    name: TYPE_LABELS[name] || name,
    value,
  }))

  const riskScore = Math.max(0, Math.min(100, Math.round((analysis.risk_score || 0) / 100)))
  const threatLevel = riskScore >= 80 ? "CRITICAL" : riskScore >= 50 ? "HIGH" : riskScore >= 20 ? "MEDIUM" : "LOW"
  const avgConfidence = chains.length > 0 ? Math.round((chains.reduce((sum, chain) => sum + chain.chain_confidence, 0) / chains.length) * 100) : 0

  return (
    <DashboardLayout analysisId={analysis.scan_id} workspaceTitle={analysis.file_name}>
      <div className="space-y-10 animate-reveal">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0c]/60 backdrop-blur-3xl p-10 md:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none -rotate-12 translate-x-20">
            <Radar className="w-96 h-96 text-primary" />
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center gap-4">
                 <div className="h-px w-10 bg-primary/40" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80">Investigation Terminal</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                 Detailed Forensic <span className="text-gradient">Synthesis</span>
              </h1>
              <div className="flex flex-wrap gap-4 pt-4">
                 <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 group hover:border-primary/30 transition-all cursor-default">
                    <History className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{new Date(analysis.generated_at).toLocaleDateString()}</span>
                 </div>
                 <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3 group hover:border-primary/30 transition-all cursor-default">
                    <Cpu className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mono-data">{analysis.total_logs.toLocaleString()} ENCODED SIGNALS</span>
                 </div>
                 <div className={cn(
                    "px-5 py-2.5 rounded-full border flex items-center gap-3 shadow-xl transition-all font-black text-[10px] uppercase tracking-[0.3em]",
                    riskScore >= 80 ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-primary/10 border-primary/30 text-primary"
                 )}>
                    <ShieldAlert className="w-4 h-4" />
                    THREAT VECTOR: {threatLevel}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full lg:w-[420px]">
               {[
                 { label: "Composite Risk", value: `${riskScore}%`, icon: ShieldAlert, c: riskScore >= 80 ? "text-red-400" : "text-primary" },
                 { label: "Logic Chains", value: analysis.attack_chain_count, icon: GitBranch, c: "text-accent" },
                 { label: "Confidence", value: `${avgConfidence}%`, icon: Network, c: "text-cyan-400" },
                 { label: "Forensic Signals", value: analysis.total_threats, icon: Activity, c: "text-amber-400" },
               ].map((m) => (
                 <div key={m.label} className="glass-card rounded-[1.5rem] p-6 flex flex-col justify-between h-36 group/card">
                    <m.icon className={cn("w-5 h-5 transition-transform group-hover/card:scale-110 group-hover/card:rotate-6", m.c)} />
                    <div>
                       <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-1">{m.label}</p>
                       <p className="text-2xl font-black text-white tracking-tighter mono-data">{m.value}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Global Progress Posture */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
           <div className="md:col-span-12 xl:col-span-12 glass-card p-10 flex flex-col md:flex-row md:items-center gap-10 bg-white/[0.01]">
              <div className="shrink-0">
                 <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-3">Overall Potency Index</p>
                 <div className="text-6xl font-black text-white tracking-tighter mono-data">{riskScore}</div>
                 <p className={cn("text-[10px] font-black uppercase tracking-widest mt-2", riskScore >= 80 ? "text-red-400" : "text-primary")}>
                    CORE RISK ADJUDICATION: {threatLevel}
                 </p>
              </div>
              <div className="flex-1 space-y-6">
                 <div className="flex items-center justify-between text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">
                    <span>Signal-to-Noise Distribution</span>
                    <span>{riskScore}% Potency</span>
                 </div>
                 <div className="h-3 w-full bg-zinc-950 rounded-full border border-white/[0.05] overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${riskScore}%` }} 
                      transition={{ duration: 1.5, ease: [0.2, 0.8, 0.2, 1] }}
                      className={cn(
                        "h-full rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)]",
                        riskScore >= 80 ? "bg-red-500 shadow-red-500/40" : riskScore >= 50 ? "bg-orange-500 shadow-orange-500/40" : "bg-primary shadow-primary/40"
                      )} 
                    />
                 </div>
                 <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-[0.2em] leading-relaxed">
                    Composite score generated via chronological clustering and heuristic weighting of {analysis.total_laws || analysis.total_logs} encoded signals.
                 </p>
              </div>
           </div>
        </div>

        <Charts severityData={severityData} typeData={typeData} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          <FindingsTable findings={findings} onViewAll={() => router.push(`/analysis/${id}/findings`)} />
          <AttackChains chains={chains} onViewAll={() => router.push(`/analysis/${id}/chains`)} />
        </div>
      </div>
    </DashboardLayout>
  )
}
