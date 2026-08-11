import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Lock, Building, ArrowRight, Loader2, AlertCircle, CheckCircle2, Clock, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Signup() {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    organization: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { signup, token, user } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect if user is already authenticated
  useEffect(() => {
    if (token && user) {
      navigate("/", { replace: true });
    }
  }, [token, user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (error) setError("");
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanFirstName = formData.first_name.trim();
    const cleanLastName = formData.last_name.trim();
    const cleanOrg = formData.organization.trim();
    const cleanEmail = formData.email.trim();

    if (!cleanFirstName || !cleanLastName || !cleanOrg || !cleanEmail || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match. Please verify both password fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await signup({
        ...formData,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        organization: cleanOrg,
        email: cleanEmail,
      });
      setLoading(false);

      if (res.success) {
        setSubmitted(true);
      } else {
        setError(res.error || "Failed to submit signup request.");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "An unexpected error occurred. Please try again.");
    }
  };

  // SUCCESS SCREEN: Approval request sent to MyGo Administrative Department
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-body text-slate-800">
        <div className="w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl p-8 shadow-xl shadow-slate-200/50 text-center space-y-6 animate-fade-in relative z-10">
          {/* Logo */}
          <div className="flex justify-center items-center">
            <img
              src="/logo.png"
              alt="MYFormsAI Logo"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold font-display text-slate-900">Access Request Submitted</h2>
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
              Pending Administrative Approval
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-orange-50/80 border border-orange-200 text-slate-700 text-xs leading-relaxed space-y-2 text-left">
            <p className="font-medium text-slate-800">
              Your approval request is sent to <span className="font-bold text-orange-700">MyGo Administrative Department</span> and will be granted access in a few. Thank you for the patience.
            </p>
            <div className="pt-2 border-t border-orange-200/60 flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
              <span>Organization: <strong className="text-slate-800">{formData.organization}</strong></span>
              <span>•</span>
              <span>Applicant: <strong className="text-slate-800">{formData.first_name} {formData.last_name}</strong></span>
            </div>
          </div>

          <Button
            onClick={() => navigate("/login")}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login Screen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-body text-slate-800">
      {/* Background Soft Glows */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg space-y-6 relative z-10 my-8">
        {/* Logo & Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center">
            <img
              src="/logo.png"
              alt="MYFormsAI Logo"
              className="h-16 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Request access to nxForms Enterprise SAP Platform
          </p>
        </div>

        {/* Signup Form Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xl shadow-slate-200/50 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold font-display text-slate-900">Create Account Request</h2>
            <p className="text-xs text-slate-500">Fill in your details for MyGo administrative review</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs flex items-start gap-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span className="font-medium">{typeof error === "string" ? error : String(error)}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="John"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Last Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Organization Name</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  placeholder="Wolters Kluwer"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Work Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@wolterskluwer.com"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  Submit Request Access <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center">
          <p className="text-xs text-slate-600 font-medium">
            Already have an approved account?{" "}
            <Link to="/login" className="text-orange-600 font-bold hover:text-orange-700 hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
