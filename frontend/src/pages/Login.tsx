import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Field, Input } from "../components/ui";
import { apiError } from "../lib/api";
import { homePathFor } from "../lib/nav";
import { useAuth } from "../store/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(homePathFor(user.role));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-brand-600 font-bold text-white">
            R
          </div>
          <h1 className="text-xl font-semibold">IITR Rides</h1>
          <p className="text-sm text-slate-500">Sign in to book or drive</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@iitr.ac.in"
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link to="/register" className="font-medium text-brand-700">
            Create an account
          </Link>
        </p>

        <div className="mt-6 rounded-lg bg-slate-100 p-3 text-center text-xs leading-relaxed text-slate-500">
          Demo logins — student <b>aarav@iitr.ac.in</b>, driver{" "}
          <b>rohan@campusrides.in</b>, admin <b>admin@iitr.ac.in</b>
          <br />
          password: <b>password123</b>
        </div>
      </div>
    </div>
  );
}
