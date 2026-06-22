"use client";

import React, { useEffect, useState } from "react";
import { Flag, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/providers/AuthProvider";
import { submitReport } from "@/lib/actions";

export function ReportDialog({
  open,
  onClose,
  reportedId,
  reportedName,
}: {
  open: boolean;
  onClose: () => void;
  reportedId?: string;
  reportedName?: string;
}) {
  const { profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSubject("");
      setDescription("");
      setSubmitting(false);
      setDone(false);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (subject.trim().length < 3) {
      setError("Please add a short subject.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Please describe the issue (at least 10 characters).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitReport(profile, {
        subject,
        description,
        reportedId,
        reportedName,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the report.");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="gap-5 sm:max-w-md">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Report submitted</h2>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Thanks for flagging this. Our team will review it and take action if needed.
              </p>
            </div>
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-destructive" />
                Report {reportedName ? reportedName : "a problem"}
              </DialogTitle>
              <DialogDescription>
                Tell us what happened. Reports are private and reviewed by our team.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-subject">Subject</Label>
                <Input
                  id="report-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. No-show, inappropriate behavior, spam…"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-desc">Description</Label>
                <Textarea
                  id="report-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add the details that will help us understand the issue…"
                  className="min-h-[120px]"
                  maxLength={1000}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" loading={submitting}>
                  <Flag className="h-4 w-4" />
                  Submit report
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
