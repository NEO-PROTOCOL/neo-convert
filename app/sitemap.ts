import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://neo-convert.site'

    const tools = [
        'compress-pdf',
        'merge-pdf',
        'split-pdf',
        'jpg-to-pdf',
        'convert-pdf',
        'pdf-to-word',
        'sign-pdf',
        'rotate-pdf',
        'delete-pages',
        'word-to-pdf',
        'excel-to-pdf',
        'protect-pdf',
        'ai-summary',
        'compress-image',
    ]

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly' as const,
            priority: 1,
        },
        ...tools.map((tool) => ({
            url: `${baseUrl}/tools/${tool}`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.8,
        })),
    ]
}
