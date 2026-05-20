// Core audit() implementation — orchestrates all enabled checks and returns an AuditReport.

import { createHash } from 'crypto';
import type { AuditOptions, AuditReport, AuditFinding } from './types.js';
import { checkTextUnderBox } from './checks/text-under-box.js';
import { checkIncrementalSave } from './checks/incremental-save.js';
import { checkMetadataLeak } from './checks/metadata-leak.js';
import { checkPendingAnnotation } from './checks/pending-annotation.js';

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
	// We get page count lazily once pdfjs loads.
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
		// Tier 2: glyphPositionLeak — placeholder (no external dependency needed).
		if (opts.glyphPositionLeak) {
			pageCheckPromises.push(checkGlyphPositionLeak(pdf, p));
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
 * Tier 2: Check for glyphs positioned outside the visible page area or with
 * zero-width rendering that could be hiding content.
 * Returns findings if such glyphs are detected.
 */
async function checkGlyphPositionLeak(pdf: ArrayBuffer, pageNum: number): Promise<AuditFinding[]> {
	const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');

	const doc = await getDocument({ data: pdf.slice(0) }).promise;
	if (pageNum > doc.numPages) {
		await doc.destroy();
		return [];
	}

	const page = await doc.getPage(pageNum);
	const viewport = page.getViewport({ scale: 1.0 });
	const [pageWidth, pageHeight] = [viewport.width, viewport.height];

	let textContent: Awaited<ReturnType<typeof page.getTextContent>>;
	try {
		textContent = await page.getTextContent();
	} finally {
		page.cleanup();
		await doc.destroy();
	}

	const findings: AuditFinding[] = [];

	for (const item of textContent.items as Array<{ str: string; transform: number[]; width: number; height: number }>) {
		if (!item.str.trim()) continue;

		const tx = item.transform[4] ?? 0;
		const ty = item.transform[5] ?? 0;

		// Flag items positioned far outside the page boundaries (more than 50pt).
		const outsidePage =
			tx < -50 ||
			tx > pageWidth + 50 ||
			ty < -50 ||
			ty > pageHeight + 50;

		// Flag items with valid text but near-zero width (possible white-on-white or invisible text).
		const nearZeroWidth = item.width !== undefined && item.width > 0 && item.width < 1 && item.str.length > 2;

		if (outsidePage || nearZeroWidth) {
			findings.push({
				check: 'glyph-position',
				severity: 'HIGH',
				page: pageNum,
				bbox: [tx, ty, tx + (item.width || 10), ty + (item.height || 10)],
				detail: outsidePage
					? `Text item positioned outside page bounds at (${tx.toFixed(1)}, ${ty.toFixed(1)}) on page ${pageNum}`
					: `Text item with near-zero width (${item.width.toFixed(3)}pt) may be invisible on page ${pageNum}`,
				recoveredText: item.str,
			});
		}
	}

	return findings;
}
