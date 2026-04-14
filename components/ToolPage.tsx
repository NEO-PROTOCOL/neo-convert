"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";

type ResultItem = {
  name: string;
  url: string;
  source: "local" | "session";
  sessionFileId?: string;
};

interface ToolPageProps {
  icon: string;
  title: string;
  description: string;
  accept?: string;
  acceptLabel?: string;
  color: string;
  onProcess?: (files: File[]) => Promise<{ name: string; url: string }[]>;
  multi?: boolean;
  tip?: string;
  children?: React.ReactNode;
  payment?: {
    enabled: boolean;
    planId: string;
    planName: string;
    planPrice: string;
    ttlMs?: number;
    localStorageKey?: string;
    freeAllowance?: {
      maxUsesPerDevice: number;
      maxFilesPerUse?: number;
      storageKey?: string;
    };
  };
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function revokeBlobUrls(results: ResultItem[]): void {
  for (const result of results) {
    if (result.source === "local" && result.url.startsWith("blob:")) {
      URL.revokeObjectURL(result.url);
    }
  }
}

function ToolPageInner({
  icon,
  title,
  description,
  accept = "",
  acceptLabel = "",
  color,
  onProcess,
  multi = false,
  tip,
  children,
  payment,
}: ToolPageProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [cloudUrls, setCloudUrls] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [redirectingToCheckout, setRedirectingToCheckout] = useState(false);
  const [downloadAuthorized, setDownloadAuthorized] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [checkoutSessionToken, setCheckoutSessionToken] = useState<
    string | null
  >(null);
  const [freeUsesConsumed, setFreeUsesConsumed] = useState(0);
  const [freeUnlockActive, setFreeUnlockActive] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [rehydratingSession, setRehydratingSession] = useState(false);
  const latestResultsRef = useRef<ResultItem[]>([]);
  const acceptedExtensions = useRef(
    accept
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.startsWith(".")),
  );
  const paymentEnabled = Boolean(payment?.enabled);
  const freeAllowance = payment?.freeAllowance;
  const paymentTtlMs = payment?.ttlMs ?? 60 * 60 * 1000;
  const paymentStorageKey =
    payment?.localStorageKey ||
    (paymentEnabled && payment?.planId
      ? `neo:download-authorization:${payment.planId}`
      : "");
  const paymentTokenStorageKey =
    paymentEnabled && payment?.planId
      ? `neo:download-token:${payment.planId}`
      : "";
  const freeAllowanceStorageKey =
    freeAllowance?.storageKey ||
    (paymentEnabled && payment?.planId && freeAllowance
      ? `neo:free-usage:${payment.planId}`
      : "");
  const freeUsesRemaining = freeAllowance
    ? Math.max(freeAllowance.maxUsesPerDevice - freeUsesConsumed, 0)
    : 0;
  const freeEligibleByFileCount =
    !freeAllowance?.maxFilesPerUse ||
    files.length <= freeAllowance.maxFilesPerUse;
  const freeUnlockAvailable = Boolean(
    freeAllowance &&
    files.length > 0 &&
    freeUsesRemaining > 0 &&
    freeEligibleByFileCount,
  );

  const clearResults = useCallback(() => {
    setResults((previous) => {
      revokeBlobUrls(previous);
      return [];
    });
    setCloudUrls({});
  }, []);

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      const arr = Array.from(incoming);
      const validFiles: File[] = [];

      for (const file of arr) {
        if (!file.size || file.size > MAX_FILE_SIZE_BYTES) {
          setError(`Arquivo inválido: ${file.name}. Limite máximo de 50 MB.`);
          continue;
        }

        const lowerName = file.name.toLowerCase();
        if (
          acceptedExtensions.current.length > 0 &&
          !acceptedExtensions.current.some((ext) => lowerName.endsWith(ext))
        ) {
          setError(`Formato não permitido: ${file.name}.`);
          continue;
        }

        validFiles.push(file);
      }

