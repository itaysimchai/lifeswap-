import {
  Code2,
  Compass,
  PenTool,
  BrainCircuit,
  Briefcase,
  TrendingUp,
  Megaphone,
  Languages,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// Category "artwork" for session cards — since sessions have no photos, each
// category gets a distinct icon over a brand-aligned gradient (blue / slate /
// gold family, no purple/teal) so the grid feels varied but stays on-brand.
type Art = { gradient: string; Icon: LucideIcon };

const MAP: Record<string, Art> = {
  "Software Engineering": { gradient: "from-blue-600 to-blue-800", Icon: Code2 },
  "Product Management": { gradient: "from-slate-600 to-slate-800", Icon: Compass },
  Design: { gradient: "from-amber-400 to-amber-600", Icon: PenTool },
  "Data Science & AI": { gradient: "from-sky-700 to-slate-800", Icon: BrainCircuit },
  "Career Coaching": { gradient: "from-blue-700 to-slate-900", Icon: Briefcase },
  "Business Strategy": { gradient: "from-slate-700 to-slate-900", Icon: TrendingUp },
  Marketing: { gradient: "from-amber-500 to-amber-700", Icon: Megaphone },
  Languages: { gradient: "from-sky-600 to-blue-800", Icon: Languages },
};

const FALLBACK: Art = { gradient: "from-blue-600 to-slate-800", Icon: Sparkles };

export function categoryArt(category: string): Art {
  return MAP[category] ?? FALLBACK;
}
