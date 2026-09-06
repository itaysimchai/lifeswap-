import React from "react";
import { LegalDocument } from "@/components/legal/LegalDocument";
// Edit the full Privacy Policy text in src/content/legal/privacy-policy.json.
import document from "@/content/legal/privacy-policy.json";

export const metadata = { title: document.title };

export default function PrivacyPage() {
  return <LegalDocument document={document} />;
}
