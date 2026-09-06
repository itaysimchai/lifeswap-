import React from "react";
import { LegalDocument } from "@/components/legal/LegalDocument";
import document from "@/content/legal/privacy-policy.json";

export const metadata = { title: document.title };

export default function PrivacyPage() {
  return <LegalDocument document={document} />;
}
