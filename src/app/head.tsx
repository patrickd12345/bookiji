export default function Head() {
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-2311249346490347';
  return <meta name="google-adsense-account" content={adClient} />;
} 