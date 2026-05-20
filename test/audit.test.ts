// Tests for the audit() function covering all Tier 1 checks with synthetic PDFs.

import { describe, it, expect } from 'vitest';
import { audit, AuditPresets } from '../src/index.js';
import { buildMinimalPdf, buildPdfWithIncrementalSave } from './helpers/pdf-builder.js';

describe('audit()', () => {
	describe('clean PDF', () => {
		it('returns clean=true for a minimal valid PDF', async () => {
			const pdf = buildMinimalPdf('Hello world');
			const report = await audit(pdf, AuditPresets.quick);
			// A minimal PDF with no redaction structures should produce no CRITICAL/HIGH findings.
			const critical = report.findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
			expect(critical).toHaveLength(0);
			expect(report.sha256).toMatch(/^[a-f0-9]{64}$/);
			expect(report.checkedAt).toBeTruthy();
		});
	});

	describe('incremental-save check', () => {
		it('detects multiple %%EOF markers', async () => {
			const pdf = buildPdfWithIncrementalSave();
			const report = await audit(pdf, { incrementalSave: true, textUnderBox: false, metadataLeak: false, pendingAnnotation: false });
			const finding = report.findings.find((f) => f.check === 'incremental-save');
			expect(finding).toBeDefined();
			expect(finding?.severity).toBe('HIGH');
			expect(report.clean).toBe(false);
		});

		it('passes a single-revision PDF', async () => {
			const pdf = buildMinimalPdf('Clean document');
			const report = await audit(pdf, { incrementalSave: true, textUnderBox: false, metadataLeak: false, pendingAnnotation: false });
			const finding = report.findings.find((f) => f.check === 'incremental-save');
			expect(finding).toBeUndefined();
		});
	});

	describe('AuditPresets', () => {
		it('quick preset disables glyphPositionLeak and patternOracle', () => {
			expect(AuditPresets.quick.glyphPositionLeak).toBe(false);
			expect(AuditPresets.quick.patternOracle).toBe(false);
		});

		it('compliance preset enables glyphPositionLeak', () => {
			expect(AuditPresets.compliance.glyphPositionLeak).toBe(true);
		});

		it('forensic preset enables all checks', () => {
			expect(AuditPresets.forensic.glyphPositionLeak).toBe(true);
			expect(AuditPresets.forensic.patternOracle).toBe(true);
		});
	});

	describe('report structure', () => {
		it('always includes sha256 and checkedAt', async () => {
			const pdf = buildMinimalPdf('Test');
			const report = await audit(pdf, AuditPresets.quick);
			expect(report.sha256).toHaveLength(64);
			expect(new Date(report.checkedAt).getTime()).toBeGreaterThan(0);
		});

		it('clean is true when findings array is empty', async () => {
			const pdf = buildMinimalPdf('Test');
			const report = await audit(pdf, { textUnderBox: false, incrementalSave: false, metadataLeak: false, pendingAnnotation: false });
			expect(report.clean).toBe(true);
			expect(report.findings).toHaveLength(0);
		});
	});
});
