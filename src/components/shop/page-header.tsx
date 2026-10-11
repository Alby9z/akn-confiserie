export function PageHeader({ title, intro, children }: { title: string; intro?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="container-page pb-8 pt-8 sm:pt-10">
      {children}
      <h1 className="mt-4 font-display text-4xl font-semibold text-reglisse sm:text-5xl">{title}</h1>
      {intro && <div className="mt-4 max-w-2xl text-lg leading-relaxed text-encre-doux">{intro}</div>}
    </div>
  );
}
