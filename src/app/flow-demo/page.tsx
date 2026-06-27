import { FlowDemo } from "@/components/landing/FlowDemo";

// Isolated preview of the flow-demo reel. Lets us review the component without
// touching the landing/hero. Not linked from anywhere — visit /flow-demo.
export default function FlowDemoPreviewPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Flow demo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse → book → message, rebuilt from the real UI. Preview only.
        </p>
      </div>
      <FlowDemo />
    </main>
  );
}
