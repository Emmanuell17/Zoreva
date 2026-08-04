type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <div
      className={`mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-6 sm:py-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
