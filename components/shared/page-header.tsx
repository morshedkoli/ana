interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8 sm:gap-6 lg:mb-10">
      <div className="space-y-1.5 sm:space-y-2">
        {eyebrow && <p className="label-tiny text-accent">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted sm:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
