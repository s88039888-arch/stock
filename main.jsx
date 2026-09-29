import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// بديل تخزين Claude: يحفظ البيانات في متصفح الجهاز
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      if (value === null) throw new Error("not found");
      return { key, value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return { key, value };
    },
    async delete(key) {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
  };
}

createRoot(document.getElementById("root")).render(<App />);
