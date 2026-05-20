"use client"
// AuditDemo — drag-and-drop PDF upload with live audit results.

import { useState, useRef, useCallback, type DragEvent } from "react"

interface Finding {
	check: string
	severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"
	page?: number
	bbox?: [number, number, number, number]
	detail: string
	recoveredText?: string
}

interface AuditReport {
	clean: boolean
	findings: Finding[]
	checkedAt: string
	sha256: string
}

type State =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "done"; report: AuditReport; filename: string }
	| { status: "error"; message: string }

const SEVERITY_STYLES: Record<Finding["severity"], string> = {
	CRITICAL: "bg-red-950/60 text-red-300 border border-red-800/50",
	HIGH: "bg-orange-950/60 text-orange-300 border border-orange-800/50",
	MEDIUM: "bg-amber-950/60 text-amber-300 border border-amber-800/50",
	LOW: "bg-sky-950/60 text-sky-300 border border-sky-800/50",
	INFO: "bg-white/5 text-white/50 border border-white/10",
}

const CHECK_LABELS: Record<string, string> = {
	"text-under-box": "Text under box",
	"incremental-save": "Incremental save",
	"metadata-leak": "Metadata leak",
	"pending-annotation": "Pending annotation",
	"glyph-position": "Glyph position",
}

export default function AuditDemo() {
	const [state, setState] = useState<State>({ status: "idle" })
	const [isDragging, setIsDragging] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const runAudit = useCallback(async (file: File) => {
		setState({ status: "loading" })
		const form = new FormData()
		form.append("pdf", file)
		try {
			const res = await fetch("/api/audit", { method: "POST", body: form })
			const data = await res.json() as { report?: AuditReport; error?: string }
			if (!res.ok || data.error) {
				setState({ status: "error", message: data.error ?? "Audit failed" })
			} else {
				setState({ status: "done", report: data.report!, filename: file.name })
			}
		} catch {
			setState({ status: "error", message: "Network error — please try again" })
		}
	}, [])

	const handleFiles = useCallback((files: FileList | null) => {
		const file = files?.[0]
		if (!file) return
		if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
			setState({ status: "error", message: "Please upload a PDF file" })
			return
		}
		if (file.size > 4 * 1024 * 1024) {
			setState({ status: "error", message: "File too large — maximum is 4 MB" })
			return
		}
		void runAudit(file)
	}, [runAudit])

	const onDragOver = useCallback((e: DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
	const onDragLeave = useCallback(() => setIsDragging(false), [])
	const onDrop = useCallback((e: DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		handleFiles(e.dataTransfer.files)
	}, [handleFiles])

	return (
		<div className="flex flex-col gap-6">
			{/* Drop zone */}
			<label
				className={`
					flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-8 py-12
					cursor-pointer transition-colors
					${isDragging ? "border-white/50 bg-white/8" : "border-white/15 hover:border-white/30 hover:bg-white/4"}
					${state.status === "loading" ? "pointer-events-none opacity-60" : ""}
				`}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
			>
				<input
					ref={inputRef}
					type="file"
					accept=".pdf,application/pdf"
					className="sr-only"
					onChange={e => handleFiles(e.target.files)}
				/>
				{state.status === "loading" ? (
					<>
						<div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
						<p className="text-sm opacity-50">Auditing…</p>
					</>
				) : (
					<>
						<svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="opacity-40">
							<path d="M16 6v14M16 6l-5 5M16 6l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
							<path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
						</svg>
						<p className="text-sm opacity-60">Drop a PDF here, or <span className="opacity-100 underline underline-offset-2">browse</span></p>
						<p className="text-xs opacity-30">Max 4 MB · no data is stored · no AI is used</p>
					</>
				)}
			</label>

			{/* Error */}
			{state.status === "error" && (
				<div className="rounded-lg bg-red-950/50 border border-red-800/40 px-4 py-3 text-sm text-red-300">
					{state.message}
				</div>
			)}

			{/* Results */}
			{state.status === "done" && (
				<div className="flex flex-col gap-4">
					<div className="flex items-center justify-between">
						<p className="text-xs opacity-40 truncate">{state.filename}</p>
						<button
							onClick={() => setState({ status: "idle" })}
							className="text-xs opacity-40 hover:opacity-70 transition-opacity shrink-0 ml-4"
						>
							Clear
						</button>
					</div>

					{state.report.clean ? (
						<div className="flex items-center gap-3 rounded-xl bg-emerald-950/50 border border-emerald-800/40 px-5 py-4">
							<svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-emerald-400 shrink-0">
								<circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
								<path d="M5.5 9l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
							<div>
								<p className="text-sm text-emerald-300 font-medium">No issues detected</p>
								<p className="text-xs text-emerald-400/60 mt-0.5">All four Tier 1 checks passed</p>
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2 text-sm">
								<span className="text-amber-300 font-medium">{state.report.findings.length} issue{state.report.findings.length !== 1 ? "s" : ""} found</span>
								<span className="opacity-30">·</span>
								<span className="opacity-40">this PDF may not be securely redacted</span>
							</div>

							{state.report.findings.map((f, i) => (
								<div key={i} className="rounded-lg bg-white/3 border border-white/8 px-4 py-3 flex flex-col gap-2">
									<div className="flex items-center gap-2 flex-wrap">
										<span className={`text-xs px-2 py-0.5 rounded font-mono tracking-wide ${SEVERITY_STYLES[f.severity]}`}>
											{f.severity}
										</span>
										<span className="text-xs font-medium opacity-80">
											{CHECK_LABELS[f.check] ?? f.check}
										</span>
										{f.page && (
											<span className="text-xs opacity-30">page {f.page}</span>
										)}
									</div>
									<p className="text-xs leading-relaxed opacity-60">{f.detail}</p>
									{f.recoveredText && (
										<div className="rounded bg-white/5 px-3 py-2 text-xs font-mono text-amber-200/80 border border-white/5">
											{f.recoveredText}
										</div>
									)}
								</div>
							))}

							<p className="text-xs opacity-25 mt-1">
								SHA-256 {state.report.sha256.slice(0, 16)}…
							</p>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
