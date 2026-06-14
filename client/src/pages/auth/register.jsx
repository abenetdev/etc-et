import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { registerUser } from "@/store/auth-slice";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, UserPlus } from "lucide-react";

function AuthRegister() {
  const [form, setForm]               = useState({ userName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);

  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { toast } = useToast();

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const data = await dispatch(registerUser(form));
    setLoading(false);

    if (data?.payload?.success) {
      toast({ title: "Account created!", description: "Please sign in." });
      navigate("/auth/login");
    } else {
      toast({
        title:       "Registration failed",
        description: data?.payload?.message || "Please try again",
        variant:     "destructive",
      });
    }
  }

  const isValid = form.userName.trim() && form.email.trim() && form.password.length >= 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Join thousands of shoppers on MarketPlace.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="userName">Username</Label>
          <Input
            id="userName"
            type="text"
            placeholder="johndoe"
            value={form.userName}
            onChange={(e) => set("userName", e.target.value)}
            required
            autoComplete="username"
            className="h-11"
          />
        </div>

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
              placeholder="At least 6 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
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
          {form.password && form.password.length < 6 && (
            <p className="text-xs text-orange-500">Password must be at least 6 characters</p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading || !isValid}
          className="w-full h-11 gap-2 text-sm font-medium mt-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {loading ? "Creating account…" : "Create Account"}
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

      {/* Login link */}
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          to="/auth/login"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default AuthRegister;
