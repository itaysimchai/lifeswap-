import React from "react";
import { LegalDocument } from "@/components/legal/LegalDocument";
import document from "@/content/legal/terms-of-use.json";

export const metadata = { title: document.title };

export default function TermsPage() {
  return <LegalDocument document={document} />;
}
