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
  title: "Parc-It: Anonymous Office Suggestions",
  description: "Submit and upvote anonymous office improvement ideas, powered by Zero Knowledge Proofs and Group Signatures.",
  openGraph: {
    title: "Parc-It: Anonymous Office Suggestions",
    description: "Submit and upvote anonymous office improvement ideas, powered by Zero Knowledge Proofs and Group Signatures.",
    url: "https://parc-it.example.com/",
    siteName: "Parc-It",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parc-It: Anonymous Office Suggestions",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parc-It: Anonymous Office Suggestions",
    description: "Submit and upvote anonymous office improvement ideas, powered by Zero Knowledge Proofs and Group Signatures.",
    images: ["/og-image.png"],
    creator: "@0xPARC"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icons/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
