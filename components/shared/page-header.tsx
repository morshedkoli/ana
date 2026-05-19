interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div className="space-y-2">
        {eyebrow && <p className="label-tiny text-accent">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-medium tracking-tight lg:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-base text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
