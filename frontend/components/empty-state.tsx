"use client";

import { FileQuestion } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon,
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="mb-4 text-slate-400">
        {icon ?? <FileQuestion className="h-16 w-16" strokeWidth={1} />}
      </div>
      <h3 className="text-lg font-medium text-slate-600">{title}</h3>
      <p className="mt-2 max-w-sm text-slate-400">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
