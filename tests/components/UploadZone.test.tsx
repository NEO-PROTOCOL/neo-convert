import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadZone from "@/components/UploadZone";

describe("UploadZone", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prevents uploads larger than 50 MB", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    const { container } = render(<UploadZone />);
    const input = container.querySelector("input[type='file']");
    const largeFile = new File(["x"], "large.pdf", { type: "application/pdf" });

    Object.defineProperty(largeFile, "size", {
      value: 50 * 1024 * 1024 + 1,
      configurable: true,
    });

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Expected upload input to exist");
    }

    await user.upload(input, largeFile);

    expect(await screen.findByText(/50MB/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads a pdf and exposes tool links", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://files.neo-convert.site/contract.pdf",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    const { container } = render(<UploadZone />);
    const input = container.querySelector("input[type='file']");
    const pdfFile = new File(["pdf"], "contract.pdf", {
      type: "application/pdf",
    });

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Expected upload input to exist");
    }

    await user.upload(input, pdfFile);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(await screen.findByText("Arquivo pronto para o protocolo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Comprimir/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/tools/compress-pdf?"),
    );
    expect(
      screen.getByRole("link", { name: /Comprimir/i }).getAttribute("href"),
    ).toContain(encodeURIComponent("contract.pdf"));
  });

  it("uploads an image and suggests jpg to pdf", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://files.neo-convert.site/photo.jpg",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    const { container } = render(<UploadZone />);
    const input = container.querySelector("input[type='file']");
    const imageFile = new File(["img"], "photo.jpg", { type: "image/jpeg" });

    if (!(input instanceof HTMLInputElement)) {
      throw new Error("Expected upload input to exist");
    }

    await user.upload(input, imageFile);

    expect(
      await screen.findByRole("link", { name: /Converter para PDF/i }),
    ).toHaveAttribute("href", expect.stringContaining("/tools/jpg-to-pdf?"));
  });
});
