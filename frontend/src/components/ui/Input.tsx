import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...rest }, ref) => (
    <label className="block w-full">
      {label && <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={`w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 ${className}`}
        {...rest}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = "", id, ...rest }, ref) => (
    <label className="block w-full">
      {label && <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>}
      <textarea
        ref={ref}
        id={id}
        className={`w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${className}`}
        {...rest}
      />
    </label>
  )
);
Textarea.displayName = "Textarea";
