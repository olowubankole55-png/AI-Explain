import { ReplitConnectors } from "@replit/connectors-sdk";
import { Router, type IRouter } from "express";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const OPENAI_CONNECTOR_NAME = "openai";
const MAX_QUESTION_LENGTH = 2000;

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

function extractAnswer(data: OpenAIResponse): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim();

  return text ?? "";
}

function safeErrorMessage(status: number): string {
  if (status === 429) {
    return "The AI service is busy or has reached a quota limit. Please try again later.";
  }

  if (status >= 500) {
    return "The AI service is temporarily unavailable. Please try again soon.";
  }

  return "The AI service could not answer that request. Please try rephrasing your question.";
}

const router: IRouter = Router();

router.post("/explain", async (req, res) => {
  const question =
    typeof req.body?.question === "string" ? req.body.question.trim() : "";

  if (!question) {
    return res.status(400).json({
      answer: null,
      error: "Please enter a question before pressing Explain.",
    });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return res.status(400).json({
      answer: null,
      error: `Please keep your question under ${MAX_QUESTION_LENGTH} characters.`,
    });
  }

  const apiKey = process.env["OPENAI_API_KEY"];

  try {
    const requestBody = {
      model: process.env["OPENAI_MODEL"] || DEFAULT_MODEL,
      instructions:
        "You are AI Explain, a helpful student tutor. Give an accurate direct answer first, then explain in simple language. Break complicated subjects into steps, show math or science working when useful, give examples when helpful, ask for clarification if the question is unclear, and do not invent facts.",
      input: question,
    };

    const openAiResponse = apiKey
      ? await fetch(OPENAI_RESPONSES_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })
      : await new ReplitConnectors().proxy(
          OPENAI_CONNECTOR_NAME,
          "/v1/responses",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          },
        );

    if (!openAiResponse.ok) {
      req.log.warn({ status: openAiResponse.status }, "OpenAI request failed");
      return res.status(openAiResponse.status === 429 ? 429 : 502).json({
        answer: null,
        error: safeErrorMessage(openAiResponse.status),
      });
    }

    const data = (await openAiResponse.json()) as OpenAIResponse;
    const answer = extractAnswer(data);

    if (!answer) {
      req.log.warn("OpenAI response did not include answer text");
      return res.status(502).json({
        answer: null,
        error: "The AI service returned an empty answer. Please try again.",
      });
    }

    return res.json({ answer, error: null });
  } catch {
    req.log.error("OpenAI request error");
    return res.status(502).json({
      answer: null,
      error:
        "A network error stopped the AI service from answering. Please try again.",
    });
  }
});

export default router;
