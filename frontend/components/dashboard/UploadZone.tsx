import React, { useCallback, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, Loader2, Sparkles, UploadCloud, X, ShieldCheck, Zap, Fingerprint } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface UploadZoneProps {
  onUpload: (file: File) => void
  uploading: boolean
  progress?: number
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function UploadZone({ onUpload, uploading, progress = 0 }: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true)
    }
    if (event.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".csv")) return
    setSelectedFile(file)
  }, [])

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
  }

  const handleUpload = () => {
    if (!selectedFile || uploading) return
    onUpload(selectedFile)
  }

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.05] bg-[#0a0a0c]/40 backdrop-blur-3xl p-10 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] group"
    >
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <Fingerprint className="w-5 h-5 text-primary" />
             <p className="text-[10px] uppercase font-black tracking-[0.4em] text-zinc-600">Forensic Ingest Protocol</p>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight leading-none">Dataset Uplink Terminal</h2>
          <p className="text-sm font-medium text-zinc-500 mt-4 max-w-lg leading-relaxed italic">
            Inject Windows event telemetry (CSV) into the neural correlation pipeline. 
            Automated structure normalization is active.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] px-5 py-3 shadow-2xl">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsla(var(--primary),0.8)]" />
           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Heuristic Matrix Ready</span>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-[2rem] border-2 border-dashed transition-all duration-700 min-h-[320px] flex items-center justify-center overflow-hidden",
          dragActive
            ? "border-primary bg-primary/10 shadow-[inner_0_0_60px_rgba(var(--primary),0.1)] scale-[0.99]"
            : "border-white/5 bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/10"
        )}
      >
        <input
          id="file-upload"
          type="file"
          accept=".csv"
          onChange={handleInput}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
        />

        <AnimatePresence mode="wait">
          {selectedFile ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center text-center p-10 z-10"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
                <div className="relative w-28 h-28 rounded-[2.5rem] bg-zinc-950 border border-primary/40 flex items-center justify-center shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)]">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                {!uploading && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedFile(null); }}
                    className="absolute -top-2 -right-2 w-10 h-10 rounded-2xl bg-zinc-950 border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center shadow-2xl active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <h4 className="text-xl font-black text-white max-w-[400px] truncate tracking-tight">{selectedFile.name}</h4>
              <p className="text-[11px] font-black text-zinc-600 mt-2 uppercase tracking-[0.3em] mono-data">{formatBytes(selectedFile.size)} · STRUCTURE-VERIFIED</p>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center p-12 z-10 space-y-6"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/40 transition-all duration-700">
                <UploadCloud className="w-10 h-10 text-zinc-700 group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-2xl font-black text-white tracking-tighter">Engage Target Dataset</p>
                <p className="text-xs font-bold text-zinc-600 mt-2 uppercase tracking-[0.2em]">Drop local laboratory storage stream</p>
              </div>
              <div className="flex items-center gap-4 pt-6 opacity-30 group-hover:opacity-100 transition-opacity duration-700">
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-950 border border-white/5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 font-mono">ENCRYPTED-PIPE</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ambient background particles or lines could be added here for extra "Wow" */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.05),transparent_70%)]" />
        </div>
      </div>

      <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 w-full max-w-md">
          <AnimatePresence>
            {uploading && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Propagating Signals...</span>
                  </div>
                  <span className="text-lg font-black text-primary mono-data">{progress}%</span>
                </div>
                <div className="h-3 w-full bg-zinc-950 rounded-full border border-white/[0.05] overflow-hidden p-0.5">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${progress}%` }}
                     className="h-full bg-primary rounded-full shadow-[0_0_15px_hsla(var(--primary),0.6)]"
                   />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className={cn(
            "h-16 px-12 rounded-[1.25rem] font-black text-xs uppercase tracking-[0.3em] transition-all duration-500 active:scale-95 shadow-2xl",
            selectedFile && !uploading
              ? "bg-primary hover:bg-primary/90 text-white shadow-primary/30"
              : "bg-zinc-900/50 text-zinc-700 border border-white/5 cursor-not-allowed opacity-50"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Processing Uplink...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-3" />
              Finalize Capture
            </>
          )}
        </Button>
      </div>
    </motion.section>
  )
}
