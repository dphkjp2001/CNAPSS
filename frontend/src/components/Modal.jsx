import React from "react";

export default function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl">
        {title && <h2 className="text-xl font-semibold mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
