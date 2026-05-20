// Tests for the unseal() function covering recovery scenario outputs and result structure.

import { describe, it, expect } from 'vitest';
import { unseal } from '../src/index.js';
import { buildMinimalPdf, buildPdfWithIncrementalSave } from './helpers/pdf-builder.js';

describe('unseal()', () => {
	describe('result structure', () => {
		it('returns a valid UnsealResult for a clean PDF', async () => {
			const pdf = buildMinimalPdf('Clean document');
			const result = await unseal(pdf, { output: 'both', includeAudit: false });
			expect(result.findings).toBeDefined();
			expect(Array.isArray(result.findings)).toBe(true);
			expect(typeof result.overlaysStripped).toBe('number');
			expect(typeof result.annotationsRemoved).toBe('number');
			expect(typeof result.priorRevisionRecovered).toBe('boolean');
		});

		it('returns pdf bytes when output is "pdf"', async () => {
			const pdf = buildMinimalPdf('Test');
			const result = await unseal(pdf, { output: 'pdf', includeAudit: false });
			expect(result.pdf).toBeInstanceOf(Uint8Array);
			expect((result.pdf?.length ?? 0)).toBeGreaterThan(0);
		});

		it('returns pdf bytes when output is "both"', async () => {
			const pdf = buildMinimalPdf('Test');
			const result = await unseal(pdf, { output: 'both', includeAudit: false });
			expect(result.pdf).toBeInstanceOf(Uint8Array);
		});

		it('omits pdf bytes when output is "report"', async () => {
			const pdf = buildMinimalPdf('Test');
			const result = await unseal(pdf, { output: 'report', includeAudit: false });
			expect(result.pdf).toBeUndefined();
		});
	});

	describe('Scenario C — prior revision extraction', () => {
		it('detects an incremental save and sets priorRevisionRecovered=true', async () => {
			const pdf = buildPdfWithIncrementalSave();
			const result = await unseal(pdf, {
				stripOverlays: false,
				stripAnnotations: false,
				extractPriorRevision: true,
				annotateCandidates: false,
				output: 'report',
				includeAudit: false,
			});
			expect(result.priorRevisionRecovered).toBe(true);
			const cFinding = result.findings.find((f) => f.scenario === 'C');
			expect(cFinding).toBeDefined();
			expect(cFinding?.priorRevisionPdf).toBeInstanceOf(Uint8Array);
		});

		it('does not set priorRevisionRecovered for a single-revision PDF', async () => {
			const pdf = buildMinimalPdf('Single revision');
			const result = await unseal(pdf, {
				stripOverlays: false,
				stripAnnotations: false,
				extractPriorRevision: true,
				annotateCandidates: false,
				output: 'report',
				includeAudit: false,
			});
			expect(result.priorRevisionRecovered).toBe(false);
		});
	});

	describe('audit integration', () => {
		it('includes auditReport when includeAudit=true', async () => {
			const pdf = buildMinimalPdf('Audited document');
			const result = await unseal(pdf, { output: 'report', includeAudit: true });
			expect(result.auditReport).toBeDefined();
			expect(result.auditReport?.sha256).toHaveLength(64);
		});

		it('omits auditReport when includeAudit=false', async () => {
			const pdf = buildMinimalPdf('No audit');
			const result = await unseal(pdf, { output: 'report', includeAudit: false });
			expect(result.auditReport).toBeUndefined();
		});
	});
});
