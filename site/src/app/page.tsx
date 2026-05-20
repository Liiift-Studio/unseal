// unseal.dev — product page with live audit demo.
import AuditDemo from "@/components/AuditDemo"
import CodeBlock from "@/components/CodeBlock"
import CopyInstall from "@/components/CopyInstall"
import { version } from "../../../package.json"
import { version as siteVersion } from "../../package.json"

export const maxDuration = 60

export default function Home() {
	return (
		<main className="flex flex-col items-center px-6 py-20 gap-24">

			{/* Hero */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<p className="text-xs uppercase tracking-widest opacity-50">unseal</p>
					<h1 className="text-4xl lg:text-8xl xl:text-9xl" style={{ fontFamily: "var(--font-merriweather), serif", fontVariationSettings: '"wght" 300, "opsz" 144', lineHeight: "1.05em" }}>
						Your redactions<br />
						<span style={{ opacity: 0.45, fontStyle: "italic" }}>might be fake.</span>
					</h1>
				</div>
				<div className="flex items-center gap-4">
					<CopyInstall pkg="unseal" />
					<a href="https://github.com/Liiift-Studio/unseal" className="text-sm opacity-50 hover:opacity-100 transition-opacity">GitHub</a>
					<a href="https://npmjs.com/package/unseal" className="text-sm opacity-50 hover:opacity-100 transition-opacity">npm</a>
				</div>
				<div className="flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-50 tracking-wide">
					<span>TypeScript</span><span>·</span><span>Node.js</span><span>·</span><span>Zero HTTP calls for Tier 1</span><span>·</span><span>v{version}</span>
				</div>
				<p className="text-base opacity-60 leading-relaxed max-w-xl">
					Four known PDF redaction vulnerabilities — text hidden under filled boxes, recoverable prior revisions, metadata leaks, and unapplied annotation markers — audited in a single pass, with recoverable text returned inline.
				</p>
			</section>

			{/* Demo */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					<p className="text-xs uppercase tracking-widest opacity-50">Live audit</p>
					<p className="text-sm opacity-40">Upload any PDF. No data is stored and no AI is used for Tier 1.</p>
				</div>
				<div className="rounded-xl -mx-8 px-8 py-8" style={{ background: "rgba(0,0,0,0.25)" }}>
					<AuditDemo />
				</div>
			</section>

			{/* How it works */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<p className="text-xs uppercase tracking-widest opacity-50">Four checks, milliseconds</p>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm leading-relaxed opacity-70">
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Text under box</p>
						<p>The most common mistake: a black rectangle drawn on top of the text, but the text operators remain in the page content stream. unseal scans every filled rectangle against underlying text items and surfaces the hidden text verbatim.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Incremental save</p>
						<p>When a PDF is saved incrementally, the original content is appended rather than replaced. Prior versions of the file sit in the same byte stream. unseal detects the telltale {`%%EOF`} signature pattern and flags the recoverable revision.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Metadata leak</p>
						<p>Document metadata — Title, Author, Subject, Keywords — and XMP streams are preserved through many redaction workflows. Redacted names or document titles often survive in the DocInfo dictionary or embedded XMP even after the content is blacked out.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Pending annotations</p>
						<p>PDF/A and many redaction tools create <code className="text-xs font-mono">Redact</code>-subtype annotations to mark regions. They are only effective after the tool applies them. Many workflows skip the apply step — the annotations are found, the text beneath is untouched.</p>
					</div>
				</div>
			</section>

			{/* Tier 2 & 3 */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<p className="text-xs uppercase tracking-widest opacity-50">Advanced checks</p>
				<div className="prose-grid grid grid-cols-1 sm:grid-cols-2 gap-12 text-sm leading-relaxed opacity-70">
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Glyph position analysis <span className="text-xs font-normal opacity-50 ml-1">Tier 2</span></p>
						<p>Implements the Bland et al. (2022) observation: OCR-reconstructed text has glyph widths that don&apos;t match the underlying font metrics. unseal compares pdfjs-measured advance widths against opentype.js font metrics to detect reconstructed text. Enable with <code className="text-xs font-mono">glyphPositionLeak: true</code>.</p>
					</div>
					<div className="flex flex-col gap-3">
						<p className="font-semibold opacity-100 text-base">Pattern oracle <span className="text-xs font-normal opacity-50 ml-1">Tier 3</span></p>
						<p>When text has been properly removed from content streams, the redaction bar width still encodes the original character sequence&apos;s total advance width. The Naccache-Whelan bar-width attack enumerates candidates; the LLM oracle (via Vercel AI Gateway) ranks them by contextual plausibility. Enable with <code className="text-xs font-mono">patternOracle: true</code>.</p>
					</div>
				</div>
			</section>

			{/* Usage */}
			<section className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6">
				<p className="text-xs uppercase tracking-widest opacity-50">Usage</p>
				<div className="flex flex-col gap-8 text-sm">
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Basic audit</p>
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
						<p className="opacity-50">All Tier 1 checks are enabled by default</p>
						<CodeBlock code={`// AuditOptions — enable higher tiers selectively
const report = await audit(pdf.buffer, {
  textUnderBox: true,       // Tier 1 — default
  incrementalSave: true,    // Tier 1 — default
  metadataLeak: true,       // Tier 1 — default
  pendingAnnotation: true,  // Tier 1 — default
  glyphPositionLeak: false, // Tier 2 — opentype.js font metrics
  patternOracle: false,     // Tier 3 — Naccache-Whelan + LLM
})`} />
					</div>
					<div className="flex flex-col gap-3">
						<p className="opacity-50">Recovery — strip overlays, annotations, and prior revisions</p>
						<CodeBlock code={`import { unseal } from 'unseal'

const result = await unseal(pdf.buffer)

// result.pdf        — modified PDF with overlays removed
// result.findings   — what was recovered and how
// result.auditReport — full audit of the original`} />
					</div>
				</div>

				{/* Options table */}
				<div className="flex flex-col gap-3">
					<p className="text-xs opacity-50">AuditOptions</p>
					<table className="w-full text-xs">
						<thead>
							<tr className="opacity-50 text-left">
								<th className="pb-2 pr-6 font-normal">Option</th>
								<th className="pb-2 pr-6 font-normal">Default</th>
								<th className="pb-2 font-normal">Description</th>
							</tr>
						</thead>
						<tbody className="opacity-70">
							{[
								["textUnderBox", "true", "Scan content streams for text beneath filled rectangles"],
								["incrementalSave", "true", "Detect recoverable prior revisions via incremental save"],
								["metadataLeak", "true", "Check DocInfo and XMP streams for surviving redacted content"],
								["pendingAnnotation", "true", "Find Redact-subtype annotations that were never applied"],
								["glyphPositionLeak", "false", "Bland et al. glyph-width comparison via opentype.js (Tier 2)"],
								["patternOracle", "false", "Naccache-Whelan bar-width attack + AI ranking (Tier 3)"],
							].map(([opt, def, desc]) => (
								<tr key={opt} className="border-t border-white/10 hover:bg-white/5 transition-colors">
									<td className="py-2 pr-6 font-mono">{opt}</td>
									<td className="py-2 pr-6">{def}</td>
									<td className="py-2">{desc}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>

			{/* Footer */}
			<footer className="w-full max-w-2xl lg:max-w-5xl flex flex-col gap-6 pt-8 border-t border-white/10 text-xs">
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 opacity-50">
					<a href="https://liiift.studio" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
						liiift.studio
					</a>
					<a href="https://github.com/Liiift-Studio/unseal" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
						GitHub
					</a>
					<a href="https://npmjs.com/package/unseal" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
						npm
					</a>
					<span className="sm:col-start-4 tabular-nums">npm v{version} · site v{siteVersion}</span>
				</div>
			</footer>

		</main>
	)
}

