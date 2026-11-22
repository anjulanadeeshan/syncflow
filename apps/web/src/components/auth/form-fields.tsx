import type { InputHTMLAttributes } from 'react';

export function FormField({
  label,
  error,
  ...inputProps
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <input
        {...inputProps}
        aria-invalid={Boolean(error)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
      />
      {error ? <span className="mt-1.5 block text-sm text-red-400">{error}</span> : null}
    </label>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
