/**
 * Converts an OpenAI-compatible SSE response body into a plain UTF-8 stream of
 * just the generated text.
 *
 * Kept separate from the route handler because the buffering here is the easy
 * thing to get wrong: chunk boundaries fall in arbitrary places, so a single
 * `data:` frame — or a multi-byte character — can be split across two reads.
 * Lines are therefore buffered until a newline is actually seen, and the
 * decoder runs in streaming mode.
 */
export function openAIStreamToText(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      let buffer = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // The trailing element may be a partial line — hold it for next read.
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;

            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }

            try {
              const token = JSON.parse(payload)?.choices?.[0]?.delta?.content;
              if (typeof token === "string" && token.length > 0) {
                controller.enqueue(encoder.encode(token));
              }
            } catch {
              // Keep-alive or non-JSON frame — skip it rather than tearing down
              // a stream that is otherwise healthy.
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}
