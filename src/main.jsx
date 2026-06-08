import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App.jsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Falta VITE_CLERK_PUBLISHABLE_KEY en .env.local");
}

function ClerkGate({ children }) {
  const { isLoaded } = useAuth();
  if (!isLoaded)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0F4A38",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#5EC9AD",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
      </div>
    );
  return children;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ClerkGate>
        <App />
      </ClerkGate>
    </ClerkProvider>
  </StrictMode>,
);
