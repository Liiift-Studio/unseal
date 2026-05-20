// Public API for the unseal package — exports audit(), unseal(), AuditPresets, and all types.

export { audit } from './audit.js';
export { unseal } from './unseal.js';
export { AuditPresets } from './presets.js';

export type {
	AuditOptions,
	AuditReport,
	AuditFinding,
	CandidateString,
	UnsealOptions,
	UnsealResult,
	UnsealFinding,
} from './types.js';

export type { Candidate } from './oracle/naccache-whelan.js';
export type { RankedCandidate } from './oracle/pattern-oracle.js';
