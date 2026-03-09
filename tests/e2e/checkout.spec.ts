import { expect, test } from "@playwright/test";

test("completes the checkout modal flow until paid confirmation", async ({
  page,
}) => {
  await page.route("**/api/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        correlationID: "charge-e2e-123",
        brCode: "00020101021226880014br.gov.bcb.pix2566pix.example/charge-e2e",
        qrCode:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8Y5kAAAAASUVORK5CYII=",
        expiresAt: "2026-03-07T03:00:00.000Z",
      }),
    });
  });

  let statusChecks = 0;
  await page.route("**/api/checkout/status/**", async (route) => {
    statusChecks += 1;

    if (statusChecks === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          status: "CREATED",
          paid: false,
          paidAt: null,
          paymentEmailSent: false,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        status: "PAID",
        paid: true,
        paidAt: "2026-03-07T03:01:00.000Z",
        paymentEmailSent: true,
        downloadToken: "download-e2e-token",
      }),
    });
  });

  await page.goto("/");
  await page.locator("#plan-pro-cta").click();

  await expect(page.getByRole("heading", { name: "Gerar cobrança" })).toBeVisible();

  await page.getByLabel("Seu nome").fill("NEØ MELLØ");
  await page.getByLabel("E-mail").fill("neo@example.com");
  await page.getByRole("button", { name: /Gerar QR Code Pix/i }).click();

  await expect(page.getByRole("heading", { name: "Pague com Pix" })).toBeVisible();
  await expect(page.getByAltText("QR Code Pix")).toBeVisible();
  await expect(page.getByText(/0002010102122688/)).toBeVisible();

  await page.getByRole("button", { name: /Verificar agora/i }).click();

  await expect(page.getByRole("heading", { name: "Pago com sucesso!" })).toBeVisible();
  await expect(page.getByText(/neo@example\.com/i)).toBeVisible();
  await expect(page.getByText(/charge-e2e-123/)).toBeVisible();
});
