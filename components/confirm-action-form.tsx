"use client";

type ConfirmActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  label: string;
  hidden?: Record<string, string>;
  size?: "sm" | "md";
};

// Rode verwijderknop met een bevestigingsvraag, voor acties die niet ongedaan te maken zijn.
export function ConfirmActionForm({
  action,
  message,
  label,
  hidden,
  size = "sm"
}: ConfirmActionFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <button
        type="submit"
        className={`rounded-xl border border-red-200 bg-red-50 font-semibold text-red-700 transition hover:bg-red-100 ${
          size === "md" ? "px-4 py-2 text-sm" : "px-3 py-2 text-xs"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
