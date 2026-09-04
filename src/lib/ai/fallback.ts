import type { AIProvider, ModelConfig, ProviderEvent, StreamOptions } from "./providers/types";
import { getProviderOrThrow } from "./providers";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface Attempt {
  model: ModelConfig;
  stream: ReadableStream<ProviderEvent>;
}

/**
 * Creates a stream for the preferred model, falling back to the next
 * candidate when a provider fails.
 *
 * - The first candidate is started eagerly so immediate failures (bad API
 *   key, provider down at request time) surface as HTTP errors.
 * - Remaining candidates are started lazily, only when a fallback is needed.
 * - A candidate that fails mid-stream before any content was emitted is
 *   replaced transparently. Once content has been streamed to the client,
 *   failures are propagated instead (a mid-response model swap would be
 *   confusing).
 */
export async function createStreamWithFallback(
  candidates: ModelConfig[],
  options: Omit<StreamOptions, "model">,
  getProvider: (id: string) => AIProvider = getProviderOrThrow,
): Promise<ReadableStream<ProviderEvent>> {
  const failures: string[] = [];

  let initial: Attempt | null = null;
  for (const model of candidates) {
    try {
      initial = {
        model,
        stream: await getProvider(model.provider).createStream({ ...options, model: model.id }),
      };
      break;
    } catch (error) {
      const message = errorMessage(error);
      failures.push(`${model.id}: ${message}`);
      console.warn(`[fallback] model "${model.id}" failed to start: ${message}`);
    }
  }

  if (!initial) {
    throw new Error(`All providers failed: ${failures.join(" | ")}`);
  }

  const rest = candidates.filter((m) => m.id !== initial!.model.id);
  return fallbackEventStream(initial, rest, options, getProvider, failures);
}

function fallbackEventStream(
  initial: Attempt,
  rest: ModelConfig[],
  options: Omit<StreamOptions, "model">,
  getProvider: (id: string) => AIProvider,
  failures: string[],
): ReadableStream<ProviderEvent> {
  let restIndex = 0;

  const nextAttempt = async (): Promise<Attempt | null> => {
    while (restIndex < rest.length) {
      const model = rest[restIndex++];
      try {
        return {
          model,
          stream: await getProvider(model.provider).createStream({ ...options, model: model.id }),
        };
      } catch (error) {
        const message = errorMessage(error);
        failures.push(`${model.id}: ${message}`);
        console.warn(`[fallback] model "${model.id}" failed to start: ${message}`);
      }
    }
    return null;
  };

  return new ReadableStream<ProviderEvent>({
    async start(controller) {
      let current: Attempt | null = initial;
      let emittedText = false;

      while (current) {
        const reader = current.stream.getReader();
        let streamEnded = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              streamEnded = true;
              break;
            }
            if (value.type === "text") {
              emittedText = true;
              controller.enqueue(value);
            } else if (value.type === "done") {
              controller.enqueue(value);
              controller.close();
              return;
            } else if (value.type === "error") {
              const message = value.message;
              failures.push(`${current.model.id}: ${message}`);
              if (emittedText) {
                controller.enqueue({ type: "error", message });
                controller.close();
                return;
              }
              console.warn(`[fallback] model "${current.model.id}" failed mid-stream: ${message}`);
              break;
            }
          }
        } catch (error) {
          const message = errorMessage(error);
          failures.push(`${current.model.id}: ${message}`);
          if (emittedText) {
            controller.enqueue({ type: "error", message });
            controller.close();
            return;
          }
          console.warn(`[fallback] model "${current.model.id}" failed mid-stream: ${message}`);
        } finally {
          reader.releaseLock();
        }

        // Stream ended cleanly without a done event — treat as completion.
        if (streamEnded) {
          controller.enqueue({ type: "done" });
          controller.close();
          return;
        }

        // Error before any content — try the next candidate.
        current = await nextAttempt();
        if (!current) {
          controller.enqueue({
            type: "error",
            message: failures[failures.length - 1] ?? "All models failed",
          });
          controller.close();
          return;
        }
      }

      controller.close();
    },
  });
}
