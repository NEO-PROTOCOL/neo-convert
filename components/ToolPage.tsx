"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import CheckoutModal from "@/components/CheckoutModal";

interface ToolPageProps {
    icon: string;
    title: string;
    description: string;
    accept: string;
    acceptLabel: string;
    color: string;
    onProcess: (files: File[]) => Promise<{ name: string; url: string }[]>;
    multi?: boolean;
    tip?: string;
    payment?: {
        enabled: boolean;
        planId: string;
        planName: string;
        planPrice: string;
        ttlMs?: number;
        localStorageKey?: string;
    };
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function revokeBlobUrls(results: { name: string; url: string }[]): void {
    for (const result of results) {
        if (result.url.startsWith("blob:")) {
            URL.revokeObjectURL(result.url);
        }
    }
}

function ToolPageInner({
    icon,
    title,
    description,
    accept,
    acceptLabel,
    color,
    onProcess,
    multi = false,
    tip,
    payment,
}: ToolPageProps) {
    const searchParams = useSearchParams();
    const [files, setFiles] = useState<File[]>([]);
    const [drag, setDrag] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ name: string; url: string }[]>([]);
    const [cloudUrls, setCloudUrls] = useState<Record<string, string>>({});
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [downloadAuthorized, setDownloadAuthorized] = useState(false);
    const [downloadToken, setDownloadToken] = useState<string | null>(null);
    const latestResultsRef = useRef<{ name: string; url: string }[]>([]);
    const acceptedExtensions = useRef(
        accept
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter((value) => value.startsWith(".")),
    );
    const paymentEnabled = Boolean(payment?.enabled);
    const paymentTtlMs = payment?.ttlMs ?? 60 * 60 * 1000;
    const paymentStorageKey =
        payment?.localStorageKey ||
        (paymentEnabled && payment?.planId
            ? `neo:download-authorization:${payment.planId}`
            : "");

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

        // Only allow fetching from Vercel Blob Storage to prevent SSRF
        const ALLOWED_FILE_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//;

        if (fileUrl && ALLOWED_FILE_URL.test(fileUrl) && files.length === 0 && !loading) {
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
            return;
        }

        try {
            const raw = window.localStorage.getItem(paymentStorageKey);
            const expiresAt = raw ? Number(raw) : 0;
            if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
                setDownloadAuthorized(true);
                return;
            }
            window.localStorage.removeItem(paymentStorageKey);
        } catch {
            // Ignore localStorage failures and require a new payment attempt.
        }

        setDownloadAuthorized(false);
    }, [paymentEnabled, paymentStorageKey]);

    const handlePaymentApproved = useCallback((data?: { downloadToken?: string }) => {
        if (paymentEnabled && paymentStorageKey) {
            const expiresAt = Date.now() + paymentTtlMs;
            try {
                window.localStorage.setItem(paymentStorageKey, String(expiresAt));
            } catch {
                // Ignore storage errors; authorization remains in-memory for current session.
            }
        }

        if (data?.downloadToken) {
            setDownloadToken(data.downloadToken);
        }

        setDownloadAuthorized(true);
        setCheckoutOpen(false);
        setError("");
    }, [paymentEnabled, paymentStorageKey, paymentTtlMs]);

    const handleProcess = async () => {
        if (!files.length) return;
        setLoading(true);
        setError("");
        clearResults();
        try {
            const processed = await onProcess(files);
            setResults((previous) => {
                revokeBlobUrls(previous);
                return processed;
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro ao processar arquivo.");
        } finally {
            setLoading(false);
        }
    };

    const uploadToCloud = async (res: { name: string; url: string }) => {
        setUploadingKey(res.url);
        setError("");

        try {
            if (!res.url.startsWith("blob:")) {
                throw new Error("URL de resultado inválida.");
            }

            const response = await fetch(res.url, { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Falha ao ler arquivo processado.");
            }

            const blob = await response.blob();
            const formData = new FormData();
            formData.append("file", blob, res.name);

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

            setCloudUrls((previous) => ({ ...previous, [res.url]: publicUrl }));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erro no storage serverless.");
        } finally {
            setUploadingKey(null);
        }
    };

    const reset = () => {
        setFiles([]);
        clearResults();
        setError("");
        setUploadingKey(null);
        setDownloadToken(null);
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
                                            style={{ fontWeight: 600, color: "var(--text-primary)" }}
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
                                <span style={{ color: color, fontSize: 13, fontWeight: 600 }}>
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
                                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
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
                                <div className="btn-primary" style={{ display: "inline-flex" }}>
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
                {files.length > 0 && !results.length && (
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

                        {paymentEnabled && !downloadAuthorized && payment && (
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
                                <button
                                    onClick={() => setCheckoutOpen(true)}
                                    className="btn-primary"
                                    style={{ justifyContent: "center", width: "100%" }}
                                >
                                    ⚡ Liberar download agora
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
                                const isUnlocked = !paymentEnabled || downloadAuthorized;

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
                                            <a
                                                href={r.url}
                                                download={r.name}
                                                className="btn-primary"
                                                style={{ justifyContent: "center" }}
                                            >
                                                ⬇️ Baixar {r.name}
                                            </a>
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
                                                        : "☁️ Gerar Link Seguro (Vercel Blob)"}
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
                                                            fontSize: 11,
                                                            color: "var(--text-muted)",
                                                            marginBottom: 8,
                                                        }}
                                                    >
                                                        Link expira conforme política de retenção:
                                                    </p>
                                                    <a
                                                        href={publicLink}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        style={{
                                                            fontSize: 13,
                                                            color: "var(--neo-green)",
                                                            wordBreak: "break-all",
                                                            textDecoration: "none",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {publicLink}
                                                    </a>
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
                            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
                        >
                            Processar outro arquivo
                        </button>
                    </div>
                )}
            </div>

            {paymentEnabled && payment && (
                <CheckoutModal
                    isOpen={checkoutOpen}
                    onClose={() => setCheckoutOpen(false)}
                    planId={payment.planId}
                    planName={payment.planName}
                    planPrice={payment.planPrice}
                    onPaid={(data) => handlePaymentApproved({ downloadToken: data.downloadToken })}
                />
            )}
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
