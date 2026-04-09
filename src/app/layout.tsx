import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://easymotores.com"),
  applicationName: "EasyMotores",
  title: {
    default: "EasyMotores | Compra y vende autos seminuevos en Querétaro, México",
    template: "%s | EasyMotores",
  },
  description:
    "Compra y vende autos seminuevos en Querétaro, México. Trato directo, pagos protegidos y entrega con revisión.",
  keywords: [
    "autos seminuevos",
    "Querétaro",
    "México",
    "comprar auto",
    "vender auto",
    "coches usados",
    "easymotores",
  ],
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://easymotores.com/",
    siteName: "EasyMotores",
    title: "EasyMotores | Compra y vende autos seminuevos en Querétaro, México",
    description:
      "Compra y vende autos seminuevos en Querétaro, México. Trato directo, pagos protegidos y entrega con revisión.",
    images: ["/easymotores_logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "EasyMotores",
    description:
      "Compra y vende autos seminuevos en Querétaro, México. Trato directo, pagos protegidos y entrega con revisión.",
    images: ["/easymotores_logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favico.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
