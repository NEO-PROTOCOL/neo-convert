import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getClientIp, isSameOriginRequest, safeFilename } from '@/lib/security';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const UPLOAD_RATE_LIMIT = 20;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_CONTENT_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/octet-stream',
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }

    const ip = getClientIp(request);
    const rateLimit = enforceRateLimit(`upload:${ip}`, UPLOAD_RATE_LIMIT, UPLOAD_WINDOW_MS);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Muitas requisições de upload. Aguarde.' },
            { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
        );
    }

    try {
        const formData = await request.formData();
        const fileField = formData.get('file');

        if (!(fileField instanceof File)) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }
        const file = fileField;

        if (!file.size || file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: 'Arquivo inválido ou maior que 50 MB.' },
                { status: 413 }
            );
        }

        if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
            return NextResponse.json(
                { error: 'Tipo de arquivo não permitido.' },
                { status: 415 }
            );
        }

        const filename = safeFilename(file.name, 'arquivo');

        const blob = await put(filename, file, {
            access: 'public',
            contentType: file.type,
            addRandomSuffix: true,
        });

        const response = NextResponse.json({
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType,
        });
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
