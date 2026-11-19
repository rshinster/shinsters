import { z } from "zod";

// What the chat box may send: the recent conversation, last message from the visitor.
export const MAX_MESSAGES = 12;
export const MAX_USER_MESSAGE_LENGTH = 1000;
// Guide replies come back from the page, so they are capped too (a few sentences in practice).
export const MAX_GUIDE_MESSAGE_LENGTH = 2000;
// Roomy for the limits above in ordinary text; bigger bodies are refused before JSON parsing.
export const MAX_BODY_BYTES = 128 * 1024;

const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string().trim().min(1).max(MAX_USER_MESSAGE_LENGTH),
});

const GuideMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().trim().min(1).max(MAX_GUIDE_MESSAGE_LENGTH),
});

export const ChatRequestSchema = z.object({
  messages: z
    .array(z.discriminatedUnion("role", [UserMessageSchema, GuideMessageSchema]))
    .min(1)
    .max(MAX_MESSAGES)
    .refine((messages) => messages.at(-1)?.role === "user", {
      message: "the last message must be from the user",
    }),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
