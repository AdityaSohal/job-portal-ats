import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            border: "2px solid #1b1b1b",
            borderRadius: "12px",
            boxShadow: "3px 3px 0 0 #1b1b1b",
            background: "#fff",
            color: "#1b1b1b",
            fontWeight: 600,
            fontSize: "14px",
          },
        }}
      />
    </QueryClientProvider>
  </StrictMode>
);