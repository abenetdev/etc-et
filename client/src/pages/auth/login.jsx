import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginUser } from "@/store/auth-slice";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, LogIn } from "lucide-react";

function AuthLogin() {
  const [form, setForm]               = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);

  const dispatch    = useDispatch();
  const navigate    = useNavigate();
  const { toast }   = useToast();

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const data = await dispatch(loginUser(form));
    setLoading(false);

    if (data?.payload?.success) {
      toast({ title: "Welcome back!" });
    } else {
      toast({
        title:       "Login failed",
        description: data?.payload?.message || "Check your credentials",
        variant:     "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Enter your details to continue.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              autoComplete="current-password"
              className="h-11 pr-10"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || !form.email || !form.password}
          className="w-full h-11 gap-2 text-sm font-medium mt-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {loading ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-gray-50 px-2 text-gray-400">or</span>
        </div>
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link
          to="/auth/register"
          className="font-semibold text-primary hover:underline"
        >
          Create one free
        </Link>
      </p>
    </div>
  );
}

export default AuthLogin;
