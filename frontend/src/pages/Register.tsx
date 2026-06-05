import { ChangeEvent, FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Field, Input, Select } from "../components/ui";
import { apiError } from "../lib/api";
import { Role } from "../lib/types";
import { useAuth } from "../store/auth";

// Students register with their institute email; drivers are operators and exempt.
const STUDENT_EMAIL_DOMAIN = "@iitr.ac.in";

const ROLE_OPTIONS: {
  value: Role;
  title: string;
  blurb: string;
  icon: JSX.Element;
}[] = [
  {
    value: "PASSENGER",
    title: "Passenger",
    blurb: "Book rides around campus",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    value: "DRIVER",
    title: "Driver",
    blurb: "Accept rides and earn",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0a2 2 0 0 0-2 2v3h2m14-5a2 2 0 0 1 2 2v3h-2m-12 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm12 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("PASSENGER");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    vehicleType: "E_RICKSHAW",
    vehicleNumber: "",
    vehicleModel: "",
    licenseNumber: "",
    upiId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  function validate() {
    if (form.name.trim().length < 2) return "Please enter your full name.";
    if (
      role === "PASSENGER" &&
      !form.email.trim().toLowerCase().endsWith(STUDENT_EMAIL_DOMAIN)
    )
      return `Students must use a ${STUDENT_EMAIL_DOMAIN} email.`;
    if (form.password.length < 6)
      return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords do not match.";
    if (role === "DRIVER") {
      if (!form.vehicleNumber.trim()) return "Vehicle number is required.";
      if (!form.licenseNumber.trim()) return "License number is required.";
    }
    return "";
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        role,
      };
      if (role === "DRIVER") {
        Object.assign(payload, {
          vehicleType: form.vehicleType,
          vehicleNumber: form.vehicleNumber,
          vehicleModel: form.vehicleModel || undefined,
          licenseNumber: form.licenseNumber,
          upiId: form.upiId || undefined,
        });
      }
      const user = await register(payload);
      navigate(user.role === "DRIVER" ? "/driver" : "/passenger");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-brand-600 font-bold text-white">
            R
          </div>
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="text-sm text-slate-500">Join as a passenger or a driver</p>
        </div>

        <Card>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  aria-pressed={active}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={active ? "text-brand-600" : "text-slate-400"}
                  >
                    {opt.icon}
                  </span>
                  <span className="text-sm font-semibold">{opt.title}</span>
                  <span className="text-xs text-slate-400">{opt.blurb}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="space-y-3" noValidate>
            <Field label="Full name">
              <Input value={form.name} onChange={set("name")} required />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder={
                  role === "PASSENGER" ? `you${STUDENT_EMAIL_DOMAIN}` : "you@example.com"
                }
                required
              />
              {role === "PASSENGER" && (
                <span className="text-xs text-slate-400">
                  Use your institute <b>{STUDENT_EMAIL_DOMAIN}</b> email.
                </span>
              )}
            </Field>
            <Field label="Phone (optional)">
              <Input value={form.phone} onChange={set("phone")} />
            </Field>
            <Field label="Password">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  minLength={6}
                  className="pr-16"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <Field label="Confirm password">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                required
              />
            </Field>

            {role === "DRIVER" && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Vehicle details
                </p>
                <Field label="Vehicle type">
                  <Select value={form.vehicleType} onChange={set("vehicleType")}>
                    <option value="E_RICKSHAW">E-Rickshaw</option>
                    <option value="CAR">Car</option>
                    <option value="BIKE">Bike</option>
                  </Select>
                </Field>
                <Field label="Vehicle number">
                  <Input
                    value={form.vehicleNumber}
                    onChange={set("vehicleNumber")}
                    placeholder="UK07 1234"
                    required
                  />
                </Field>
                <Field label="Model (optional)">
                  <Input value={form.vehicleModel} onChange={set("vehicleModel")} />
                </Field>
                <Field label="License number">
                  <Input
                    value={form.licenseNumber}
                    onChange={set("licenseNumber")}
                    required
                  />
                </Field>
                <Field label="UPI ID (optional)">
                  <Input
                    value={form.upiId}
                    onChange={set("upiId")}
                    placeholder="yourname@okhdfcbank"
                  />
                </Field>
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Creating…"
                : role === "DRIVER"
                ? "Sign up as driver"
                : "Sign up as passenger"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
