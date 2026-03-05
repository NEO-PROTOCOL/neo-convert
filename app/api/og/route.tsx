import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)

        // ?title=<title>
        const hasTitle = searchParams.has('title')
        const title = hasTitle
            ? searchParams.get('title')?.slice(0, 100)
            : 'NeoConvert - Professional PDF Tools'

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#050508',
                        backgroundImage: 'radial-gradient(circle at 50% 50%, #13131a 0%, #050508 100%)',
                    }}
                >
                    {/* Decorative Grid */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            backgroundImage: 'linear-gradient(rgba(0, 255, 157, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 157, 0.03) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '20px 40px',
                            borderRadius: '24px',
                            background: 'rgba(0, 255, 157, 0.1)',
                            border: '1px solid rgba(0, 255, 157, 0.3)',
                            marginBottom: '40px',
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#00ff9d',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                        }}
                    >
                        NΞØ CONVΞRT
                    </div>

                    <div
                        style={{
                            fontSize: 60,
                            fontWeight: 900,
                            textAlign: 'center',
                            color: 'white',
                            lineHeight: 1.2,
                            padding: '0 80px',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        {title}
                    </div>

                    <div
                        style={{
                            marginTop: '40px',
                            fontSize: '24px',
                            color: 'rgba(232, 232, 240, 0.6)',
                            fontWeight: 500,
                        }}
                    >
                        Fast. Secure. Straight in the browser.
                    </div>

                    <div
                        style={{
                            position: 'absolute',
                            bottom: 40,
                            fontSize: '20px',
                            color: 'rgba(232, 232, 240, 0.35)',
                            fontFamily: 'monospace',
                        }}
                    >
                        neo-convert.site
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        )
    } catch (e: any) {
        console.log(`${e.message}`)
        return new Response(`Failed to generate the image`, {
            status: 500,
        })
    }
}
