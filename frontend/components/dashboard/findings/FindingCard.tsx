import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Clock, ExternalLink, Globe, Server, ShieldAlert, User, Activity, Fingerprint } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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

interface FindingCardProps {
  finding: Finding
  index: number
}

const severityConfig: Record<string, { color: string, border: string, bg: string, glow: string }> = {
  critical: { color: "text-red-400", border: "border-red-500/40", bg: "bg-red-500/10", glow: "shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]" },
  high: { color: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10", glow: "shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]" },
  medium: { color: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/10", glow: "shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]" },
  low: { color: "text-cyan-400", border: "border-cyan-500/40", bg: "bg-cyan-500/10", glow: "shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)]" },
  info: { color: "text-zinc-400", border: "border-zinc-500/30", bg: "bg-zinc-500/5", glow: "" },
}

const typeLabels: Record<string, string> = {
  rule: "Static Signal",
  ml_anomaly: "Heuristic Anomaly",
  impossible_travel: "Geo-Spatial Logic",
  priv_esc: "Privilege Escalation",
  persistence: "Establish Persistence",
  lateral: "Lateral Vector",
}

export default function FindingCard({ finding, index }: FindingCardProps) {
  const [expanded, setExpanded] = useState(false)
  const sev = severityConfig[finding.severity] || severityConfig.info

  const anomalyScoreRaw =
    typeof finding.anomaly_score === "number"
      ? finding.anomaly_score
      : typeof finding.details?.anomaly_score === "number"
        ? Number(finding.details?.anomaly_score)
        : undefined

  const anomalyScore =
    typeof anomalyScoreRaw === "number"
      ? Math.max(0, Math.min(1, anomalyScoreRaw))
      : undefined

  const riskScore =
    typeof finding.details?.risk_score === "number"
      ? Math.round(Number(finding.details.risk_score))
      : undefined

  const formatTime = (ts?: string) => {
    if (!ts) return ""
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return ts
    }
  }

  return (
    <motion.article
      layout
      transition={{ layout: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } }}
      className={cn(
        "group relative list-item-card rounded-[1.25rem] transition-colors duration-300",
        expanded ? "bg-white/[0.04] border-white/20" : "hover:border-white/15"
      )}
    >
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[3px] transition-opacity duration-500 opacity-60 rounded-l-[1.25rem]",
        sev.bg.replace('/10', '/50'),
        expanded ? "opacity-100" : "opacity-0"
      )} />

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center gap-6 p-5"
      >
        <div className={cn(
          "h-12 w-12 rounded-xl border flex flex-col items-center justify-center flex-shrink-0 transition-all duration-500",
          sev.bg, sev.border, sev.glow,
          expanded && "scale-110"
        )}>
           <span className={cn("text-[9px] font-black uppercase tracking-tighter leading-none mb-0.5", sev.color)}>RISK</span>
           <span className={cn("text-lg font-black leading-none mono-data", sev.color)}>{riskScore || "-"}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 overflow-hidden">
             <Fingerprint className="w-3 h-3 text-primary/40 flex-shrink-0" />
             <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
                SIG::{finding.rule_id || "CORE-SIG"} · FORENSIC-BLOCK-77
             </p>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight leading-tight group-hover:text-primary transition-colors duration-300">
            {finding.title}
          </h3>
          <div className="flex items-center gap-4 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5">
               <Clock className="w-3.5 h-3.5 text-zinc-500" />
               <span className="text-[10px] font-bold text-zinc-400 mono-data uppercase tracking-widest">{formatTime(finding.timestamp_start)}</span>
            </div>
            {finding.mitre_techniques?.length && (
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400 mono-data">{finding.mitre_techniques[0]}</span>
              </div>
            )}
            <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border", sev.bg, sev.border, sev.color)}>
               {finding.severity}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
           <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Vector Status</span>
           <Badge variant="outline" className="border-white/5 bg-white/[0.02] text-zinc-300 font-bold text-[9px] px-3 py-1 uppercase tracking-widest rounded-lg">
             {typeLabels[finding.detection_type] || finding.detection_type}
           </Badge>
        </div>

        <div className={cn(
          "w-10 h-10 rounded-xl border border-white/[0.05] flex items-center justify-center transition-all duration-500",
          expanded ? "bg-primary/20 border-primary/30 text-white rotate-180" : "text-zinc-500 group-hover:bg-white/5"
        )}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
           layout
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="overflow-hidden border-t border-white/[0.04]"
        >
          <div className="px-6 pb-6 pt-6 space-y-8">
              {finding.description && (
                <div className="max-w-3xl">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-3">Threat Context</p>
                  <p className="text-sm font-medium text-zinc-300 leading-relaxed italic border-l-2 border-primary/30 pl-4 bg-primary/5 py-3 rounded-r-xl">{finding.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {finding.affected_users?.length && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Identity Nodes</p>
                    <div className="flex flex-wrap gap-2">
                      {finding.affected_users.map((u) => (
                        <div key={u} className="flex items-center gap-2 text-[11px] font-bold text-zinc-300 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors">
                          <User className="w-3.5 h-3.5 text-primary opacity-60" />
                          {u}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {finding.affected_hosts?.length && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Hardware Targets</p>
                    <div className="flex flex-wrap gap-2">
                      {finding.affected_hosts.map((h) => (
                        <div key={h} className="flex items-center gap-2 text-[11px] font-bold text-zinc-300 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors">
                          <Server className="w-3.5 h-3.5 text-accent opacity-60" />
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {finding.source_ips?.length && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Network Sovereignty</p>
                    <div className="flex flex-wrap gap-2">
                      {finding.source_ips.map((ip) => (
                        <div key={ip} className="flex items-center gap-2 text-[11px] font-bold text-zinc-300 bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-xl mono-data hover:bg-white/[0.06] transition-colors">
                          <Globe className="w-3.5 h-3.5 text-cyan-400 opacity-60" />
                          {ip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {finding.mitre_techniques?.length && (
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">MITRE ATT&CK Matrix Mapping</p>
                  <div className="flex flex-wrap gap-3">
                    {finding.mitre_techniques.map((t) => (
                      <a
                        key={t}
                        href={`https://attack.mitre.org/techniques/${t.replace(".", "/")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-4 py-2 hover:bg-primary/20 transition-all rounded-2xl group/link shadow-lg shadow-primary/5"
                      >
                        <span className="mono-data">{t}</span>
                        <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {anomalyScore !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Neural Anomaly Heuristics</p>
                     <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{finding.ml_method || "Sentinel-ISO"}</span>
                  </div>
                  <div className="flex items-center gap-6 bg-white/[0.02] border border-white/[0.04] p-4 rounded-3xl">
                    <div className="flex-1 h-3 bg-zinc-950 border border-white/[0.05] overflow-hidden rounded-full p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${anomalyScore * 100}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={cn(
                          "h-full rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]",
                          anomalyScore >= 0.8 ? "bg-red-500" : anomalyScore >= 0.5 ? "bg-primary" : "bg-cyan-500"
                        )}
                      />
                    </div>
                    <div className="text-right flex-shrink-0">
                       <p className="text-2xl font-black text-white mono-data">{(anomalyScore * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}

              {finding.details && Object.keys(finding.details).length > 0 && (
                <details className="group">
                  <summary className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] cursor-pointer hover:text-primary transition-all flex items-center gap-3 py-4 border-t border-white/[0.02] list-none">
                    <div className="w-2 h-2 rounded-full border border-zinc-700 bg-zinc-900 group-open:bg-primary group-open:border-primary transition-colors" />
                    Tactical JSON Core Breakdown
                  </summary>
                  <div className="mt-4 relative group/code bg-black/40 rounded-3xl p-6 border border-white/[0.04]">
                      <pre className="text-[11px] text-zinc-400 overflow-x-auto scrollbar-thin max-h-96 mono-data leading-relaxed">
                        {JSON.stringify(finding.details, null, 2)}
                      </pre>
                  </div>
                </details>
              )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.article>
  )
}
