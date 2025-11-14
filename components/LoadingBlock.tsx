export default function LoadingBlock({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="text-center py-20 text-neutral-400">
      <div className="mx-auto w-12 h-12 mb-3 relative">
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <div>{text}</div>
    </div>
  );
}
