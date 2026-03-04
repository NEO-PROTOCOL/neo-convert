import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const PLANS: Record<string, { name: string; value: number; label: string }> = {
    starter: { name: "NeoConvert Starter", value: 750, label: "R$ 7,50/mês" },
    pro: { name: "NeoConvert Pro", value: 2900, label: "R$ 29/mês" },
    business: { name: "NeoConvert Business", value: 7900, label: "R$ 79/mês" },
};

export async function POST(req: NextRequest) {
    try {
        const { planId, name, email } = await req.json();

        if (!planId || !name || !email) {
            return NextResponse.json(
                { error: "planId, name e email são obrigatórios" },
                { status: 400 }
            );
        }

        const plan = PLANS[planId];
        if (!plan) {
            return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
        }

        const correlationID = `neoconvert-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

        // Criar cobrança Pix via Woovi
        const wooviRes = await fetch(
            `${process.env.WOOVI_API_URL || "https://api.woovi.com"}/api/v1/charge`,
            {
                method: "POST",
                headers: {
                    Authorization: process.env.WOOVI_API_KEY || "",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    correlationID,
                    value: plan.value,
                    comment: plan.name,
                    expiresIn: 3600,
                    customer: { name, email },
                    additionalInfo: [{ key: "Plano", value: plan.name }],
                }),
            }
        );

        if (!wooviRes.ok) {
            const err = await wooviRes.text();
            console.error("Woovi error:", err);
            return NextResponse.json(
                { error: "Erro ao criar cobrança Pix. Tente novamente." },
                { status: 502 }
            );
        }

        const wooviData = await wooviRes.json();
        const charge = wooviData.charge;

        // Enviar email de confirmação via Resend
        if (process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const fromAddress =
                process.env.RESEND_FROM || "NeoConvert <no-reply@neo-convert.com>";

            const pixCode = charge?.brCode || charge?.pixQrCode?.payload || "";
            const qrImage = charge?.pixQrCode?.encodedImage
                ? `<img src="data:image/png;base64,${charge.pixQrCode.encodedImage}" width="200" height="200" alt="QR Code Pix" style="border-radius:12px;" />`
                : "";

            await resend.emails.send({
                from: fromAddress,
                to: email,
                subject: `⚡ Seu Pix para ${plan.name} — NeoConvert`,
                html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050508;font-family:'Segoe UI',system-ui,sans-serif;color:#e8e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,255,157,0.1);border:1px solid rgba(0,255,157,0.3);border-radius:999px;padding:6px 16px;margin-bottom:24px;">
        <span style="width:6px;height:6px;background:#00ff9d;border-radius:50%;"></span>
        <span style="color:#00ff9d;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;font-family:monospace;">NeoConvert</span>
      </div>
      <h1 style="font-size:28px;font-weight:800;margin:0 0 8px;">Seu Pix está pronto! ⚡</h1>
      <p style="color:rgba(232,232,240,0.6);margin:0;">Olá, ${name}! Use o QR Code ou o código abaixo para ativar seu plano ${plan.name}.</p>
    </div>

    <div style="background:#13131a;border:1px solid rgba(0,255,157,0.2);border-radius:20px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;font-weight:800;color:#00ff9d;margin-bottom:4px;">${plan.label}</div>
      <div style="color:rgba(232,232,240,0.5);font-size:13px;margin-bottom:24px;">Plano ${plan.name}</div>
      
      ${qrImage ? `<div style="margin-bottom:24px;">${qrImage}</div>` : ""}

      ${pixCode
                        ? `
      <div style="background:#0a0a0f;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;word-break:break-all;font-family:monospace;font-size:11px;color:rgba(232,232,240,0.7);text-align:left;margin-bottom:16px;">
        ${pixCode}
      </div>
      `
                        : ""
                    }

      <div style="font-size:12px;color:rgba(232,232,240,0.4);">ID da cobrança: ${correlationID}</div>
    </div>

    <div style="background:#13131a;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:24px;margin-bottom:24px;">
      <h3 style="font-size:14px;font-weight:700;margin:0 0 12px;color:#00ff9d;">Como pagar</h3>
      <ol style="margin:0;padding:0 0 0 20px;color:rgba(232,232,240,0.6);font-size:14px;line-height:2;">
        <li>Abra o app do seu banco</li>
        <li>Escaneie o QR Code ou copie o código Pix</li>
        <li>Confirme o pagamento</li>
        <li>Sua conta será ativada automaticamente em minutos</li>
      </ol>
    </div>

    <div style="text-align:center;font-size:12px;color:rgba(232,232,240,0.3);">
      <p>O Pix expira em 1 hora. Dúvidas? <a href="mailto:suporte@neo-convert.com" style="color:#00ff9d;text-decoration:none;">suporte@neo-convert.com</a></p>
      <p style="margin-top:8px;">© ${new Date().getFullYear()} NeoConvert · Todos os direitos reservados</p>
    </div>
  </div>
</body>
</html>`,
            });
        }

        return NextResponse.json({
            success: true,
            correlationID,
            brCode: charge?.brCode,
            qrCode: charge?.pixQrCode?.encodedImage,
            expiresAt: charge?.expiresAt,
        });
    } catch (error) {
        console.error("Checkout error:", error);
        return NextResponse.json(
            { error: "Erro interno do servidor" },
            { status: 500 }
        );
    }
}
