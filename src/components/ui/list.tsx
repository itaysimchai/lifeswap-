import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Grouped inset lists - the iOS Settings pattern.
 *
 * A settings screen is a list of rows, not a stack of cards. One rounded
 * container per section with hairline separators between rows reads as a single
 * object; a card per setting reads as six unrelated objects and wastes a third
 * of the width on padding at phone sizes.
 */

export function ListSection({
  title,
  footer,
  className,
  children,
}: {
  title?: string;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title && (
        <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>
      {footer && <p className="px-4 text-[13px] leading-snug text-muted-foreground">{footer}</p>}
    </section>
  );
}

/**
 * One row. Renders as a button when it does something, a plain div otherwise,
 * so only actionable rows are reachable by keyboard or VoiceOver.
 * `min-h-11` is the 44pt touch target.
 */
export function ListRow({
  label,
  detail,
  icon: Icon,
  onClick,
  href,
  chevron,
  destructive,
  disabled,
  children,
  className,
}: {
  label: React.ReactNode;
  detail?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  href?: string;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Trailing control - a switch, a value, a segmented control. */
  children?: React.ReactNode;
  className?: string;
}) {
  const interactive = Boolean(onClick || href);
  const showChevron = chevron ?? Boolean(href || (onClick && !children));

  const body = (
    <>
      {Icon && (
        <Icon
          className={cn(
            "h-[18px] w-[18px] shrink-0",
            destructive ? "text-destructive" : "text-muted-foreground"
          )}
        />
      )}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px] font-medium",
            destructive ? "text-destructive" : "text-foreground"
          )}
        >
          {label}
        </span>
        {detail && (
          <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
      {children}
      {showChevron && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
    </>
  );

  const shared = cn(
    "flex w-full min-h-11 items-center gap-3 px-4 py-2.5 text-left",
    "border-b border-border last:border-b-0",
    interactive && !disabled && "active:bg-muted",
    disabled && "opacity-50",
    className
  );

  if (href && !disabled) {
    return (
      <a href={href} className={shared}>
        {body}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={shared}>
        {body}
      </button>
    );
  }
  return <div className={shared}>{body}</div>;
}

/**
 * Segmented control. Used for choices of three or fewer where showing the
 * options costs less than hiding them behind a menu.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex shrink-0 rounded-lg bg-muted p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-8 rounded-[6px] px-3 text-[13px] font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
