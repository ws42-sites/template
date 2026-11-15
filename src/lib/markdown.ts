import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export async function renderMarkdown(source: string): Promise<string> {
  const raw = await marked.parse(source, { gfm: true });
  return sanitizeHtml(raw, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "h1", "h2", "img"],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      a: ["href", "name", "target", "rel"],
    },
  });
}
