// frontend/src/pages/auth/Register.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import AsyncButton from "../../components/AsyncButton";
import { useAuth } from "../../contexts/AuthContext";

const ENABLED_SCHOOLS = new Set(["nyu"]);
const ALL_SCHOOLS = [
  { value: "nyu", label: "NYU" },
  { value: "columbia", label: "Columbia" },
  { value: "boston", label: "Boston" },
];

const ALLOWED_BY_SCHOOL = {
  nyu: ["nyu.edu"],
};

const emailMatches = (email, domains) => {
  const at = String(email || "").toLowerCase().trim().split("@");
  if (at.length !== 2) return false;
  const domain = at[1];
  return (domains || []).some((d) => domain === String(d).toLowerCase());
};

/** Academic year that starts in September.
 *  Sep(8)~Dec: current year, Jan~Aug: previous year.
 */
function academicStartYear(date = new Date()) {
  const m = date.getMonth(); // 0=Jan
  const y = date.getFullYear();
  return m >= 8 ? y : y - 1; // 8 === September
}

/** Build "Class of YYYY" options around the current academic year.
 *  Example (2025 Sep ~ 2026 Aug): base=2025 → range 2024 ~ 2031
 */
function buildClassOfOptions() {
  const base = academicStartYear(); // academic year anchor
  const start = base;
  const end = base + 4; // show a comfortable forward window
  const arr = [];
  for (let yy = start; yy <= end; yy++) arr.push(yy);
  return arr;
}

function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { school: schoolParam } = useParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");

  const [classOf, setClassOf] = useState(""); // NEW
  const classOfOptions = useMemo(() => buildClassOfOptions(), []);

  const [school, setSchool] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const baseURL = import.meta.env.VITE_API_URL;

  // prefill school (only if enabled)
  useEffect(() => {
    const fromState = location?.state?.prefillSchool;
    const fromStorage = localStorage.getItem("lastVisitedSchool") || "";
    const candidate = String(schoolParam || fromState || fromStorage || "").toLowerCase();
    setSchool(ENABLED_SCHOOLS.has(candidate) ? candidate : "nyu");
  }, [schoolParam, location?.state?.prefillSchool]);

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const allowedDomains = ALLOWED_BY_SCHOOL[school] || [];
  const emailAllowed = emailMatches(email, allowedDomains);

  const sendCode = async () => {
    if (!email || busy || cooldown) return;
    if (!emailAllowed) {
      setError(`Please use your official school email (${allowedDomains.join(", ")}).`);
      return;
    }
    setError("");
    try {
      setBusy(true);
      const res = await fetch(`${baseURL}/auth/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send code");
      setCodeSent(true);
      setCooldown(60);
      alert("Verification code sent. Please check your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (!email || !code || busy) return;
    if (!emailAllowed) {
      setError(`Please use your official school email (${allowedDomains.join(", ")}).`);
      return;
    }
    setError("");
    try {
      setBusy(true);
      const res = await fetch(`${baseURL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Verification failed");
      setEmailVerified(true);
      alert("Email verified!");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async () => {
    if (!emailVerified || !school || busy) return;
    if (!classOf) {
      setError("Please select your class year (e.g., 2029).");
      return;
    }
    if (!ENABLED_SCHOOLS.has(school)) {
      alert("This school is coming soon 🚧");
      return;
    }
    if (!emailAllowed) {
      setError(`Please use your official school email (${allowedDomains.join(", ")}).`);
      return;
    }
    setError("");
    try {
      setBusy(true);
      const res = await fetch(`${baseURL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nickname,
          school,
          classOf: Number(classOf), // ✅ cohort (graduation year)
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.message || "Sign up failed.";
        if (msg.toLowerCase().includes("email already")) {
          const go = window.confirm("Email already exists.\nGo to Log In?");
          if (go) navigate("/login", { replace: true, state: { from: location.state?.from } });
        } else if (msg.toLowerCase().includes("nickname")) {
          setError("This nickname is already taken. Please choose another.");
        } else {
          setError(msg);
        }
        return;
      }

      if (data?.user && data?.token) {
        try {
          data.user.classOf = data.user.classOf ?? Number(classOf);
          login({ user: data.user, token: data.token });
        } catch {}
        const from = location.state?.from;
        const bad = ["/", "/select-school", "/auth-required", "/login", "/register"];
        const fallback = `/${data.user.school}/dashboard`;
        const dest = bad.includes(from) ? fallback : from || fallback;
        alert("Registration complete! Welcome 👋");
        navigate(dest, { replace: true });
        return;
      }

      alert("Registration complete! You can log in now.");
      navigate("/login", { replace: true, state: { from: location.state?.from } });
    } catch (err) {
      setError("Unexpected error occurred. Please try again later.");
      console.error("Register error:", err);
    } finally {
      setBusy(false);
    }
  };

  const schoolOptions = useMemo(
    () =>
      ALL_SCHOOLS.map((s) => (
        <option key={s.value} value={s.value} disabled={!ENABLED_SCHOOLS.has(s.value)}>
          {ENABLED_SCHOOLS.has(s.value) ? s.label : `${s.label} (coming soon)`}
        </option>
      )),
    []
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="mx-auto flex max-w-4xl items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Sign Up</h1>
            <p className="mt-1 text-sm text-gray-600">
              CNAPSS currently supports university emails only. For NYU, please use <b>@nyu.edu</b>.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                placeholder="your.name@nyu.edu"
                className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 ${
                  email && !emailAllowed ? "border-red-300 focus:ring-red-200" : ""
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {email && !emailAllowed && (
                <p className="mt-1 text-xs text-red-600">
                  Please use your official school email ({allowedDomains.join(", ")}).
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nickname</label>
              <input
                type="text"
                placeholder="Display name"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">School</label>
              <select
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
              >
                <option value="">Select your school</option>
                {schoolOptions}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Only NYU is available for sign-up right now. Others are coming soon.
              </p>
            </div>

            {/* Class of YYYY (academic year anchored in September) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Class year</label>
              <select
                value={classOf}
                onChange={(e) => setClassOf(e.target.value)}
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
              >
                <option value="">Select your class year (Class of …)</option>
                {classOfOptions.map((yy) => (
                  <option key={yy} value={yy}>
                    Class of {yy}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                We’ll display your standing (Freshman/Sophomore/Junior/Senior) automatically from this.
              </p>
            </div>

            {/* Email code section */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Verification Code
                </label>
                <input
                  type="text"
                  placeholder="6-digit code"
                  className="w-full rounded-xl border px-3 py-2 uppercase outline-none focus:ring-2"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  inputMode="latin"
                />
              </div>
              <div className="flex gap-2">
                <AsyncButton
                  onClick={sendCode}
                  disabled={!email || cooldown > 0 || emailVerified || busy}
                  className="rounded-xl border bg-gray-50 px-3 py-2 text-sm"
                  loadingText="Sending..."
                >
                  {cooldown > 0 ? `Resend (${cooldown}s)` : codeSent ? "Resend" : "Send Code"}
                </AsyncButton>
                <AsyncButton
                  onClick={verifyCode}
                  disabled={!email || !code || emailVerified || busy}
                  className="rounded-xl bg-gray-900 px-3 py-2 text-sm text-white"
                  loadingText="Verifying..."
                >
                  {emailVerified ? "Verified" : "Verify"}
                </AsyncButton>
              </div>
            </div>

            <AsyncButton
              onClick={handleRegister}
              loadingText="Signing up..."
              className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
              disabled={!emailVerified || !school || !classOf || busy}
            >
              Sign Up
            </AsyncButton>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="font-semibold text-indigo-600 hover:underline"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;









