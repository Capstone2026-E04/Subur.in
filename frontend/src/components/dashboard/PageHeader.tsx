interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div
      data-reveal
      className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
    >
      <div className="min-w-0">
        <h1 className="text-primary text-2xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-prose text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
