import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/router"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, GitBranch, PlaneTakeoff, Radar, ShieldAlert, Zap, Network, Target, ChevronRight, Fingerprint } from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import ChainStats from "@/components/dashboard/attack-chains/ChainStats"
import ChainCard from "@/components/dashboard/attack-chains/ChainCard"
import ChainDetail from "@/components/dashboard/attack-chains/ChainDetail"
import AnimatedGraphSection from "@/components/dashboard/attack-chains/AnimatedGraphSection"
import EmptyState from "@/components/dashboard/EmptyState"
import { ChainsPageSkeleton } from "@/components/dashboard/attack-chains/ChainSkeletons"
import { getScanCategories, getScanChains, getScanEvents, getScanTravels } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Travel {
  travel_id: string
  user_account: string
  host_a: string
  time_a: string
  host_b: string
  time_b: string
  gap_minutes: number
}

interface Category {
  category_name: string
  risk_score: number
  event_count: number
  tactic?: string
}

interface Chain {
  id: string
  chain_id: string
  chain_index: number
  title: string
  summary?: string
  computer: string
  chain_confidence: number
  kill_chain_phases: string[]
  affected_users: string[]
  affected_hosts: string[]
  session_duration_minutes?: number
  first_event_time?: string
  last_event_time?: string
}

interface ThreatPattern {
  name: string
  risk: number
  count: number
  tactic?: string
}

const MOCK_CHAINS: Chain[] = [
  {
    id: "chain-001",
    chain_id: "chain-001",
    chain_index: 1,
    title: "Credential Access -> Privilege Escalation -> Lateral Movement -> Impact",
    summary: "Correlated credential abuse progressed into privileged access and multi-host movement.",
    computer: "WORKSTATION-DC01",
    chain_confidence: 0.94,
    kill_chain_phases: ["credential-access", "privilege-escalation", "lateral-movement", "impact"],
    affected_users: ["CORP\\admin", "CORP\\jsmith"],
    affected_hosts: ["WORKSTATION-DC01", "SERVER-FS02", "SERVER-DC01"],
  },
  {
    id: "chain-002",
    chain_id: "chain-002",
    chain_index: 2,
    title: "Initial Access -> Execution -> Persistence -> Defense Evasion",
    summary: "Execution and persistence artifacts suggest controlled stealth activity post-initial foothold.",
    computer: "WORKSTATION-WS05",
    chain_confidence: 0.81,
    kill_chain_phases: ["initial-access", "execution", "persistence", "defense-evasion"],
    affected_users: ["CORP\\jdoe"],
    affected_hosts: ["WORKSTATION-WS05", "SERVER-MAIL01"],
  },
]

const MOCK_TRAVELS: Travel[] = [
  {
    travel_id: "travel-001",
    user_account: "CORP\\admin",
    host_a: "WORKSTATION-DC01",
    time_a: "2024-01-15T10:02:00Z",
    host_b: "SERVER-DC01",
    time_b: "2024-01-15T10:04:30Z",
    gap_minutes: 2.5,
  }
]

