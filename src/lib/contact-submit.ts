const MIN_DELAY_MS = 3000;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 30_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactFormValues = {
  name: string;
  email: string;
  message: string;
};

export type ContactSubmitResult = {
  ok: boolean;
  code:
    | "SENT"
    | "VALIDATION_ERROR"
    | "HONEYPOT_REJECTED"
    | "TURNSTILE_REQUIRED"
    | "TOO_FAST"
    | "EXPIRED"
    | "COOLDOWN"
    | "RATE_LIMITED"
    | "CONTACT_FORM_UNAVAILABLE"
    | "SUBMIT_FAILED";
  message: string;
};

type ContactFormController = {
  submitCurrentForm: () => Promise<ContactSubmitResult>;
  submitWithValues: (values: ContactFormValues) => Promise<ContactSubmitResult>;
};

const controllers = new WeakMap<HTMLFormElement, ContactFormController>();

function parseErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object") {
    if ("errors" in payload && Array.isArray(payload.errors)) {
      const first: unknown = payload.errors[0];
      if (
        first &&
        typeof first === "object" &&
        "message" in first &&
        typeof first.message === "string"
      ) {
        return first.message;
      }
    }
    if ("error" in payload && typeof payload.error === "string") {
      return payload.error;
    }
  }
  return "Something went wrong. Please try again later.";
}

function setStatusText(status: Element | null, message: string): void {
  if (status instanceof HTMLElement) {
    status.textContent = message;
  }
}

function hasIncompleteTurnstile(form: HTMLFormElement): boolean {
  const tokenField = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    '[name="cf-turnstile-response"]',
  );
  if (tokenField) {
    return tokenField.value.trim().length === 0;
  }
  const widget = form.querySelector("[data-turnstile], .cf-turnstile");
  return widget !== null;
}

function resolveFormEndpoint(form: HTMLFormElement): string | null {
  const rawAction = form.getAttribute("action")?.trim() ?? "";
  if (rawAction.length === 0 || rawAction.includes("{{") || rawAction.includes("}}")) {
    return null;
  }
  try {
    const base = form.ownerDocument.baseURI || "https://example.com/";
    const resolved = new URL(rawAction, base);
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

export function attachContactForm(form: HTMLFormElement): ContactFormController {
  const existing = controllers.get(form);
  if (existing) {
    return existing;
  }

  const openedAt = form.querySelector("#form-opened-at");
  const status = form.querySelector("#form-status");
  const submitButton = form.querySelector("button[type=submit]");
  const started = Date.now();

  if (openedAt instanceof HTMLInputElement && openedAt.value.trim().length === 0) {
    openedAt.value = String(started);
  }

  const state = {
    lastSubmitAt: 0,
    inFlight: false,
  };

  const submitCurrentForm = async (): Promise<ContactSubmitResult> => {
    const endpoint = resolveFormEndpoint(form);
    if (!endpoint) {
      return {
        ok: false,
        code: "CONTACT_FORM_UNAVAILABLE",
        message: "The contact form is not connected on this page.",
      };
    }

    const gotcha = form.querySelector<HTMLInputElement>('input[name="_gotcha"]');
    if (gotcha?.value.trim()) {
      return {
        ok: false,
        code: "HONEYPOT_REJECTED",
        message: "Submission rejected.",
      };
    }

    if (hasIncompleteTurnstile(form)) {
      const message = "Please complete the security check and try again.";
      setStatusText(status, message);
      return { ok: false, code: "TURNSTILE_REQUIRED", message };
    }

    const now = Date.now();
    const opened = Number(openedAt instanceof HTMLInputElement ? openedAt.value : started);

    if (!Number.isFinite(opened) || now - opened < MIN_DELAY_MS) {
      const message = "Please wait a moment and try again.";
      setStatusText(status, message);
      return { ok: false, code: "TOO_FAST", message };
    }
    if (now - opened > MAX_AGE_MS) {
      const message = "This form has expired. Refresh the page and try again.";
      setStatusText(status, message);
      return { ok: false, code: "EXPIRED", message };
    }
    if (state.inFlight || (state.lastSubmitAt > 0 && now - state.lastSubmitAt < COOLDOWN_MS)) {
      const message = "Please wait before sending another message.";
      setStatusText(status, message);
      return { ok: false, code: "COOLDOWN", message };
    }

    state.inFlight = true;
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
    }
    setStatusText(status, "Sending…");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.status === 429) {
        const message = "Too many messages were just sent. Please wait a minute and try again.";
        setStatusText(status, message);
        if (submitButton instanceof HTMLButtonElement) {
          globalThis.setTimeout(() => {
            submitButton.disabled = false;
          }, COOLDOWN_MS);
        }
        return { ok: false, code: "RATE_LIMITED", message };
      }

      if (response.ok) {
        state.lastSubmitAt = Date.now();
        form.reset();
        if (openedAt instanceof HTMLInputElement) {
          openedAt.value = String(Date.now());
        }
        const message = "Thanks. Your message was sent.";
        setStatusText(status, message);
        if (submitButton instanceof HTMLButtonElement) {
          globalThis.setTimeout(() => {
            submitButton.disabled = false;
          }, COOLDOWN_MS);
        }
        return { ok: true, code: "SENT", message };
      }

      const payload: unknown = await response.json().catch(() => null);
      const message = parseErrorMessage(payload);
      setStatusText(status, message);
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
      return { ok: false, code: "SUBMIT_FAILED", message };
    } catch {
      const message = "Something went wrong. Please try again later.";
      setStatusText(status, message);
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
      }
      return { ok: false, code: "SUBMIT_FAILED", message };
    } finally {
      state.inFlight = false;
    }
  };

  const submitWithValues = async (values: ContactFormValues): Promise<ContactSubmitResult> => {
    const name = values.name.trim();
    const email = values.email.trim();
    const messageText = values.message.trim();

    if (name.length === 0 || name.length > 200) {
      return { ok: false, code: "VALIDATION_ERROR", message: "Please provide your name." };
    }
    if (email.length === 0 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Please provide a valid email address.",
      };
    }
    if (messageText.length === 0 || messageText.length > 5000) {
      return { ok: false, code: "VALIDATION_ERROR", message: "Please provide a message." };
    }

    const nameField = form.querySelector<HTMLInputElement>('input[name="name"]');
    const emailField = form.querySelector<HTMLInputElement>('input[name="email"]');
    const messageField = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
    if (!nameField || !emailField || !messageField) {
      return {
        ok: false,
        code: "CONTACT_FORM_UNAVAILABLE",
        message: "The contact form fields are unavailable on this page.",
      };
    }

    nameField.value = name;
    emailField.value = email;
    messageField.value = messageText;
    return submitCurrentForm();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitCurrentForm();
  });

  const controller: ContactFormController = {
    submitCurrentForm,
    submitWithValues,
  };
  controllers.set(form, controller);
  return controller;
}

export async function submitTemplateContact(
  doc: Document,
  values: ContactFormValues,
): Promise<ContactSubmitResult> {
  const form = doc.querySelector("[data-contact-form]");
  if (!(form instanceof HTMLFormElement) || !resolveFormEndpoint(form)) {
    return {
      ok: false,
      code: "CONTACT_FORM_UNAVAILABLE",
      message: "The contact form is not connected on this page.",
    };
  }
  return attachContactForm(form).submitWithValues(values);
}
