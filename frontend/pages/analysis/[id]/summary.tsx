import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, RefreshCw, Loader2, Copy, Check, Sparkles, ChevronDown, ChevronUp } from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import AttackRadar from "@/components/dashboard/AttackRadar"
import AttackFlow from "@/components/dashboard/AttackFlow"
import FindingsSummaryTable from "@/components/dashboard/FindingsSummaryTable"
import KeyFindings from "@/components/dashboard/KeyFindings"
import KillChainTimeline from "@/components/dashboard/attack-chains/KillChainTimeline"
import SummaryPageSkeleton from "@/components/dashboard/SummarySkeleton"
import { getScan, getScanSummary, getScanEvents, getScanChains } from "@/lib/api"
import ReactMarkdown from "react-markdown"

interface Summary {
  scan_id: string
  generated_at: string
  executive_briefing: string
  content_markdown: string
  model?: string // Added back for UI compatibility
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

interface Finding {
  id: string
  severity: string
  title: string
  detection_type: string
  rule_id?: string
  mitre_techniques?: string[]
  affected_users?: string[]
  affected_hosts?: string[]
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

export default function SummaryPage() {
  const router = useRouter()
  const { id } = router.query
  const [summary, setSummary] = useState<Summary | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [chains, setChains] = useState<Chain[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [mode, setMode] = useState("SOC_ANALYST")
  const [copied, setCopied] = useState(false)
  const [expandedReport, setExpandedReport] = useState(true)
  const [expandedRemediation, setExpandedRemediation] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id, mode])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const scanId = id as string
      const [analysisData, summaryData, eventsData, chainsData] = await Promise.all([
        getScan(scanId),
        getScanSummary(scanId).catch(() => null),
        getScanEvents(scanId, { limit: 50 }),
        getScanChains(scanId),
      ])
      
      setAnalysis(analysisData)
      
      if (summaryData) {
        setSummary({
          ...summaryData,
          content_markdown: summaryData.executive_briefing,
          sections: {
            executive_summary: summaryData.executive_briefing,
            attack_narrative: "See detailed report below.",
            affected_assets: "Refer to Keys Findings section.",
            remediation_steps: "Implement security patches and rotate credentials."
          }
        })
      }

      setFindings((eventsData.events || []).map((ev: any) => ({
        id: ev.event_id,
        severity: "high",
        title: ev.category,
        detection_type: "ml_anomaly",
        affected_users: ev.user_account ? [ev.user_account] : [],
        affected_hosts: ev.computer ? [ev.computer] : [],
        details: ev
      })))

