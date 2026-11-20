import type { APIRoute } from "astro";
import { llmsTxt } from "../lib/llms";
import { businessCard, llmsPages } from "../lib/llms-content";

export const GET: APIRoute = async () => {
  const { pages, legal } = await llmsPages();
  return new Response(llmsTxt(businessCard(), pages, legal), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
