export function PageHeader({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-end gap-3.5 flex-wrap px-0.5 pt-0.5">
      <div className="flex-1 min-w-[230px]">
        <h1 className="text-[26px] font-extrabold tracking-[-.6px] m-0">{title}</h1>
        <p className="mt-1 mb-0 text-[12.5px] text-ink3">{hint}</p>
      </div>
      {children}
    </div>
  );
}
