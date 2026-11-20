import { type ContactSubmitResult, submitTemplateContact } from "./contact-submit";
import type { ClientWebMcpData } from "./seo-head";

export type WebMcpToolAnnotations = {
  readOnlyHint?: boolean | undefined;
  consequentialHint?: boolean | undefined;
};

export type WebMcpJsonSchema = {
  type: "object";
  properties: Record<string, { type: "string"; description?: string | undefined }>;
  required?: readonly string[] | undefined;
  additionalProperties: false;
};

export type WebMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: WebMcpJsonSchema;
  annotations?: WebMcpToolAnnotations | undefined;
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
};

export type ModelContextLike = {
  registerTool: (
    tool: WebMcpToolDefinition,
    options?: { signal?: AbortSignal | undefined },
  ) => unknown | Promise<unknown>;
};

function assertPlainAllowedObject(
  input: unknown,
  allowedKeys: readonly string[],
): {
  name?: unknown;
  email?: unknown;
  message?: unknown;
} {
  if (input === undefined) {
    return {};
  }
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Tool input must be a JSON object.");
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error("Tool input must be a plain object.");
  }
  if (Object.prototype.hasOwnProperty.call(input, "__proto__")) {
    throw new Error("Unexpected property: __proto__");
  }
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      throw new Error(`Unexpected property: ${key}`);
    }
  }
  return input as { name?: unknown; email?: unknown; message?: unknown };
}

function getDocumentModelContext(doc: Document): ModelContextLike | null {
  try {
    if (!("modelContext" in doc)) {
      return null;
    }
    const candidate = (doc as Document & { modelContext?: ModelContextLike | null }).modelContext;
    if (typeof candidate?.registerTool !== "function") {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export function buildClientWebMcpTools(
  doc: Document,
  data: ClientWebMcpData,
): WebMcpToolDefinition[] {
  return [
    {
      name: "get_business_info",
      description: `Return public business details, service area, address, phone, and website URL for ${data.name || "this business"}.`,
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false,
      },
      execute: (rawInput) => {
        assertPlainAllowedObject(rawInput, []);
        return {
          name: data.name,
          tagline: data.tagline,
          url: data.url,
          ...(data.businessType ? { businessType: data.businessType } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.telephone ? { telephone: data.telephone } : {}),
          ...(data.address ? { address: data.address } : {}),
          areaServed: [...data.areaServed],
        };
      },
    },
    {
      name: "get_hours",
      description: `Return opening hours for ${data.name || "this business"}.`,
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false,
      },
      execute: (rawInput) => {
        assertPlainAllowedObject(rawInput, []);
        return {
          name: data.name,
          configured: data.hours.length > 0,
          hours: [...data.hours],
        };
      },
    },
    {
      name: "get_services",
      description: `Return services and offerings for ${data.name || "this business"}.`,
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        consequentialHint: false,
      },
      execute: (rawInput) => {
        assertPlainAllowedObject(rawInput, []);
        return {
          name: data.name,
          configured: data.services.length > 0,
          services: [...data.services],
        };
      },
    },
    {
      name: "submit_contact",
      description: `Submit a contact message through the page's existing contact form for ${data.name || "this business"}.`,
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Sender full name." },
          email: { type: "string", description: "Sender reply email address." },
          message: { type: "string", description: "Message to send to the business." },
        },
        required: ["name", "email", "message"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        consequentialHint: true,
      },
      execute: async (rawInput): Promise<ContactSubmitResult> => {
        const parsed = assertPlainAllowedObject(rawInput, ["name", "email", "message"]);
        const { name, email, message } = parsed;
        if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
          throw new Error("name, email, and message must be strings.");
        }
        return submitTemplateContact(doc, { name, email, message });
      },
    },
  ];
}

export function registerClientWebMcpTools(doc: Document, data: ClientWebMcpData): () => void {
  const modelContext = getDocumentModelContext(doc);
  if (!modelContext) {
    return () => {};
  }

  const controller = new AbortController();
  const tools = buildClientWebMcpTools(doc, data);

  for (const tool of tools) {
    if (controller.signal.aborted) {
      break;
    }
    try {
      const pending = modelContext.registerTool(tool, { signal: controller.signal });
      void Promise.resolve(pending).catch(() => {});
    } catch {
      // Ignore synchronous registration rejections.
    }
  }

  return () => {
    controller.abort();
  };
}

export function initClientWebMcpFromDom(doc: Document): () => void {
  if (!getDocumentModelContext(doc)) {
    return () => {};
  }
  const configEl = doc.querySelector<HTMLScriptElement>("script[data-ws42-webmcp-config]");
  if (!configEl?.textContent) {
    return () => {};
  }
  let parsed: ClientWebMcpData;
  try {
    parsed = JSON.parse(configEl.textContent) as ClientWebMcpData;
  } catch {
    return () => {};
  }
  const abort = registerClientWebMcpTools(doc, parsed);
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", abort, { once: true });
  }
  doc.addEventListener("astro:before-swap", abort, { once: true });
  return abort;
}
