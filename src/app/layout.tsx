import type { Metadata } from "next";
import Script from "next/script";
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
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1412439763702609');
fbq('track', 'PageView');`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1412439763702609&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
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
