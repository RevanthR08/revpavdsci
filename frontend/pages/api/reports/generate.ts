import type { NextApiRequest, NextApiResponse } from "next"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { randomUUID } from "crypto"
import { spawn } from "child_process"

type PythonCandidate = {
  command: string
  prefixArgs?: string[]
}

type PythonRunResult = {
  usedCommand: string
  stdout: string
  stderr: string
}

type CommandResult = {
  usedCommand: string
  stdout: string
  stderr: string
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
}

function normalizeScanId(value: unknown): string {
  const raw = String(value || "analysis")
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 72) || "analysis"
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function candidateSignature(candidate: PythonCandidate): string {
  return `${candidate.command}::${(candidate.prefixArgs || []).join(" ")}`
}

async function resolvePythonCandidates(): Promise<PythonCandidate[]> {
  const envPython = process.env.PYTHON_BIN?.trim()
  const cwd = process.cwd()

  const localCandidates = [
    envPython,
    path.resolve(cwd, ".venv", "Scripts", "python.exe"),
    path.resolve(cwd, "..", ".venv", "Scripts", "python.exe"),
    path.resolve(cwd, "venv", "Scripts", "python.exe"),
    path.resolve(cwd, "..", "venv", "Scripts", "python.exe"),
  ].filter(Boolean) as string[]

  const resolved: PythonCandidate[] = []
  for (const candidatePath of localCandidates) {
    if (await fileExists(candidatePath)) {
      resolved.push({ command: candidatePath })
    }
  }

  resolved.push(
    { command: "python" },
    { command: "python3" },
    { command: "py", prefixArgs: ["-3"] }
  )

  const seen = new Set<string>()
  return resolved.filter((candidate) => {
    const signature = candidateSignature(candidate)
    if (seen.has(signature)) return false
    seen.add(signature)
    return true
  })
}

function findMissingModule(errorText: string): string | undefined {
  const match = errorText.match(/ModuleNotFoundError:\s+No module named ['"]([^'"]+)['"]/)
  return match?.[1]
}

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

async function readEnvKeyFromFile(filePath: string, key: string): Promise<string | undefined> {
  if (!(await fileExists(filePath))) return undefined

  try {
    const content = await fs.readFile(filePath, "utf8")
    const lines = content.split(/\r?\n/)

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match) continue
      if (match[1] !== key) continue

      return parseEnvValue(match[2])
    }
  } catch {
    return undefined
  }

  return undefined
}

async function resolveGroqApiKey(): Promise<string | undefined> {
  const fromEnv = process.env.GROQ_API_KEY?.trim()
  if (fromEnv) return fromEnv

  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, "..", ".env"),
  ]

  for (const envFile of candidates) {
    const value = await readEnvKeyFromFile(envFile, "GROQ_API_KEY")
    if (value?.trim()) return value.trim()
  }

  return undefined
}

function runCandidateCommand(candidate: PythonCandidate, args: string[]): Promise<CommandResult> {
  const fullArgs = [...(candidate.prefixArgs || []), ...args]

  return new Promise((resolve, reject) => {
    const child = spawn(candidate.command, fullArgs, {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8")
    })

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8")
    })

    child.on("error", (error) => {
      reject(new Error(`Failed to start ${candidate.command}: ${error.message}`))
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          usedCommand: [candidate.command, ...(candidate.prefixArgs || [])].join(" "),
          stdout,
          stderr,
        })
        return
      }

      reject(
        new Error(
          `${candidate.command} exited with code ${code}. ${stderr || stdout || "No error output from Python."}`
        )
      )
    })
  })
}

function runOnePythonCandidate(
  candidate: PythonCandidate,
  scriptPath: string,
  inputPath: string,
  outputPath: string
): Promise<PythonRunResult> {
  return runCandidateCommand(candidate, [scriptPath, "--input", inputPath, "--output", outputPath])
}

function installPythonRequirements(candidate: PythonCandidate, requirementsPath: string): Promise<CommandResult> {
  return runCandidateCommand(candidate, [
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    "-r",
    requirementsPath,
  ])
}

async function runPythonScript(
  scriptPath: string,
  inputPath: string,
  outputPath: string,
  requirementsPath: string
): Promise<PythonRunResult> {
  const candidates = await resolvePythonCandidates()
  const hasRequirements = await fileExists(requirementsPath)

  const failures: string[] = []

  for (const candidate of candidates) {
    try {
      return await runOnePythonCandidate(candidate, scriptPath, inputPath, outputPath)
    } catch (error: any) {
      const message = error?.message || String(error)
      const missingModule = findMissingModule(message)

      if (missingModule && hasRequirements) {
        try {
          await installPythonRequirements(candidate, requirementsPath)
          return await runOnePythonCandidate(candidate, scriptPath, inputPath, outputPath)
        } catch (installError: any) {
          failures.push(
            `${message} | dependency bootstrap with ${candidate.command} failed: ${installError?.message || String(installError)}`
          )
          continue
        }
      }

      failures.push(message)
    }
  }

  throw new Error(`Unable to execute Python report generator. Attempts: ${failures.join(" | ")}`)
}

function withJsonContentType(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ detail: "Method not allowed" })
    return false
  }

  return true
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!withJsonContentType(req, res)) return

  let payload: any
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body
  } catch {
    res.status(400).json({ detail: "Malformed JSON request body." })
    return
  }

  if (!payload || typeof payload !== "object") {
    res.status(400).json({ detail: "Invalid request body." })
    return
  }

  const scanId = normalizeScanId(payload.scan_id || payload.analysis?.scan_id || payload.scanId)
  const requestId = `${Date.now()}-${randomUUID()}`
  const tmpDir = os.tmpdir()
  const inputPath = path.join(tmpDir, `forensic-report-input-${requestId}.json`)
  const outputPath = path.join(tmpDir, `forensic-report-${requestId}.pdf`)
  const scriptPath = path.join(process.cwd(), "reporting", "generate_forensic_report.py")
  const requirementsPath = path.join(process.cwd(), "reporting", "requirements.txt")

  try {
    const groqApiKey = await resolveGroqApiKey()
    const normalizedPayload = {
      ...payload,
      report_theme: payload.report_theme || process.env.PDF_REPORT_THEME || "legal_navy",
      ...(groqApiKey && !payload.groq_api_key ? { groq_api_key: groqApiKey } : {}),
    }

    await fs.access(scriptPath)
    await fs.writeFile(inputPath, JSON.stringify(normalizedPayload, null, 2), "utf8")

    const runResult = await runPythonScript(scriptPath, inputPath, outputPath, requirementsPath)
    const pdf = await fs.readFile(outputPath)

    const fileTimestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `forensic_incident_report_${scanId}_${fileTimestamp}.pdf`

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Length", pdf.length)
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`)
    res.setHeader("X-Report-Generator", runResult.usedCommand)

    res.status(200).send(pdf)
  } catch (error: any) {
    console.error("[PDF Report] generation failed", error)
    res.status(500).json({
      detail: error?.message || "Failed to generate PDF report",
      hint: "Ensure Python interpreter/dependencies are available; set GROQ_API_KEY in frontend/.env.local or repo .env to enable Groq narrative gap-filling.",
    })
  } finally {
    await Promise.allSettled([
      fs.unlink(inputPath),
      fs.unlink(outputPath),
    ])
  }
}
