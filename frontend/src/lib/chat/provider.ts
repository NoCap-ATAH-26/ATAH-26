/**
 * Chat inference config.
 *
 * Ollama and the free hosted providers (Groq, OpenRouter, Cerebras, Together)
 * all expose the *same* OpenAI-compatible `/v1/chat/completions` contract, so
 * this integration targets that shape and swaps provider purely through env
 * vars — no code change to move between them.
 *
 * Defaults point at a local Ollama, which costs nothing and needs no key.
 * That works in local dev, but a deployed serverless function obviously
 * cannot reach a laptop's localhost, so production needs these three vars
 * pointed at a hosted provider's free tier. See docs/CHAT_SETUP.md.
 *
 * Deliberately server-only (no NEXT_PUBLIC_ prefix) so the key is never
 * inlined into the browser bundle.
 */
export type ChatProviderConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
  /** True when nothing was configured and we're falling back to local Ollama. */
  isLocalDefault: boolean;
};

const OLLAMA_BASE_URL = "http://localhost:11434/v1";
const OLLAMA_DEFAULT_MODEL = "llama3.2";

export function getChatProvider(): ChatProviderConfig {
  const baseUrl = (process.env.CHAT_BASE_URL ?? OLLAMA_BASE_URL).replace(/\/+$/, "");
  const model = process.env.CHAT_MODEL ?? OLLAMA_DEFAULT_MODEL;
  // Ollama requires the Authorization header to be present but ignores its
  // value; hosted providers need a real key here.
  const apiKey = process.env.CHAT_API_KEY ?? "ollama";

  return {
    baseUrl,
    model,
    apiKey,
    isLocalDefault: !process.env.CHAT_BASE_URL,
  };
}

export const SYSTEM_PROMPT = [
  "You are the NoCap assistant.",
  "NoCap is an autonomous pipeline that inspects documents entering a knowledge base,",
  "repairs the ones that fail its checks, and verifies the repairs before publishing —",
  "so a RAG chatbot never answers from unsourced, stale, or synthetic data.",
  "The pipeline has three stages: Inspector, Repair, and Verifier.",
  "Answer concisely and concretely. If you do not know something, say so plainly",
  "rather than inventing details.",
].join(" ");
