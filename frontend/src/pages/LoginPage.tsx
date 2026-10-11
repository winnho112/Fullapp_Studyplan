/**
 * LoginPage — Dual-mode login / sign-up screen
 * Route: /
 *
 * Calls the FastAPI backend for auth (which proxies to Supabase Auth).
 *
 * Props flow: Receives onLogin callback from App
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import InputField from "../components/InputField";
import { BookOpen } from "lucide-react";

interface LoginPageProps {
  onLogin: (email: string, password: string, name?: string) => Promise<boolean>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  /** Switch between login and sign-up, clearing all fields/errors */
  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setSuccess("");
  };

  /** Handle sign-up: call API, then switch to login */
  const handleSignUp = async () => {
    setError("");
    setSuccess("");

    if (!name.trim()) { setError("Name is required"); return; }
    if (!email.trim()) { setError("Email is required"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      await onLogin(email, password, name.trim());
      setSuccess("Account created! Check your email to confirm, then log in.");
      setMode("login");
      setName("");
      setEmail("");
      setPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  /** Handle login: call API, navigate to dashboard */
  const handleLogin = async () => {
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === "signup";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-light mb-4">
            <BookOpen size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">StudyPlan</h1>
          <p className="text-sm text-text-muted mt-1">
            Plan less. Study smarter.
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl border border-border p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-text mb-1">
            {isSignUp ? "Create an account" : "Welcome back"}
          </h2>
          <p className="text-sm text-text-muted mb-6">
            {isSignUp
              ? "Sign up to start planning your studies"
              : "Sign in to access your study plans"}
          </p>

          {/* Success message */}
          {success && (
            <p className="text-xs text-success font-medium mb-4 text-center">
              {success}
            </p>
          )}

          <div className="flex flex-col gap-4">
            {isSignUp && (
              <InputField
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="e.g., Alice Smith"
                required
              />
            )}
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />
            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={
                isSignUp
                  ? "At least 6 characters"
                  : "Enter your password"
              }
              required
              error={error}
            />
            <PrimaryButton
              onClick={isSignUp ? handleSignUp : handleLogin}
              fullWidth
              disabled={loading}
            >
              {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
            </PrimaryButton>
          </div>

          {/* Toggle link */}
          <p className="text-sm text-text-muted text-center mt-6">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}