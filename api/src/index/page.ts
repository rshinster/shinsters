import { z } from "zod";

export const VisibilitySchema = z.enum(["public", "private"]);

// "page": an HTML page; "file": a file linked from a page (e.g. a PDF), known by its link only.
export const KindSchema = z.enum(["page", "file"]);

export const PageSchema = z.object({
  url: z.string().startsWith("/"),
  kind: KindSchema,
  owner: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  lang: z.string(),
  headings: z.array(z.string()),
  text: z.string(),
  visibility: VisibilitySchema,
});

export type Visibility = z.infer<typeof VisibilitySchema>;
export type Kind = z.infer<typeof KindSchema>;
export type Page = z.infer<typeof PageSchema>;
