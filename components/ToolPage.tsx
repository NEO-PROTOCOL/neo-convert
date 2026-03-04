"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function revokeBlobUrls(results: { name: string; url: string }[]): void {
    for (const result of results) {
        if (result.url.startsWith("blob:")) {
            URL.revokeObjectURL(result.url);
        }
    }
}

export default function ToolPage({
    icon, title, description, accept, acceptLabel, color, onProcess, multi = false, tip,
}: ToolPageProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [drag, setDrag] = useState(false);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ name: string; url: string }[]>([]);
    const [cloudUrls, setCloudUrls] = useState<Record<string, string>>({});
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [error, setError] = useState("");
    const latestResultsRef = useRef<{ name: string; url: string }[]>([]);
    const acceptedExtensions = useRef(
        accept
            .split(",")
            .map((value) => value.trim().toLowerCase())
            .filter((value) => value.startsWith("."))
    );

    useEffect(() => {
        latestResultsRef.current = results;
    }, [results]);

    useEffect(() => {
        return () => {
            revokeBlobUrls(latestResultsRef.current);
        };
    }, []);

    const clearResults = useCallback(() => {
        setResults((previous) => {
            revokeBlobUrls(previous);
            return [];
        });
        setCloudUrls({});
    }, []);

    const addFiles = useCallback((incoming: FileList | null) => {
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
    }, [clearResults, multi]);

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

            const uploadRes = await fetch("/api/upload-to-cloud", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) throw new Error("Erro ao gerar link na nuvem.");
            const data = await uploadRes.json() as { url?: string };
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
    };

    return (
        <div style={{ minHeight: "100vh", paddingTop: 100, paddingBottom: 80 }}>
            <div className="container" style={{ maxWidth: 720 }}>
                {/* Breadcrumb */}
                <div style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)" }}>
                    <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>NeoConvert</Link>
                    <span>→</span>
                    <span style={{ color: "var(--text-secondary)" }}>{title}</span>
                </div>

                {/* Header */}
                <div style={{ marginBottom: 40, textAlign: "center" }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: `${color}18`, border: `1px solid ${color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 32, margin: "0 auto 20px",
                    }}>{icon}</div>
                    <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>
                        {title}
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
                        {description}
                    </p>
                </div>

                {/* Drop Zone */}
                {!results.length && (
                    <label
                        className={`upload-zone ${drag ? "drag-active" : ""}`}
                        style={{ marginBottom: 24 }}
                        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                        onDragLeave={() => setDrag(false)}
                        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
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
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                <div style={{ fontSize: 40 }}>📄</div>
                                <div>
                                    {files.map((f) => (
                                        <div key={`${f.name}-${f.lastModified}-${f.size}`} style={{ fontWeight: 600, color: "var(--text-primary)" }}>{f.name}</div>
                                    ))}
                                    <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                                        {files.length > 1 ? `${files.length} arquivos` : `${(files[0].size / 1024 / 1024).toFixed(2)} MB`}
                                    </div>
                                </div>
                                <span style={{ color: color, fontSize: 13, fontWeight: 600 }}>Clique para trocar →</span>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    width: 72, height: 72, borderRadius: "50%",
                                    background: "var(--bg-surface)", border: "2px solid var(--border-accent)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    margin: "0 auto 20px", fontSize: 28,
                                }}>📄</div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                                    {drag ? "Solte aqui" : `Arraste ${multi ? "os arquivos" : "o arquivo"}`}
                                </h3>
                                <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 20 }}>{acceptLabel}</p>
                                <div className="btn-primary" style={{ display: "inline-flex" }}>Selecionar</div>
                            </>
                        )}
                    </label>
                )}

                {/* Tip */}
                {tip && !files.length && !results.length && (
                    <div style={{
                        background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)", padding: "12px 16px",
                        fontSize: 13, color: "var(--text-muted)", marginBottom: 24,
                    }}>
                        💡 {tip}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)",
                        borderRadius: "var(--radius-md)", padding: "12px 16px",
                        fontSize: 14, color: "#ff2d55", marginBottom: 16,
                    }}>⚠️ {error}</div>
                )}

                {/* Action */}
                {files.length > 0 && !results.length && (
                    <button
                        id="tool-process-btn"
                        onClick={handleProcess}
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? (
                            <>
                                <span style={{
                                    width: 16, height: 16, border: "2px solid rgba(0,0,0,0.3)",
                                    borderTopColor: "#000", borderRadius: "50%",
                                    animation: "spin 0.7s linear infinite", display: "inline-block",
                                }} />
                                Processando...
                            </>
                        ) : `⚡ ${title}`}
                    </button>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div style={{
                        background: "var(--bg-surface)", border: "1px solid var(--border-accent)",
                        borderRadius: "var(--radius-xl)", padding: 32, textAlign: "center",
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Pronto</h2>
                        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
                            Seu arquivo foi processado com sucesso.
                        </p>

                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                            {results.map((r) => {
                                const publicLink = cloudUrls[r.url];
                                const isUploading = uploadingKey === r.url;

                                return (
                                    <div key={`${r.name}-${r.url}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        <a
                                            href={r.url}
                                            download={r.name}
                                            className="btn-primary"
                                            style={{ justifyContent: "center" }}
                                        >
                                            ⬇️ Baixar {r.name}
                                        </a>

                                        {!publicLink ? (
                                            <button
                                                onClick={() => uploadToCloud(r)}
                                                disabled={isUploading}
                                                className="btn-secondary"
                                                style={{ justifyContent: "center", opacity: isUploading ? 0.7 : 1 }}
                                            >
                                                {isUploading ? "Gerando link..." : "☁️ Gerar Link Seguro (Vercel Blob)"}
                                            </button>
                                        ) : (
                                            <div style={{
                                                padding: 12, background: "rgba(0,255,157,0.05)",
                                                border: "1px solid var(--border-accent)", borderRadius: "var(--radius-md)"
                                            }}>
                                                <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Link expira conforme política de retenção:</p>
                                                <a href={publicLink} target="_blank" rel="noreferrer" style={{
                                                    fontSize: 13, color: "var(--neo-green)", wordBreak: "break-all", textDecoration: "none", fontWeight: 600
                                                }}>
                                                    {publicLink}
                                                </a>
                                            </div>
                                        )}
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
        </div>
    );
}
