import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-elevated border border-border">
        <Icon className="h-6 w-6 text-muted" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-xl">{title}</h3>
        <p className="max-w-md text-sm text-muted">{description}</p>
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
