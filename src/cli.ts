// CLI entry point: `npx unseal audit <file>` and `npx unseal strip <file>`.
// This file is bundled separately as dist/cli.js with a shebang.

import { program } from 'commander';
import { readFile, writeFile } from 'fs/promises';
import { audit, unseal, AuditPresets } from './index.js';
import type { AuditPresets as AuditPresetsType } from './presets.js';

const pkg = { version: '0.1.0' };

program
	.name('unseal')
	.description('Detect and remove fake PDF redactions')
	.version(pkg.version);

// ─── audit ───────────────────────────────────────────────────────────────────

program
	.command('audit <file>')
	.description('Audit a PDF for fake or insecure redactions')
	.option('--preset <preset>', 'Preset to use: quick | compliance | forensic', 'quick')
	.option('--json', 'Output results as JSON')
	.action(async (file: string, opts: { preset: string; json?: boolean }) => {
		let pdfBuffer: Buffer;
		try {
			pdfBuffer = await readFile(file);
		} catch (err) {
			console.error(`Error: Cannot read file "${file}": ${String(err)}`);
			process.exit(1);
		}

		const presetKey = opts.preset as keyof typeof AuditPresetsType;
		const options = AuditPresets[presetKey] ?? AuditPresets.quick;

		let report: Awaited<ReturnType<typeof audit>>;
		try {
			report = await audit(pdfBuffer.buffer as ArrayBuffer, options);
		} catch (err) {
			console.error(`Error: Failed to audit PDF: ${String(err)}`);
			process.exit(1);
		}

		if (opts.json) {
			console.log(JSON.stringify(report, null, 2));
			return;
		}

		if (report.clean) {
			console.log(`✓ No issues found (SHA-256: ${report.sha256.slice(0, 16)}…)`);
		} else {
			console.log(`✗ ${report.findings.length} issue(s) found (SHA-256: ${report.sha256.slice(0, 16)}…)`);
		}

		for (const f of report.findings) {
			const pageStr = f.page ? ` [page ${f.page}]` : '';
			const recoveredStr = f.recoveredText ? ` → "${f.recoveredText.slice(0, 60)}"` : '';
			console.log(`  [${f.severity}]${pageStr} ${f.check}: ${f.detail}${recoveredStr}`);
		}

		if (!report.clean) process.exit(1);
	});

// ─── strip ───────────────────────────────────────────────────────────────────

program
	.command('strip <file>')
	.description('Strip fake redactions and write a usable PDF')
	.option('--output <file>', 'Output PDF file path', 'unsealed.pdf')
	.option('--report <file>', 'Write a JSON findings report to this file')
	.option('--no-audit', 'Skip the built-in audit pass')
	.action(
		async (
			file: string,
			opts: { output: string; report?: string; audit: boolean },
		) => {
			let pdfBuffer: Buffer;
			try {
				pdfBuffer = await readFile(file);
			} catch (err) {
				console.error(`Error: Cannot read file "${file}": ${String(err)}`);
				process.exit(1);
			}

			let result: Awaited<ReturnType<typeof unseal>>;
			try {
				result = await unseal(pdfBuffer.buffer as ArrayBuffer, {
					output: 'both',
					includeAudit: opts.audit !== false,
				});
			} catch (err) {
				console.error(`Error: Failed to process PDF: ${String(err)}`);
				process.exit(1);
			}

			if (result.pdf) {
				await writeFile(opts.output, result.pdf);
				console.log(`Wrote unsealed PDF to: ${opts.output}`);
			}

			console.log(
				`Stripped: ${result.overlaysStripped} overlay(s), ${result.annotationsRemoved} annotation(s)`,
			);

			if (result.priorRevisionRecovered) {
				console.log('Prior revision recovered — see findings report for details');
			}

			for (const f of result.findings) {
				const pageStr = f.page ? ` [page ${f.page}]` : '';
				const recoveredStr = f.recoveredText ? ` → "${f.recoveredText.slice(0, 60)}"` : '';
				console.log(`  [Scenario ${f.scenario}]${pageStr} confidence=${(f.confidence * 100).toFixed(0)}%${recoveredStr}`);
			}

			if (opts.report) {
				const reportData = {
					findings: result.findings.map((f) => ({
						...f,
						// Omit large binary blobs from the JSON report.
						priorRevisionPdf: f.priorRevisionPdf ? `<${f.priorRevisionPdf.length} bytes>` : undefined,
					})),
					overlaysStripped: result.overlaysStripped,
					annotationsRemoved: result.annotationsRemoved,
					priorRevisionRecovered: result.priorRevisionRecovered,
					auditReport: result.auditReport,
				};
				await writeFile(opts.report, JSON.stringify(reportData, null, 2));
				console.log(`Wrote findings report to: ${opts.report}`);
			}
		},
	);

program.parseAsync(process.argv).catch((err) => {
	console.error(String(err));
	process.exit(1);
});
