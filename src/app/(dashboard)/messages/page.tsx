"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useChats, useMessages } from "@/hooks/useChats";
import { sendMessage, markChatRead } from "@/lib/actions";
import type { Chat } from "@/lib/types";
import type { Timestamp } from "firebase/firestore";

function initials(name: string | undefined) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTime(ts: Timestamp | null | undefined) {
  if (!ts) return "";
  const d = ts.toDate();
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The other participant's display name for a chat. */
function otherName(chat: Chat, uid: string) {
  const otherId = chat.participantIds.find((id) => id !== uid) ?? uid;
  return chat.participantNames?.[otherId] ?? "Conversation";
}

export default function MessagesPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: chats, loading } = useChats(uid);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  // On phones we show ONE pane at a time (list, then the conversation). On
  // larger screens both panes sit side by side, so we can auto-open the first
  // chat there. Auto-opening on a phone would hide the list behind a chat.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Default-select the first conversation once chats load (desktop only).
  useEffect(() => {
    if (isDesktop && !selectedId && chats.length > 0) setSelectedId(chats[0].id);
  }, [isDesktop, chats, selectedId]);

  const selected = useMemo(
    () => chats.find((c) => c.id === selectedId) ?? null,
    [chats, selectedId]
  );
  const { data: messages } = useMessages(selectedId ?? undefined);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  // Mark the open conversation as read (clears its unread dot), and re-mark when
  // new messages arrive while it's open.
  useEffect(() => {
    if (selectedId && uid) markChatRead(selectedId, uid).catch(() => {});
  }, [selectedId, uid, messages.length]);

  async function handleSend() {
    if (!uid || !selectedId || !draft.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(selectedId, uid, draft);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="mt-1 text-muted-foreground">
          Chat with people once a request is accepted.
        </p>
      </div>

      <div className="flex h-[calc(100dvh-13rem)] min-h-[420px] overflow-hidden rounded-xl border border-border bg-card md:h-[600px]">
        {/* Conversation list — full width on phones; hidden once a chat is open */}
        <div
          className={cn(
            "flex-col border-border md:flex md:w-80 md:shrink-0 md:border-r",
            selected ? "hidden md:flex" : "flex w-full"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : chats.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No conversations yet. Request a service to start one.
              </div>
            ) : (
              chats.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={cn(
                    "flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent",
                    selectedId === conv.id && "bg-primary/10"
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-sm">
                      {initials(uid ? otherName(conv, uid) : undefined)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {uid ? otherName(conv, uid) : "Conversation"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conv.lastMessage || conv.serviceTitle || "New conversation"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area — full width on phones; hidden until a chat is opened */}
        <div className={cn("flex-1 flex-col", selected ? "flex" : "hidden md:flex")}>
          {selected && uid ? (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="-ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-sm">
                    {initials(otherName(selected, uid))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {otherName(selected, uid)}
                  </div>
                  {selected.serviceTitle && (
                    <span className="text-xs text-muted-foreground">
                      {selected.serviceTitle}
                    </span>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Say hello to start the conversation.
                  </p>
                )}
                {messages.map((msg) => {
                  const mine = msg.senderId === uid;
                  return (
                    <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-xs rounded-2xl px-4 py-2.5 text-sm lg:max-w-md",
                          mine
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-muted text-foreground"
                        )}
                      >
                        {msg.text}
                        <div
                          className={cn(
                            "mt-1 text-[10px]",
                            mine ? "text-right text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type your message…"
                    className="max-h-28 min-h-[40px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button size="icon" disabled={!draft.trim() || sending} onClick={handleSend}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
