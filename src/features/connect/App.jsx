
import { useCallback, useEffect, useState } from "react";
import {
  Switch,
  Route,
  Link,
  useLocation,
  useRoute,
} from "wouter";

import { useAuthStore } from "@/store/auth";
import { api } from "./services/api";
import { JitsiMeeting } from "@jitsi/react-sdk";

import {
  Activity,
  CalendarDays,
  Compass,
  PlusCircle,
  Inbox,
  Bell,
  Settings,
  LayoutDashboard,
  ArrowUpRight,
  Clock3,
  Users,
  MapPin,
  Search,
  Sun,
  Moon,
  LogIn,
  Video,
  ChevronRight,
  Ticket,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Send,
  MessageCircle,
  ChevronLeft,
} from "lucide-react";

import "./styles.css";

// =====================================================
// CONSTANTS
// =====================================================

const NAV_ITEMS = [
  ["/connect", "Overview", LayoutDashboard],
  ["/connect/explore", "Explore", Compass],
  ["/connect/create", "Create activity", PlusCircle],
  ["/connect/my-activities", "My activities", Activity],
  ["/connect/bookings", "Bookings", Ticket],
  ["/connect/calendar", "Calendar", CalendarDays],
  ["/connect/inbox", "Inbox", Inbox],
  ["/connect/notifications", "Notifications", Bell],
  ["/connect/settings", "Settings", Settings],
];

const CATEGORIES = [
  "Technology",
  "Career",
  "Design",
  "Business",
  "Education",
  "Community",
  "Other",
];

const CATEGORY_COVERS = {
  Technology: "/connect-assets/cover-technology.svg",
  Career: "/connect-assets/cover-career.svg",
  Design: "/connect-assets/cover-design.svg",
  Business: "/connect-assets/cover-business.svg",
  Education: "/connect-assets/cover-education.svg",
  Community: "/connect-assets/cover-community.svg",
  Other: "/connect-assets/cover-ideas.svg",
};

const getActivityCover = (item) =>
  item?.cover_image_url ||
  CATEGORY_COVERS[item?.category] ||
  CATEGORY_COVERS.Other;

const EMPTY_ARRAY = [];

// =====================================================
// HELPERS
// =====================================================

function formatDate(value, includeTime = false) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" } : {}),
  });
}

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function getItems(response) {
  return Array.isArray(response?.items)
    ? response.items
    : [];
}

function useAsyncAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async (callback) => {
    if (busy) return null;

    setBusy(true);
    setError("");

    try {
      return await callback();
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  return { busy, error, setError, run };
}

// =====================================================
// REUSABLE UI
// =====================================================

function ErrorMessage({ children, onRetry }) {
  if (!children) return null;

  return (
    <div className="error" role="alert">
      <span>{children}</span>

      {onRetry && (
        <button type="button" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

function LoadingState({ message = "Loading..." }) {
  return (
    <div className="empty" role="status">
      {message}
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Compass />
      </div>

      <h3>{title}</h3>

      {description && <p>{description}</p>}

      {action}
    </div>
  );
}

function PageHead({ eyebrow, title, sub, action }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>

      {action}
    </div>
  );
}

// =====================================================
// APPLICATION SHELL
// =====================================================

function Shell({ children }) {
  const [location] = useLocation();
  const [dark, setDark] = useState(false);
  const user = useAuthStore((state) => state.user);
  const displayName = user?.name || user?.fullName || user?.email?.split("@")[0] || "SkillSwap member";
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="connect-root">
      <div className={dark ? "app dark" : "app light"}>
        <aside className="sidebar">
          <Link href="/connect" className="brand">
            <span className="brand-mark" aria-label="SkillSwap">
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <defs><linearGradient id="ssMark" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8B6CFF"/><stop offset="1" stopColor="#5B3FE4"/></linearGradient></defs>
                <rect width="40" height="40" rx="13" fill="url(#ssMark)"/>
                <path d="M25.8 11.8c-1.7-1.3-3.6-1.9-5.9-1.9-4.5 0-7.6 2.5-7.6 6.1 0 3.4 2.3 5 7 6l2.6.6c2.2.5 3.1 1.2 3.1 2.4 0 1.5-1.5 2.5-3.9 2.5-2.6 0-4.8-1-6.7-2.9l-3.4 3.5c2.6 2.7 5.9 4 10 4 5.6 0 9.3-2.8 9.3-7.3 0-3.5-2.2-5.4-7-6.5l-2.8-.7c-2-.4-2.8-1-2.8-2.1 0-1.2 1.2-2 3.1-2 1.8 0 3.4.6 4.9 1.8z" fill="white"/>
              </svg>
            </span>

            <span>
              skillswap
              <span className="brand-sub">CONNECT</span>
            </span>
          </Link>

          <div className="side-label">WORKSPACE</div>

          {NAV_ITEMS.map(([to, label, Icon]) => {
            const active =
              location === to ||
              (to !== "/connect" && location.startsWith(to));

            return (
              <Link
                key={to}
                href={to}
                className={`nav-item ${active ? "active" : ""}`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}

          <div className="side-bottom">
            <div className="profile">
              <div className="avatar">
                {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
              </div>

              <div>
                <b>{displayName}</b>
                <small>{user?.email || "SkillSwap member"}</small>
              </div>
            </div>

            <button
              type="button"
              className="theme-toggle"
              onClick={() => setDark((value) => !value)}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
              Switch theme
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="crumb">
              Workspace
              <ChevronRight size={14} />
              <b>Connect</b>
            </div>

            <div className="top-actions">
              <span className="live-pill">
                <i /> Connect workspace
              </span>

              <Link
                className="icon-btn"
                href="/connect/notifications"
                title="Notifications"
              >
                <Bell size={18} />
              </Link>

              <div className="avatar small">
                {user?.avatar ? <img src={user.avatar} alt="" /> : initials}
              </div>
            </div>
          </header>

          <div className="content">{children}</div>
        </main>
      </div>
    </div>
  );
}

// =====================================================
// ACTIVITY CARD
// =====================================================

function ActivityCard({ item }) {
  return (
    <Link
      className="activity-card"
      href={`/connect/events/${encodeURIComponent(item.slug)}`}
    >
      <div
        className="cover"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(3,24,21,.05), rgba(3,24,21,.82)), url("${getActivityCover(item)}")`,
        }}
      >
        <span className="category-tag">{item.category}</span>
        {!item.cover_image_url && (
          <span className="cover-art-mark" aria-hidden="true">
            {({ Technology: "⌘", Design: "✦", Career: "↗", Business: "◇", Education: "✎", Community: "◎" })[item.category] || "✳"}
          </span>
        )}
        <span className="format-tag">{item.format}</span>
      </div>

      <div className="card-body">
        <h3>{item.title}</h3>

        <p>
          {(item.description || "").slice(0, 105)}
          {item.description?.length > 105 ? "…" : ""}
        </p>

        <div className="card-meta">
          <span>
            <CalendarDays size={14} />
            {formatDate(item.start_at)}
          </span>

          <span>
            <Users size={14} />
            {item.seats_remaining ?? item.max_seats ?? 0} seats
          </span>
        </div>

        <div className="card-foot">
          <span className="host-label">
            Hosted on SkillSwap Connect
          </span>

          <ArrowUpRight size={16} />
        </div>
      </div>
    </Link>
  );
}

// =====================================================
// OVERVIEW
// =====================================================

function Overview() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [items, setItems] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");

    try {
      const response = await api("/activities", { signal });
      setItems(getItems(response));
      if (token) {
        try {
          const bookingResponse = await api("/me/bookings", { signal });
          if (!signal?.aborted) setMyBookings(getItems(bookingResponse));
        } catch (bookingError) {
          if (bookingError.name !== "AbortError") setMyBookings([]);
        }
      } else {
        setMyBookings([]);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(getErrorMessage(err));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();

    load(controller.signal);

    return () => controller.abort();
  }, [load]);

  return (
    <>
      <PageHead
        eyebrow="YOUR KNOWLEDGE NETWORK"
        title={(user?.name || user?.fullName) ? `Hello, ${user.name || user.fullName} 👋` : "Make knowledge move."}
        sub="Ready to share something new? Discover people, sessions and ideas worth sharing."
        action={
          <Link className="btn primary" href="/connect/create">
            <PlusCircle size={17} />
            Create activity
          </Link>
        }
      />

      <section className="connect-stats" aria-label="Activity overview">
        <article className="stat-card stat-green">
          <span>Published activities</span>
          <strong>{items.length}</strong>
          <small>Discover what's happening</small>
          <Activity size={20} />
        </article>
        <article className="stat-card stat-blue">
          <span>Skill categories</span>
          <strong>{new Set(items.map((item) => item.category).filter(Boolean)).size}</strong>
          <small>Knowledge areas</small>
          <Compass size={20} />
        </article>
        <article className="stat-card stat-teal">
          <span>Online sessions</span>
          <strong>{items.filter((item) => item.format === "online").length}</strong>
          <small>Learn from anywhere</small>
          <Video size={20} />
        </article>
        <article className="stat-card stat-violet">
          <span>Free activities</span>
          <strong>{items.filter((item) => item.price_type !== "credits").length}</strong>
          <small>Open to everyone</small>
          <Users size={20} />
        </article>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            THE WORLD IS YOUR CLASSROOM
          </span>

          <h2>
            Share what you know.
            <br />
            <em>Learn what you don't.</em>
          </h2>

          <p>
            Host a workshop, find a mentor, build a team
            or start a conversation. Your next connection
            starts here.
          </p>

          <div className="hero-actions">
            <Link className="btn white" href="/connect/explore">
              Explore activities <ArrowUpRight size={16} />
            </Link>

            <Link className="text-link" href="/connect/create">
              Become a host <ChevronRight size={15} />
            </Link>
          </div>
        </div>

        <div className="hero-art">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit-core">✳</div>

          <div className="float-card float-top">
            <span className="float-icon">✦</span>
            <span>
              <b>Share skills</b>
              <small>Grow together</small>
            </span>
          </div>

          <div className="float-card float-bottom">
            <span className="avatar">AI</span>
            <span>
              <b>New connections</b>
              <small>Across the globe</small>
            </span>
          </div>
        </div>
      </section>

      <div className="section-head">
        <div>
          <div className="eyebrow">CURATED FOR YOU</div>
          <h2>Upcoming activities</h2>
        </div>

        <Link className="subtle-link" href="/connect/explore">
          View all <ArrowUpRight size={15} />
        </Link>
      </div>

      {loading ? (
        <LoadingState message="Loading activities..." />
      ) : error ? (
        <ErrorMessage
          onRetry={() => load()}
        >
          {error}
        </ErrorMessage>
      ) : items.length ? (
        <div className="activity-grid">
          {items.slice(0, 3).map((item) => (
            <ActivityCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your next big idea starts with a first event."
          description="There are no published activities yet. Create one and invite the world."
          action={
            <Link className="btn primary" href="/connect/create">
              Create your first activity
            </Link>
          }
        />
      )}

      <div className="dashboard-bottom">
        <section className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div><span className="eyebrow">YOUR SCHEDULE</span><h3>Upcoming sessions</h3></div>
            <Link className="subtle-link" href="/connect/calendar">Calendar <ArrowUpRight size={14}/></Link>
          </div>
          {myBookings.filter((booking) => booking.status === "confirmed").slice(0, 3).map((booking) => (
            <div className="dashboard-list-row" key={booking.id}>
              <span className="dashboard-list-icon"><CalendarDays size={16}/></span>
              <div><strong>{booking.title}</strong><small>{formatDate(booking.requested_start_at, true)}</small></div>
              <Link className="dashboard-join" href={`/connect/meetings/${encodeURIComponent(booking.id)}`}>Join</Link>
            </div>
          ))}
          {!myBookings.some((booking) => booking.status === "confirmed") && (
            <div className="dashboard-empty">{token ? "Your confirmed sessions will appear here." : "Sign in to see your upcoming sessions."}</div>
          )}
        </section>
        <section className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div><span className="eyebrow">LATEST UPDATES</span><h3>Recent activity</h3></div>
            <Link className="subtle-link" href="/connect/notifications">View all <ArrowUpRight size={14}/></Link>
          </div>
          {myBookings.slice(0, 3).map((booking) => (
            <div className="dashboard-list-row" key={booking.id}>
              <span className="dashboard-list-icon"><Users size={16}/></span>
              <div><strong>{booking.title}</strong><small>{booking.is_host ? "You hosted a session" : "You booked a session"} · {booking.status}</small></div>
              <span className={`status ${booking.status}`}>{booking.status}</span>
            </div>
          ))}
          {!myBookings.length && <div className="dashboard-empty">Your booking updates will appear here as you connect with learners and hosts.</div>}
        </section>
      </div>
    </>
  );
}

// =====================================================
// EXPLORE
// =====================================================

function Explore() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        search,
        category,
      });

      const response = await api(
        `/activities?${params.toString()}`
      );

      setItems(getItems(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHead
        eyebrow="DISCOVER"
        title="Explore activities"
        sub="Find a session, share an idea or meet your next collaborator."
      />

      <div className="filterbar">
        <div className="searchbox">
          <Search size={17} />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") load();
            }}
            placeholder="Search topics, skills or hosts"
          />
        </div>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories</option>

          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          className="btn secondary"
          type="button"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <ErrorMessage>{error}</ErrorMessage>

      {loading ? (
        <LoadingState message="Searching activities..." />
      ) : items.length ? (
        <div className="activity-grid">
          {items.map((item) => (
            <ActivityCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No activities found"
          description="Try another search term or category."
        />
      )}
    </>
  );
}

// =====================================================
// CREATE ACTIVITY
// =====================================================

function Create() {
  const [, navigate] = useLocation();
  const { busy, error, setError, run } = useAsyncAction();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Technology",
    format: "online",
    startAt: "",
    durationMinutes: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    maxSeats: 20,
    bookingType: "instant",
    priceType: "free",
    priceCredits: 0,
  });

  function change(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      if (form.title.trim().length < 5) return "Enter a title with at least 5 characters.";
      if (form.description.trim().length < 20) return "Add a description of at least 20 characters.";
    }
    if (currentStep === 2) {
      const startDate = new Date(form.startAt);
      if (!form.startAt || Number.isNaN(startDate.getTime())) return "Choose a valid date and time.";
      if (startDate.getTime() <= Date.now()) return "Activity start time must be in the future.";
      if (Number(form.durationMinutes) < 10) return "Duration must be at least 10 minutes.";
    }
    if (currentStep === 3) {
      if (Number(form.maxSeats) < 1) return "At least one seat is required.";
      if (form.bookingType === "one_to_one" && Number(form.maxSeats) !== 1) return "One-to-one activities must have exactly one seat.";
    }
    return "";
  }

  function nextStep() {
    const message = validateStep(step);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setStep((value) => Math.min(4, value + 1));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const message = validateStep(1) || validateStep(2) || validateStep(3);
    if (message) {
      setError(message);
      return;
    }
    const startDate = new Date(form.startAt);
    await run(async () => {
      await api("/activities", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          startAt: startDate.toISOString(),
          durationMinutes: Number(form.durationMinutes),
          maxSeats: Number(form.maxSeats),
          priceCredits: Number(form.priceCredits),
        }),
      });
      navigate("/connect/my-activities");
    });
  }

  const steps = ["Details", "Schedule", "Settings", "Preview"];

  return (
    <>
      <PageHead
        eyebrow="HOST SOMETHING"
        title="Create an activity"
        sub="Turn your knowledge into a session people can learn from."
      />

      <div className="wizard-progress" aria-label="Activity creation progress">
        {steps.map((label, index) => {
          const number = index + 1;
          return (
            <div className={`wizard-step ${step === number ? "current" : ""} ${step > number ? "complete" : ""}`} key={label}>
              <span>{step > number ? <CheckCircle2 size={17} /> : number}</span>
              <small>{label}</small>
            </div>
          );
        })}
      </div>

      <form className="form-card wizard-card" onSubmit={submit}>
        {step === 1 && (
          <div className="form-section">
            <div className="wizard-section-heading">
              <span className="wizard-kicker">STEP 01 / 04</span>
              <h3>Activity details</h3>
              <p>Give learners a clear idea of what you will share.</p>
            </div>
            <label>
              Activity title *
              <input required minLength={5} maxLength={140} name="title" value={form.title} onChange={change} placeholder="e.g. React Crash Course" />
            </label>
            <label>
              Description *
              <textarea required minLength={20} maxLength={12000} name="description" value={form.description} onChange={change} rows={5} placeholder="Explain what you will teach, who it is for, and what learners will gain..." />
            </label>
            <div className="form-row">
              <label>
                Category *
                <select name="category" value={form.category} onChange={change}>
                  {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                Format *
                <select name="format" value={form.format} onChange={change}>
                  <option value="online">Online</option>
                  <option value="offline">In person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-section">
            <div className="wizard-section-heading">
              <span className="wizard-kicker">STEP 02 / 04</span>
              <h3>Schedule your session</h3>
              <p>Choose a time that works for your future learners.</p>
            </div>
            <div className="form-row">
              <label>
                Start date and time *
                <input required type="datetime-local" name="startAt" value={form.startAt} onChange={change} />
              </label>
              <label>
                Duration (minutes) *
                <input required type="number" min={10} max={1440} name="durationMinutes" value={form.durationMinutes} onChange={change} />
              </label>
            </div>
            <label>
              Timezone *
              <input required name="timezone" value={form.timezone} onChange={change} />
            </label>
            <div className="wizard-tip">
              <CalendarDays size={18} />
              <span>Your activity will be displayed in the learner's local timezone.</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-section">
            <div className="wizard-section-heading">
              <span className="wizard-kicker">STEP 03 / 04</span>
              <h3>Booking settings</h3>
              <p>Control how learners can join your activity.</p>
            </div>
            <div className="form-row">
              <label>
                Maximum seats *
                <input required type="number" min={1} max={10000} name="maxSeats" value={form.maxSeats} onChange={change} />
              </label>
              <label>
                Booking method
                <select name="bookingType" value={form.bookingType} onChange={change}>
                  <option value="instant">Instant confirmation</option>
                  <option value="host_approval">Host approval</option>
                  <option value="one_to_one">One-to-one</option>
                  <option value="group">Group registration</option>
                  <option value="limited_seat">Limited seats</option>
                </select>
              </label>
            </div>
            <label>
              Access type
              <select name="priceType" value={form.priceType} onChange={change}>
                <option value="free">Free</option>
                <option value="credits" disabled>SkillSwap credits (not enabled yet)</option>
              </select>
            </label>
            <div className="wizard-tip">
              <ShieldAlert size={18} />
              <span>Credit-priced bookings remain disabled until the secure SkillSwap credit ledger integration is verified.</span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-section preview-section">
            <div className="wizard-section-heading">
              <span className="wizard-kicker">STEP 04 / 04</span>
              <h3>Review your activity</h3>
              <p>Check the details before saving it as a draft.</p>
            </div>
            <div className="activity-preview">
              <div className="preview-cover"><span>{form.category}</span><span>{form.format}</span></div>
              <div className="preview-body">
                <h2>{form.title || "Your activity title"}</h2>
                <p>{form.description || "Your activity description will appear here."}</p>
                <div className="preview-meta">
                  <span><CalendarDays size={15} />{form.startAt ? new Date(form.startAt).toLocaleString() : "Schedule not set"}</span>
                  <span><Clock3 size={15} />{form.durationMinutes} minutes</span>
                  <span><Users size={15} />{form.maxSeats} seats</span>
                </div>
                <div className="preview-footer">
                  <span className="status">Free activity</span>
                  <span className="muted">Saved privately as a draft</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <ErrorMessage>{error}</ErrorMessage>
        <div className="wizard-actions">
          <button className="btn secondary" type="button" disabled={step === 1 || busy} onClick={() => { setError(""); setStep((value) => Math.max(1, value - 1)); }}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className="muted">Your activity is saved as a private draft.</span>
          {step < 4 ? (
            <button className="btn primary" type="button" onClick={nextStep}>
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn primary" disabled={busy} type="submit">
              {busy ? "Saving..." : "Save draft"} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </form>
    </>
  );
}

// =====================================================
// EVENT DETAILS
// =====================================================

function Event() {
  const [, params] = useRoute("/connect/events/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug;
  const token = useAuthStore((state) => state.token);

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingBusy, setBookingBusy] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    setLoading(true);
    setError("");

    api(`/activities/${encodeURIComponent(slug)}`, {
      signal: controller.signal,
    })
      .then(setItem)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug]);

  async function book() {
    if (!item || bookingBusy) return;

    if (!token) {
      navigate("/login");
      return;
    }

    setBookingBusy(true);
    setBookingMessage("");
    setError("");

    try {
      const response = await api(
        `/activities/${encodeURIComponent(item.id)}/bookings`,
        {
          method: "POST",
          body: JSON.stringify({ seats: 1 }),
        }
      );

      setBookingMessage(
        response?.status === "confirmed"
          ? "Your booking is confirmed. You can find it in Bookings."
          : "Your booking request was sent to the host."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBookingBusy(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading activity..." />;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!item) {
    return <EmptyState title="Activity not found" />;
  }

  return (
    <>
      <div
        className="event-cover"
        style={{
          backgroundImage: `linear-gradient(0deg, rgba(3,24,21,.82), rgba(3,24,21,.04)), url("${getActivityCover(item)}")`,
        }}
      />

      {bookingMessage && (
        <div className="connect-success" role="status">
          <CheckCircle2 size={17} />
          <span>{bookingMessage}</span>
        </div>
      )}

      <div className="event-layout">
        <div>
          <span className="category-tag">{item.category}</span>

          <h1>{item.title}</h1>

          <p className="event-desc">{item.description}</p>

          <h3>About this activity</h3>
          <p>{item.description}</p>

          {item.agenda?.length > 0 && (
            <>
              <h3>Agenda</h3>

              {item.agenda.map((entry, index) => (
                <p key={`${entry.title}-${index}`}>
                  • {entry.title}
                  {entry.description
                    ? ` — ${entry.description}`
                    : ""}
                </p>
              ))}
            </>
          )}
        </div>

        <aside className="booking-panel">
          <div className="eyebrow">SESSION DETAILS</div>

          <h2>{formatDate(item.start_at, true)}</h2>

          <p>
            <Clock3 size={15} />
            {item.duration_minutes} minutes
          </p>

          <p>
            <Users size={15} />
            {item.seats_remaining ?? item.max_seats} seats remaining
          </p>

          <p>
            <MapPin size={15} />
            {item.format}
          </p>

          <button
            className="btn primary full"
            onClick={book}
            disabled={bookingBusy}
          >
            {bookingBusy ? "Registering..." : "Register now"}
            <ArrowUpRight size={16} />
          </button>

          <small>
            Registration requires your SkillSwap account.
          </small>
        </aside>
      </div>
    </>
  );
}

// =====================================================
// MY ACTIVITIES
// =====================================================

function MyActivities() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api("/me/activities");
      setItems(getItems(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function action(id, actionName) {
    if (busyId) return;

    setBusyId(id);
    setError("");

    try {
      await api(
        `/activities/${encodeURIComponent(id)}/${actionName}`,
        { method: "POST" }
      );

      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHead
        eyebrow="HOST STUDIO"
        title="My activities"
        sub="Manage drafts and published activities."
        action={
          <Link className="btn primary" href="/connect/create">
            <PlusCircle size={16} /> New activity
          </Link>
        }
      />

      <div className="segmented-tabs" role="tablist" aria-label="Activity status">
        {["all", "upcoming", "ongoing", "completed", "draft"].map((value) => {
          const count = items.filter((item) => {
            const start = new Date(item.start_at).getTime();
            const end = start + Number(item.duration_minutes || 60) * 60000;
            if (value === "all") return true;
            if (value === "draft") return ["draft", "unpublished"].includes(item.status);
            if (value === "upcoming") return item.status === "published" && start > Date.now();
            if (value === "ongoing") return item.status === "published" && start <= Date.now() && end > Date.now();
            return (item.status === "published" && end <= Date.now()) || item.status === "completed";
          }).length;
          return <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>
            {value[0].toUpperCase() + value.slice(1)} <span>{count}</span>
          </button>;
        })}
      </div>
      <ErrorMessage onRetry={load}>{error}</ErrorMessage>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="table-card">
          {items.filter((item) => {
            const start = new Date(item.start_at).getTime();
            const end = start + Number(item.duration_minutes || 60) * 60000;
            if (filter === "all") return true;
            if (filter === "draft") return ["draft", "unpublished"].includes(item.status);
            if (filter === "upcoming") return item.status === "published" && start > Date.now();
            if (filter === "ongoing") return item.status === "published" && start <= Date.now() && end > Date.now();
            return (item.status === "published" && end <= Date.now()) || item.status === "completed";
          }).map((item) => (
            <div className="table-row" key={item.id}>
              <div>
                <b>{item.title}</b>
                <small>
                  {item.status} · {formatDate(item.start_at, true)}
                </small>
              </div>

              <div className="row-actions">
                {item.status === "draft" ||
                item.status === "unpublished" ? (
                  <button
                    disabled={busyId === item.id}
                    onClick={() => action(item.id, "publish")}
                  >
                    Publish
                  </button>
                ) : item.status === "published" ? (
                  <button
                    disabled={busyId === item.id}
                    onClick={() => action(item.id, "unpublish")}
                  >
                    Unpublish
                  </button>
                ) : null}

                <Link href={`/connect/events/${encodeURIComponent(item.slug)}`}>
                  Preview
                </Link>
              </div>
            </div>
          ))}

          {!items.length && (
            <EmptyState title="Your activities will appear here." />
          )}
        </div>
      )}
    </>
  );
}

// =====================================================
// BOOKINGS
// =====================================================

function Bookings() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("received");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api("/me/bookings");
      setItems(getItems(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id, action) {
    if (busyId) return;
    setBusyId(id);
    setError("");
    try {
      await api(`/bookings/${encodeURIComponent(id)}/${action}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const received = items.filter((booking) => booking.is_host);
  const sent = items.filter((booking) => !booking.is_host);
  const visible = tab === "received" ? received : sent;

  return (
    <>
      <PageHead
        eyebrow="YOUR SCHEDULE"
        title="Bookings"
        sub="Manage the sessions you're hosting and the ones you've booked."
      />
      <div className="segmented-tabs" role="tablist" aria-label="Booking direction">
        <button type="button" role="tab" aria-selected={tab === "received"} className={tab === "received" ? "selected" : ""} onClick={() => setTab("received")}>
          Received <span>{received.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "sent"} className={tab === "sent" ? "selected" : ""} onClick={() => setTab("sent")}>
          Sent <span>{sent.length}</span>
        </button>
      </div>
      <ErrorMessage onRetry={load}>{error}</ErrorMessage>
      {loading ? <LoadingState /> : (
        <div className="booking-list">
          {visible.map((booking) => (
            <article className="booking-card" key={booking.id}>
              <div className="booking-avatar">{(booking.title || "S").slice(0, 1).toUpperCase()}</div>
              <div className="booking-main">
                <strong>{booking.title}</strong>
                <small>{tab === "received" ? "Learner booking" : "Your booking"} · {formatDate(booking.requested_start_at, true)}</small>
                <small>{booking.seats} seat(s) · {booking.format || "Session"}</small>
              </div>
              <span className={`status ${booking.status}`}>{booking.status}</span>
              <div className="row-actions">
                {tab === "received" && booking.status === "pending" && (
                  <>
                    <button disabled={busyId === booking.id} onClick={() => act(booking.id, "approve")}>Approve</button>
                    <button disabled={busyId === booking.id} onClick={() => act(booking.id, "reject")}>Reject</button>
                  </>
                )}
                {booking.status === "confirmed" && (
                  <Link className="btn primary" href={`/connect/meetings/${encodeURIComponent(booking.id)}`}>
                    <Video size={15} /> Join
                  </Link>
                )}
                {["pending", "confirmed"].includes(booking.status) && (
                  <button disabled={busyId === booking.id} onClick={() => act(booking.id, "cancel")}>Cancel</button>
                )}
              </div>
            </article>
          ))}
          {!visible.length && <EmptyState title={tab === "received" ? "No bookings received yet." : "You haven't booked a session yet."} description={tab === "received" ? "New learner requests will appear here." : "Explore activities and book a session to get started."} action={tab === "sent" ? <Link className="btn primary" href="/connect/explore">Explore activities</Link> : null} />}
        </div>
      )}
    </>
  );
}

// =====================================================
// CALENDAR
// =====================================================

function Calendar() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date());
  const [view, setView] = useState("month");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api("/me/calendar");
      setItems(getItems(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function exportIcs() {
    try {
      const response = await api("/me/calendar.ics");
      const content = typeof response === "string" ? response : response?.data || "";
      if (!content) throw new Error("Calendar export returned empty data.");
      const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "skillswap-connect.ics";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) { setError(getErrorMessage(err)); }
  }

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - monthStart.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dateOf = (item) => new Date(item.requested_start_at || item.start_at);
  const monthItems = items.filter((item) => {
    const date = dateOf(item);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  });
  const today = new Date();

  return (
    <>
      <PageHead
        eyebrow="PLAN AHEAD"
        title="Calendar"
        sub="Your confirmed sessions and upcoming activities."
        action={<button className="btn secondary" onClick={exportIcs} type="button">Export ICS</button>}
      />
      <ErrorMessage onRetry={load}>{error}</ErrorMessage>
      <div className="calendar-toolbar">
        <button className="btn secondary" type="button" onClick={() => setMonth(new Date())}>Today</button>
        <div className="calendar-month-nav">
          <button aria-label="Previous month" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={17}/></button>
          <strong>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button aria-label="Next month" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={17}/></button>
        </div>
        <div className="view-switch">
          {["month", "week", "day"].map((item) => <button key={item} type="button" className={view === item ? "active" : ""} onClick={() => setView(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
        </div>
      </div>
      {loading ? <LoadingState /> : (
        <div className="calendar-card">
          {view === "month" ? (
            <>
              <div className="calendar-grid calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}</div>
              <div className="calendar-grid">
                {days.map((date, index) => {
                  const dayItems = monthItems.filter((item) => sameDay(dateOf(item), date));
                  return (
                    <div className={`calendar-day ${date.getMonth() !== month.getMonth() ? "outside" : ""} ${sameDay(date, today) ? "today" : ""}`} key={`${date.toISOString()}-${index}`}>
                      <span className="calendar-date">{date.getDate()}</span>
                      {dayItems.slice(0, 2).map((item) => <Link key={item.id} className="calendar-event" href={`/connect/meetings/${encodeURIComponent(item.booking_id || item.id)}`}>{item.title}</Link>)}
                      {dayItems.length > 2 && <small>+{dayItems.length - 2} more</small>}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="calendar-agenda">
              {items.filter((item) => {
                const date = dateOf(item);
                if (Number.isNaN(date.getTime())) return false;
                if (view === "day") return sameDay(date, today);
                const start = new Date(today); start.setDate(today.getDate() - today.getDay());
                const end = new Date(start); end.setDate(start.getDate() + 7);
                return date >= start && date < end;
              }).sort((a,b) => dateOf(a)-dateOf(b)).map((item) => (
                <article className="agenda-event" key={item.booking_id}>
                  <time>{formatDate(item.requested_start_at || item.start_at, true)}</time>
                  <div><strong>{item.title}</strong><small>{item.format || "Confirmed session"}</small></div>
                  <span className="status confirmed">Confirmed</span>
                </article>
              ))}
              {!items.length && <EmptyState title="No confirmed sessions yet." />}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// =====================================================
// INBOX
// =====================================================

function InboxPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api("/me/conversations");
      const nextItems = getItems(response);
      setItems(nextItems);
      setSelectedId((current) => current || nextItems[0]?.id || "");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return undefined;
    }
    const controller = new AbortController();
    setMessagesLoading(true);
    api(`/conversations/${encodeURIComponent(selectedId)}/messages`, { signal: controller.signal })
      .then((response) => setMessages(getItems(response)))
      .catch((err) => {
        if (err.name !== "AbortError") setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setMessagesLoading(false);
      });
    return () => controller.abort();
  }, [selectedId]);

  async function sendMessage(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    setError("");
    try {
      const message = await api(`/conversations/${encodeURIComponent(selectedId)}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setMessages((current) => [...current, message]);
      setDraft("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHead eyebrow="STAY CONNECTED" title="Inbox" sub="Conversations connected to your bookings and activities." />
      <ErrorMessage onRetry={load}>{error}</ErrorMessage>
      {loading ? <LoadingState /> : (
        <div className="inbox-layout">
          <aside className="conversation-list">
            <div className="conversation-list-head">
              <strong>Messages</strong>
              <span>{items.length}</span>
            </div>
            {items.map((item) => (
              <button type="button" key={item.id} className={`conversation-item ${selectedId === item.id ? "active" : ""}`} onClick={() => setSelectedId(item.id)}>
                <span className="conversation-avatar">SS</span>
                <span className="conversation-copy">
                  <strong>Session conversation</strong>
                  <small>{item.last_message || "No messages yet"}</small>
                </span>
                <time>{item.last_message_at ? new Date(item.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "New"}</time>
              </button>
            ))}
            {!items.length && <div className="conversation-empty">Conversations appear after a booking is confirmed.</div>}
          </aside>
          <section className="message-panel">
            {selectedId ? (
              <>
                <header className="message-panel-head">
                  <span className="conversation-avatar">SS</span>
                  <div><strong>Session conversation</strong><small>Private booking conversation</small></div>
                  <span className="message-secure"><span /> Booking linked</span>
                </header>
                <div className="message-thread">
                  {messagesLoading ? <LoadingState message="Loading messages..." /> : messages.map((message) => (
                    <article className={`message-bubble ${String(message.sender_user_id) === String(currentUser?.id) ? "mine" : ""}`} key={message.id}>
                      <p>{message.body}</p>
                      <time>{formatDate(message.created_at, true)}</time>
                    </article>
                  ))}
                  {!messagesLoading && !messages.length && <EmptyState title="Start the conversation" description="Send a message to coordinate your session." />}
                </div>
                <form className="message-composer" onSubmit={sendMessage}>
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message..." maxLength={5000} aria-label="Message" />
                  <button className="btn primary" type="submit" disabled={!draft.trim() || sending}><Send size={16}/>{sending ? "Sending" : "Send"}</button>
                </form>
              </>
            ) : (
              <div className="message-no-selection"><MessageCircle size={34}/><h3>Your conversations live here</h3><p>Select a booking conversation to read and send messages.</p></div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

// =====================================================
// NOTIFICATIONS
// =====================================================

function Notifications() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api("/me/notifications");
      setItems(getItems(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    setError("");
    try {
      await api("/notifications/read-all", { method: "POST" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  }

  async function read(id) {
    if (busyId) return;

    setBusyId(id);
    setError("");

    try {
      await api(
        `/notifications/${encodeURIComponent(id)}/read`,
        { method: "POST" }
      );

      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    const type = String(item.type || "").toLowerCase();
    if (filter === "bookings") return type.includes("booking");
    if (filter === "messages") return type.includes("message");
    return !type.includes("booking") && !type.includes("message");
  });

  return (
    <>
      <PageHead
        eyebrow="UPDATES"
        title="Notifications"
        sub="Important updates from your Connect activities."
        action={<button className="btn secondary" type="button" onClick={markAllRead} disabled={markingAll || !items.some((item) => !item.read_at)}>{markingAll ? "Updating..." : "Mark all as read"}</button>}
      />
      <div className="segmented-tabs" role="tablist" aria-label="Notification category">
        {["all", "bookings", "messages", "activities"].map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>
            {value[0].toUpperCase() + value.slice(1)}
            <span>{value === "all" ? items.length : items.filter((item) => {
              const type = String(item.type || "").toLowerCase();
              if (value === "bookings") return type.includes("booking");
              if (value === "messages") return type.includes("message");
              return !type.includes("booking") && !type.includes("message");
            }).length}</span>
          </button>
        ))}
      </div>

      <ErrorMessage onRetry={load}>{error}</ErrorMessage>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="table-card">
          {filteredItems.map((item) => (
            <div className={`table-row notification-row ${item.read_at ? "" : "unread"}`} key={item.id}>
              <div>
                <b>{item.title}</b>
                <small>
                  {item.body} · {formatDate(item.created_at, true)}
                </small>
              </div>

              {!item.read_at && (
                <button
                  disabled={busyId === item.id}
                  onClick={() => read(item.id)}
                >
                  Mark read
                </button>
              )}
            </div>
          ))}

          {!filteredItems.length && (
            <EmptyState title={items.length ? "No updates in this category." : "You're all caught up."} />
          )}
        </div>
      )}
    </>
  );
}

// =====================================================
// SETTINGS
// =====================================================

function SettingsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <PageHead
        eyebrow="PREFERENCES"
        title="Settings"
        sub="Manage your Connect workspace and SkillSwap account."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <a className="active" href="#connect-profile">Profile</a>
          <a href="#connect-account">Account</a>
          <a href="#connect-preferences">Preferences</a>
          <a href="#connect-privacy">Privacy & security</a>
        </nav>
        <div className="settings-content">
          <section className="form-card settings-panel" id="connect-profile">
            <div className="settings-panel-heading">
              <div><span className="wizard-kicker">PUBLIC PROFILE</span><h3>Profile</h3><p>How other learners and hosts see you on Connect.</p></div>
              <div className="profile-large">{user?.avatar ? <img src={user.avatar} alt="" /> : (user?.name || "S").split(/\s+/).map((part) => part[0]).slice(0,2).join("").toUpperCase()}</div>
            </div>
            <div className="profile-fields">
              <label>Full name<input value={user?.name || user?.fullName || "SkillSwap member"} readOnly /></label>
              <label>Email address<input value={user?.email || ""} readOnly /></label>
              <label>Skills you teach<input value={(user?.skillsTeach || []).join(", ") || "Add skills in your SkillSwap profile"} readOnly /></label>
              <label>Skills you want to learn<input value={(user?.skillsLearn || []).join(", ") || "Add learning goals in your SkillSwap profile"} readOnly /></label>
            </div>
            <p className="muted">Profile details are managed by your main SkillSwap account to keep one consistent identity across the platform.</p>
          </section>
          <section className="form-card settings-panel" id="connect-account">
            <span className="wizard-kicker">ACCOUNT CONNECTION</span>
            <h3>SkillSwap account</h3>
            <p className="muted">{token ? "Your existing SkillSwap account is connected." : "Sign in to SkillSwap to use protected Connect actions."}</p>
            <div className="account-connected"><span />{token ? "Connected with your SkillSwap login" : "Sign-in required"}</div>
            <p className="muted">Connect reuses the existing authentication store. It does not create a separate account or store a second login token.</p>
          </section>
          <section className="form-card settings-panel" id="connect-preferences">
            <span className="wizard-kicker">WORKSPACE PREFERENCES</span>
            <h3>Appearance and notifications</h3>
            <p className="muted">Use the theme control at the bottom of the Connect sidebar to switch between dark and light appearance. Notification preferences are managed by the main SkillSwap account.</p>
          </section>
          <section className="form-card settings-panel" id="connect-privacy">
            <span className="wizard-kicker">PRIVACY & SECURITY</span>
            <h3>Your sessions stay protected</h3>
            <p className="muted">Private booking conversations and meeting access are checked by the Connect backend against your existing SkillSwap identity.</p>
          </section>
        </div>
      </div>
    </>
  );
}

// =====================================================
// PUBLIC HOST PROFILE
// =====================================================

function Host() {
  const [, params] = useRoute("/connect/host/:userId");
  const userId = params?.userId;

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;

    const controller = new AbortController();

    setData(null);
    setError("");

    api(`/hosts/${encodeURIComponent(userId)}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(getErrorMessage(err));
        }
      });

    return () => controller.abort();
  }, [userId]);

  return (
    <>
      <PageHead
        eyebrow="COMMUNITY HOST"
        title="Host profile"
        sub="Public host profile and upcoming activities."
      />

      <ErrorMessage>{error}</ErrorMessage>

      <div className="activity-grid">
        {(data?.activities || EMPTY_ARRAY).map((item) => (
          <ActivityCard key={item.id} item={item} />
        ))}
      </div>

      {data && !data.activities?.length && (
        <EmptyState title="No public activities available." />
      )}
    </>
  );
}

// =====================================================
// AUTHENTICATION GATE
// =====================================================

function LoginGate() {
  return (
    <div className="empty">
      <div className="empty-icon">
        <LogIn />
      </div>

      <h3>Sign in to continue</h3>

      <p>
        Connect uses your existing SkillSwap account.
        Sign in to access this feature. No separate
        Connect account is required.
      </p>

      <Link className="btn primary" href="/login">
        Sign in to SkillSwap
      </Link>

      <p className="muted" style={{ marginTop: 12 }}>
        <Link href="/connect">
          Return to public Connect activities
        </Link>
      </p>
    </div>
  );
}

function ProtectedConnect({ component: Component }) {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return <LoginGate />;
  }

  return <Component />;
}

// =====================================================
// JITSI MEETING
// =====================================================

function MeetingPage() {
  const [, params] = useRoute("/connect/meetings/:bookingId");
  const bookingId = params?.bookingId;

  const user = useAuthStore((state) => state.user);

  const [meeting, setMeeting] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [left, setLeft] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const controller = new AbortController();

    setLoading(true);
    setError("");
    setMeeting(null);
    setLeft(false);

    api(
      `/bookings/${encodeURIComponent(bookingId)}/meeting`,
      { signal: controller.signal }
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setMeeting(data);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(
            getErrorMessage(err) ||
            "Unable to access this meeting."
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [bookingId]);

  if (loading) {
    return <LoadingState message="Checking booking access..." />;
  }

  if (error) {
    return (
      <div className="empty">
        <ErrorMessage>{error}</ErrorMessage>

        <Link className="btn secondary" href="/connect/bookings">
          Back to bookings
        </Link>
      </div>
    );
  }

  if (!meeting?.roomName) {
    return (
      <EmptyState
        title="Meeting room is not available for this booking."
        action={
          <Link className="btn secondary" href="/connect/bookings">
            Back to bookings
          </Link>
        }
      />
    );
  }

  if (left) {
    return (
      <div className="empty">
        <h2>You left the meeting</h2>

        <Link className="btn primary" href="/connect/bookings">
          Back to bookings
        </Link>
      </div>
    );
  }

  return (
    <section className="meeting-page">
      <PageHead
        eyebrow="PRIVATE SESSION"
        title="Your Connect meeting"
        sub="Your booking is checked before the meeting room is loaded."
      />

      <div className="meeting-notice">
        <ShieldAlert size={17} />

        <span>
          Important: the public Jitsi service does not enforce
          SkillSwap booking permissions inside the meeting room.
          Anyone who obtains the room name may be able to join.
          Do not treat this as a private or access-controlled room.
        </span>
      </div>

      <div className="meeting-frame">
        <JitsiMeeting
          domain={meeting.domain || "meet.jit.si"}
          roomName={meeting.roomName}
          userInfo={{
            displayName:
              user?.name ||
              user?.fullName ||
              user?.email ||
              "SkillSwap member",
          }}
          configOverwrite={{
            prejoinPageEnabled: true,
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            enableWelcomePage: false,
          }}
          interfaceConfigOverwrite={{
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "chat",
              "raisehand",
              "tileview",
              "fullscreen",
              "hangup",
            ],
          }}
          onApiReady={(externalApi) => {
            externalApi.addListener(
              "videoConferenceLeft",
              () => setLeft(true)
            );
          }}
          getIFrameRef={(iframeRef) => {
            if (iframeRef) {
              iframeRef.style.width = "100%";
              iframeRef.style.height = "min(76vh, 760px)";
              iframeRef.style.border = "0";
            }
          }}
        />
      </div>

      <p className="meeting-footnote">
        If the room does not load, check camera and microphone
        permissions and allow third-party meeting content.
      </p>

      <Link className="btn secondary" href="/connect/bookings">
        Back to bookings
      </Link>
    </section>
  );
}

// =====================================================
// MAIN CONNECT APP
// =====================================================

export default function ConnectApp() {
  return (
    <Shell>
      <Switch>
        <Route path="/connect" component={Overview} />

        <Route path="/connect/explore" component={Explore} />

        <Route path="/connect/events/:slug" component={Event} />

        <Route path="/connect/host/:userId" component={Host} />

        <Route path="/connect/settings">
          <ProtectedConnect component={SettingsPage} />
        </Route>

        <Route path="/connect/create">
          <ProtectedConnect component={Create} />
        </Route>

        <Route path="/connect/my-activities">
          <ProtectedConnect component={MyActivities} />
        </Route>

        <Route path="/connect/bookings">
          <ProtectedConnect component={Bookings} />
        </Route>

        <Route path="/connect/calendar">
          <ProtectedConnect component={Calendar} />
        </Route>

        <Route path="/connect/inbox">
          <ProtectedConnect component={InboxPage} />
        </Route>

        <Route path="/connect/notifications">
          <ProtectedConnect component={Notifications} />
        </Route>

        <Route path="/connect/meetings/:bookingId">
          <ProtectedConnect component={MeetingPage} />
        </Route>

        <Route>
          <Overview />
        </Route>
      </Switch>
    </Shell>
  );
}