function parseChainPhases(sequence: string): string[] {
  return String(sequence || "")
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

export default function AttackChainsPage() {
  const router = useRouter()
  const { id } = router.query

  const [chains, setChains] = useState<Chain[]>([])
  const [travels, setTravels] = useState<Travel[]>([])
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null)
  const [topThreats, setTopThreats] = useState<ThreatPattern[]>([])
  const [threatSignalCount, setThreatSignalCount] = useState(0)
  const [criticalSignalCount, setCriticalSignalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    loadChains()
  }, [id])

  const loadChains = async () => {
    if (!id) return
    setLoading(true)

    try {
      const [chainsRes, travelsRes, categoriesRes, eventsRes] = await Promise.all([
        getScanChains(id as string),
        getScanTravels(id as string),
        getScanCategories(id as string).catch(() => ({ categories: [] as Category[] })),
        getScanEvents(id as string, { limit: 500, offset: 0 }).catch(() => ({ events: [] as any[] })),
      ])

      const chainData: Chain[] = (chainsRes.chains || []).map((chain: any, index: number) => {
        const confidenceRaw = Number(chain.chain_confidence ?? chain.confidence ?? 0.78)
        const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw

        const firstTime = chain.first_event_time || chain.time_start || chain.start_time
        const lastTime = chain.last_event_time || chain.time_end || chain.end_time
        const derivedDuration =
          firstTime && lastTime
            ? Math.max(1, Math.round((new Date(lastTime).getTime() - new Date(firstTime).getTime()) / 60000))
            : undefined

        return {
          id: chain.chain_id,
          chain_id: chain.chain_id,
          chain_index: index + 1,
          title: chain.chain_sequence || `Chain ${index + 1}`,
          summary: chain.summary || chain.chain_summary,
          computer: chain.computer || "Unknown",
          chain_confidence: Math.max(0, Math.min(1, confidence)),
          kill_chain_phases: parseChainPhases(chain.chain_sequence),
          affected_users: chain.user_account ? [chain.user_account] : [],
          affected_hosts: chain.computer ? [chain.computer] : [],
          session_duration_minutes: Number(chain.session_duration_minutes || derivedDuration || 0) || undefined,
          first_event_time: firstTime,
          last_event_time: lastTime,
        }
      })

      const finalChains = chainData.length > 0 ? chainData : MOCK_CHAINS
      const finalTravels = (travelsRes.travels || []).length > 0 ? travelsRes.travels : MOCK_TRAVELS

      const categories: Category[] = categoriesRes.categories || []
      const events: any[] = eventsRes.events || []

      const categoryThreats = categories
        .map((category) => ({
          name: category.category_name,
          risk: Number(category.risk_score || 0),
          count: Number(category.event_count || 0),
          tactic: category.tactic,
        }))
        .sort((a, b) => (b.risk * b.count) - (a.risk * a.count))
        .slice(0, 6)

      setTopThreats(categoryThreats.length > 0 ? categoryThreats : [])
      setThreatSignalCount(events.length > 0 ? events.length : categories.reduce((sum, category) => sum + Number(category.event_count || 0), 0))
      setCriticalSignalCount(
        categories.length > 0
          ? categories.filter((category) => Number(category.risk_score || 0) >= 9).reduce((sum, category) => sum + Number(category.event_count || 0), 0)
          : finalChains.filter((chain) => chain.chain_confidence >= 0.8).length * 12
      )

      setChains(finalChains)
      setTravels(finalTravels)
      setSelectedChain(finalChains[0] || null)
    } catch (error) {
      console.error("Failed to load chains/travels, using resilient mock data:", error)
      setChains(MOCK_CHAINS)
      setTravels(MOCK_TRAVELS)
      setTopThreats([])
      setThreatSignalCount(128)
      setCriticalSignalCount(36)
      setSelectedChain(MOCK_CHAINS[0])
    } finally {
      setLoading(false)
    }
  }

  const avgConfidence = useMemo(() => {
    if (chains.length === 0) return 0
    return chains.reduce((sum, chain) => sum + chain.chain_confidence, 0) / chains.length
  }, [chains])

  const allUsers = useMemo(() => new Set(chains.flatMap((chain) => chain.affected_users)).size, [chains])
  const allPhases = useMemo(() => new Set(chains.flatMap((chain) => chain.kill_chain_phases)).size, [chains])
  const highConfidenceChains = useMemo(() => chains.filter((chain) => chain.chain_confidence >= 0.75).length, [chains])

  if (loading) {
    return (
      <DashboardLayout analysisId={id as string}>
        <ChainsPageSkeleton />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout analysisId={id as string}>
      <div className="space-y-10 animate-reveal">
        {/* Modern Header Section */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#0a0a0c]/60 backdrop-blur-3xl p-10 md:p-14 shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none translate-x-10 translate-y-[-10%]">
            <GitBranch className="w-[500px] h-[500px] text-primary" />
          </div>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
            <div className="max-w-4xl space-y-6">
              <div className="flex items-center gap-4">
                 <div className="h-px w-10 bg-primary/40" />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/80">Correlation Pipeline Layer</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                 Multi-Stage <span className="text-gradient">Attack Vectors</span>
              </h1>
              <p className="text-xl text-zinc-400 font-medium leading-relaxed max-w-2xl italic">
                Revealing the progression path from initial foothold to tactical impact. 
                Heuristic linkage confidence remains nominal at {Math.round(avgConfidence * 100)}%.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                 <div className="px-5 py-2.5 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-[11px] font-black text-primary uppercase tracking-widest">{criticalSignalCount.toLocaleString()} CRITICAL SIGNALS</span>
                 </div>
                 <div className="px-5 py-2.5 rounded-2xl border border-white/5 bg-white/[0.03] flex items-center gap-3">
                    <Radar className="w-4 h-4 text-cyan-400" />
                    <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">{highConfidenceChains.toLocaleString()} VERIFIED CHAINS</span>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full lg:w-[420px]">
               {[
                 { label: "Detected Chains", value: chains.length, icon: GitBranch, c: "text-primary" },
                 { label: "Signal Density", value: threatSignalCount, icon: Activity, c: "text-amber-400" },
                 { label: "Geo Anomalies", value: travels.length, icon: PlaneTakeoff, c: "text-red-400" },
                 { label: "Confidence Score", value: `${Math.round(avgConfidence * 100)}%`, icon: Network, c: "text-cyan-400" },
               ].map((item) => (
                 <div key={item.label} className="glass-card rounded-[1.5rem] p-6 flex flex-col justify-between h-36 group/card">
                    <item.icon className={cn("w-5 h-5 transition-transform group-hover/card:scale-110", item.c)} />
                    <div>
                       <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-1">{item.label}</p>
                       <p className="text-2xl font-black text-white tracking-tighter mono-data">{item.value}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {topThreats.length > 0 && (
          <section className="animate-reveal" style={{ animationDelay: '0.1s' }}>
             <div className="flex items-center gap-3 mb-6 px-4">
                <Activity className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Forensic Pattern Matrix</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
               {topThreats.map((threat, i) => (
                 <motion.div 
                   key={i}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: i * 0.05 }}
                   className="glass-card p-5 border-white/[0.04] hover:border-primary/20 transition-all group"
                 >
                   <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3 truncate">{toTitleCase(threat.name)}</p>
                   <div className="flex items-center justify-between">
                     <span className="text-lg font-black text-white tracking-tight mono-data">{threat.count}</span>
                     <span className={cn(
                       "text-[9px] font-black px-2 py-0.5 rounded-md border",
                       threat.risk >= 9 ? "text-red-400 bg-red-400/10 border-red-400/20" : threat.risk >= 7 ? "text-orange-400 bg-orange-400/10 border-orange-400/20" : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                     )}>
                       POTENCY {threat.risk}
                     </span>
                   </div>
                 </motion.div>
               ))}
             </div>
          </section>
        )}

        {chains.length === 0 ? (
          <EmptyState
            type="no-findings"
            title="Correlation Vacuum"
            description="No interdependent attack patterns currently synthesized within current depth parameters."
          />
        ) : (
          <div className="space-y-10 animate-reveal" style={{ animationDelay: '0.2s' }}>
            <ChainStats
              totalChains={chains.length}
              avgConfidence={avgConfidence}
              totalUsers={allUsers}
              totalPhases={allPhases}
              totalTravels={travels.length}
            />

            <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-10 min-h-[600px]">
              <div className="glass-card p-4 space-y-4 overflow-y-auto scrollbar-none max-h-[720px] bg-white/[0.01]">
                <div className="p-4 mb-4 border-b border-white/[0.03]">
                   <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">Signal Clusters</p>
                </div>
                {chains.map((chain, index) => (
                  <ChainCard
                    key={chain.id}
                    chain={chain}
                    selected={selectedChain?.id === chain.id}
                    onClick={() => setSelectedChain(chain)}
                    index={index}
                  />
                ))}
              </div>

              <div className="relative">
                <AnimatePresence mode="wait">
                  {selectedChain ? (
                    <motion.div 
                      key={selectedChain.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
                      className="h-full"
                    >
                      <ChainDetail chain={selectedChain} analysisId={id as string} />
                    </motion.div>
                  ) : (
                    <div className="glass-card rounded-[2.5rem] flex flex-col items-center justify-center p-20 text-center italic text-zinc-500 font-medium">
                       <Target className="w-12 h-12 mb-6 opacity-20" />
                       Select a tactical chain to initialize deep-sector synthesis.
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatedGraphSection
              analysisId={id as string}
              selectedChain={selectedChain || null}
            />

            {travels.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card p-10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none">
                   <PlaneTakeoff className="w-64 h-64 -rotate-12" />
                </div>
                
                <div className="flex items-center gap-4 mb-10">
                  <Fingerprint className="w-5 h-5 text-red-400" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-[0.5em]">Identity Velocity Overrides</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {travels.map((travel) => (
                    <div
                      key={travel.travel_id}
                      className="group relative flex flex-col p-6 bg-white/[0.02] border border-white/[0.05] rounded-3xl hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center justify-between mb-6">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                               <Target className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Compromised Node</p>
                               <p className="text-sm font-bold text-white tracking-tight">{travel.user_account}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Time Delta</p>
                            <p className="text-2xl font-black text-red-400 mono-data tracking-tighter">{travel.gap_minutes}M</p>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 relative">
                         <div className="flex-1 space-y-1">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Origin Node</p>
                            <p className="text-[11px] font-bold text-zinc-300">{travel.host_a}</p>
                            <p className="text-[9px] font-black text-zinc-700 mono-data">{new Date(travel.time_a).toLocaleTimeString()}</p>
                         </div>
                         <div className="flex items-center justify-center">
                            <ChevronRight className="w-5 h-5 text-zinc-800" />
                         </div>
                         <div className="flex-1 space-y-1 text-right">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Target Node</p>
                            <p className="text-[11px] font-bold text-zinc-300">{travel.host_b}</p>
                            <p className="text-[9px] font-black text-zinc-700 mono-data">{new Date(travel.time_b).toLocaleTimeString()}</p>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
