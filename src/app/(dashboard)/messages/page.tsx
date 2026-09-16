"use client";

import React from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useChats } from "@/hooks/useChats";
import { chatInitials, formatChatTime, otherName, isUnread } from "@/lib/chat";

/**
 * The conversation list. Opening one pushes /messages/:chatId rather than
 * swapping panes, so the shell's back chevron, the title bar and the native
 * back gesture all mean the right thing.
 */
export default function MessagesPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const { data: chats, loading } = useChats(uid);

  if (loading) {
    // Rows in the shape they will land in, so nothing shifts when they arrive.
    return (
      <div data-fullbleed className="border-t border-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 py-16 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-[15px] font-medium text-foreground">No conversations yet</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Request a service to start one.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div data-page-header>
        <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        <p className="mt-1 text-muted-foreground">Chat with people once a request is accepted.</p>
      </div>
      {/* Rows carry their own 16px gutter, so inside the shell the list spans
          the full width instead of sitting inside the page container's. */}
      <ul data-fullbleed className="mt-4 border-t border-border">
        {chats.map((chat) => {
          const name = uid ? otherName(chat, uid) : "Conversation";
          const unread = uid ? isUnread(chat, uid) : false;
          return (
            <li key={chat.id}>
              <Link
                href={`/messages/${chat.id}`}
                className="flex min-h-16 items-center gap-3 border-b border-border px-4 py-3 active:bg-muted"
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="text-sm">{chatInitials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-[15px] text-foreground",
                        unread ? "font-semibold" : "font-medium"
                      )}
                    >
                      {name}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted-foreground">
                      {formatChatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-[13px]",
                      unread ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {chat.lastMessage || chat.serviceTitle || "New conversation"}
                  </p>
                </div>
                {unread && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                    aria-label="Unread"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
