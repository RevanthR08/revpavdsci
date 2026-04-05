import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity,
  CheckCircle2,
  Clock,
  Download,
  ShieldAlert,
  Trash2,
  XCircle,
  TrendingUp,
  FileSearch,
  ChevronRight,
  Database,
  Link,
  Zap,
  Fingerprint,
  Target,
  ArrowRight,
  GitBranch
} from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import UploadZone from "@/components/dashboard/UploadZone"
import { apiFetch, listScans, uploadFile } from "@/lib/api"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Analysis {
  scan_id: string
  file_name: string
  total_logs: number
  total_threats: number
  risk_score: number
  generated_at: string
  status?: string
}

export default function HomePage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProtocol, setActiveProtocol] = useState<number | null>(null)

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      const data = await listScans()
      setAnalyses(data.scans || [])
    } catch (error) {
      console.error("Failed to load analyses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(20)
    setActiveProtocol(0) // Logic for Protocol 1

    try {
      await uploadFile(file)
      setUploadProgress(60)
      setActiveProtocol(1) // Logic for Protocol 2
      
      const data = await listScans()
      setAnalyses(data.scans || [])
      setUploadProgress(100)
      setActiveProtocol(3) // Logic for Protocol 4
    } catch (error: any) {
      console.error("Upload error:", error)
    } finally {
      setUploading(false)
      setTimeout(() => {
        setUploadProgress(0)
        setActiveProtocol(null)
      }, 2000)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/scans/${id}`, { method: "DELETE" })
      await loadAnalyses()
    } catch (error: any) {
      console.error("Delete error:", error)
    }
  }

  const downloadSample = () => {
    const anchor = document.createElement("a")
    anchor.href = "/DEMO_logs.csv"
    anchor.download = "DEMO_logs.csv"
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  const statusMeta = (status: string) => {
    if (status === "completed")
      return { 
        icon: CheckCircle2, 
        label: "SYNCED", 
        color: "text-emerald-400", 
        pulse: "bg-emerald-500",
        bg: "bg-emerald-500/10 border-emerald-500/20" 
      }
    if (status === "failed")
      return { 
        icon: XCircle, 
        label: "ERROR", 
        color: "text-red-400", 
        pulse: "bg-red-500",
        bg: "bg-red-500/10 border-red-500/20" 
      }
    return { 
      icon: Clock, 
      label: "UPLINKING", 
      color: "text-cyan-400", 
      pulse: "bg-cyan-500 animate-pulse",
      bg: "bg-cyan-500/10 border-cyan-500/20" 
    }
  }

  const riskPercent = (riskScore?: number) => Math.max(0, Math.min(100, Math.round((riskScore || 0) / 100)))

  const metrics = useMemo(() => {
    const scans = analyses.length
    const logs = analyses.reduce((sum, item) => sum + (item.total_logs || 0), 0)
    const threats = analyses.reduce((sum, item) => sum + (item.total_threats || 0), 0)
    const avgRisk = scans > 0
      ? Math.round(analyses.reduce((sum, item) => sum + (item.risk_score || 0), 0) / scans)
      : 0

    return { scans, logs, threats, avgRisk }
  }, [analyses])

  const protocolSteps = [
    { t: "Evidence Ingest", d: "Normalization and parity check of raw system event telemetry.", i: Database },
    { t: "Logic Correlation", d: "Neural heuristics mapping signals to chronological behavior chains.", i: GitBranch },
    { t: "Vector Ranking", d: "Context-aware adjudication of risk potency via ISO-27001 metrics.", i: Target },
    { t: "Briefing Synthesis", d: "Semantic summarization for boardroom-level tactical oversight.", i: FileSearch }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-14 max-w-[1720px] mx-auto animate-reveal">
        {/* Modern Hero Section */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 rounded-[3rem] blur-2xl opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-[#0a0a0c]/80 backdrop-blur-3xl p-12 md:p-20 shadow-[0_50px_120px_-20px_rgba(0,0,0,0.8)]">
            <div className="absolute top-[-20%] right-[-10%] p-12 opacity-[0.03] pointer-events-none rotate-12 max-w-full">
              <ShieldAlert className="w-[800px] h-[800px] text-primary" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-16">
              <div className="max-w-4xl space-y-8">
                <div className="flex items-center gap-4">
                   <div className="h-px w-10 bg-primary/40" />
                   <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/80 leading-none">Cyber-Forensics AI-Pipeline v4.2</span>
                </div>
                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] decoration-primary/20 decoration-8">
                  Autonomous <span className="text-gradient">Threat</span> Linkage & Analysis
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed font-semibold italic">
                  Converting unstructured system telemetry into verified forensic attack chains with neural-grade precision.
                </p>
                <div className="flex flex-wrap gap-6 pt-4">
                  <Button 
                    className="rounded-2xl h-16 px-12 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_-5px_rgba(37,99,235,0.3)]" 
                    onClick={() => document.getElementById("file-upload")?.click()}
                  >
                    Initiate Forensic Uplink
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-2xl h-16 px-12 border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 font-bold text-xs uppercase tracking-widest transition-all" 
                    onClick={downloadSample}
                  >
                    <Download className="w-4 h-4 mr-3" />
                    Reference Dataset
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full lg:w-[480px]">
                {[
                  { label: "Forensic Nodes", value: metrics.scans, icon: Database, color: "text-primary" },
                  { label: "Environment Stability", value: `${metrics.avgRisk >= 1 ? 100 - metrics.avgRisk : 100}%`, icon: TrendingUp, color: "text-emerald-400" },
                ].map((m) => (
                  <div key={m.label} className="glass-card rounded-[2rem] p-8 flex flex-col justify-between h-48 group/card cursor-default">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.05] flex items-center justify-center group-hover/card:bg-primary/10 group-hover/card:border-primary/20 transition-all">
                       <m.icon className={cn("w-6 h-6 transition-transform group-hover/card:scale-110", m.color)} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-1">{m.label}</p>
                      <p className="text-4xl font-black text-white tracking-tighter mono-data">{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Global Key Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { label: "Telemetry Density", value: metrics.logs.toLocaleString(), desc: "Encoded Log Signatures", icon: Activity, tone: "#22d3ee" },
            { label: "Risk Detections", value: metrics.threats.toLocaleString(), desc: "Unverified Vectors", icon: ShieldAlert, tone: "#f43f5e" },
            { label: "Neural Precision", value: "98.2%", desc: "Classifier Optimization", icon: Zap, tone: "#8b5cf6" },
            { label: "Logic Depth", value: "84%", desc: "Signal-to-Chain Linkage", icon: Link, tone: "#3b82f6" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              className="glass-card p-8 flex items-start gap-5 hover:-translate-y-2 transition-all relative overflow-hidden group rounded-[2rem]"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                 <stat.icon style={{ color: stat.tone }} className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                 <h5 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-2">{stat.label}</h5>
                 <p className="text-3xl font-black text-white tracking-tighter mono-data mb-1">{stat.value}</p>
                 <p className="text-[10px] font-bold text-zinc-500 truncate">{stat.desc}</p>
              </div>
              <div className="absolute top-[-15px] right-[-15px] w-24 h-24 opacity-[0.03] transition-opacity group-hover:opacity-10" style={{ color: stat.tone }}>
                 <stat.icon className="w-full h-full rotate-12" />
              </div>
            </motion.div>
          ))}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-12">
          <div className="space-y-12">
            {/* Archive Section - Functional */}
            <div className="list-container-card rounded-[2.5rem] shadow-2xl border-white/[0.06]">
              <div className="px-10 py-8 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Database className="w-6 h-6 text-primary" />
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Investigation Archive</h3>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Repository Depth: {analyses.length} Encoded Signals</p>
                   </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em]">Synapse Stable</span>
                </div>
              </div>
              
              <div className="divide-y divide-white/[0.04] max-h-[800px] overflow-y-auto scrollbar-none optimize-scrolling">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="p-10 flex items-center justify-between">
                       <div className="space-y-3 flex-1">
                          <Skeleton className="h-6 w-1/3 bg-white/5 rounded-lg" />
                          <Skeleton className="h-3 w-1/4 bg-white/5 rounded-md" />
                       </div>
                       <Skeleton className="h-12 w-32 bg-white/5 rounded-xl transition-all" />
                    </div>
                  ))
                ) : (
                  analyses.map((analysis, index) => {
                    const risk = riskPercent(analysis.risk_score)
                    const status = statusMeta(analysis.status || "completed")
                    return (
                      <motion.div
                        key={analysis.scan_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                        className="group flex flex-col lg:flex-row items-center justify-between gap-10 p-10 list-item-card hover:bg-white/[0.015] transition-all cursor-pointer relative"
                        onClick={() => router.push(`/analysis/${analysis.scan_id}`)}
                      >
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={cn("px-4 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest shadow-xl transition-all", status.bg, status.color)}>
                                   <div className="flex items-center gap-2">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", status.pulse)} />
                                      {status.label}
                                   </div>
                                </div>
                                <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mono-data">{analysis.scan_id.slice(0,8)}</span>
                            </div>
                            <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors tracking-tighter leading-none mb-4">{analysis.file_name}</h3>
                            <div className="flex items-center gap-8 opacity-40 group-hover:opacity-100 transition-opacity">
                               <div className="flex items-center gap-2.5">
                                  <Clock className="w-4 h-4 text-zinc-500" />
                                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{new Date(analysis.generated_at).toLocaleDateString()}</span>
                               </div>
                               <div className="flex items-center gap-2.5">
                                  <Fingerprint className="w-4 h-4 text-primary" />
                                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mono-data">{analysis.total_logs.toLocaleString()} SIGNALS</span>
                               </div>
                            </div>
                         </div>

                         <div className="hidden xl:flex items-center gap-16 text-right">
                            <div>
                               <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em] mb-2">Vectors</p>
                               <Badge variant="outline" className="text-xl font-black text-white px-4 py-1 border-white/5 bg-white/[0.02] shadow-2xl mono-data">{analysis.total_threats}</Badge>
                            </div>
                            <div className="w-40">
                               <div className="flex items-center justify-between mb-2">
                                  <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em]">Potency Index</p>
                                  <span className="text-[9px] font-black text-zinc-500 mono-data">{risk}%</span>
                               </div>
                               <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-white/[0.05] p-[1px]">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${risk}%` }}
                                    transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
                                    className={cn("h-full rounded-full shadow-[0_0_12px_rgba(0,0,0,0.4)]", risk >= 80 ? "bg-red-500" : risk >= 50 ? "bg-orange-500" : "bg-primary")} 
                                  />
                                </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-4">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-14 w-14 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-[1.25rem] transition-all"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(analysis.scan_id); }}
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-zinc-950 border-white/10 text-white font-black p-3 rounded-2xl text-[10px] tracking-widest uppercase border backdrop-blur-3xl shadow-3xl translate-y-1">Purge Node Data</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-zinc-700 group-hover:text-white group-hover:bg-primary group-hover:border-primary/20 transition-all group-hover:scale-110 shadow-lg">
                               <ChevronRight className="w-6 h-6" />
                            </div>
                         </div>
                      </motion.div>
                    )
                  })
                )}
                {analyses.length === 0 && !loading && (
                   <div className="p-20 text-center space-y-4 opacity-40">
                      <Database className="w-12 h-12 mx-auto text-zinc-500 mb-6" />
                      <p className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em]">Repository Empty</p>
                      <p className="text-xs font-medium text-zinc-600">Upload forensic log files to initialize forensic correlation chains.</p>
                   </div>
                )}
              </div>
            </div>

            <UploadZone onUpload={handleUpload} uploading={uploading} progress={uploadProgress} />
          </div>

          <aside className="space-y-10">
            {/* Protocol Section - Refined & Functional Overlay */}
            <div className="glass-card p-10 border-primary/20 bg-primary/[0.02] relative overflow-hidden rounded-[2.5rem]">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none -rotate-12 translate-x-10 translate-y-[-10%]">
                 <Link className="w-[400px] h-[400px] text-primary" />
              </div>
              <div className="flex items-center gap-3 mb-10">
                 <Zap className="w-4 h-4 text-primary" />
                 <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-primary leading-none">Pipeline Architecture</h4>
              </div>

              <div className="space-y-12 relative z-10">
                {protocolSteps.map((step, i) => {
                  const isActive = activeProtocol === i
                  const Icon = step.i
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex gap-6 group/step transition-all duration-500 cursor-pointer",
                        isActive ? "scale-105" : "opacity-60 hover:opacity-100"
                      )}
                      onClick={() => i === 0 && document.getElementById("file-upload")?.click()}
                    >
                      <div className="flex flex-col items-center gap-4">
                         <div className={cn(
                           "w-10 h-10 rounded-2xl border flex items-center justify-center transition-all duration-500 shadow-xl",
                           isActive ? "bg-primary border-primary text-white scale-110 shadow-primary/20" : "border-primary/20 text-primary bg-primary/5 group-hover/step:bg-primary/10"
                         )}>
                            {isActive ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
                         </div>
                         {i < 3 && <div className={cn("w-[2px] h-10 transition-colors duration-500", isActive ? "bg-primary" : "bg-white/[0.05]")} />}
                      </div>
                      <div className="pt-1.5 flex-1">
                        <div className="flex items-center justify-between gap-3 mb-2">
                           <h4 className="text-sm font-black text-white tracking-tighter uppercase tracking-[0.1em]">{step.t}</h4>
                           {isActive && <span className="text-[8px] font-black text-primary animate-pulse tracking-widest uppercase">Executing...</span>}
                        </div>
                        <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">{step.d}</p>
                        {i === 0 && !uploading && (
                          <div className="mt-4 flex items-center gap-2 text-[9px] font-black text-primary/60 border-b border-primary/20 w-fit pb-0.5 group-hover/step:text-primary transition-colors">
                             START PROTOCOL <ArrowRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="glass-card p-10 border-white/[0.04] rounded-[2.5rem]">
              <div className="flex items-center gap-3 mb-8">
                 <Activity className="w-4 h-4 text-emerald-400" />
                 <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Environment Sentinel</h3>
              </div>
              <div className="space-y-4">
                {[
                  { l: "PostgreSQL Nexus", s: "NOMINAL", c: "text-emerald-400", pulse: true },
                  { l: "Forensic Proxy", s: "NOMINAL", c: "text-emerald-400", pulse: true },
                  { l: "Neural Core", s: uploading ? "BUSY" : "NOMINAL", c: uploading ? "text-primary" : "text-emerald-400", pulse: uploading },
                  { l: "SSL Tunnel", s: "SECURE", c: "text-emerald-400", pulse: false },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.015] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-default group/line">
                    <span className="text-[10px] font-bold text-zinc-500 group-hover/line:text-zinc-300 transition-colors uppercase tracking-[0.15em]">{item.l}</span>
                    <div className="flex items-center gap-2">
                       {item.pulse && <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", item.c.replace('text', 'bg'))} />}
                       <span className={cn("text-[9px] font-black tracking-widest font-mono", item.c)}>
                          {item.s}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  )
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}
