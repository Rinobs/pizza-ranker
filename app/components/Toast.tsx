"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  onDismiss: () => void;
};

export function Toast({ message, type = "success", onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-4 ${
        type === "success"
          ? "border-[#5A2E08] bg-[#1E0E06]/95 text-[#FFE4C8]"
          : "border-[#5E3340] bg-[#1A0A10]/95 text-[#FFD8E1]"
      }`}
    >
      <span className={`shrink-0 ${type === "success" ? "text-[#E8750A]" : "text-[#FF8FAB]"}`}>
        {type === "success" ? <FiCheck size={16} strokeWidth={2.5} /> : <FiX size={16} />}
      </span>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}

type ToastEntry = {
  id: number;
  message: string;
  type: "success" | "error";
};

type UseToastReturn = {
  toasts: ToastEntry[];
  showToast: (message: string, type?: "success" | "error") => void;
  dismissToast: (id: number) => void;
};

let nextId = 1;

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  function showToast(message: string, type: "success" | "error" = "success") {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return { toasts, showToast, dismissToast };
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast message={toast.message} type={toast.type} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
}
