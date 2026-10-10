/**
 * LoginPage — Dual-mode login / sign-up screen
 * Route: /
 *
 * Login mode:  validates credentials against localStorage accounts
 * Sign-up mode: creates a new account in localStorage, then switches to login
 *
 * Props flow: Receives onLogin callback from App
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import InputField from "../components/InputField";
import { BookOpen } from "lucide-react";
import { findAccount, saveAccount, emailExists, getUserName } from "../lib/auth";

interface LoginPageProps {
  onLogin: (email: string, name: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /** Switch between login and sign-up, clearing all fields/errors */
  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setSuccess("");
  };

  /** Handle sign-up: validate inputs, save account, switch to login */
  const handleSignUp = () => {
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (emailExists(email)) {
      setError("An account with this email already exists");
      return;
    }

    saveAccount({ name: name.trim(), email, password });
    setSuccess("Account created! You can now log in.");
    setMode("login");
    setName("");
    setEmail("");
    setPassword("");
  };

  /** Handle login: check credentials against stored accounts */
  const handleLogin = () => {
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    if (findAccount(email, password)) {
      onLogin(email, getUserName(email));
      navigate("/dashboard");
    } else {
      setError("Invalid email or password");
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
            >
              {isSignUp ? "Sign Up" : "Sign In"}
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