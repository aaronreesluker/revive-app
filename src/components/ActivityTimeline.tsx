"use client";

import { motion } from "framer-motion";
import { 
  Phone, 
  CreditCard, 
  Star, 
  Users, 
  Mail, 
  MessageSquare, 
  Calendar,
  CheckCircle2,
  Clock,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ActivityType = 
  | "call"
  | "payment"
  | "review"
  | "contact"
  | "email"
  | "message"
  | "appointment"
  | "task"
  | "general";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string | Date;
  meta?: {
    amount?: number;
    rating?: number;
    contactName?: string;
    status?: "success" | "pending" | "failed";
  };
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

const typeConfig: Record<ActivityType, { icon: LucideIcon; color: string; bgColor: string }> = {
  call: { icon: Phone, color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
  payment: { icon: CreditCard, color: "text-blue-400", bgColor: "bg-blue-500/15" },
  review: { icon: Star, color: "text-amber-400", bgColor: "bg-amber-500/15" },
  contact: { icon: Users, color: "text-purple-400", bgColor: "bg-purple-500/15" },
  email: { icon: Mail, color: "text-cyan-400", bgColor: "bg-cyan-500/15" },
  message: { icon: MessageSquare, color: "text-pink-400", bgColor: "bg-pink-500/15" },
  appointment: { icon: Calendar, color: "text-orange-400", bgColor: "bg-orange-500/15" },
  task: { icon: CheckCircle2, color: "text-teal-400", bgColor: "bg-teal-500/15" },
  general: { icon: Clock, color: "text-gray-400", bgColor: "bg-gray-500/15" },
};

function formatTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-GB", { 
    day: "numeric", 
    month: "short" 
  });
}

export function ActivityTimeline({ 
  activities, 
  maxItems = 10, 
  showLoadMore = false,
  onLoadMore,
  className 
}: ActivityTimelineProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className={cn("space-y-1", className)}>
      {displayedActivities.map((activity, index) => {
        const config = typeConfig[activity.type];
        const Icon = config.icon;
        const isLast = index === displayedActivities.length - 1;

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            className="relative flex gap-3 pb-4"
          >
            {/* Timeline line */}
            {!isLast && (
              <div 
                className="absolute left-[17px] top-9 bottom-0 w-px"
                style={{ background: "color-mix(in oklab, var(--foreground), transparent 85%)" }}
              />
            )}

            {/* Icon */}
            <div className={cn(
              "relative flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full",
              config.bgColor
            )}>
              <Icon size={16} className={config.color} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {activity.title}
                  </p>
                  {activity.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
                      {activity.description}
                    </p>
                  )}
                </div>
                <span className="flex-shrink-0 text-[11px]" style={{ color: "color-mix(in oklab, var(--foreground), transparent 55%)" }}>
                  {formatTimestamp(activity.timestamp)}
                </span>
              </div>

              {/* Meta info */}
              {activity.meta && (
                <div className="flex items-center gap-2 mt-1.5">
                  {activity.meta.amount !== undefined && (
                    <span className="text-xs font-medium" style={{ color: "var(--brand)" }}>
                      £{activity.meta.amount.toLocaleString()}
                    </span>
                  )}
                  {activity.meta.rating !== undefined && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-400">
                      <Star size={12} fill="currentColor" />
                      {activity.meta.rating}
                    </span>
                  )}
                  {activity.meta.status && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      activity.meta.status === "success" && "bg-emerald-500/15 text-emerald-400",
                      activity.meta.status === "pending" && "bg-amber-500/15 text-amber-400",
                      activity.meta.status === "failed" && "bg-rose-500/15 text-rose-400"
                    )}>
                      {activity.meta.status.charAt(0).toUpperCase() + activity.meta.status.slice(1)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Load more */}
      {showLoadMore && activities.length > maxItems && (
        <button
          onClick={onLoadMore}
          className="w-full py-2 text-sm text-center rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--brand)" }}
        >
          View {activities.length - maxItems} more activities
        </button>
      )}

      {/* Empty state */}
      {activities.length === 0 && (
        <div className="py-8 text-center">
          <Clock size={32} className="mx-auto mb-2" style={{ color: "color-mix(in oklab, var(--foreground), transparent 60%)" }} />
          <p className="text-sm" style={{ color: "color-mix(in oklab, var(--foreground), transparent 50%)" }}>
            No activity yet
          </p>
        </div>
      )}
    </div>
  );
}


