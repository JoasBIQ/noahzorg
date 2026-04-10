import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Rondom Noah",
  description: 'Zorgcoordinatie voor de familie van Noah',
  manifest: '/manifest.json?v=3',
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Rondom Noah",
  },
}

export const viewport: Viewport = {
  themeColor: '#FAFAF8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />

        {/* Splash screen stijlen — geladen vóór JavaScript */}
        <style>{`
          #splash-screen {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background-color: #FAFAF8;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            transition: opacity 0.5s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          #splash-screen img {
            width: 120px;
            height: 120px;
            border-radius: 28px;
            margin-bottom: 24px;
          }
          #splash-title {
            color: #4A7C59;
            font-size: 22px;
            font-weight: 600;
            text-align: center;
            margin: 0 0 8px;
            letter-spacing: -0.3px;
          }
          #splash-subtitle {
            color: #6B7280;
            font-size: 13px;
            text-align: center;
            margin: 0 0 28px;
            line-height: 1.5;
          }
          #splash-dots {
            display: flex;
            gap: 8px;
          }
          .splash-dot {
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background-color: #4A7C59;
            animation: splash-pulse 1.4s ease-in-out infinite both;
          }
          .splash-dot:nth-child(2) { animation-delay: 0.2s; }
          .splash-dot:nth-child(3) { animation-delay: 0.4s; }
          @keyframes splash-pulse {
            0%, 80%, 100% { transform: scale(0.7); opacity: 0.35; }
            40%            { transform: scale(1.15); opacity: 1; }
          }
        `}</style>
      </head>
      <body className={inter.className}>

        {/* Splash screen — zichtbaar vóór React hydration */}
        <div id="splash-screen">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192x192.png" alt="" width={120} height={120} />
          <p id="splash-title">Rondom Noah</p>
          <p id="splash-subtitle">Laden. Koffie inschenken mag ook. ☕</p>
          <div id="splash-dots">
            <span className="splash-dot" />
            <span className="splash-dot" />
            <span className="splash-dot" />
          </div>
        </div>

        {/* Script: verberg splash zodra de pagina geladen is */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function hideSplash() {
                  var el = document.getElementById('splash-screen');
                  if (!el) return;
                  el.style.opacity = '0';
                  el.style.pointerEvents = 'none';
                  setTimeout(function () {
                    if (el.parentNode) el.parentNode.removeChild(el);
                  }, 520);
                }
                if (document.readyState === 'complete') {
                  setTimeout(hideSplash, 120);
                } else {
                  window.addEventListener('load', function () {
                    setTimeout(hideSplash, 120);
                  });
                }
              })();
            `,
          }}
        />

        {children}
      </body>
    </html>
  )
}