      if (!validFiles.length) return;

      setFreeUnlockActive(false);
      setCopiedLink(null);
      setCheckoutSessionToken(null);
      setFiles((prev) => (multi ? [...prev, ...validFiles] : [validFiles[0]]));
      clearResults();
      setError("");
    },
    [clearResults, multi],
  );

  // Lógica para auto-carregar arquivo via URL (vindo da Home)
  useEffect(() => {
    const fileUrl = searchParams.get("fileUrl");
    const fileName = searchParams.get("fileName") || "arquivo_importado";

    // Only allow fetching from the expected trusted upload host to prevent SSRF.
    const ALLOWED_FILE_URL =
      /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;

    if (
      fileUrl &&
      ALLOWED_FILE_URL.test(fileUrl) &&
      files.length === 0 &&
      !loading
    ) {
      setLoading(true);
      fetch(fileUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], fileName, { type: blob.type });
          addFiles([file]);
        })
        .catch(() => setError("Falha ao carregar arquivo da nuvem."))
        .finally(() => setLoading(false));
    } else if (fileUrl && !ALLOWED_FILE_URL.test(fileUrl)) {
      setError("URL de origem não permitida.");
    }
  }, [searchParams, addFiles, files.length, loading]);

  useEffect(() => {
    latestResultsRef.current = results;
  }, [results]);

  useEffect(() => {
    return () => {
      revokeBlobUrls(latestResultsRef.current);
    };
  }, []);

  useEffect(() => {
    if (!paymentEnabled || !paymentStorageKey) {
      setDownloadAuthorized(false);
      setDownloadToken(null);
      return;
    }

    let authorized = false;
    let restoredToken: string | null = null;

    try {
      const raw = window.localStorage.getItem(paymentStorageKey);
      const expiresAt = raw ? Number(raw) : 0;
      if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
        authorized = true;
      } else {
        window.localStorage.removeItem(paymentStorageKey);
      }

      if (paymentTokenStorageKey) {
        const rawToken = window.localStorage.getItem(paymentTokenStorageKey);
        if (rawToken) {
          const parsed = JSON.parse(rawToken) as {
            token?: string;
            expiresAt?: number;
          };
          if (
            parsed?.token &&
            typeof parsed.expiresAt === "number" &&
            parsed.expiresAt > Date.now()
          ) {
            restoredToken = parsed.token;
          } else {
            window.localStorage.removeItem(paymentTokenStorageKey);
          }
        }
      }
    } catch {
      // Ignore localStorage failures and require a new payment attempt.
    }

    setDownloadAuthorized(authorized);
    setDownloadToken(restoredToken);
  }, [paymentEnabled, paymentStorageKey, paymentTokenStorageKey]);

  useEffect(() => {
    if (!freeAllowance || !freeAllowanceStorageKey) {
      setFreeUsesConsumed(0);
      return;
    }

    try {
      const raw = window.localStorage.getItem(freeAllowanceStorageKey);
      const parsed = raw ? Number(raw) : 0;
      setFreeUsesConsumed(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
    } catch {
      setFreeUsesConsumed(0);
    }
  }, [freeAllowance, freeAllowanceStorageKey]);

  const handlePaymentApproved = useCallback(
    (data?: { downloadToken?: string }) => {
      const expiresAt = Date.now() + paymentTtlMs;

      if (paymentEnabled && paymentStorageKey) {
        try {
          window.localStorage.setItem(paymentStorageKey, String(expiresAt));
        } catch {
          // Ignore storage errors; authorization remains in-memory for current session.
        }
      }

      if (data?.downloadToken) {
        setDownloadToken(data.downloadToken);
        if (paymentTokenStorageKey) {
          try {
            window.localStorage.setItem(
              paymentTokenStorageKey,
              JSON.stringify({
                token: data.downloadToken,
                expiresAt,
              }),
            );
          } catch {
            // Ignore storage failures and keep the token in memory.
          }
        }
      }

      setDownloadAuthorized(true);
      setFreeUnlockActive(false);
      setError("");
    },
    [paymentEnabled, paymentStorageKey, paymentTokenStorageKey, paymentTtlMs],
  );

  useEffect(() => {
    if (!paymentEnabled) return;

    const sessionParam = searchParams.get("checkoutSession");
    const queryDownloadToken = searchParams.get("downloadToken");

    if (sessionParam) {
      setCheckoutSessionToken(sessionParam);
      setRehydratingSession(true);

      fetch(
        `/api/checkout-session?session=${encodeURIComponent(sessionParam)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      )
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok || !data || !Array.isArray(data.files)) {
            throw new Error("Sessão de checkout inválida ou expirada.");
          }
          setResults((previous) => {
            revokeBlobUrls(previous);
            return data.files.map(
              (file: { id?: unknown; name?: unknown }, index: number) => ({
                name:
                  typeof file.name === "string"
                    ? file.name
                    : `arquivo-${index + 1}`,
                url: `session:${index}`,
                source: "session" as const,
                sessionFileId:
                  typeof file.id === "string" ? file.id : String(index),
              }),
            );
          });
          setFiles([]);
          setCloudUrls({});
          setError("");
        })
        .catch((sessionError) => {
          setError(
            sessionError instanceof Error
              ? sessionError.message
              : "Falha ao recuperar o arquivo do checkout.",
          );
        })
        .finally(() => setRehydratingSession(false));
    }

    if (queryDownloadToken) {
      handlePaymentApproved({ downloadToken: queryDownloadToken });

      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.delete("downloadToken");
        window.history.replaceState({}, "", currentUrl.toString());
      } catch {
        // Ignore URL cleanup failures.
      }
    }
  }, [handlePaymentApproved, paymentEnabled, searchParams]);

  const handleProcess = async () => {
    if (!files.length) return;
    const shouldUnlockForFree = freeUnlockAvailable;
    setLoading(true);
    setError("");
    setCopiedLink(null);
    clearResults();
    try {
      if (!onProcess) return;
      const processed = await onProcess(files);
      setResults((previous) => {
        revokeBlobUrls(previous);
        return processed.map((item) => ({
          ...item,
          source: "local" as const,
        }));
      });

      if (shouldUnlockForFree && freeAllowance && freeAllowanceStorageKey) {
        const nextUsage = freeUsesConsumed + 1;
        setFreeUsesConsumed(nextUsage);
        setFreeUnlockActive(true);
        try {
          window.localStorage.setItem(
            freeAllowanceStorageKey,
            String(nextUsage),
          );
        } catch {
          // Ignore storage failures and keep the free unlock in-memory.
        }
      } else {
        setFreeUnlockActive(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProtectedResultBlob = useCallback(
    async (result: ResultItem): Promise<Blob> => {
      if (result.source === "local") {
        const response = await fetch(result.url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Falha ao ler arquivo processado.");
        }
        return response.blob();
      }

      if (!checkoutSessionToken || !downloadToken || !result.sessionFileId) {
        throw new Error("Sessão ou autorização de download indisponível.");
      }

      const response = await fetch(
        `/api/checkout-session/download?session=${encodeURIComponent(
          checkoutSessionToken,
        )}&file=${encodeURIComponent(result.sessionFileId)}`,
        {
          method: "GET",
          headers: {
            "x-download-token": downloadToken,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error || "Falha ao recuperar arquivo protegido.",
        );
      }

      return response.blob();
    },
    [checkoutSessionToken, downloadToken],
  );

  const createCheckoutSessionAndRedirect = useCallback(async () => {
    if (!paymentEnabled || !payment || !results.length) return;

    if (
      checkoutSessionToken &&
      results.every((result) => result.source === "session")
    ) {
      window.location.assign(
        `/checkout?plan=${encodeURIComponent(payment.planId)}&session=${encodeURIComponent(checkoutSessionToken)}`,
      );
      return;
    }

    setRedirectingToCheckout(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("planId", payment.planId);
      formData.append("returnToPath", pathname);

      for (const result of results) {
        const blob = await fetchProtectedResultBlob(result);
        formData.append("file", blob, result.name);
      }

      const response = await fetch("/api/checkout-session", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as {
        session?: string;
        checkoutUrl?: string;
        error?: string;
      } | null;

      if (!response.ok || !data?.checkoutUrl || !data.session) {
        throw new Error(
          data?.error || "Falha ao preparar a compra para este download.",
        );
      }

      setCheckoutSessionToken(data.session);
      window.location.assign(data.checkoutUrl);
    } catch (sessionError) {
      setError(
        sessionError instanceof Error
          ? sessionError.message
          : "Erro ao preparar checkout do download.",
      );
    } finally {
      setRedirectingToCheckout(false);
    }
  }, [
    checkoutSessionToken,
    fetchProtectedResultBlob,
    pathname,
    payment,
    paymentEnabled,
    results,
  ]);

  const triggerProtectedDownload = useCallback(
    async (result: ResultItem) => {
      const blob = await fetchProtectedResultBlob(result);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = result.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    },
    [fetchProtectedResultBlob],
  );

  const uploadToCloud = async (result: ResultItem) => {
    setUploadingKey(result.url);
    setError("");

    try {
      const blob = await fetchProtectedResultBlob(result);
      const formData = new FormData();
      formData.append("file", blob, result.name);

      const uploadHeaders: Record<string, string> = {};
      if (downloadToken) {
        uploadHeaders["x-download-token"] = downloadToken;
      }

      const uploadRes = await fetch("/api/upload-to-cloud", {
        method: "POST",
        headers: uploadHeaders,
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Erro ao gerar link na nuvem.");
      const data = (await uploadRes.json()) as { url?: string };
      if (!data.url) throw new Error("Upload concluído sem URL.");
      const publicUrl = data.url;

      setCloudUrls((previous) => ({ ...previous, [result.url]: publicUrl }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no storage serverless.");
    } finally {
      setUploadingKey(null);
    }
  };

  const copySecureLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(url);
    } catch {
      setError("Não foi possível copiar o link seguro.");
    }
  };

  const reset = () => {
    setFiles([]);
    clearResults();
    setError("");
    setUploadingKey(null);
    setDownloadToken(null);
    setCheckoutSessionToken(null);
    setFreeUnlockActive(false);
    setCopiedLink(null);
    setRehydratingSession(false);
  };

  return (
    <main
      id="main-content"
      style={{ minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}
    >
      <div className="container" style={{ maxWidth: 720 }}>
        {/* Breadcrumb */}
        <div
          style={{
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          <Link
            href="/"
            style={{ color: "var(--text-muted)", textDecoration: "none" }}
          >
            NeoConvert
          </Link>
          <span>→</span>
          <span style={{ color: "var(--text-secondary)" }}>{title}</span>
        </div>

        {/* Header */}
        <header style={{ marginBottom: 40, textAlign: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: `${color}18`,
              border: `1px solid ${color}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 20px",
            }}
          >
            {icon}
          </div>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 10,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 16,
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            {description}
          </p>
        </header>

        {children ? (
          <div style={{ marginTop: 24 }}>{children}</div>
        ) : (
          <>
            {/* Drop Zone */}
            {!results.length && (
              <label
                className={`upload-zone ${drag ? "drag-active" : ""}`}
                style={{ marginBottom: 24 }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  addFiles(e.dataTransfer.files);
                }}
              >
                <input
                  id="tool-file-input"
                  type="file"
                  accept={accept}
                  multiple={multi}
                  style={{ display: "none" }}
                  onChange={(e) => addFiles(e.target.files)}
                />

                {files.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 40 }}>📄</div>
                    <div>
                      {files.map((f) => (
                        <div
                          key={`${f.name}-${f.lastModified}-${f.size}`}
                          style={{
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {f.name}
                        </div>
                      ))}
                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: 13,
                          marginTop: 4,
                        }}
                      >
                        {files.length > 1
                          ? `${files.length} arquivos`
                          : `${(files[0].size / 1024 / 1024).toFixed(2)} MB`}
                      </div>
                    </div>
                    <span
                      style={{ color: color, fontSize: 13, fontWeight: 600 }}
                    >
                      Clique para trocar →
                    </span>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "var(--bg-surface)",
                        border: "2px solid var(--border-accent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px",
                        fontSize: 28,
                      }}
                    >
                      📄
                    </div>
                    <div
                      style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}
                    >
                      {drag
                        ? "Solte aqui"
                        : `Arraste ${multi ? "os arquivos" : "o arquivo"}`}
                    </div>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: 14,
                        marginBottom: 20,
                      }}
                    >
                      {acceptLabel}
                    </p>
                    <div
                      className="btn-primary"
                      style={{ display: "inline-flex" }}
                    >
                      Selecionar
                    </div>
                  </>
                )}
              </label>
            )}

            {/* Tip */}
            {tip && !files.length && !results.length && (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 24,
                }}
              >
                💡 {tip}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "rgba(255,45,85,0.1)",
                  border: "1px solid rgba(255,45,85,0.3)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  fontSize: 14,
                  color: "#ff2d55",
                  marginBottom: 16,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            {/* Action */}
            {files.length > 0 && !results.length && onProcess && (
              <div style={{ display: "grid", gap: 12 }}>
                {freeAllowance ? (
                  <div
                    style={{
                      background: freeUnlockAvailable
                        ? "rgba(0,255,157,0.08)"
                        : "rgba(255, 193, 7, 0.08)",
                      border: freeUnlockAvailable
                        ? "1px solid rgba(0,255,157,0.28)"
                        : "1px solid rgba(255, 193, 7, 0.28)",
                      borderRadius: "var(--radius-md)",
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {freeUnlockAvailable ? (
                      <>
                        Esta execução entra na franquia gratuita. Restam{" "}
                        <strong style={{ color: "var(--neo-green)" }}>
                          {freeUsesRemaining}
                        </strong>{" "}
                        uso{freeUsesRemaining === 1 ? "" : "s"} neste
                        dispositivo.
                      </>
                    ) : freeUsesRemaining > 0 && !freeEligibleByFileCount ? (
                      <>
                        A franquia gratuita cobre até{" "}
                        <strong>{freeAllowance.maxFilesPerUse}</strong> arquivo
                        {freeAllowance.maxFilesPerUse === 1 ? "" : "s"} por
                        execução. Acima disso, o download segue para liberação
                        paga.
                      </>
                    ) : (
                      <>
                        A franquia gratuita deste dispositivo foi consumida. O
                        próximo download segue via liberação paga.
                      </>
                    )}
                  </div>
                ) : null}

                <button
                  id="tool-process-btn"
                  onClick={handleProcess}
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(0,0,0,0.3)",
                          borderTopColor: "#000",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                          display: "inline-block",
                        }}
                      />
                      Processando...
                    </>
                  ) : (
                    `⚡ ${title}`
                  )}
                </button>
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-accent)",
                  borderRadius: "var(--radius-xl)",
                  padding: 32,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                  Pronto
                </h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    marginBottom: 24,
                  }}
                >
                  Seu arquivo foi processado com sucesso.
                </p>

                {paymentEnabled &&
                  !downloadAuthorized &&
                  !freeUnlockActive &&
                  payment && (
                    <div
                      style={{
                        marginBottom: 20,
                        background: "rgba(255, 193, 7, 0.08)",
                        border: "1px solid rgba(255, 193, 7, 0.35)",
                        borderRadius: "var(--radius-md)",
                        padding: "14px 16px",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-primary)",
                          marginBottom: 8,
                          fontWeight: 700,
                        }}
                      >
                        Download bloqueado até confirmação de pagamento.
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          marginBottom: 12,
                        }}
                      >
                        Valor unitário:{" "}
                        <strong style={{ color: "var(--neo-green)" }}>
                          {payment.planPrice}
                        </strong>
                        . Autorização válida por 1 hora neste dispositivo.
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <Link
                          href={
                            checkoutSessionToken
                              ? `/checkout?plan=${payment.planId}&session=${encodeURIComponent(checkoutSessionToken)}`
                              : `/checkout?plan=${payment.planId}`
                          }
                          style={{
                            color: "var(--neo-green)",
                            textDecoration: "none",
                            fontSize: 13,
                          }}
                        >
                          Ver detalhes comerciais e políticas deste plano
                        </Link>
                      </div>
                      <button
                        onClick={() => {
                          void createCheckoutSessionAndRedirect();
                        }}
                        className="btn-primary"
                        style={{ justifyContent: "center", width: "100%" }}
                        disabled={redirectingToCheckout || rehydratingSession}
                      >
                        {redirectingToCheckout
                          ? "Preparando compra..."
                          : "⚡ Liberar download agora"}
                      </button>
                    </div>
                  )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  {results.map((r) => {
                    const publicLink = cloudUrls[r.url];
                    const isUploading = uploadingKey === r.url;
                    const isUnlocked =
                      !paymentEnabled || downloadAuthorized || freeUnlockActive;

                    return (
                      <div
                        key={`${r.name}-${r.url}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {isUnlocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (r.source === "local") {
                                const anchor = document.createElement("a");
                                anchor.href = r.url;
                                anchor.download = r.name;
                                document.body.appendChild(anchor);
                                anchor.click();
                                anchor.remove();
                                return;
                              }
                              void triggerProtectedDownload(r).catch(
                                (downloadError) => {
                                  setError(
                                    downloadError instanceof Error
                                      ? downloadError.message
                                      : "Falha ao baixar arquivo protegido.",
                                  );
                                },
                              );
                            }}
                            className="btn-primary"
                            style={{ justifyContent: "center" }}
                          >
                            ⬇️ Baixar {r.name}
                          </button>
                        ) : (
                          <div
                            style={{
                              padding: "10px 12px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-muted)",
                              fontSize: 13,
                            }}
                          >
                            Arquivo pronto: {r.name}
                          </div>
                        )}

                        {isUnlocked ? (
                          !publicLink ? (
                            <button
                              onClick={() => uploadToCloud(r)}
                              disabled={isUploading}
                              className="btn-secondary"
                              style={{
                                justifyContent: "center",
                                opacity: isUploading ? 0.7 : 1,
                              }}
                            >
                              {isUploading
                                ? "Gerando link..."
                                : "☁️ Gerar link seguro"}
                            </button>
                          ) : (
                            <div
                              style={{
                                padding: 12,
                                background: "rgba(0,255,157,0.05)",
                                border: "1px solid var(--border-accent)",
                                borderRadius: "var(--radius-md)",
                              }}
                            >
                              <p
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  marginBottom: 12,
                                  lineHeight: 1.6,
                                }}
                              >
                                Link seguro pronto para compartilhamento
                                temporário.
                              </p>
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 10,
                                }}
                              >
                                <a
                                  href={publicLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="btn-secondary"
                                  style={{ textDecoration: "none" }}
                                >
                                  Abrir link
                                </a>
                                <button
                                  type="button"
                                  onClick={() => copySecureLink(publicLink)}
                                  className="btn-secondary"
                                >
                                  {copiedLink === publicLink
                                    ? "Link copiado"
                                    : "Copiar link"}
                                </button>
                              </div>
                            </div>
                          )
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={reset}
                  className="btn-secondary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: 16,
                  }}
                >
                  Processar outro arquivo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function ToolPage(props: ToolPageProps) {
  return (
    <Suspense fallback={<div>Carregando ferramentas...</div>}>
      <ToolPageInner {...props} />
    </Suspense>
  );
}
