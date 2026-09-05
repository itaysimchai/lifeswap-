"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Clock,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useMyApplication } from "@/hooks/useApplications";
import { submitApplication } from "@/lib/actions";
import { hostApplicationSchema, type HostApplicationFormData } from "@/lib/validations";

const STEPS = [
  { title: "About you", description: "Your background and links" },
  { title: "Experience", description: "Your expertise and skills" },
  { title: "Motivation", description: "Why you want to join" },
  { title: "Review", description: "Check and submit" },
];

export default function BecomeProviderPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: myApp, loading: appLoading } = useMyApplication(profile?.uid);

  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<HostApplicationFormData>({
    resolver: zodResolver(hostApplicationSchema),
    defaultValues: { skills: [] },
  });

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 15) {
      const next = [...skills, trimmed];
      setSkills(next);
      setValue("skills", next, { shouldValidate: true });
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    const next = skills.filter((s) => s !== skill);
    setSkills(next);
    setValue("skills", next, { shouldValidate: true });
  };

  const nextStep = async () => {
    const fields: (keyof HostApplicationFormData)[][] = [
      ["bio", "linkedin", "portfolio"],
      ["experience", "skills"],
      ["motivation"],
    ];
    const valid = await trigger(fields[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const onSubmit = async (data: HostApplicationFormData) => {
    if (!profile) return;
    await submitApplication(profile, {
      bio: data.bio,
      experience: data.experience,
      skills,
      linkedin: data.linkedin,
      portfolio: data.portfolio,
      motivation: data.motivation,
    });
    // The application snapshot flips to "pending" and the status card below renders.
  };

  // ── Gated states ─────────────────────────────────────────────────────────
  if (appLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (profile?.isProvider) {
    return (
      <StatusCard
        icon={<BadgeCheck className="h-7 w-7" />}
        tone="success"
        title="You're a provider"
        body="Your application was approved. You can publish and manage your services now."
        action={
          <Button asChild>
            <Link href="/my-services">Go to My Services</Link>
          </Button>
        }
      />
    );
  }

  if (myApp?.status === "pending") {
    return (
      <StatusCard
        icon={<Clock className="h-7 w-7" />}
        tone="warning"
        title="Application under review"
        body="Thanks for applying. Our team typically reviews applications within 2–3 business days, and you'll see the result here."
        action={
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </Button>
        }
      />
    );
  }

  // ── Application form ─────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Become a provider
        </h1>
        <p className="mt-1 text-muted-foreground">
          Share your expertise and offer your own services on LifeSwap.
        </p>
      </div>

      {myApp?.status === "rejected" && (
        <div className="mb-6 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Your previous application wasn&apos;t approved. You&apos;re welcome to refine
          and submit again.
        </div>
      )}

      {/* Stepper */}
      <ol className="mb-8 flex items-center">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li
              key={s.title}
              className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")}
            >
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                    done && "border-primary bg-primary text-primary-foreground",
                    active && "border-primary bg-primary/10 text-primary",
                    !done && !active && "border-border bg-card text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    active || done ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-px flex-1 transition-colors",
                    i < step ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">{STEPS[step].title}</h2>
            <p className="text-sm text-muted-foreground">{STEPS[step].description}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {step === 0 && (
              <>
                <Field label="Your bio" htmlFor="bio" required hint="Minimum 100 characters. This appears on your provider profile.">
                  <Textarea
                    id="bio"
                    placeholder="Tell clients about your background, your work, and how you can help…"
                    className="min-h-[140px]"
                    error={errors.bio?.message}
                    {...register("bio")}
                  />
                </Field>
                <Field label="LinkedIn" htmlFor="linkedin" hint="Optional, but it builds trust.">
                  <Input id="linkedin" placeholder="https://linkedin.com/in/yourname" error={errors.linkedin?.message} {...register("linkedin")} />
                </Field>
                <Field label="Portfolio or website" htmlFor="portfolio">
                  <Input id="portfolio" placeholder="https://yourwebsite.com" error={errors.portfolio?.message} {...register("portfolio")} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="Experience & expertise" htmlFor="experience" required hint="Minimum 50 characters.">
                  <Textarea
                    id="experience"
                    placeholder="Describe your professional experience, notable work, and areas of deep expertise…"
                    className="min-h-[140px]"
                    error={errors.experience?.message}
                    {...register("experience")}
                  />
                </Field>
                <Field label="Skills" required hint="Add the skills you can offer, e.g. React, Product Strategy, UX.">
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      placeholder="Add a skill and press Enter"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addSkill} aria-label="Add skill">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors.skills && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.skills.message}</p>
                  )}
                  {skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1 pr-1.5">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </Field>
              </>
            )}

            {step === 2 && (
              <Field label="Why do you want to join as a provider?" htmlFor="motivation" required hint="Minimum 100 characters.">
                <Textarea
                  id="motivation"
                  placeholder="Tell us what you hope to offer and achieve as a LifeSwap provider…"
                  className="min-h-[180px]"
                  error={errors.motivation?.message}
                  {...register("motivation")}
                />
              </Field>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-5">
                  <ReviewField label="Bio" value={getValues("bio")} />
                  <ReviewField label="LinkedIn" value={getValues("linkedin") || "Not provided"} />
                  <ReviewField label="Portfolio" value={getValues("portfolio") || "Not provided"} />
                  <ReviewField label="Experience" value={getValues("experience")} />
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.length > 0 ? (
                        skills.map((s) => (
                          <Badge key={s} variant="secondary">
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">None added</span>
                      )}
                    </div>
                  </div>
                  <ReviewField label="Motivation" value={getValues("motivation")} />
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
                  <strong className="font-semibold">What happens next?</strong> Our team
                  reviews your application within 2–3 business days. You&apos;ll see the
                  result on this page.
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-border pt-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" loading={isSubmitting}>
                  <Check className="h-4 w-4" />
                  Submit application
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 line-clamp-3 text-sm text-foreground">{value}</p>
    </div>
  );
}

function StatusCard({
  icon,
  tone,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  tone: "success" | "warning";
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl",
              tone === "success" && "bg-success/10 text-success",
              tone === "warning" && "bg-warning/10 text-warning"
            )}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
          <div className="mt-2">{action}</div>
        </CardContent>
      </Card>
    </div>
  );
}
