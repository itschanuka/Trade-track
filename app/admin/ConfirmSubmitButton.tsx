"use client";

type ConfirmSubmitButtonProps = {
  children: React.ReactNode;
  confirmMessage: string;
  tone?: "danger" | "neutral";
};

export function ConfirmSubmitButton({
  children,
  confirmMessage,
  tone = "neutral"
}: ConfirmSubmitButtonProps) {
  const className =
    tone === "danger"
      ? "rounded-md border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
      : "rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50";

  return (
    <button
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
