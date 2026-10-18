import { Link } from "wouter";
import {
  ArrowRight, ShieldCheck, Lock, Brain, Award, Flame, Users, Wallet,
  ArrowLeftRight, QrCode, BadgeCheck, Search, ChevronDown, Star, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type FormEvent } from "react";

// ==========================================================
// Landing page — every number, review and activity item on this
// page comes from the backend. If the backend has nothing, that
// block is hidden. Nothing is invented on the client.
// ==========================================================

type Review = { name: string; text: string; rating: number | null; skill?: string };
type CertSummary = {
  total: number;
  topSkills: { skill: string; count: number }[];
  recent: { certId: string; skill: string; role: string; level: string; dateStr: string }[];
};
type PublicData = {
  totalUsers: number | null;
  activeUsers: number | null;
  sessionsCompleted: number | null;
  ratingAverage: number | null;
  ratingCount: number | null;
};

const heading = { fontFamily: "Outfit, sans-serif" } as const;

const STEPS = [
  { icon: Wallet, title: "Get credits", desc: "New accounts start with credits. You earn more every time you teach a session." },
  { icon: Lock, title: "Book a mentor", desc: "Your credits are held in escrow while the session is booked, so the mentor is paid only when it is done." },
  { icon: ArrowLeftRight, title: "Learn, then release", desc: "After the session you share a 6-digit OTP with the mentor and the credits move to their wallet." },
];

const FEATURES = [
  { icon: ArrowLeftRight, title: "Credits, not cash", desc: "1 credit is 1 minute. Teach something you know and spend what you earn on something you want to learn." },
  { icon: ShieldCheck, title: "Escrow and OTP", desc: "Credits are locked at booking and released only after you confirm the session with an OTP." },
  { icon: Brain, title: "Skill matching", desc: "Tell us what you can teach and what you want to learn. We suggest people whose lists fit yours." },
  { icon: Award, title: "Ratings and badges", desc: "Every session can be rated, so a mentor's profile reflects what they have actually taught." },
  { icon: Flame, title: "Streaks", desc: "Learn or teach on consecutive days to earn bonus credits." },
  { icon: Users, title: "Group classes", desc: "Host a class for several learners at once and earn credits from a single hour of teaching." },
];

