// Helper para envio de email via Mailtrap
// Docs: https://api-docs.mailtrap.io/docs/mailtrap-api-docs/bcf61cdc1547e-send-email

interface MailtrapEmail {
    to: string;
    subject: string;
    html: string;
    fromName?: string;
    fromEmail?: string;
}

const MAILTRAP_TIMEOUT_MS = 10_000;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmail({ to, subject, html, fromName, fromEmail }: MailtrapEmail) {
    const apiToken = process.env.MAILTRAP_API_TOKEN;
    if (!apiToken) {
        console.warn("MAILTRAP_API_TOKEN não configurado — email ignorado");
        return;
    }

    const toEmail = to.trim().toLowerCase();
    if (!SIMPLE_EMAIL_REGEX.test(toEmail) || toEmail.length > 254) {
        throw new Error("Mailtrap: email de destino inválido");
    }

    if (!subject.trim() || subject.length > 200) {
        throw new Error("Mailtrap: assunto inválido");
    }

    const from = {
        email: fromEmail || process.env.MAILTRAP_FROM_EMAIL || "no-reply@neo-convert.site",
        name: fromName || process.env.MAILTRAP_FROM_NAME || "NeoConvert",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAILTRAP_TIMEOUT_MS);

    const res = await fetch("https://send.api.mailtrap.io/api/send", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to: [{ email: toEmail }],
            subject,
            html,
        }),
        signal: controller.signal,
    }).finally(() => {
        clearTimeout(timeout);
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Mailtrap error:", err);
        throw new Error(`Mailtrap: ${err}`);
    }

    return res.json();
}
