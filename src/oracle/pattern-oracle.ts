// Pattern oracle — ranks Naccache-Whelan candidates using an LLM for plausibility scoring.
// Uses AI SDK v6: generateText + Output.object (generateObject was removed in v6).

import type { Candidate } from './naccache-whelan.js';

/** A candidate ranked by the LLM oracle. */
export interface RankedCandidate {
	candidate: string;
	/** LLM confidence score 0–1. */
	confidence: number;
	/** LLM reasoning for this ranking. */
	reasoning: string;
}

export interface PatternOracleOptions {
	/** Candidates from Naccache-Whelan enumeration. */
	candidates: Candidate[];
	/** Text immediately before the redacted region. */
	contextBefore: string;
	/** Text immediately after the redacted region. */
	contextAfter: string;
	/** First 500 chars of the document for broader context. */
	documentContext?: string;
	/** Maximum results to return. Default: 10. */
	maxResults?: number;
}

const MAX_CANDIDATES_TO_SEND = 20;

/**
 * Ranks Naccache-Whelan candidates using an LLM via the Vercel AI Gateway.
 *
 * Gateway authentication is handled by the @ai-sdk/gateway client using
 * ambient credentials (OIDC token or gateway API key configured in the
 * environment). If the gateway call fails for any reason, returns candidates
 * sorted by Naccache-Whelan probability score as a graceful fallback.
 */
export async function rankCandidates(options: PatternOracleOptions): Promise<RankedCandidate[]> {
	const { candidates, contextBefore, contextAfter, documentContext, maxResults = 10 } = options;

	if (candidates.length === 0) return [];

	const topCandidates = candidates.slice(0, MAX_CANDIDATES_TO_SEND);
	const candidateList = topCandidates.map((c) => `"${c.text}"`).join(', ');

	const prompt = [
		'You are a forensic document analyst. A PDF contained a redacted region.',
		documentContext ? `Document context (first 500 chars): "${documentContext.slice(0, 500)}"` : '',
		`The text surrounding the redaction is: "...${contextBefore} [REDACTED] ${contextAfter}..."`,
		``,
		`Based on the surrounding context, rank these candidate strings by likelihood of being the original redacted text:`,
		`Candidates: ${candidateList}`,
		``,
		`Return a ranked list with confidence scores (0 to 1) and brief reasoning for each.`,
		`Only include candidates that are plausible given the context.`,
	]
		.filter(Boolean)
		.join('\n');

	try {
		const { generateText, Output } = await import('ai');
		const { createGateway } = await import('@ai-sdk/gateway');
		const { z } = await import('zod');

		const gateway = createGateway();

		const result = await generateText({
			model: gateway('anthropic/claude-sonnet-4.6'),
			output: Output.object({
				schema: z.object({
					ranked: z.array(
						z.object({
							candidate: z.string(),
							confidence: z.number().min(0).max(1),
							reasoning: z.string(),
						}),
					),
				}),
			}),
			prompt,
		});

		const ranked: RankedCandidate[] = result.output.ranked
			.slice(0, maxResults)
			.map((r: { candidate: string; confidence: number; reasoning: string }) => ({
				candidate: r.candidate,
				confidence: r.confidence,
				reasoning: r.reasoning,
			}));

		return ranked;
	} catch (err) {
		console.warn(`Unseal: pattern oracle API call failed: ${String(err)}. Falling back to width-based ranking.`);
		return candidates.slice(0, maxResults).map((c) => ({
			candidate: c.text,
			confidence: c.probability,
			reasoning: `Width match score: ${(c.probability * 100).toFixed(1)}% (oracle unavailable)`,
		}));
	}
}
