/** Re-mounts on every navigation: a curtain lifts like a turning page. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="page-curtain pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-deep">
        <div className="page-curtain-line h-px w-40 bg-accent" />
      </div>
      <div className="page-enter">{children}</div>
    </>
  );
}
