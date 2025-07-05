export default function Head() {
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2311249346490347'
  return (
    <>
      <meta name="google-adsense-account" content={adClient} />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`}
        crossOrigin="anonymous"
      ></script>
    </>
  )
} 