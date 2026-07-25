import type { Metadata } from "next";
import "./globals.css";
import { SceneProvider } from "@/components/SceneProvider";
import BackgroundField from "@/components/BackgroundField";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Biomimicry Pattern Hub",
  description: "Morphological Adaptability Design — patterns borrowed from living systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-void font-sans text-white antialiased">
        <SceneProvider>
          <BackgroundField />
          <Header />
          <main className="relative z-10 min-h-screen">{children}</main>
        </SceneProvider>
      </body>
    </html>
  );
}
