import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

function validateWooviSignature(body: string, signature: string): boolean {
    const secret = process.env.WOOVI_WEBHOOK_SECRET;
    if (!secret) {
        console.warn("WOOVI_WEBHOOK_SECRET não configurado — validação ignorada");
        return true;
    }
    const expected = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");
    return crypto.timingSafeEqual(
        Buffer.from(expected, "hex"),
        Buffer.from(signature, "hex")
    );
}

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature =
        req.headers.get("x-webhook-signature") ||
        req.headers.get("x-woovi-signature") ||
        "";

    if (signature && !validateWooviSignature(rawBody, signature)) {
        console.error("Assinatura do webhook inválida");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: {
        event?: string;
        charge?: {
            correlationID?: string;
            status?: string;
            customer?: { name?: string; email?: string };
            comment?: string;
        };
    };

    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { event, charge } = payload;

    // Woovi envia "OPENPIX:CHARGE_COMPLETED" quando Pix é pago
    if (event === "OPENPIX:CHARGE_COMPLETED" || charge?.status === "COMPLETED") {
        const correlationID = charge?.correlationID;
        const customerEmail = charge?.customer?.email;
        const customerName = charge?.customer?.name;
        const planName = charge?.comment;

        console.log(`✅ Pix pago: ${correlationID} — ${customerEmail}`);

        // TODO: Ativar assinatura no banco de dados
        // await db.subscription.activate({ correlationID, email: customerEmail });

        // Enviar email de boas-vindas
        if (customerEmail && process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const fromAddress =
                process.env.RESEND_FROM || "NeoConvert <no-reply@neo-convert.com>";

            await resend.emails.send({
                from: fromAddress,
                to: customerEmail,
                subject: `🎉 Pagamento confirmado! Bem-vindo ao NeoConvert ${planName}`,
                html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Segoe UI',system-ui,sans-serif;color:#e8e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:64px;margin-bottom:16px;">🎉</div>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;">Pagamento confirmado!</h1>
      <p style="color:rgba(232,232,240,0.6);margin:0;">
        Olá${customerName ? `, ${customerName}` : ""}! Seu Pix foi recebido e sua assinatura está ativa.
      </p>
    </div>

    <div style="background:#13131a;border:1px solid rgba(0,255,157,0.3);border-radius:20px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,255,157,0.1);border:1px solid rgba(0,255,157,0.3);border-radius:999px;padding:8px 20px;margin-bottom:16px;">
        <span style="color:#00ff9d;font-weight:700;">✓ Assinatura ativa — ${planName || "Pro"}</span>
      </div>
      <p style="color:rgba(232,232,240,0.6);font-size:14px;margin:0;">
        Acesse todas as ferramentas premium agora mesmo em <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://neo-convert.com"}" style="color:#00ff9d;text-decoration:none;">neo-convert.com</a>
      </p>
    </div>

    <div style="text-align:center;font-size:12px;color:rgba(232,232,240,0.3);">
      <p>ID da cobrança: ${correlationID}</p>
      <p style="margin-top:8px;">Dúvidas? <a href="mailto:suporte@neo-convert.com" style="color:#00ff9d;text-decoration:none;">suporte@neo-convert.com</a></p>
      <p style="margin-top:8px;">© ${new Date().getFullYear()} NeoConvert</p>
    </div>
  </div>
</body>
</html>`,
            });
        }

        return NextResponse.json({ received: true, processed: "payment_confirmed" });
    }

    // Outros eventos — apenas confirmar recebimento
    return NextResponse.json({ received: true, event: event || "unknown" });
}