      setChains((chainsData.chains || []).map((ch: any, idx: number) => ({
        id: ch.chain_id,
        chain_id: ch.chain_id,
        chain_index: idx + 1,
        title: ch.chain_sequence,
        computer: ch.computer,
        chain_confidence: 0.9,
        kill_chain_phases: [],
        affected_users: [],
        affected_hosts: [ch.computer]
      })))

    } catch (err) {
      console.error("Failed to load summary data:", err)
    } finally {
      setLoading(false)
    }
  }

  const generateSummary = async () => {
    setGenerating(true)
    try {
      // The new API generates summary on the fly with GET /summary
      const data = await getScanSummary(id as string)
      if (data) {
        setSummary({
          ...data,
          content_markdown: data.executive_briefing,
          sections: {
            executive_summary: data.executive_briefing,
            attack_narrative: "See detailed report below.",
            affected_assets: "Refer to Keys Findings section.",
            remediation_steps: "Implement security patches and rotate credentials."
          }
        })
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (summary?.content_markdown) {
      await navigator.clipboard.writeText(summary.content_markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const riskScorePercentage = Math.round((analysis?.risk_score || 0) / 100)
  const threatLevel = riskScorePercentage >= 80 ? "CRITICAL" : riskScorePercentage >= 50 ? "HIGH" : riskScorePercentage >= 20 ? "MEDIUM" : "LOW"

  const uniqueUsers = [...new Set(findings.flatMap(f => f.affected_users || []))]
  const uniqueHosts = [...new Set(findings.flatMap(f => f.affected_hosts || []))]

  const findingsForTable = findings.map(f => ({
    severity: f.severity,
    title: f.title,
    type: f.detection_type,
    count: f.details?.count || f.details?.failed_attempts || 1,
    mitre: f.mitre_techniques || [],
  }))

  const allPhases = [...new Set(chains.flatMap(c => c.kill_chain_phases || []))]

  if (loading) {
    return (
      <DashboardLayout analysisId={id as string}>
        <SummaryPageSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout analysisId={id as string}>
      <div className="space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center" style={{ backgroundColor: "rgba(108, 93, 211, 0.1)", borderRadius: "6px" }}>
              <Sparkles className="w-5 h-5" style={{ color: "#6C5DD3" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Summary</h1>
              <p className="text-xs text-zinc-500">{analysis?.file_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-800 border border-zinc-700 p-0.5" style={{ borderRadius: "6px" }}>
              <button
                onClick={() => setMode("SOC_ANALYST")}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderRadius: "4px",
                  backgroundColor: mode === "SOC_ANALYST" ? "#6C5DD3" : "transparent",
                  color: mode === "SOC_ANALYST" ? "#ffffff" : undefined,
                }}
              >
                SOC Analyst
              </button>
              <button
                onClick={() => setMode("CISO")}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderRadius: "4px",
                  backgroundColor: mode === "CISO" ? "#6C5DD3" : "transparent",
                  color: mode === "CISO" ? "#ffffff" : undefined,
                }}
              >
                CISO Brief
              </button>
            </div>
            <button
              onClick={generateSummary}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors"
              style={{
                borderRadius: "6px",
                backgroundColor: generating ? "#27272a" : "#6C5DD3",
                color: "#ffffff",
                cursor: generating ? "not-allowed" : "pointer",
              }}
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><RefreshCw className="w-4 h-4" />{summary ? "Regenerate" : "Generate"}</>}
            </button>
          </div>
        </motion.div>

        {/* Pipeline Flow */}
        <AttackFlow
          totalEvents={analysis?.total_logs || 0}
          totalFindings={analysis?.total_threats || 0}
          totalChains={chains.length}
          threatLevel={threatLevel}
        />

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4">
          <AttackRadar findings={findings} />
          <FindingsSummaryTable findings={findingsForTable} />
        </div>

        {/* No Summary State */}
        {!summary && !generating ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center py-12"
            style={{ borderRadius: "6px" }}
          >
            <div className="w-14 h-14 bg-zinc-800 flex items-center justify-center mb-4" style={{ borderRadius: "6px" }}>
              <FileText className="w-7 h-7 text-zinc-500" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">No Summary Generated</h3>
            <p className="text-xs text-zinc-400 mb-4">Generate an AI-powered summary of the security analysis</p>
            <button
              onClick={generateSummary}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: "#6C5DD3", borderRadius: "6px" }}
            >
              <Sparkles className="w-4 h-4" />Generate Summary
            </button>
          </motion.div>
        ) : summary ? (
          <>
            {/* Executive Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border p-5"
              style={{
                borderRadius: "6px",
                backgroundColor: threatLevel === "CRITICAL" ? "rgba(220, 38, 38, 0.1)" : threatLevel === "HIGH" ? "rgba(217, 119, 6, 0.1)" : "rgba(34, 197, 94, 0.1)",
                borderColor: threatLevel === "CRITICAL" ? "rgba(220, 38, 38, 0.25)" : threatLevel === "HIGH" ? "rgba(217, 119, 6, 0.25)" : "rgba(34, 197, 94, 0.25)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Executive Summary</p>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 text-white"
                  style={{
                    borderRadius: "4px",
                    backgroundColor: threatLevel === "CRITICAL" ? "#EF4444" : threatLevel === "HIGH" ? "#F59E0B" : "#22C55E",
                  }}
                >
                  {threatLevel}
                </span>
              </div>
              <p
                className="text-sm text-zinc-300 leading-relaxed"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 6,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {summary.sections.executive_summary || summary.content_markdown.slice(0, 500)}
              </p>
            </motion.div>

            {/* Main Split */}
            <div className="grid grid-cols-3 gap-4">
              {/* Left: Expandable Report */}
              <div className="col-span-2 space-y-3">
                {/* AI Report */}
                <div className="bg-zinc-900 border border-zinc-800" style={{ borderRadius: "6px" }}>
                  <div
                    onClick={() => setExpandedReport(!expandedReport)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                    style={{ borderRadius: "6px" }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" style={{ color: "#6C5DD3" }} />
                      <span className="text-sm font-semibold text-white">AI Analysis Report</span>
                      <span className="text-[9px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5" style={{ borderRadius: "3px" }}>
                        {summary.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard() }}
                        className="text-zinc-400 hover:text-white p-1 hover:bg-zinc-700 transition-colors"
                        style={{ borderRadius: "4px" }}
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {expandedReport ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedReport && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
                          <div className="prose prose-sm prose-invert max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-400 prose-strong:text-zinc-200 prose-li:text-zinc-400">
                            <ReactMarkdown>{summary.content_markdown}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Remediation */}
                <div className="bg-zinc-900 border border-zinc-800" style={{ borderRadius: "6px" }}>
                  <div
                    onClick={() => setExpandedRemediation(!expandedRemediation)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                    style={{ borderRadius: "6px" }}
                  >
                    <span className="text-sm font-semibold text-white">Remediation Steps</span>
                    {expandedRemediation ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <AnimatePresence>
                    {expandedRemediation && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
                          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {summary.sections.remediation_steps || "No remediation steps available."}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Attack Chains Preview */}
                {chains.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 p-4" style={{ borderRadius: "6px" }}>
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Attack Chains</p>
                    <div className="space-y-3">
                      {chains.slice(0, 3).map((chain) => (
                        <div key={chain.id} className="bg-zinc-800/50 border border-zinc-700/50 p-3" style={{ borderRadius: "6px" }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">{chain.affected_users[0] || "Unknown"}</span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 text-white"
                              style={{
                                borderRadius: "4px",
                                backgroundColor: chain.chain_confidence >= 0.8 ? "#EF4444" : chain.chain_confidence >= 0.5 ? "#F59E0B" : "#00A8CC",
                              }}
                            >
                              {Math.round(chain.chain_confidence * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {chain.kill_chain_phases.slice(0, 4).map((phase) => (
                              <span
                                key={phase}
                                className="text-[9px] font-semibold px-1.5 py-0.5 text-white capitalize"
                                style={{ backgroundColor: "#6C5DD3", borderRadius: "3px" }}
                              >
                                {phase.split("-")[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Key Findings */}
              <KeyFindings findings={findingsForTable} affectedUsers={uniqueUsers} affectedHosts={uniqueHosts} />
            </div>

            {/* Kill Chain Progression */}
            {allPhases.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-4" style={{ borderRadius: "6px" }}>
                <KillChainTimeline phases={allPhases} />
              </div>
            )}
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
