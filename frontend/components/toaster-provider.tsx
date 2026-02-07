"use client";

import { Toaster } from "react-hot-toast";

const toastStyles = {
  borderRadius: "0.75rem",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  padding: "16px 20px",
};

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      gutter={12}
      toastOptions={{
        className: "rounded-xl shadow-lg",
        duration: 4000,
        style: toastStyles,
        success: {
          iconTheme: {
            primary: "#10B981",
            secondary: "#fff",
          },
          style: {
            ...toastStyles,
            borderLeft: "4px solid #10B981",
          },
        },
        error: {
          iconTheme: {
            primary: "#EF4444",
            secondary: "#fff",
          },
          style: {
            ...toastStyles,
            borderLeft: "4px solid #EF4444",
          },
        },
        loading: {
          iconTheme: {
            primary: "#0EA5E9",
            secondary: "#fff",
          },
          style: {
            ...toastStyles,
            borderLeft: "4px solid #0EA5E9",
          },
        },
      }}
    />
  );
}