const FAQS = [
  { q: "Is SkillSwap free?", a: "Yes. You pay with your time instead of money: teach to earn credits and spend those credits to learn. No card is needed to sign up." },
  { q: "How do I get my first credits?", a: "New accounts get a welcome bonus of credits when they sign up. After that you earn credits by teaching sessions or hosting group classes." },
  { q: "What if I think I have nothing to teach?", a: "A language you speak, a tool you use every day, a sport or a hobby all count. Start with something small and use the credits for bigger skills." },
  { q: "How do escrow and the OTP protect me?", a: "When a session is booked, the learner's credits are held by SkillSwap. After the session the learner shares a 6-digit OTP and only then do the credits go to the mentor." },
  { q: "What if the mentor doesn't show up?", a: "Don't share the OTP and raise a dispute from the session. Our team reviews it and refunds your credits if the session did not happen." },
];

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      ))}
    </span>
  );
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [data, setData] = useState<PublicData>({
    totalUsers: null, activeUsers: null, sessionsCompleted: null, ratingAverage: null, ratingCount: null,
  });
  const [liveActivity, setLiveActivity] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [certs, setCerts] = useState<CertSummary | null>(null);
  const [verifyId, setVerifyId] = useState("");

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || "";
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/landing`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success || !json.data) return;
        const d = json.data;
        setData({
          totalUsers: num(d.totalUsers),
          activeUsers: num(d.activeUsers),
          sessionsCompleted: num(d.completedSessions),
          ratingAverage: num(d.ratingAverage),
          ratingCount: num(d.ratingCount),
        });
        if (Array.isArray(d.liveExchanges)) {
          setLiveActivity(d.liveExchanges.filter((x: unknown) => typeof x === "string" && (x as string).trim()).slice(0, 4));
        }
        if (Array.isArray(d.recentReviews)) {
          setReviews(
            d.recentReviews
              .map((r: any) => ({
                name: String(r.name || "SkillSwap member"),
                text: String(r.text || r.comment || "").trim(),
                rating: num(r.rating),
                skill: r.skill ? String(r.skill) : undefined,
              }))
              .filter((r: Review) => r.text.length > 0)
              .slice(0, 4)
          );
        }
      } catch { /* leave everything empty */ }
    })();

    (async () => {
      try {
        const r = await fetch(`${API}/api/certificates/public/summary`);
        if (r.ok && !cancelled) setCerts(await r.json());
      } catch { /* empty state */ }
    })();

    return () => { cancelled = true; };
  }, []);

  const facts = [
    data.totalUsers && data.totalUsers > 0 ? { label: "members", value: data.totalUsers.toLocaleString() } : null,
    data.activeUsers && data.activeUsers > 0 ? { label: "active this month", value: data.activeUsers.toLocaleString() } : null,
    data.sessionsCompleted && data.sessionsCompleted > 0 ? { label: "sessions completed", value: data.sessionsCompleted.toLocaleString() } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const hasRating = !!data.ratingCount && data.ratingCount > 0 && data.ratingAverage !== null;

  const goVerify = (e: FormEvent) => {
    e.preventDefault();
    const id = verifyId.trim().toUpperCase();
    if (id) window.location.href = `/verify.html?id=${encodeURIComponent(id)}`;
  };

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 bg-white text-slate-900">

      {/* ================= HERO ================= */}
      <section className="px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28 bg-gradient-to-b from-indigo-50/60 to-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-14 items-center">
          <div>
            <h1 style={heading} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
              Learn a skill by<br className="hidden sm:block" /> teaching one.
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
              SkillSwap is a peer-to-peer platform where you earn credits by teaching and spend them learning from other people.
              One credit is one minute. No money changes hands.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/register">
                <Button className="h-12 px-7 rounded-xl text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
                  Create free account <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 px-7 rounded-xl text-base font-semibold"
              >
                How it works
              </Button>
            </div>
            <p className="mt-4 text-sm text-slate-500">Free to join. No card required.</p>

            {(facts.length > 0 || hasRating) && (
              <dl className="mt-10 pt-6 border-t border-slate-200 flex flex-wrap gap-x-10 gap-y-4">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="sr-only">{f.label}</dt>
                    <dd className="text-2xl font-bold text-slate-900 leading-none">{f.value}</dd>
                    <p className="text-sm text-slate-500 mt-1">{f.label}</p>
                  </div>
                ))}
                {hasRating && (
                  <div>
                    <dd className="flex items-center gap-2 leading-none">
                      <span className="text-2xl font-bold text-slate-900">{data.ratingAverage!.toFixed(1)}</span>
                      <Stars value={data.ratingAverage!} />
                    </dd>
                    <p className="text-sm text-slate-500 mt-1">from {data.ratingCount!.toLocaleString()} {data.ratingCount === 1 ? "review" : "reviews"}</p>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Right: explainer + real recent activity */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-slate-900">How credits move</h2>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">Example</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Teach Hindi for 30 min</span>
                  <span className="text-sm font-bold text-emerald-700">+30 credits</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">Learn React for 30 min</span>
                  <span className="text-sm font-bold text-indigo-700">&minus;30 credits</span>
                </div>
              </div>
            </div>

            {liveActivity.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Recent on SkillSwap
                </h2>
                <ul className="space-y-3">
                  {liveActivity.map((t, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span className="leading-5">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 py-20 scroll-mt-4">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight">How it works</h2>
            <p className="mt-3 text-slate-600 text-lg">Three steps, and every session is protected by escrow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <s.icon className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-bold text-slate-400">Step {i + 1}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight">What you get</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-[15px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CERTIFICATES ================= */}
      <section id="certificates" className="px-4 sm:px-6 lg:px-8 py-20 scroll-mt-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-4">
              <BadgeCheck className="w-5 h-5" /> Verifiable certificates
            </p>
            <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              A certificate anyone can check.
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed mb-6">
              Each certificate has a unique ID and a QR code. Scan it, or type the ID below, and SkillSwap confirms whether it is genuine.
              The record is signed on our server, so an edited certificate will not verify.
            </p>

            <ul className="space-y-2.5 mb-8">
              {["Works on any phone, no app needed", "Separate certificates for learners and mentors", "Revoked certificates show as revoked"].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-slate-700">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" /> {t}
                </li>
              ))}
            </ul>

            {certs && certs.total > 0 && (
              <p className="mb-6 text-slate-600">
                <span className="text-2xl font-bold text-slate-900">{certs.total.toLocaleString()}</span> certificate{certs.total === 1 ? "" : "s"} issued so far
                {certs.topSkills.length > 0 && <> &middot; most in <span className="font-semibold text-slate-800">{certs.topSkills[0].skill}</span></>}
              </p>
            )}

            <a href="/certificate.html" className="inline-block mb-6">
              <Button className="h-12 px-6 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
                Get your certificate <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>

            <form onSubmit={goVerify} className="flex gap-2 max-w-md" aria-label="Verify a certificate">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={verifyId}
                  onChange={(e) => setVerifyId(e.target.value)}
                  placeholder="Enter certificate ID"
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-300 bg-white text-sm font-medium uppercase placeholder:normal-case focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <Button type="submit" variant="outline" className="h-11 rounded-xl font-semibold">Verify</Button>
            </form>
          </div>

          <div>
            {certs && certs.recent.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-slate-500 mb-3">Recently issued</p>
                <div className="rounded-2xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
                  {certs.recent.slice(0, 5).map((c) => (
                    <a key={c.certId} href={`/verify.html?id=${encodeURIComponent(c.certId)}`}
                       className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{c.skill}</p>
                        <p className="text-sm text-slate-500">{c.level} &middot; {c.role === "teacher" ? "Mentor" : "Learner"} &middot; {c.dateStr}</p>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700 flex-shrink-0">
                        <BadgeCheck className="w-4 h-4" /> Verify
                      </span>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
                <div className="flex items-center gap-4">
                  <span className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center"><QrCode className="w-8 h-8" /></span>
                  <div>
                    <p className="font-bold text-slate-900">Every certificate carries a QR code</p>
                    <p className="text-sm text-slate-600">Scanning it opens the verification page with the holder, skill and issue date.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= REVIEWS (real only) ================= */}
      {reviews.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-slate-50 border-y border-slate-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
              <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight">What members say</h2>
              {hasRating && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Stars value={data.ratingAverage!} />
                  <span className="font-semibold text-slate-900">{data.ratingAverage!.toFixed(1)}</span>
                  from {data.ratingCount!.toLocaleString()} {data.ratingCount === 1 ? "review" : "reviews"}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.map((r, i) => (
                <figure key={i} className="rounded-2xl bg-white border border-slate-200 p-7">
                  {r.rating !== null && <div className="mb-3"><Stars value={r.rating} /></div>}
                  <blockquote className="text-slate-700 leading-relaxed">&ldquo;{r.text}&rdquo;</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                      {r.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-sm">
                      <span className="font-semibold text-slate-900">{r.name}</span>
                      {r.skill && <span className="text-slate-500"> &middot; {r.skill}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= FAQ ================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 style={heading} className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-8">Questions</h2>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQS.map((f, i) => (
              <div key={f.q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="font-semibold text-lg text-slate-900">{f.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && <p className="pb-6 -mt-1 text-slate-600 leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2 style={heading} className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Start with what you already know.
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            {data.totalUsers && data.totalUsers > 0
              ? `${data.totalUsers.toLocaleString()} members are already swapping skills.`
              : "Teach one skill, learn another."}
          </p>
          <Link href="/register">
            <Button className="mt-8 h-12 px-8 rounded-xl text-base font-semibold bg-white text-slate-900 hover:bg-slate-100">
              Create free account <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
