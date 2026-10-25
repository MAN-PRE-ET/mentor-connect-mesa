import { createOpenAI } from "@ai-sdk/openai";

/**
 * Lovable AI Gateway helpers (server-only). Copied from the gateway SDK
 * skill's run-id reference; the provider is created per request so the run ID
 * stays request-local.
 */

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  let resolveRunId: (value: string | undefined) => void = () => {};
  let runIdResolved = false;
  const runIdReady = new Promise<string | undefined>((resolve) => {
    resolveRunId = resolve;
  });

  const publishRunId = (value?: string) => {
    const nextRunId = value?.trim() || undefined;
    if (!runId && nextRunId) {
      runId = nextRunId;
    }
    if (!runIdResolved) {
      runIdResolved = true;
      resolveRunId(runId);
    }
  };
  if (runId) publishRunId(runId);

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      try {
        const response = await fetch(input, { ...init, headers });
        publishRunId(response.headers.get(LOVABLE_AIG_RUN_ID_HEADER) ?? undefined);
        return response;
      } catch (error) {
        publishRunId(undefined);
        throw error;
      }
    },
    getRunId: () => runId,
    waitForRunId: () => (runId ? Promise.resolve(runId) : runIdReady),
  };
}

export const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";

export function getAiApiKey(): string | undefined {
  return process.env["Gemini_mentor_connect"] ?? process.env["GEMINI_API_KEY"];
}

export function createGeminiProvider(apiKey: string) {
  return createOpenAI({ baseURL: GEMINI_BASE_URL, apiKey });
}

export function createResponsesProvider() {
  const apiKey = getAiApiKey()!;
  return {
    provider: createGeminiProvider(apiKey),
    getRunId: () => undefined as string | undefined,
  };
}
