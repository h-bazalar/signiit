import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import App from "./App.jsx";
import SigniitLogo from "./components/SigniitLogo.jsx";
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <SigniitLogo variant="dark" size="lg" />
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "9px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(240,237,230,0.3)",
            margin: 0,
          }}
        >
          Creativos con intención para Meta Ads
        </p>
      </div>
    );
  return children;
}

createRoot(document.getElementById("root")).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <ClerkGate>
      <App />
    </ClerkGate>
  </ClerkProvider>,
);
