import { Link } from "react-router-dom";
import { Icon, IconName } from "../components/Icon";
import { homePathFor } from "../lib/nav";
import { useAuth } from "../store/auth";

const FEATURES: { title: string; body: string; icon: IconName }[] = [
  {
    title: "Real-time matching",
    body: "Your request reaches every nearby online driver instantly. The first to accept takes the ride.",
    icon: "bolt",
  },
  {
    title: "Live tracking",
    body: "Follow your driver on the map and watch the ride move through each stage in real time.",
    icon: "navigation",
  },
  {
    title: "Schedule ahead",
    body: "Book a ride for later. Drivers can claim it in advance, and it goes live right on time.",
    icon: "eta",
  },
  {
    title: "Verified drivers",
    body: "Every driver is reviewed and approved by an admin before they can pick up passengers.",
    icon: "shield",
  },
  {
    title: "Campus only",
    body: "Sign-ups are gated to institute @iitr.ac.in emails, so you ride with fellow students.",
    icon: "riders",
  },
  {
    title: "Fixed fares",
    body: "Flat ₹10 anywhere on campus and fixed prices to the railway station and bus stand — no surprises.",
    icon: "rupee",
  },
  {
    title: "Ratings & payments",
    body: "Rate drivers after every trip, and pay by UPI QR straight from the ride summary.",
    icon: "star",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Set your trip",
    body: "Pick your pickup point and destination on campus and request a ride.",
  },
  {
    n: "2",
    title: "Get matched",
    body: "A nearby verified driver accepts and heads your way — track them live.",
  },
  {
    n: "3",
    title: "Ride & rate",
    body: "Reach your stop, pay the estimated fare, and leave a rating.",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              R
            </span>
            IITR Rides
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                to={homePathFor(user.role)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50 to-white" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-xs font-medium text-brand-700 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Live e-rickshaw rides across campus
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            IITR rides, the moment you need them
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Request an e-rickshaw, match with a nearby verified driver, and track your
            trip in real time — built for students, by the campus.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Book a ride
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Become a driver
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Students sign up with their <b>@iitr.ac.in</b> email.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900">Everything in one place</h2>
          <p className="mt-2 text-slate-600">
            A complete ride platform — fast matching, live tracking, and trust built in.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name={f.icon} size={20} />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
            <p className="mt-2 text-slate-600">Three steps from request to drop-off.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role CTAs */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <h3 className="text-xl font-semibold text-slate-900">For students</h3>
            <p className="mt-2 text-sm text-slate-600">
              Get where you need to be on campus without the wait. Book, track, and rate —
              all from your phone.
            </p>
            <Link
              to="/register"
              className="mt-5 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Sign up as passenger
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-8 text-white">
            <h3 className="text-xl font-semibold">For drivers</h3>
            <p className="mt-2 text-sm text-slate-300">
              Drive on your schedule. Receive nearby requests in real time and track your
              earnings and ratings. Profiles are admin-verified before going live.
            </p>
            <Link
              to="/register"
              className="mt-5 inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Sign up as driver
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2 font-semibold text-brand-700">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              R
            </span>
            IITR Rides
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-slate-700">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-slate-700">
              Sign up
            </Link>
          </div>
          <p>© {new Date().getFullYear()} IITR Rides</p>
        </div>
      </footer>
    </div>
  );
}
