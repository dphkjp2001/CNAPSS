// frontend/src/components/AsyncButton.jsx

import React, { useState } from "react";

function AsyncButton({ onClick, children, loadingText = "Processing...", ...props }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      await onClick(e);
    } catch (err) {
      console.error("AsyncButton error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`disabled:opacity-50 ${props.className || ""}`}
      {...props}
    >
      {isLoading ? loadingText : children}
    </button>
  );
}

export default AsyncButton;
