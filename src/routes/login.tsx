import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";
import { Card, btnPrimary } from "@/components/nx";

const searchSchema = z.object({
  redirect: z.string().optional(),
  tab: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign In or Sign Up – Nexora" },
      { name: "description", content: "Authenticate to access your AI meeting memory bank and workspaces." },
      { property: "og:title", content: "Sign In – Nexora" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, signIn, signUp, signInAsDemo, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(search.tab === "signup" ? "signup" : "signin");

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const redirectTo = search.redirect || "/dashboard";

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);

    if (res.ok) {
      toast.success("Welcome back to Nexora!");
      navigate({ to: redirectTo as any });
    } else {
      toast.error(res.error || "Authentication failed. Check your credentials.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.error("Please fill in your name, email, and password.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const res = await signUp(name, email, password, company);
    setLoading(false);

    if (res.ok) {
      toast.success("Account created successfully! Welcome to Nexora.");
      navigate({ to: redirectTo as any });
    } else {
      toast.error(res.error || "Failed to create account. Please try again.");
    }
  };

  const handleDemoLogin = () => {
    signInAsDemo();
    toast.success("Signed in as Demo Executive (Pavani Singaram)");
    navigate({ to: redirectTo as any });
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
    if (score <= 2) return { score: 2, label: "Medium", color: "bg-warn" };
    return { score: 3, label: "Strong", color: "bg-success" };
  };

  const strength = getPasswordStrength(password);

  return (
    <div className="relative min-h-[90vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background ambient glowing orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-gradient-to-tr from-primary/20 via-violet/20 to-cyan/10 blur-[130px] opacity-70" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[400px] rounded-full bg-primary/15 blur-[120px] opacity-60" />

      <div className="relative w-full max-w-md animate-fade-up">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand glow shadow-lg shadow-primary/25 transition group-hover:scale-105">
              <BrainCircuit className="h-6 w-6 text-primary-foreground" />
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">Nexora</span>
          </Link>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Access your persistent meeting memories and live prep briefs"
              : "Start turning every conversation into your unfair advantage"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass rounded-3xl border border-white/10 bg-card/75 p-6 md:p-8 shadow-2xl backdrop-blur-2xl">
          {/* If already authenticated, show switch or continue */}
          {isAuthenticated && user && (
            <div className="mb-6 rounded-2xl border border-success/30 bg-success/10 p-4 text-center">
              <p className="text-xs text-muted-foreground">Currently logged in as</p>
              <p className="font-semibold text-foreground mt-0.5">{user.name} ({user.email})</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Link to={redirectTo as any} className={btnPrimary + " !px-4 !py-1.5 text-xs"}>
                  Continue to App <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                >
                  Switch Account
                </button>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/40 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-xl py-2 transition ${
                mode === "signin"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-xl py-2 transition ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Sign In Form */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work Email</label>
                <div className="relative mt-1.5 flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => toast.info("Demo tip: Use 'Instant Demo Access' or enter your registered password.")}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1.5 flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  Remember my session
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={btnPrimary + " w-full !py-2.5 justify-center text-sm font-semibold"}
              >
                {loading ? "Signing in..." : "Sign In to Nexora"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <div className="relative mt-1.5 flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pavani Singaram"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Work Email</label>
                <div className="relative mt-1.5 flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pavani@company.com"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company / Organization</label>
                <div className="relative mt-1.5 flex items-center">
                  <Building2 className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Innovations"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</label>
                <div className="relative mt-1.5 flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden flex gap-1">
                      <div className={`h-full flex-1 ${strength.color}`} />
                      <div className={`h-full flex-1 ${strength.score >= 2 ? strength.color : "bg-muted"}`} />
                      <div className={`h-full flex-1 ${strength.score >= 3 ? strength.color : "bg-muted"}`} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{strength.label}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className={btnPrimary + " w-full !py-2.5 justify-center text-sm font-semibold"}
              >
                {loading ? "Creating account..." : "Create Free Account"}
                <Sparkles className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-card px-3 text-xs uppercase tracking-wider text-muted-foreground">
              Or Instant Access
            </span>
          </div>

          {/* ⚡ One-Click Instant Demo Access */}
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/15 to-violet/10 p-4 transition hover:border-primary/50">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand glow">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">Evaluating Nexora?</p>
                <p className="text-[11px] text-muted-foreground">1-Click Demo Executive Login (No password needed)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary/90 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary hover:scale-[1.01]"
            >
              Continue as Demo Executive <ArrowRight className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>

          {/* Enterprise OAuth Mock buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                toast.info("Connecting to Google OAuth...");
                setTimeout(handleDemoLogin, 800);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 py-2 text-xs font-medium hover:bg-secondary"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                toast.info("Connecting to Zoom Marketplace OAuth...");
                setTimeout(handleDemoLogin, 800);
              }}
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 py-2 text-xs font-medium hover:bg-secondary"
            >
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-[#0B5CFF] text-[9px] font-bold text-white">Z</span>
              Zoom
            </button>
          </div>
        </div>

        {/* Security badges */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" /> End-to-End Encryption
          </span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Powered by Supabase Auth
          </span>
        </div>
      </div>
    </div>
  );
}
