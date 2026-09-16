"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useChats, useMessages } from "@/hooks/useChats";
import { sendMessage, markChatRead } from "@/lib/actions";
import { formatMessageTime, otherName } from "@/lib/chat";
import { useScreenTitle } from "@/lib/screen-title";
import { useKeyboardInset } from "@/lib/keyboard";

/**
 * One conversation, as a screen rather than a pane.
 *
 * The layout owns the viewport: the transcript is the only scroller (the shell
 * scroller is switched off for this route in mobile.css, so there is no nested
 * pair chaining into each other), and the composer sits on the bottom edge
 * lifted by --keyboard-inset so the keyboard never covers it.
 */
export default function ChatThreadPage() {
  const params = useParams();
  const chatId = typeof params?.chatId === "string" ? params.chatId : undefined;
  const { user } = useAuth();
  const uid = user?.uid;

  const { data: chats } = useChats(uid);
  const chat = useMemo(() => chats.find((c) => c.id === chatId) ?? null, [chats, chatId]);
  const { data: messages } = useMessages(chatId);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);

  useKeyboardInset();
  // Title the chrome after whoever is on the other end.
  useScreenTitle(chat && uid ? otherName(chat, uid) : null);

  // Pin to the newest message, and stay pinned as the keyboard opens.
  useEffect(() => {
    const el = transcript.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, chatId]);

  useEffect(() => {
    if (chatId && uid) markChatRead(chatId, uid).catch(() => {});
  }, [chatId, uid, messages.length]);

  async function handleSend() {
    if (!uid || !chatId || !draft.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(chatId, uid, draft);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mobile-thread">
      <div ref={transcript} className="mobile-thread-scroll">
        {messages.length === 0 && (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            Say hello to start the conversation.
          </p>
        )}
        {messages.map((msg) => {
          const mine = msg.senderId === uid;
          return (
            <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug",
                  mine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground"
                )}
              >
                {msg.text}
                <span
                  className={cn(
                    "mt-1 block text-[11px]",
                    mine ? "text-right text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {formatMessageTime(msg.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mobile-composer">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message"
          rows={1}
          className="max-h-28 min-h-10 resize-none rounded-2xl py-2"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!draft.trim() || sending}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity active:opacity-60 disabled:opacity-40"
        >
          <Send className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
