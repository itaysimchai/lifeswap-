import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

type Document = {
  title: string;
  updated: string;
  status: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export function LegalDocument({ document }: { document: Document }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <article className="container-page py-10 sm:py-16">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{document.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Draft updated {document.updated}</p>
            <p className="mt-5 rounded-xl border border-border bg-muted p-4 text-sm text-foreground">{document.status}</p>
            <nav aria-label="Legal documents" className="mt-5 flex flex-wrap gap-5 text-sm text-primary">
              <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
              <Link href="/terms" className="underline underline-offset-4">Terms of Use</Link>
              <a href="mailto:nadrty8@gmail.com" className="underline underline-offset-4">Contact LifeSwap</a>
            </nav>
            <div className="mt-10 space-y-9">
              {document.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index} className="mt-3 whitespace-pre-line break-words leading-relaxed text-muted-foreground">{paragraph}</p>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
