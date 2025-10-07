import React from "react";

export default function AsyncButton({ onClick, children, className = "", ...rest }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium shadow-sm border border-gray-200 bg-white hover:bg-gray-50 ${className}`}
      disabled={loading || rest.disabled}
      onClick={async (e) => {
        try {
          setLoading(true);
          await onClick?.(e);
        } finally {
          setLoading(false);
        }
      }}
      {...rest}
    >
      {loading ? "..." : children}
    </button>
  );
}
