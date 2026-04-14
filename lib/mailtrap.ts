// Helper para envio de email via Mailtrap
// Docs: https://api-docs.mailtrap.io/docs/mailtrap-api-docs/bcf61cdc1547e-send-email

import { EMAIL_REGEX, SECURITY, API_TIMEOUTS } from "./constants";

interface MailtrapEmail {
  to: string;
  subject?: string; // Opcional se usar template
  html?: string; // Opcional se usar template
  templateUuid?: string;
  templateVariables?: Record<string, string | number | boolean>;
  fromName?: string;
  fromEmail?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  templateUuid,
  templateVariables,
  fromName,
  fromEmail,
}: MailtrapEmail) {
  const apiToken = process.env.MAILTRAP_API_TOKEN;
  if (!apiToken) {
    console.warn("MAILTRAP_API_TOKEN não configurado — email ignorado");
    return;
  }

  const toEmail = to.trim().toLowerCase();
  if (
    !EMAIL_REGEX.test(toEmail) ||
    toEmail.length > SECURITY.MAX_EMAIL_LENGTH
  ) {
    throw new Error("Mailtrap: email de destino inválido");
  }

  const from = {
    email:
      fromEmail || process.env.MAILTRAP_FROM_EMAIL || "team@neo-convert.site",
    name: fromName || process.env.MAILTRAP_FROM_NAME || "NΞØ CONVΞRT",
  };

  interface MailtrapPayload {
    from: { email: string; name: string };
    to: { email: string }[];
    subject?: string;
    html?: string;
    template_uuid?: string;
    template_variables?: Record<string, string | number | boolean>;
  }

  const payload: MailtrapPayload = {
    from,
    to: [{ email: toEmail }],
  };

  // Decide entre Template ou HTML direto
  if (templateUuid) {
    payload.template_uuid = templateUuid;
    if (templateVariables) {
      payload.template_variables = templateVariables;
    }
  } else {
    if (!subject || !html) {
      throw new Error(
        "Mailtrap: subject e html são obrigatórios caso não use templateUuid",
      );
    }
    payload.subject = subject;
    payload.html = html;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    API_TIMEOUTS.MAILTRAP_MS,
  );

  try {
    const res = await fetch("https://send.api.mailtrap.io/api/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Mailtrap error:", err);
      throw new Error(`Mailtrap: ${err}`);
    }

    return await res.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Mailtrap: timeout no envio");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
