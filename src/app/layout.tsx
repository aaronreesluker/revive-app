import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { readFileSync } from "fs";
import { join } from "path";
import { AuthProvider } from "../context/AuthContext";
import { EventLogProvider } from "../context/EventLogContext";
import { Providers } from "../components/Providers";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Read config at build time, not import time
function getConfig() {
  try {
    const configPath = join(process.cwd(), "config.json");
    const configContent = readFileSync(configPath, "utf-8");
    return JSON.parse(configContent);
  } catch {
    return {
      branding: {
        name: "Revive",
        colors: { primary: "#00b3b3" },
      },
    };
  }
}

const config = getConfig();

function generateThemeVars(colors: { primary: string; secondary?: string; accent?: string }) {
  return {
    "--brand-primary": colors.primary,
    "--brand-secondary": colors.secondary || colors.primary,
    "--brand-accent": colors.accent || colors.primary,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeVars = generateThemeVars(config.branding.colors);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover" />
        <style dangerouslySetInnerHTML={{ __html: `:root { ${Object.entries(themeVars).map(([k, v]) => `${k}: ${v};`).join(" ")} }` }} />
      </head>
      <body className={`${geistMono.variable} antialiased min-h-screen`} suppressHydrationWarning>
        <ThemeScript />
        <EventLogProvider>
          <AuthProvider>
            <Providers>
              {children}
            </Providers>
          </AuthProvider>
        </EventLogProvider>
      </body>
    </html>
  );
}

function ThemeScript() {
  const script = `
  (function(){
    try {
      var stored = localStorage.getItem('revive-theme');
      var prefers = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
      var theme = stored || prefers;
      document.documentElement.setAttribute('data-theme', theme);
    } catch(e) { document.documentElement.setAttribute('data-theme','dark'); }

    var removeDevtools = function() {
      try {
        document.querySelectorAll('nextjs-portal').forEach(function(node){
          var host = node;
          if (!host) return;
          var shouldRemove = false;
          if (host.shadowRoot) {
            var btn = Array.from(host.shadowRoot.querySelectorAll('button[aria-label]')).find(function(el){
              var label = el.getAttribute('aria-label') || '';
              return label.toLowerCase().indexOf('devtools') !== -1;
            });
            if (btn) shouldRemove = true;
          }
          if (shouldRemove) {
            host.remove();
          }
        });

        document.querySelectorAll('button[aria-label]').forEach(function(btn){
          var label = btn.getAttribute('aria-label') || '';
          if (label.toLowerCase().indexOf('devtools') !== -1 && btn.parentElement) {
            btn.parentElement.removeChild(btn);
          }
        });
      } catch (err) {
        /* noop */
      }
    };

    removeDevtools();
    var observer;
    try {
      observer = new MutationObserver(function(){
        removeDevtools();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } catch (err) {
      /* noop */
    }

    window.addEventListener('load', removeDevtools);
    var intervalId = setInterval(removeDevtools, 400);
    setTimeout(function(){
      clearInterval(intervalId);
    }, 8000);
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

