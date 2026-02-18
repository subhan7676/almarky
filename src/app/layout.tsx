import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LocalCartProvider } from "@/components/providers/local-cart-provider";
import { LocalProfileProvider } from "@/components/providers/local-profile-provider";
import { DevtoolsVisibilityGate } from "@/components/layout/devtools-visibility-gate";
import { BrandLaunchLoader } from "@/components/animations/brand-launch-loader";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Almarky - COD Marketplace",
  description:
    "Mobile-first e-commerce marketplace with realtime products, COD checkout, and admin stock controls.",
  applicationName: "Almarky",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon", sizes: "192x192", type: "image/png" }],
    shortcut: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
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
        className={`${manrope.variable} ${sora.variable} antialiased hide-nextjs-devtools`}
      >
        <BrandLaunchLoader />
        <AuthProvider>
          <DevtoolsVisibilityGate />
          <LocalProfileProvider>
            <LocalCartProvider>
              <AppShell>{children}</AppShell>
            </LocalCartProvider>
          </LocalProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
