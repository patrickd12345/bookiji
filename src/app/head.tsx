export default function Head() {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  return (
    <>
      {adsenseClientId && (
        <meta name="google-adsense-account" content={adsenseClientId} />
      )}
    </>
  )
}