import { expect, test } from "@playwright/test";

test("uploads from the homepage and carries the file into compress pdf", async ({
  page,
}) => {
  await page.route("**/api/upload-to-cloud", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://demo.public.blob.vercel-storage.com/contract.pdf",
        pathname: "demo/contract.pdf",
        contentType: "application/pdf",
      }),
    });
  });

  await page.route(
    "https://demo.public.blob.vercel-storage.com/contract.pdf",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF",
      });
    },
  );

  await page.goto("/");

  await page.locator("input[type='file']").setInputFiles({
    name: "contract.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(
      "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF",
    ),
  });

  await expect(page.getByText("Arquivo pronto para o protocolo")).toBeVisible();
  const compressLink = page.locator('a[href*="/tools/compress-pdf?fileUrl="]');
  await expect(compressLink).toBeVisible();

  await compressLink.click();

  await expect(page).toHaveURL(/\/tools\/compress-pdf\?/);
  await expect(
    page.getByRole("heading", { name: "Comprimir PDF" }),
  ).toBeVisible();
  await expect(page.getByText("contract.pdf")).toBeVisible();
  await expect(page.locator("#tool-process-btn")).toBeVisible();
});
