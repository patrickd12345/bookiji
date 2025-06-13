import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookiji - Real-Time Booking Engine",
  description: "The Uber for availability slots. Find and book last-minute appointments with real-time availability mapping.",
  keywords: ["booking", "real-time", "availability", "appointments", "last-minute", "map-based"],
  authors: [{ name: "Bookiji Team" }],
  openGraph: {
    title: "Bookiji - Real-Time Booking Engine",
    description: "Find and book last-minute appointments with real-time availability mapping",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
} 