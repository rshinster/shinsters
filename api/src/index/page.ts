export type Visibility = "public" | "private";

export interface Page {
  url: string;
  title: string;
  description: string;
  lang: string;
  headings: string[];
  text: string;
  visibility: Visibility;
}
