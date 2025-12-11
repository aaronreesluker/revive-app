import { OperationTicket, OperationTicketStatus } from "@/context/OperationsContext";
import { cn } from "@/lib/utils";

type OperationTicketPreviewProps = {
  ticket: OperationTicket;
};

const statusPalette: Record<OperationTicketStatus, { background: string; border: string; color: string }> = {
  queued: { background: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.35)", color: "#93c5fd" },
  acknowledged: { background: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.35)", color: "#67e8f9" },
  in_progress: { background: "rgba(110,231,183,0.12)", border: "rgba(110,231,183,0.35)", color: "#6ee7b7" },
  snoozed: { background: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", color: "#fbbf24" },
  completed: { background: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.35)", color: "#a5b4fc" },
};

function formatStatus(status: OperationTicketStatus) {
  return status.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  try {
    const date = new Date(value);
    return date.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  } catch {
    return value;
  }
}

export function OperationTicketPreview({ ticket }: OperationTicketPreviewProps) {
  const palette = statusPalette[ticket.status];

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-white/5 p-4" style={{ background: "color-mix(in oklab, var(--panel), transparent 86%)" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="micro-title flex items-center gap-2">
            <span className="uppercase tracking-[0.28em]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
              {ticket.source}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {ticket.subject}
          </div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
            {ticket.summary}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ background: palette.background, border: `1px solid ${palette.border}`, color: palette.color }}
          >
            {formatStatus(ticket.status)}
          </span>
          <div className="text-right text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
            Owner • {ticket.owner}
            <br />
            Priority • {ticket.priority.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="micro-title">Activity trail</div>
        <ul className="mt-3 space-y-3">
          {ticket.activities.map((activity, index) => {
            const activityPalette = statusPalette[activity.status];
            return (
              <li key={activity.id} className="flex items-start gap-3 text-xs" style={{ color: "color-mix(in oklab, var(--foreground), transparent 45%)" }}>
                <div
                  className={cn(
                    "mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  )}
                  style={{ background: activityPalette.background, border: `1px solid ${activityPalette.border}`, color: activityPalette.color }}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2" style={{ color: "var(--foreground)" }}>
                    <span className="font-semibold">{formatStatus(activity.status)}</span>
                    <span className="text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1">{activity.summary}</p>
                  <div className="mt-1 text-[10px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }}>
                    {activity.actor}
                    {activity.note ? ` • ${activity.note}` : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

