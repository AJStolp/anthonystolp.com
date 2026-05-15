type Props = {
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
};

// Placeholder — proper cloud PNGs go here later.
export function CloudBank({ className, ref }: Props) {
  return <div ref={ref} className={className} aria-hidden />;
}
