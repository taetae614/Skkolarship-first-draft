const INFORMATION_EXTRACT_URL = "https://api.upstage.ai/v1/information-extraction/chat/completions";

export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

/**
 * Calls Upstage's Information Extract API (model: information-extract).
 * Unlike Document Parse (OCR/layout-only), this returns fields matching a
 * caller-supplied JSON schema directly — the right tool whenever the goal
 * is "pull these specific fields out of this document" rather than "give
 * me the raw text/markdown".
 * Docs: https://console.upstage.ai/docs/capabilities/information-extraction
 */
export async function extractInformation(
  file: File,
  schema: JsonSchema,
  schemaName: string,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.UPSTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("UPSTAGE_API_KEY가 설정되지 않았습니다.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Data = buffer.toString("base64");
  const mimeType = file.type || "application/pdf";

  const response = await fetch(INFORMATION_EXTRACT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "information-extract",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Data}` },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Upstage Information Extract 호출 실패 (${response.status}): ${errorText}`);
  }

  const completion = await response.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Information Extract 응답 형식이 예상과 다릅니다.");
  }

  return JSON.parse(content) as Record<string, unknown>;
}
