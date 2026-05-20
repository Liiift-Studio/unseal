// Core audit() implementation — orchestrates all enabled checks and returns an AuditReport.

import { createHash } from 'crypto';
import type { AuditOptions, AuditReport, AuditFinding } from './types.js';
import { checkTextUnderBox } from './checks/text-under-box.js';
import { checkIncrementalSave } from './checks/incremental-save.js';
import { checkMetadataLeak } from './checks/metadata-leak.js';
import { checkPendingAnnotation } from './checks/pending-annotation.js';
import { checkGlyphPosition } from './checks/glyph-position.js';

/** Default options applied when the caller does not specify a value. */
const DEFAULTS: Required<AuditOptions> = {
	textUnderBox: true,
	incrementalSave: true,
	metadataLeak: true,
	pendingAnnotation: true,
	glyphPositionLeak: false,
	patternOracle: false,
};

/**
 * Audits the given PDF for fake or insecure redactions.
 * Returns an AuditReport describing all findings.
 *
 * @param pdf - The PDF file as an ArrayBuffer.
 * @param options - Which checks to enable. Defaults to all Tier 1 checks.
 */
export async function audit(pdf: ArrayBuffer, options: AuditOptions = {}): Promise<AuditReport> {
	const opts = { ...DEFAULTS, ...options };

	const pdfBytes = new Uint8Array(pdf);
	const sha256 = createHash('sha256').update(pdfBytes).digest('hex');

	const allFindings: AuditFinding[] = [];

	// Tier 1 checks — fast, run in parallel where possible.
	const tier1Promises: Promise<AuditFinding[]>[] = [];

	if (opts.incrementalSave) {
		// Synchronous — resolve immediately.
		const findings = checkIncrementalSave(pdfBytes);
		allFindings.push(...findings);
	}

	if (opts.metadataLeak) {
		tier1Promises.push(checkMetadataLeak(pdf));
	}

	// Page-level checks require knowing the page count.
	let numPages = 0;

	if (opts.textUnderBox || opts.pendingAnnotation || opts.glyphPositionLeak) {
		const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
		const probe = await getDocument({ data: pdf.slice(0) }).promise;
		numPages = probe.numPages;
		await probe.destroy();
	}

	// Collect per-page checks.
	const pageCheckPromises: Promise<AuditFinding[]>[] = [...tier1Promises];

	for (let p = 1; p <= numPages; p++) {
		if (opts.textUnderBox) {
			pageCheckPromises.push(checkTextUnderBox(pdf, p));
		}
		if (opts.pendingAnnotation) {
			pageCheckPromises.push(checkPendingAnnotation(pdf, p));
		}
		// Tier 2: real Bland et al. glyph-position check using font metrics.
		if (opts.glyphPositionLeak) {
			pageCheckPromises.push(checkGlyphPosition(pdf, p));
		}
	}

	if (tier1Promises.length > 0 && numPages === 0) {
		// metadataLeak only, no page checks — run and collect.
		const results = await Promise.all(tier1Promises);
		for (const r of results) allFindings.push(...r);
	} else if (pageCheckPromises.length > 0) {
		const results = await Promise.all(pageCheckPromises);
		for (const r of results) allFindings.push(...r);
	}

	// Tier 3: pattern oracle — enumerate and rank candidates for redaction bars.
	if (opts.patternOracle) {
		await runPatternOracle(pdf, allFindings);
	}

	// Deduplicate findings by check+page+bbox key.
	const seen = new Set<string>();
	const dedupedFindings: AuditFinding[] = [];
	for (const f of allFindings) {
		const key = `${f.check}|${f.page ?? ''}|${f.bbox?.join(',') ?? ''}|${f.detail.slice(0, 60)}`;
		if (!seen.has(key)) {
			seen.add(key);
			dedupedFindings.push(f);
		}
	}

	return {
		clean: dedupedFindings.length === 0,
		findings: dedupedFindings,
		checkedAt: new Date().toISOString(),
		sha256,
	};
}

/**
 * Tier 3 oracle pass: for each text-under-box finding with a bbox, enumerate width-matching
 * candidates via the Naccache-Whelan bar-width attack and rank them with the LLM pattern oracle.
 * Attaches ranked candidates to each finding's `candidates` field.
 */
async function runPatternOracle(pdf: ArrayBuffer, findings: AuditFinding[]): Promise<void> {
	const oracleTargets = findings.filter(f => f.check === 'text-under-box' && f.bbox);
	if (oracleTargets.length === 0) return;

	const { rankCandidates } = await import('./oracle/pattern-oracle.js');
	const { enumerateCandidates } = await import('./oracle/naccache-whelan.js');
	const { fallbackFontMetrics } = await import('./font/metrics.js');
	const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

	const doc = await getDocument({ data: pdf.slice(0) }).promise;
	const metrics = fallbackFontMetrics();

	// Group targets by page.
	const byPage = new Map<number, AuditFinding[]>();
	for (const f of oracleTargets) {
		const pg = f.page ?? 1;
		const list = byPage.get(pg) ?? [];
		list.push(f);
		byPage.set(pg, list);
	}

	type RawTextItem = { str: string; transform: number[]; width: number };

	for (const [pageNum, pageFindgs] of byPage.entries()) {
		if (pageNum > doc.numPages) continue;

		const page = await doc.getPage(pageNum);
		const tc = await page.getTextContent();
		page.cleanup();

		// Sort by reading order: top-to-bottom (descending y in bottom-left space), left-to-right.
		const items = (tc.items as RawTextItem[])
			.filter(i => i.str.trim())
			.sort((a, b) => {
				const dy = (b.transform[5] ?? 0) - (a.transform[5] ?? 0);
				if (Math.abs(dy) > 2) return dy;
				return (a.transform[4] ?? 0) - (b.transform[4] ?? 0);
			});

		const fullPageText = items.map(i => i.str).join(' ');

		for (const finding of pageFindgs) {
			if (!finding.bbox) continue;

			const [x1, y1, x2, y2] = finding.bbox;
			const barWidth = x2 - x1;
			// Estimate font size from bar height; clamp to a reasonable minimum.
			const fontSize = Math.max(8, y2 - y1);

			// Split page text relative to the bar's vertical position for context.
			const aboveItems = items.filter(i => (i.transform[5] ?? 0) > y2);
			const belowItems = items.filter(i => (i.transform[5] ?? 0) < y1);
			const contextBefore = aboveItems
				.slice(-5)
				.map(i => i.str)
				.join(' ');
			const contextAfter = belowItems
				.slice(0, 5)
				.map(i => i.str)
				.join(' ');

			const candidates = await enumerateCandidates({
				barWidth,
				metrics,
				fontSize,
				maxCandidates: 20,
				contextBefore,
				contextAfter,
			});

			// If we already have recoveredText, ensure it leads the candidate list.
			if (finding.recoveredText) {
				const alreadyIn = candidates.some(c => c.text === finding.recoveredText);
				if (!alreadyIn) {
					candidates.unshift({ text: finding.recoveredText, widthError: 0, probability: 1.0 });
				}
			}

			if (candidates.length === 0) continue;

			const ranked = await rankCandidates({
				candidates,
				contextBefore,
				contextAfter,
				documentContext: fullPageText,
				maxResults: 5,
			});

			finding.candidates = ranked.map(r => ({
				text: r.candidate,
				confidence: r.confidence,
				reasoning: r.reasoning,
			}));
		}
	}

	await doc.destroy();
}
