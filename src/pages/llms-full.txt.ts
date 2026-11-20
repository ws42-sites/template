import type { APIRoute } from "astro";
import { llmsFullTxt } from "../lib/llms";
import { businessCard, llmsPages } from "../lib/llms-content";

export const GET: APIRoute = async () => {
  const { pages, legal } = await llmsPages();
  return new Response(llmsFullTxt(businessCard(), pages, legal), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
