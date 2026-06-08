import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import SigniitLogo from "../components/SigniitLogo";

const inputStyle = {
  width: "100%",
  background: "white",
  border: "0.5px solid rgba(15,74,56,0.18)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  color: "#0F4A38",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "13px",
  fontWeight: "500",
  color: "#0F4A38",
  marginBottom: "6px",
};

const btnStyle = {
  width: "100%",
  background: "#0F4A38",
  color: "#F0EDE6",
  border: "none",
  borderRadius: "8px",
  padding: "11px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  fontWeight: "500",
  cursor: "pointer",
  marginTop: "8px",
};

function SignInForm({ onSwitch }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      }
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      <div>
        <label style={labelStyle}>Correo electrónico</label>
        <input
          style={inputStyle}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
        />
      </div>
      <div>
        <label style={labelStyle}>Contraseña</label>
        <input
          style={inputStyle}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#C0392B",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}
        disabled={loading}
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: "#8C8880",
          textAlign: "center",
          margin: 0,
        }}
      >
        ¿No tienes cuenta?{" "}
        <span
          onClick={onSwitch}
          style={{ color: "#3DAB8E", fontWeight: "500", cursor: "pointer" }}
        >
          Regístrate
        </span>
      </p>
    </form>
  );
}

function SignUpForm({ onSwitch }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || "Error al crear cuenta.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        navigate("/");
      }
    } catch (err) {
      setError(err.errors?.[0]?.longMessage || "Código incorrecto.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "verify")
    return (
      <form
        onSubmit={handleVerify}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#0F4A38",
            textAlign: "center",
            margin: 0,
          }}
        >
          Enviamos un código a <strong>{email}</strong>
        </p>
        <div>
          <label style={labelStyle}>Código de verificación</label>
          <input
            style={{
              ...inputStyle,
              textAlign: "center",
              letterSpacing: "8px",
              fontSize: "20px",
            }}
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            autoFocus
          />
        </div>
        {error && (
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#C0392B",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading ? "Verificando..." : "Verificar cuenta"}
        </button>
      </form>
    );

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "14px" }}
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}
      >
        <div>
          <label style={labelStyle}>Nombre</label>
          <input
            style={inputStyle}
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Juan"
          />
        </div>
        <div>
          <label style={labelStyle}>Apellido</label>
          <input
            style={inputStyle}
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Pérez"
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Correo electrónico</label>
        <input
          style={inputStyle}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
        />
      </div>
      <div>
        <label style={labelStyle}>Contraseña</label>
        <input
          style={inputStyle}
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#C0392B",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}
        disabled={loading}
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "13px",
          color: "#8C8880",
          textAlign: "center",
          margin: 0,
        }}
      >
        ¿Ya tienes cuenta?{" "}
        <span
          onClick={onSwitch}
          style={{ color: "#3DAB8E", fontWeight: "500", cursor: "pointer" }}
        >
          Inicia sesión
        </span>
      </p>
    </form>
  );
}

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isSignUp = location.pathname.startsWith("/sign-up");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0F4A38",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        style={{
          position: "absolute",
          right: "-60px",
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.05,
          pointerEvents: "none",
        }}
        width="500"
        height="500"
        viewBox="0 0 500 500"
        fill="none"
      >
        <circle cx="250" cy="250" r="60" stroke="#5EC9AD" strokeWidth="1" />
        <circle cx="250" cy="250" r="120" stroke="#5EC9AD" strokeWidth="0.7" />
        <circle cx="250" cy="250" r="180" stroke="#5EC9AD" strokeWidth="0.5" />
        <circle cx="250" cy="250" r="240" stroke="#5EC9AD" strokeWidth="0.3" />
        <line
          x1="250"
          y1="10"
          x2="250"
          y2="490"
          stroke="#5EC9AD"
          strokeWidth="0.3"
        />
        <line
          x1="10"
          y1="250"
          x2="490"
          y2="250"
          stroke="#5EC9AD"
          strokeWidth="0.3"
        />
      </svg>

      <div
        style={{
          marginBottom: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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

      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "white",
          border: "0.5px solid rgba(15,74,56,0.15)",
          borderRadius: "12px",
          padding: "32px",
        }}
      >
        {isSignUp ? (
          <SignUpForm onSwitch={() => navigate("/sign-in")} />
        ) : (
          <SignInForm onSwitch={() => navigate("/sign-up")} />
        )}
      </div>
    </div>
  );
}
