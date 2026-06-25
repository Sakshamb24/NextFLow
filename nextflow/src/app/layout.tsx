import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { CandidateLogger } from "@/components/layout/candidate-logger";
import "./globals.css";

export const metadata: Metadata = {
  title: "NextFlow",
  description: "ILM workflow builder powered by React Flow, Trigger.dev, and Gemini.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <body className="min-h-full flex flex-col">
          <CandidateLogger />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
