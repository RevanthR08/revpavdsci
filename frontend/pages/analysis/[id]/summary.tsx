import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FileText, 
  RefreshCw, 
  Loader2, 
  Copy, 
  Check, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  ShieldAlert, 
  Radar, 
  Activity, 
  GitBranch, 
  Zap, 
  Cpu, 
  Fingerprint, 
  Network,
  History,
  Target,
  FileSearch,
  BookOpen
} from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import AttackRadar from "@/components/dashboard/AttackRadar"
import AttackFlow from "@/components/dashboard/AttackFlow"
import FindingsSummaryTable from "@/components/dashboard/FindingsSummaryTable"
import KeyFindings from "@/components/dashboard/KeyFindings"
import KillChainTimeline from "@/components/dashboard/attack-chains/KillChainTimeline"
import SummaryVisualBoard from "@/components/dashboard/SummaryVisualBoard"
import SummaryPageSkeleton from "@/components/dashboard/SummarySkeleton"
import {
  getScan,
  getScanSummary,
  getScanEvents,
  getScanChains,
  getScanCategories,
  getScanTravels,
  generateForensicReportPdf,
} from "@/lib/api"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

// Shadcn/ui components
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface Summary {
  scan_id: string
  generated_at: string
  executive_briefing: string
  content_markdown: string
  model?: string
  sections: {
    executive_summary: string
    attack_narrative: string
    affected_assets: string
    remediation_steps: string
  }
}

interface Analysis {
  scan_id: string
  file_name: string
  total_logs: number
  total_threats: number
  risk_score: number
}

interface Category {
  category_name: string
  risk_score: number
  event_count: number
  tactic?: string
  mitre_id?: string
}

interface Travel {
  travel_id: string
  user_account: string
  host_a: string
  time_a: string
  host_b: string
  time_b: string
  gap_minutes: number
}

interface Finding {
  id: string
  severity: string
  title: string
  detection_type: string
  rule_id?: string
  mitre_techniques?: string[]
  mitre_tactics?: string[]
  source_ips?: string[]
  affected_users?: string[]
  affected_hosts?: string[]
  timestamp?: string
  risk_score?: number
  details?: Record<string, any>
}

interface Chain {
  id: string
  chain_id: string
  chain_index: number
  title: string
  computer: string
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

const TYPE_META: Record<string, { name: string; color: string }> = {
  rule: { name: "Deterministic", color: "#3b82f6" },
  ml_anomaly: { name: "Heuristic", color: "#8b5cf6" },
  impossible_travel: { name: "Geo-Spatial", color: "#f97316" },
  priv_esc: { name: "Escalation", color: "#ef4444" },
  persistence: { name: "Persistence", color: "#14b8a6" },
  lateral: { name: "Lateral", color: "#22c55e" },
}

const REMEDIATION_LIBRARY: Array<{ match: RegExp; action: string }> = [
  {
    match: /(brute|password|credential|logon|auth)/i,
    action: "Enforce MFA for privileged and remote access users, lock out repeated failures, and rotate exposed credentials.",
  },
  {
    match: /(privilege|escalation|admin|token)/i,
    action: "Audit administrative group membership, restrict local admin rights, and monitor privilege-assignment events in real time.",
  },
  {
    match: /(travel|impossible|geo)/i,
    action: "Apply geo-impossible sign-in policy, require step-up authentication, and review federated identity trust settings.",
  },
  {
    match: /(lateral|remote service|wmic|psexec|smb|rdp)/i,
    action: "Segment east-west traffic, disable unused remote tooling, and enforce host firewall allow-lists for admin protocols.",
  },
  {
    match: /(persist|startup|scheduled task|registry run)/i,
    action: "Harden startup persistence points, monitor task scheduler changes, and baseline endpoint autorun artifacts.",
  },
  {
    match: /(anomaly|ml|isolation|outlier)/i,
    action: "Tune anomaly thresholds, suppress known-safe baselines, and route high-confidence anomaly clusters to manual triage.",
  },
]

function normalizeRiskScore(rawScore: number): number {
  return Math.max(0, Math.min(100, Math.round(rawScore / 100)))
}

function riskToSeverity(score: number): string {
  if (score >= 9) return "critical"
  if (score >= 7) return "high"
  if (score >= 4) return "medium"
  if (score >= 2) return "low"
  return "info"
}

function inferDetectionType(category: string, tactic?: string): string {
  const value = `${category} ${tactic || ""}`.toLowerCase()

  if (/(travel|impossible)/.test(value)) return "impossible_travel"
  if (/(anomaly|ml|isolation|outlier)/.test(value)) return "ml_anomaly"
  if (/(privilege|escalation|token)/.test(value)) return "priv_esc"
  if (/(persist|startup|autorun|scheduled task)/.test(value)) return "persistence"
  if (/(lateral|remote service|wmic|psexec|smb|rdp)/.test(value)) return "lateral"
  return "rule"
}

function parseChainPhases(sequence: string): string[] {
  return sequence
    .split(/\s*(?:→|->|=>)\s*/)
    .map((phase) => phase.replace(/\[.*?\]/g, "").trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean)
}

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ")
}

