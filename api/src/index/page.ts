import { z } from "zod";

export const VisibilitySchema = z.enum(["public", "private"]);

export const PageSchema = z.object({
  url: z.string().startsWith("/"),
  title: z.string(),
  description: z.string(),
  lang: z.string(),
  headings: z.array(z.string()),
  text: z.string(),
  visibility: VisibilitySchema,
});

export type Visibility = z.infer<typeof VisibilitySchema>;
export type Page = z.infer<typeof PageSchema>;
