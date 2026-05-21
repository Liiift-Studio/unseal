// unseal.dev — product page with live audit demo.
import AuditDemo from "@/components/AuditDemo"
import CodeBlock from "@/components/CodeBlock"
import CopyInstall from "@/components/CopyInstall"
import { version } from "../../../package.json"

export const maxDuration = 60

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-4 mb-10">
			<span className="text-[10px] uppercase tracking-[0.2em] shrink-0" style={{ color: "var(--ink-dim)" }}>
				{children}
			</span>
			<div className="flex-1 h-px" style={{ background: "var(--rule)" }} />
		</div>
	)
}

export default function Home() {
	return (
		<main className="max-w-2xl mx-auto w-full px-6 py-12 flex flex-col">

			{/* Document masthead */}
			<header className="mb-16">
				<div className="border-b-2 border-black pb-3 flex justify-between items-baseline">
					<span className="text-xs uppercase tracking-[0.18em]">unseal</span>
					<span className="text-xs font-mono" style={{ color: "var(--ink-dim)" }}>v{version}</span>
				</div>
			</header>

			{/* Hero */}
			<section className="mb-20">
				<h1
					className="leading-[1.0] mb-6"
					style={{
						fontFamily: "var(--font-display)",
						fontSize: "clamp(3rem, 10vw, 5.5rem)",
						letterSpacing: "-0.01em",
					}}
				>
					Detect fake<br />
					<span style={{ fontStyle: "italic" }}>PDF redactions.</span>
				</h1>

				{/* The redaction bar — what unseal detects */}
				<div className="h-6 bg-black w-full mb-6" aria-hidden="true" />

				<p className="text-base leading-relaxed mb-8" style={{ color: "var(--ink-dim)" }}>
					Four known vulnerabilities in naïve PDF redaction — text hidden under filled boxes,
					recoverable prior revisions, metadata leaks, and unapplied annotation markers —
					detected in a single pass. For Node.js and Lambda.
				</p>

				<div className="flex flex-wrap items-center gap-4">
					<CopyInstall pkg="unseal" />
					<a href="https://github.com/Liiift-Studio/unseal" className="text-sm transition-opacity hover:opacity-60" style={{ color: "var(--ink-dim)" }}>
						GitHub →
					</a>
					<a href="https://npmjs.com/package/unseal" className="text-sm transition-opacity hover:opacity-60" style={{ color: "var(--ink-dim)" }}>
						npm →
					</a>
				</div>
			</section>

			<div className="h-px mb-20" style={{ background: "var(--rule)" }} />

			{/* Live demo */}
			<section className="mb-20">
				<SectionLabel>Live audit</SectionLabel>
				<p className="text-sm mb-6" style={{ color: "var(--ink-dim)" }}>
					Upload any PDF. No data is stored. No AI is used for Tier 1.
				</p>
				<AuditDemo />
			</section>

			<div className="h-px mb-20" style={{ background: "var(--rule)" }} />

			{/* Four checks */}
			<section className="mb-20">
				<SectionLabel>Four checks</SectionLabel>
				<div className="flex flex-col divide-y" style={{ borderColor: "var(--rule)" }}>
					{[
						{
							n: "01",
							label: "Text under box",
							severity: "CRITICAL",
							body: "The most common mistake: a black rectangle drawn on top of text, but the text operators remain in the content stream. unseal scans every filled rectangle against underlying text items and surfaces the hidden content verbatim.",
						},
						{
							n: "02",
							label: "Incremental save",
							severity: "HIGH",
							body: "When a PDF is saved incrementally, prior content is appended rather than replaced. Earlier versions of the document sit in the same byte stream. unseal detects the %%EOF signature pattern and flags the recoverable revision.",
						},
						{
							n: "03",
							label: "Metadata leak",
							severity: "MEDIUM",
							body: "Title, Author, Subject, Keywords, and XMP streams survive many redaction workflows. Redacted names or document titles often remain in DocInfo or embedded XMP even after the visible content is blacked out.",
						},
						{
							n: "04",
							label: "Pending annotations",
							severity: "CRITICAL",
							body: "PDF/A and most redaction tools create Redact-subtype annotations to mark regions for removal. They are only effective after the tool applies them. Many workflows skip that step — the annotations are present, the text beneath is untouched.",
						},
					].map(({ n, label, severity, body }) => (
						<div key={n} className="py-6 flex flex-col gap-2">
							<div className="flex items-baseline gap-4">
								<span className="text-xs font-mono" style={{ color: "var(--ink-dim)" }}>{n}</span>
								<span className="text-sm font-medium flex-1">{label}</span>
								<span className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-sm ${
									severity === "CRITICAL" ? "bg-black text-[var(--background)]" :
									severity === "HIGH" ? "bg-red-700 text-white" :
									"bg-amber-600 text-white"
								}`}>
									{severity}
								</span>
							</div>
							<p className="text-sm leading-relaxed pl-8" style={{ color: "var(--ink-dim)" }}>{body}</p>
						</div>
					))}
				</div>
			</section>

			<div className="h-px mb-20" style={{ background: "var(--rule)" }} />

			{/* Advanced checks */}
			<section className="mb-20">
				<SectionLabel>Advanced checks</SectionLabel>
				<div className="flex flex-col divide-y" style={{ borderColor: "var(--rule)" }}>
					<div className="py-6 flex flex-col gap-2">
						<div className="flex items-baseline gap-4">
							<span className="text-[10px] font-mono px-1.5 py-0.5 border border-black/30 rounded-sm tracking-wide">TIER 2</span>
							<span className="text-sm font-medium">Glyph position analysis</span>
						</div>
						<p className="text-sm leading-relaxed pl-16" style={{ color: "var(--ink-dim)" }}>
							Implements the Bland et al. (2022) observation: OCR-reconstructed text has glyph widths that don&apos;t match the underlying font metrics. unseal compares pdfjs-measured advance widths against opentype.js font data to detect reconstructed text. Enable with <code className="font-mono text-xs bg-black/6 px-1 rounded">glyphPositionLeak: true</code>.
						</p>
					</div>
					<div className="py-6 flex flex-col gap-2">
						<div className="flex items-baseline gap-4">
							<span className="text-[10px] font-mono px-1.5 py-0.5 border border-black/30 rounded-sm tracking-wide">TIER 3</span>
							<span className="text-sm font-medium">Pattern oracle</span>
						</div>
						<p className="text-sm leading-relaxed pl-16" style={{ color: "var(--ink-dim)" }}>
							When text has been removed from content streams, the bar width still encodes the original advance width sum. The Naccache-Whelan attack enumerates candidates; the LLM oracle (Vercel AI Gateway) ranks them by contextual plausibility. Enable with <code className="font-mono text-xs bg-black/6 px-1 rounded">patternOracle: true</code>.
						</p>
					</div>
				</div>
			</section>

			<div className="h-px mb-20" style={{ background: "var(--rule)" }} />

			{/* Usage */}
			<section className="mb-20">
				<SectionLabel>Usage</SectionLabel>
				<div className="flex flex-col gap-10">
					<div className="flex flex-col gap-3">
						<p className="text-xs" style={{ color: "var(--ink-dim)" }}>Basic audit</p>
						<CodeBlock code={`import { audit } from 'unseal'
import { readFile } from 'node:fs/promises'

const pdf = await readFile('document.pdf')
const report = await audit(pdf.buffer)

if (!report.clean) {
  for (const finding of report.findings) {
    console.log(finding.severity, finding.check, finding.recoveredText)
  }
}`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-xs" style={{ color: "var(--ink-dim)" }}>Enable Tier 2 and Tier 3 selectively</p>
						<CodeBlock code={`const report = await audit(pdf.buffer, {
  glyphPositionLeak: true,  // Tier 2 — opentype.js font metrics
  patternOracle: true,      // Tier 3 — Naccache-Whelan + LLM
})`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-xs" style={{ color: "var(--ink-dim)" }}>Recovery — strip overlays, annotations, and prior revisions</p>
						<CodeBlock code={`import { unseal } from 'unseal'

const result = await unseal(pdf.buffer)
// result.pdf         — modified PDF with fake redactions removed
// result.findings    — what was recovered and how
// result.auditReport — full audit of the original`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="text-xs" style={{ color: "var(--ink-dim)" }}>CLI</p>
						<CodeBlock code={`npx unseal audit document.pdf
npx unseal audit document.pdf --preset forensic --json
npx unseal strip document.pdf --output unsealed.pdf --report findings.json`} />
					</div>
				</div>

				{/* Options table */}
				<div className="mt-10 flex flex-col gap-3">
					<p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-dim)" }}>AuditOptions</p>
					<table className="w-full text-xs border-collapse">
						<thead>
							<tr className="border-b" style={{ borderColor: "var(--rule)" }}>
								<th className="pb-2 pr-6 font-normal text-left" style={{ color: "var(--ink-dim)" }}>Option</th>
								<th className="pb-2 pr-6 font-normal text-left" style={{ color: "var(--ink-dim)" }}>Default</th>
								<th className="pb-2 font-normal text-left" style={{ color: "var(--ink-dim)" }}>Description</th>
							</tr>
						</thead>
						<tbody>
							{[
								["textUnderBox", "true", "Scan content streams for text beneath filled rectangles"],
								["incrementalSave", "true", "Detect recoverable prior revisions via incremental save"],
								["metadataLeak", "true", "Check DocInfo and XMP streams for surviving redacted content"],
								["pendingAnnotation", "true", "Find Redact-subtype annotations that were never applied"],
								["glyphPositionLeak", "false", "Bland et al. glyph-width comparison via opentype.js (Tier 2)"],
								["patternOracle", "false", "Naccache-Whelan bar-width attack + AI ranking (Tier 3)"],
							].map(([opt, def, desc]) => (
								<tr key={opt} className="border-b" style={{ borderColor: "var(--rule)" }}>
									<td className="py-2.5 pr-6 font-mono">{opt}</td>
									<td className="py-2.5 pr-6 font-mono" style={{ color: "var(--ink-dim)" }}>{def}</td>
									<td className="py-2.5" style={{ color: "var(--ink-dim)" }}>{desc}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* Footer */}
			<footer className="pt-10 border-t-2 border-black flex flex-col gap-6 text-xs">
				<div className="flex flex-col gap-1">
					<p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-dim)" }}>Also from Liiift Studio</p>
					<a href="https://scrubzero.org" className="text-sm hover:opacity-60 transition-opacity">
						scrubzero — True PDF content-stream redaction for Node.js →
					</a>
				</div>
				<div className="flex flex-wrap gap-x-6 gap-y-1" style={{ color: "var(--ink-dim)" }}>
					<a href="https://liiift.studio" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">liiift.studio</a>
					<a href="https://github.com/Liiift-Studio/unseal" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">GitHub</a>
					<a href="https://npmjs.com/package/unseal" target="_blank" rel="noopener noreferrer" className="hover:opacity-60 transition-opacity">npm</a>
					<span className="ml-auto font-mono">v{version}</span>
				</div>
			</footer>

		</main>
	)
}