function buildDynamicRemediation(categories: Category[]): string {
  const topCategories = [...categories]
    .sort((a, b) => (b.event_count || 0) - (a.event_count || 0))
    .slice(0, 5)

  if (topCategories.length === 0) {
    return [
      "- Enforce MFA for all privileged accounts and external access pathways.",
      "- Rotate recently used credentials and revoke unused service-account secrets.",
      "- Increase endpoint monitoring for persistence and suspicious remote-execution behaviors.",
      "- Apply network segmentation controls to reduce lateral movement opportunities.",
    ].join("\n")
  }

  return topCategories
    .map((category) => {
      const recommended = REMEDIATION_LIBRARY.find((item) => item.match.test(category.category_name))
      return `- ${toTitleCase(category.category_name)}: ${recommended?.action || "Prioritize containment for this category, tune relevant detections, and validate hardening controls."}`
    })
    .join("\n")
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

function stripMarkdown(markdown: string): string {
  if (!markdown) return ""

  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#+\s?/g, "")
    .replace(/>\s?/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\n{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function firstSentences(text: string, maxSentences: number): string {
  const clean = stripMarkdown(text)
  if (!clean) return ""

  const chunks = clean.split(/(?<=[.!?])\s+/).filter(Boolean)
  return chunks.slice(0, maxSentences).join(" ")
}

function toNumberLabel(value: number): string {
  return value.toLocaleString()
}

function buildExecutiveSummaryText(params: {
  mode: string
  threatLevel: string
  riskScore: number
  findingsCount: number
  chainCount: number
  highConfidenceChains: number
  travelCount: number
  userCount: number
  hostCount: number
  dominantDetection: string
  topCategory?: Category
  modelSummary?: string
}): string {
  const {
    mode,
    threatLevel,
    riskScore,
    findingsCount,
    chainCount,
    highConfidenceChains,
    travelCount,
    userCount,
    hostCount,
    dominantDetection,
    topCategory,
    modelSummary,
  } = params

  const modelIntro = firstSentences(modelSummary || "", mode === "CISO" ? 1 : 2)
  const threatLine = `Threat posture is ${threatLevel} with a composite risk score of ${riskScore}/100.`
  const activityLine = `${toNumberLabel(findingsCount)} suspicious signals were identified, with ${toNumberLabel(chainCount)} correlated attack chain${chainCount === 1 ? "" : "s"} and ${toNumberLabel(highConfidenceChains)} high-confidence progression path${highConfidenceChains === 1 ? "" : "s"}.`
  const exposureLine = `Observed blast radius includes ${toNumberLabel(userCount)} user account${userCount === 1 ? "" : "s"}, ${toNumberLabel(hostCount)} host${hostCount === 1 ? "" : "s"}, and ${toNumberLabel(travelCount)} impossible-travel indicator${travelCount === 1 ? "" : "s"}.`
  const patternLine = topCategory
    ? `Most active threat pattern: ${toTitleCase(topCategory.category_name)} (${toNumberLabel(topCategory.event_count)} events), primarily detected through ${dominantDetection}.`
    : `Dominant detection family in this scan: ${dominantDetection}.`

  if (mode === "CISO") {
    return [modelIntro, threatLine, activityLine, exposureLine, patternLine].filter(Boolean).join(" ")
  }

  const socLine = `Analyst priority should focus on containment of the dominant pattern, credential and privilege abuse pathways, and verification of lateral movement controls.`
  return [modelIntro, threatLine, activityLine, exposureLine, patternLine, socLine].filter(Boolean).join(" ")
}

function buildStructuredReportMarkdown(params: {
  generatedAt?: string
  threatLevel: string
  riskScore: number
  findingsCount: number
  chainCount: number
  highConfidenceChains: number
  travelCount: number
  userCount: number
  hostCount: number
  topCategories: Category[]
  topMitre: Array<{ id: string; count: number }>
  detectionData: Array<{ name: string; value: number }>
  topChains: Chain[]
  remediationText: string
  modelNarrative?: string
}): string {
  const generatedAtLine = params.generatedAt
    ? new Date(params.generatedAt).toLocaleString()
    : new Date().toLocaleString()

  const categoryBullets = params.topCategories.length > 0
    ? params.topCategories
      .slice(0, 5)
      .map((category) => `- ${toTitleCase(category.category_name)}: ${toNumberLabel(category.event_count)} event(s), risk ${category.risk_score}/10${category.tactic ? `, tactic ${toTitleCase(category.tactic)}` : ""}`)
      .join("\n")
    : "- No category-level breakdown available from the backend for this scan."

  const mitreBullets = params.topMitre.length > 0
    ? params.topMitre
      .slice(0, 6)
      .map((item) => `- ${item.id}: ${toNumberLabel(item.count)} mapped event(s)`)
      .join("\n")
    : "- No MITRE technique IDs were provided in this dataset."

  const detectionBullets = params.detectionData.length > 0
    ? params.detectionData
      .slice(0, 5)
      .map((item) => `- ${item.name}: ${toNumberLabel(item.value)} signal(s)`)
      .join("\n")
    : "- No detection-type distribution available."

  const chainBullets = params.topChains.length > 0
    ? params.topChains
      .slice(0, 3)
      .map((chain, index) => {
        const phaseSummary = chain.kill_chain_phases.length > 0
          ? chain.kill_chain_phases.slice(0, 4).map((phase) => toTitleCase(phase)).join(" -> ")
          : "Phase sequence unavailable"
        return `- Chain ${index + 1} (${Math.round(chain.chain_confidence * 100)}% confidence) on ${chain.computer}: ${phaseSummary}`
      })
      .join("\n")
    : "- No multi-step attack chain correlation was returned."

  const normalizedRemediation = params.remediationText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.match(/^\d+\./) ? line.replace(/^\d+\.\s*/, "- ") : `- ${line}`))
    .join("\n")

  const narrativeSnippet = firstSentences(params.modelNarrative || "", 6)

  return [
    "## Incident Overview",
    `- Generated: ${generatedAtLine}`,
    `- Threat level: ${params.threatLevel}`,
    `- Composite risk: ${params.riskScore}/100`,
    `- Signals: ${toNumberLabel(params.findingsCount)} | Chains: ${toNumberLabel(params.chainCount)} | High confidence chains: ${toNumberLabel(params.highConfidenceChains)}`,
    `- Blast radius: ${toNumberLabel(params.userCount)} user(s), ${toNumberLabel(params.hostCount)} host(s), ${toNumberLabel(params.travelCount)} travel anomaly indicator(s)`,
    "",
    "## Top Threat Patterns",
    categoryBullets,
    "",
    "## Attack Chain Highlights",
    chainBullets,
    "",
    "## Detection Profile",
    detectionBullets,
    "",
    "## MITRE Mapping",
    mitreBullets,
    "",
    "## Priority Remediation Plan",
    normalizedRemediation || "- No remediation actions were generated.",
    "",
    "## AI Narrative Context",
    narrativeSnippet || "No narrative content was provided by the model response.",
  ].join("\n")
}

export default function SummaryPage() {
  const router = useRouter()
  const { id } = router.query

  const [summary, setSummary] = useState<Summary | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [travels, setTravels] = useState<Travel[]>([])
  const [findings, setFindings] = useState<Finding[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [mode, setMode] = useState("SOC_ANALYST")
  const [copied, setCopied] = useState(false)
  const [expandedReport, setExpandedReport] = useState(true)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return

    setLoading(true)
    try {
      const scanId = id as string
      const [analysisData, summaryData, categoriesData, eventsData, chainsData, travelsData] = await Promise.all([
        getScan(scanId),
        getScanSummary(scanId).catch(() => null),
        getScanCategories(scanId).catch(() => ({ categories: [] })),
        getScanEvents(scanId, { limit: 500 }),
        getScanChains(scanId),
        getScanTravels(scanId).catch(() => ({ travels: [] })),
      ])

      const categoryList: Category[] = categoriesData.categories || []
      const travelList: Travel[] = travelsData.travels || []

      setAnalysis(analysisData)
      setCategories(categoryList)
      setTravels(travelList)

      const categoryMeta = categoryList.reduce((acc, category) => {
        acc[(category.category_name || "").toLowerCase()] = {
          severity: riskToSeverity(category.risk_score || 0),
          tactic: category.tactic,
          mitre_id: category.mitre_id,
          risk_score: category.risk_score,
        }
        return acc
      }, {} as Record<string, { severity: string; tactic?: string; mitre_id?: string; risk_score: number }>)

      const mappedFindings: Finding[] = (eventsData.events || []).map((event: any, index: number) => {
        const title = event.category || "Threat Signal"
        const key = title.toLowerCase()
        const meta = categoryMeta[key]

        const severity = meta?.severity || riskToSeverity(Number(event.risk_score || event.anomaly_score || 5))
        const detectionType = inferDetectionType(title, meta?.tactic || event.task_category)

        return {
          id: event.event_id || `${scanId}-${index}`,
          severity,
          title,
          detection_type: detectionType,
          mitre_techniques: meta?.mitre_id ? [meta.mitre_id] : [],
          mitre_tactics: meta?.tactic ? [meta.tactic] : [],
          affected_users: event.user_account ? [event.user_account] : [],
          affected_hosts: event.computer ? [event.computer] : [],
          timestamp: event.time_logged || event.timestamp || event.created_at,
          risk_score: meta?.risk_score,
          details: event,
        }
      })

      const mappedChains: Chain[] = (chainsData.chains || []).map((chain: any, index: number) => {
        const rawConfidence = Number(chain.chain_confidence ?? chain.confidence ?? 0.75)
        const normalizedConfidence = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence

        return {
          id: chain.chain_id,
          chain_id: chain.chain_id,
          chain_index: index + 1,
          title: chain.chain_sequence || `Chain ${index + 1}`,
          computer: chain.computer || "Unknown",
          chain_confidence: Math.max(0, Math.min(1, normalizedConfidence)),
          kill_chain_phases: parseChainPhases(chain.chain_sequence || ""),
          affected_users: chain.user_account ? [chain.user_account] : [],
          affected_hosts: chain.computer ? [chain.computer] : [],
        }
      })

      setFindings(mappedFindings)
      setChains(mappedChains)

      const impactedUsers = new Set(mappedFindings.flatMap((finding) => finding.affected_users || []))
      const impactedHosts = new Set(mappedFindings.flatMap((finding) => finding.affected_hosts || []))

      if (summaryData) {
        const sourceMarkdown = summaryData.content_markdown || summaryData.executive_briefing || ""
        setSummary({
          ...summaryData,
          content_markdown: sourceMarkdown,
          sections: {
            executive_summary: summaryData.sections?.executive_summary || summaryData.executive_briefing || sourceMarkdown,
            attack_narrative: summaryData.sections?.attack_narrative || "Chronological logic identified multi-sector progression.",
            affected_assets: summaryData.sections?.affected_assets || `${impactedUsers.size} Users | ${impactedHosts.size} Hosts`,
            remediation_steps: summaryData.sections?.remediation_steps || buildDynamicRemediation(categoryList),
          },
        })
      }
    } catch (error) {
      console.error("Failed to load summary data:", error)
    } finally {
      setLoading(false)
    }
  }

  const riskScorePercentage = useMemo(() => clampScore(analysis?.risk_score ? normalizeRiskScore(analysis.risk_score) : 65), [analysis])
  const threatLevel = riskScorePercentage >= 80 ? "CRITICAL" : riskScorePercentage >= 50 ? "HIGH" : "MEDIUM"

  const severityData = useMemo(() => 
    Object.entries(findings.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc }, {} as Record<string, number>))
      .map(([name, value]) => ({ name: toTitleCase(name), value, color: SEVERITY_COLORS[name] })), [findings])

  const detectionData = useMemo(() => 
    Object.entries(findings.reduce((acc, f) => { acc[f.detection_type] = (acc[f.detection_type] || 0) + 1; return acc }, {} as Record<string, number>))
      .map(([type, value]) => ({ name: TYPE_META[type]?.name || type, value, color: TYPE_META[type]?.color })), [findings])

  const findingsForTable = useMemo(() => {
    const counts: Record<string, number> = {}
    findings.forEach(f => {
      const key = `${f.severity}-${f.title}`
      counts[key] = (counts[key] || 0) + 1
    })

    return Array.from(new Set(findings.map(f => `${f.severity}-${f.title}`)))
      .map(key => {
        const f = findings.find(x => `${x.severity}-${x.title}` === key)!
        return {
          severity: f.severity,
          title: f.title,
          type: f.detection_type,
          count: counts[key],
          mitre: f.mitre_techniques || []
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [findings])

  const visualBoardProps = useMemo(() => {
    const affectedUsers = new Set(findings.flatMap(f => f.affected_users || [])).size
    const affectedHosts = new Set(findings.flatMap(f => f.affected_hosts || [])).size
    
    const topAssets = [
      ...Array.from(new Set(findings.flatMap(f => f.affected_users || []))).map(name => ({
        name,
        count: findings.filter(f => f.affected_users?.includes(name)).length,
        kind: "User" as const
      })),
      ...Array.from(new Set(findings.flatMap(f => f.affected_hosts || []))).map(name => ({
        name,
        count: findings.filter(f => f.affected_hosts?.includes(name)).length,
        kind: "Host" as const
      }))
    ].sort((a, b) => b.count - a.count).slice(0, 6)

    const tacticData = Object.entries(findings.reduce((acc, f) => {
      f.mitre_tactics?.forEach(t => { acc[t] = (acc[t] || 0) + 1 });
      return acc
    }, {} as Record<string, number>)).map(([name, count]) => ({ name: toTitleCase(name), count }))

    const mitreData = Object.entries(findings.reduce((acc, f) => {
      f.mitre_techniques?.forEach(t => { acc[t] = (acc[t] || 0) + 1 });
      return acc
    }, {} as Record<string, number>)).map(([id, count]) => ({ id, count }))

    return {
      riskScore: riskScorePercentage,
      threatLevel,
      totalFindings: findings.length,
      totalChains: chains.length,
      affectedUsers,
      affectedHosts,
      travelCount: travels.length,
      severityData,
      detectionData,
      timelineData: [], 
      topAssets,
      tacticData,
      mitreData
    }
  }, [findings, chains, travels, riskScorePercentage, threatLevel, severityData, detectionData])

  const copyToClipboard = () => {
    const text = summary?.content_markdown || ""
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadPdfReport = async () => {
    if (!id || !summary) return
    setDownloadingPdf(true)
    try {
      const res = await generateForensicReportPdf({ 
        scan_id: id as string, 
        analysis,
        summary,
        findings,
        chains,
        categories,
        travels,
        risk_score: riskScorePercentage,
        threat_level: threatLevel
      })
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `Forensic_Report_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("PDF generation failed:", error)
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (loading) return <DashboardLayout analysisId={id as string}><SummaryPageSkeleton /></DashboardLayout>

  return (
    <DashboardLayout analysisId={id as string} workspaceTitle={analysis?.file_name}>
      <div className="space-y-10 animate-reveal pb-20">
        
        {/* Intelligence Overhaul Header */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0c]/60 backdrop-blur-3xl p-10 md:p-14 shadow-2xl">
           <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none -rotate-12 translate-x-20">
              <BookOpen className="w-[400px] h-[400px] text-primary" />
           </div>
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
           
           <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="max-w-4xl space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="h-px w-10 bg-primary/40" />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80">Executive Summary Layer</span>
                 </div>
                 <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                    Forensic Intelligence <span className="text-gradient">Synthesis</span>
                 </h1>
                 <p className="text-xl text-zinc-400 font-medium leading-relaxed italic max-w-2xl">
                    Comprehensive adjudication of {findings.length.toLocaleString()} detected signals. 
                    The following briefing details the tactical progression and verified remediation paths.
                 </p>
                 <div className="flex flex-wrap gap-4 pt-4">
                    <div className={cn(
                       "px-6 py-3 rounded-2xl border flex items-center gap-3 transition-all",
                       threatLevel === "CRITICAL" ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-primary/10 border-primary/20 text-primary"
                    )}>
                       <ShieldAlert className="w-4 h-4 animate-pulse" />
                       <span className="text-[11px] font-black uppercase tracking-widest">{threatLevel} THREAT EXPOSURE</span>
                    </div>
                    <Button 
                       variant="outline" 
                       onClick={() => loadData()} 
                       className="h-12 px-6 rounded-2xl bg-white/[0.03] border-white/10 hover:bg-white/[0.08] text-[10px] font-black uppercase tracking-widest"
                    >
                       <RefreshCw className="w-4 h-4 mr-3" />
                       Refresh Matrix
                    </Button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full lg:w-[420px]">
                 {[
                   { label: "Composite Risk", value: `${riskScorePercentage}%`, icon: Zap, c: "text-amber-400" },
                   { label: "Correlated Chains", value: chains.length, icon: GitBranch, c: "text-primary" },
                   { label: "Target Profiles", value: [...new Set(findings.flatMap(f => f.affected_users))].length, icon: Fingerprint, c: "text-accent" },
                   { label: "Forensic Signals", value: findings.length, icon: Cpu, c: "text-cyan-400" },
                 ].map((m) => (
                    <div key={m.label} className="glass-card rounded-[1.5rem] p-6 flex flex-col justify-between h-40 group/card">
                       <m.icon className={cn("w-6 h-6 transition-transform group-hover/card:scale-110", m.c)} />
                       <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-1">{m.label}</p>
                          <p className="text-3xl font-black text-white leading-none tracking-tighter mono-data">{m.value}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Visual Analysis Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
           <div className="xl:col-span-8 space-y-10">
              <SummaryVisualBoard {...visualBoardProps} />
              <AttackFlow 
                 totalEvents={analysis?.total_logs || 0} 
                 totalFindings={findings.length} 
                 totalChains={chains.length} 
                 threatLevel={threatLevel} 
              />
           </div>

           <div className="xl:col-span-4 space-y-10">
              <AttackRadar findings={findings} />
              <div className="glass-card p-10 rounded-[2.5rem] relative group/memo overflow-hidden">
                  <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                     <Target className="w-32 h-32" />
                  </div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Tactical Adjudication</p>
                  <div className="prose prose-invert prose-sm">
                     <div className="text-zinc-400 font-medium leading-relaxed space-y-4">
                        <p>
                           DSI Brain confirms {chains.length > 0 ? `a correlated ${chains.length}-step ` : "diffuse suspicious "} 
                           <span className="text-white font-bold">{threatLevel === "CRITICAL" ? "Persistent Threat" : "Anomalous Behavioral"} signature</span> 
                           detected within {findings.length.toLocaleString()} forensic telemetry points.
                        </p>
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest border-t border-white/5 pt-4">
                           Neural Priority: {findings.filter(f => f.severity === "critical" || f.severity === "high").length} Escalation Triggers Identified
                        </p>
                     </div>
                  </div>
               </div>
           </div>
        </div>

        {/* The AI Synthesis Briefing */}
        <section className="animate-reveal" style={{ animationDelay: '0.2s' }}>
           <div className="glass-card rounded-[2.5rem] overflow-hidden">
              <div className="p-10 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                 <div className="flex items-center gap-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-bold text-white tracking-tight">AI Forensic Synthesis Briefing</h3>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                       <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                       <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Groq-Powered Inference</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard()} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-500">
                       {copied ? <Check className="w-3.5 h-3.5 mr-2 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                       Copy Log
                    </Button>
                    <Button variant="outline" className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/[0.03] border-white/5" disabled={downloadingPdf} onClick={downloadPdfReport}>
                       {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-2" />}
                       Export PDF
                    </Button>
                 </div>
              </div>

              <div className="p-10 md:p-14 space-y-12">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
                     <div className="space-y-6">
                         <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-6">Executive Perspective</p>
                         <div className="max-h-[500px] overflow-y-auto pr-6 scrollbar-none optimize-scrolling">
                            <div className="prose prose-invert prose-p:text-zinc-300 prose-headings:text-white prose-strong:text-primary prose-sm max-w-none">
                               <ReactMarkdown className="leading-relaxed font-medium">
                                  {summary?.sections.executive_summary || "Synthesis currently being adjudication by neural core..."}
                               </ReactMarkdown>
                            </div>
                         </div>
                     </div>
                     
                     <div className="space-y-8">
                        <div>
                           <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-6">Sub-Sector Vulnerability Matrix</p>
                           <div className="space-y-4">
                              {categories.slice(0, 4).map(cat => (
                                 <div key={cat.category_name} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group/cat">
                                    <div>
                                       <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-1">{cat.category_name}</p>
                                       <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{cat.tactic || "General Threat"}</p>
                                    </div>
                                    <div className="text-right">
                                       <p className="text-lg font-black text-white leading-none mb-1">{cat.risk_score}/10</p>
                                       <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-primary" style={{ width: `${(cat.risk_score || 0) * 10}%` }} />
                                       </div>
                                    </div>
                                 </div>
                              ))}
                              {categories.length === 0 && (
                                 <div className="p-5 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 text-center">
                                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">No sector telemetry identified</p>
                                 </div>
                              )}
                           </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20">
                           <div className="flex items-center gap-3 mb-4">
                              <Activity className="w-4 h-4 text-primary" />
                              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Neural Insight Panel</h4>
                           </div>
                           <p className="text-[11px] text-zinc-400 font-medium leading-relaxed italic">
                              Forensic adjudication confirms a {threatLevel === "CRITICAL" ? "highly coordinated" : "fragmented"} 
                              progression across {visualBoardProps.affectedUsers} identities and {visualBoardProps.affectedHosts} assets. 
                              Recommend immediate containment of {findings[0]?.title || "primary"} vector.
                           </p>
                        </div>
                     </div>
                  </div>

                 <div className="h-px w-full bg-white/[0.03]" />

                 <div className="grid grid-cols-1 lg:grid-cols-1 gap-12">
                     <div className="space-y-8">
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em]">Remediation Priority Queue</p>
                        <div className="prose prose-invert prose-indigo max-w-none">
                           <ReactMarkdown className="text-zinc-300 font-medium leading-loose space-y-4">
                              {summary?.sections.remediation_steps || "Remediation logic not yet synthesized."}
                           </ReactMarkdown>
                        </div>
                     </div>
                 </div>
              </div>
           </div>
        </section>

        <section className="animate-reveal" style={{ animationDelay: '0.3s' }}>
           <FindingsSummaryTable findings={findingsForTable} />
        </section>

      </div>
    </DashboardLayout>
  )
}
