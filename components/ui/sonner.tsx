"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        style: {
          background: "var(--ink)",
          color: "#fff",
          border: "none",
          borderRadius: "999px",
          padding: "13px 20px",
          fontSize: "13px",
          fontWeight: 600,
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
