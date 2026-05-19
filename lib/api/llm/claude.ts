// lib/api/llm/claude.ts
// Stub for Anthropic Claude. Wired but disabled by default — the provider
// router in lib/api/llm.ts only picks this when LLM_PROVIDER=claude.
//
// To enable later:
//   1. npm i @anthropic-ai/sdk
//   2. Set ANTHROPIC_API_KEY in .env.local
//   3. Set LLM_PROVIDER=claude in .env.local
//   4. Replace the stub body below with the real SDK call (see note inside)

export interface ClaudeGenerateInput {
  system: string;
  user: string;
  hint?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function claudeGenerate(_opts: ClaudeGenerateInput): Promise<string> {
  // To implement once the SDK is installed:
  //
  //   import Anthropic from "@anthropic-ai/sdk";
  //   const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  //   const msg = await client.messages.create({
  //     model: "claude-sonnet-4-6",
  //     max_tokens: opts.maxTokens ?? 4096,
  //     temperature: opts.temperature ?? 0.4,
  //     system: opts.system,
  //     messages: [{ role: "user", content: opts.user + (opts.hint ? ... : "") }],
  //   });
  //   const block = msg.content[0];
  //   if (block.type !== "text") throw new Error("Claude returned non-text block");
  //   return block.text;
  //
  // For now, we refuse to run so a misconfigured env var fails loudly.
  throw new Error(
    "Claude provider not yet implemented. Set LLM_PROVIDER=ollama in .env.local."
  );
}
