type ProcessNoteProps = {
  children: React.ReactNode;
};

export function ProcessNote({ children }: ProcessNoteProps) {
  return (
    <p className="text-xs leading-relaxed text-zinc-600">{children}</p>
  );
}
