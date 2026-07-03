import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";
import {
  Users, LayoutDashboard, ClipboardList, BookOpen, CreditCard,
  Trash2, Plus, Minus, X, Shield, TrendingUp, CheckCircle,
  MessageSquare, Mail, Star, History, AlertTriangle, RefreshCw,
  BadgeCheck, Ban, Search, Download, Bell, Send, Filter, Flag,
  ExternalLink, Clock, ChevronDown,
  BarChart2, Settings, AlertCircle, UserX, LineChart, PieChart, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const token = useAuthStore(s => s.token);
  const { toast } = useToast();

  const [tab, setTab] = useState("dashboard");
  const [analytics, setAnalytics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reports, setReports] = useState<any>(null);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [adminEmail, setAdminEmail] = useState("");

  // Search / filter states
  const [userSearch, setUserSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // Modal states
  const [creditModal, setCreditModal] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Notification form
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifTarget, setNotifTarget] = useState<"all" | "mentors" | "students">("all");
  const [notifLoading, setNotifLoading] = useState(false);

  // ─── API helper ──────────────────────────────────────────────
  const apiFetch = (path: string, opts?: any) =>
    fetch(`${API_BASE_URL}/api${path}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...opts?.headers,
      },
    });

  // ─── Fetch all data ──────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, sessionsRes, txRes, pendingRes, fbRes, subRes] =
        await Promise.all([
          apiFetch("/admin/stats").then(r => r.json()),
          apiFetch("/admin/users").then(r => r.json()),
          apiFetch("/admin/sessions").then(r => r.json()),
          apiFetch("/admin/transactions").then(r => r.json()),
          apiFetch("/admin/pending-withdrawals").then(r => r.json()),
          apiFetch("/platform/admin/feedbacks").then(r => r.json()),
          apiFetch("/platform/admin/subscribers").then(r => r.json()),
        ]);

      setStats(statsRes);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      setSessions(Array.isArray(sessionsRes) ? sessionsRes : []);
      setTransactions(Array.isArray(txRes) ? txRes : []);
      setPendingWithdrawals(Array.isArray(pendingRes) ? pendingRes : []);
      setFeedbacks(Array.isArray(fbRes) ? fbRes : []);
      setSubscribers(Array.isArray(subRes) ? subRes : []);
      setLastRefreshed(new Date());
    } catch {
      toast({ variant: "destructive", title: "Fetch Error", description: "Could not load admin data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { setLocation("/login"); return; }
    apiFetch("/users/me").then(r => r.json()).then(u => setAdminEmail(u.email || ""));
    apiFetch("/admin/analytics").then(r => r.json()).then(setAnalytics).catch(() => {});
    apiFetch("/admin/reports").then(r => r.json()).then(setReports).catch(() => {});
    apiFetch("/admin/user-reports").then(r => r.json()).then(d => setUserReports(Array.isArray(d) ? d : [])).catch(() => {});
    apiFetch("/admin/settings").then(r => r.json()).then(setPlatformSettings).catch(() => {});
    fetchData();
  }, [token]);

  // ─── Filtered data ───────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || String(u.id).includes(q);
  });

  const filteredSessions = sessions.filter(s => {
    const q = sessionSearch.toLowerCase();
    const matchQ = !q || s.skill?.toLowerCase().includes(q) || String(s.id).includes(q) || String(s.mentorId).includes(q) || String(s.studentId).includes(q);
    const matchStatus = sessionStatusFilter === "all" || s.status === sessionStatusFilter;
    return matchQ && matchStatus;
  });

  const filteredTransactions = transactions.filter(t => {
    const q = txSearch.toLowerCase();
    const matchQ = !q || String(t.userId).includes(q) || t.description?.toLowerCase().includes(q) || String(t.id).includes(q);
    const matchType = txTypeFilter === "all" || t.type === txTypeFilter;
    return matchQ && matchType;
  });

  // ─── Actions ─────────────────────────────────────────────────
  const handleCredits = async (add: boolean) => {
    if (!creditModal || !creditAmount) return;
    const amount = parseInt(creditAmount) * (add ? 1 : -1);
    const res = await apiFetch(`/admin/users/${creditModal.id}/credits`, {
      method: "POST",
      body: JSON.stringify({ amount, reason: creditReason || "Admin adjustment" }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: add ? "✅ Credits Added" : "✅ Credits Deducted", description: `New balance: ${data.newBalance} cr` });
      setCreditModal(null); setCreditAmount(""); setCreditReason("");
      fetchData();
    } else {
      toast({ variant: "destructive", title: "Error", description: data.error });
    }
  };

  const handleBanUser = async (id: number, name: string) => {
    if (!confirm(`Ban ${name}? Their trust score will be set to -999.`)) return;
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, trustScore: -999 } : u));
    toast({ title: "🚫 User Banned", description: `${name} has been banned.` });
  };

  const handleVerify = async (user: any) => {
    const res = await apiFetch(`/admin/users/${user.id}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ isPremium: !user.isPremium }),
    });
    const data = await res.json();
    if (data.success) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isPremium: !u.isPremium } : u));
      toast({ title: "Updated", description: `${user.name} is now ${!user.isPremium ? "✅ Verified" : "Unverified"}.` });
    }
  };

  const handleResolveUserReport = async (id: number, status: "reviewed" | "dismissed") => {
    await apiFetch(`/admin/user-reports/${id}/resolve`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setUserReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast({ title: status === "reviewed" ? "✅ Marked Reviewed" : "Dismissed" });
  };

  const handleApprove = async (txId: number) => {
    if (!confirm("Have you transferred the money via UPI? This cannot be undone.")) return;
    const res = await apiFetch(`/admin/transactions/${txId}/approve`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      toast({ title: "✅ Approved", description: "Withdrawal marked as completed." });
      fetchData();
    } else {
      toast({ variant: "destructive", title: "Error", description: data.error });
    }
  };

  const handleReject = async (txId: number) => {
    if (!confirm("Reject this withdrawal and refund credits to user?")) return;
    const res = await apiFetch(`/admin/transactions/${txId}/reject`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      toast({ title: "❌ Rejected & Refunded", description: "Credits returned to user." });
      fetchData();
    } else {
      toast({ variant: "destructive", title: "Error", description: data.error });
    }
  };

  const handleResolve = async (sessionId: number, action: string) => {
    const msg = action === "refund_student"
      ? "Cancel session and REFUND student's credits?"
      : "Force complete and PAY mentor (15% platform fee deducted)?";
    if (!confirm(msg)) return;
    const res = await apiFetch(`/admin/sessions/${sessionId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: "✅ Session Resolved" });
      fetchData();
    }
  };

  const handleViewHistory = async (user: any) => {
    setHistoryModal(user);
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      const res = await apiFetch(`/admin/user/${user.id}/history`);
      setHistoryData(await res.json());
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not load history." });
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast({ variant: "destructive", title: "Fill all fields", description: "Title and message are required." });
      return;
    }
    setNotifLoading(true);
    try {
      const res = await apiFetch("/admin/notifications/send", {
        method: "POST",
        body: JSON.stringify({ title: notifTitle, message: notifMessage, targetGroup: notifTarget }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `✅ Sent to ${data.sentTo} users`, description: `"${notifTitle}" delivered.` });
        setNotifTitle(""); setNotifMessage("");
      } else {
        toast({ variant: "destructive", title: "Failed", description: data.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Network error" });
    } finally {
      setNotifLoading(false);
    }
  };

  // ─── Export CSV helpers ───────────────────────────────────────
  const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = filename;
    a.click();
  };

  const exportUsers = () => downloadCSV(
    [["ID","Name","Email","Credits","Sessions","Rating","Premium","Trust","Joined"],
     ...filteredUsers.map(u => [u.id, u.name, u.email, u.credits, u.sessionsCompleted, u.averageRating, u.isPremium, u.trustScore, new Date(u.createdAt).toLocaleDateString()])],
    `skillswap_users_${Date.now()}.csv`
  );

  const exportSessions = () => downloadCSV(
    [["ID","Skill","MentorID","StudentID","Credits","Status","Type","Created"],
     ...filteredSessions.map(s => [s.id, s.skill, s.mentorId, s.studentId, s.creditsAmount, s.status, s.sessionType, new Date(s.createdAt).toLocaleDateString()])],
    `skillswap_sessions_${Date.now()}.csv`
  );

  const exportTransactions = () => downloadCSV(
    [["ID","UserID","Amount","Type","Description","Date"],
     ...filteredTransactions.map(t => [t.id, t.userId, t.amount, t.type, t.description, new Date(t.createdAt).toLocaleDateString()])],
    `skillswap_transactions_${Date.now()}.csv`
  );

  const exportSubscribers = () => downloadCSV(
    [["Email","Source","Subscribed On"],
     ...subscribers.map(s => [s.email, s.source, new Date(s.createdAt).toLocaleDateString()])],
    `skillswap_subscribers_${Date.now()}.csv`
  );

  // ─── Tabs config ─────────────────────────────────────────────
  const tabs = [
    { id: "dashboard",     label: "Dashboard",        icon: LayoutDashboard },
    { id: "analytics",     label: "Analytics",        icon: LineChart },
    { id: "search",        label: "Global Search",    icon: Search },
    { id: "users",         label: "Users",             icon: Users },
    { id: "sessions",      label: "Sessions",          icon: BookOpen },
    { id: "withdrawals",   label: "Withdrawals",       icon: CreditCard, badge: pendingWithdrawals.length },
    { id: "transactions",  label: "All Transactions",  icon: TrendingUp },
    { id: "notifications", label: "Notifications",     icon: Bell },
    { id: "reports",       label: "Reports",           icon: AlertTriangle },
    { id: "audit",         label: "Audit Logs",        icon: ClipboardList },
    { id: "feedback",      label: "Feedback",          icon: MessageSquare, badge: feedbacks.length },
    { id: "newsletter",    label: "Subscribers",       icon: Mail },
    { id: "settings",      label: "Settings",          icon: Settings },
  ];

  // ─── New handlers ───────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await apiFetch(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(await res.json());
    } catch { } finally { setSearchLoading(false); }
  };

  const handleSuspend = async (userId: number, suspend: boolean, name: string) => {
    const reason = suspend ? prompt(`Reason for suspending ${name}?`) : "Unsuspended by admin";
    if (suspend && !reason) return;
    await apiFetch(`/admin/users/${userId}/suspend`, {
      method: "PATCH", body: JSON.stringify({ suspend, reason }),
    });
    toast({ title: suspend ? "User Suspended" : "User Unsuspended", description: name });
    fetchData();
  };

  const handleLoginAs = async (userId: number, name: string) => {
    if (!confirm(`Login as ${name}? This will give you their session token.`)) return;
    const res = await apiFetch(`/admin/users/${userId}/login-as`, { method: "POST" });
    const data = await res.json();
    if (data.token) {
      navigator.clipboard.writeText(data.token);
      toast({ title: "Token Copied!", description: "JWT token copied to clipboard." });
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await apiFetch("/admin/settings", {
        method: "PATCH", body: JSON.stringify(platformSettings),
      });
      const data = await res.json();
      if (data.success) { setPlatformSettings(data.settings); toast({ title: "Settings Saved!" }); }
    } catch { } finally { setSettingsSaving(false); }
  };

  // ─── Helpers ─────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed:            "bg-green-100 text-green-700",
      requested:            "bg-blue-100 text-blue-700",
      accepted:             "bg-indigo-100 text-indigo-700",
      in_progress:          "bg-violet-100 text-violet-700",
      pending_clearance:    "bg-yellow-100 text-yellow-700",
      cancelled:            "bg-red-100 text-red-700",
      disputed:             "bg-orange-100 text-orange-700",
      active:               "bg-purple-100 text-purple-700",
      withdrawal_pending:   "bg-orange-100 text-orange-700",
      withdrawal_completed: "bg-green-100 text-green-700",
      withdrawal_rejected:  "bg-red-100 text-red-700",
      earned:               "bg-green-100 text-green-700",
      refund:               "bg-amber-100 text-amber-700",
      bonus:                "bg-blue-100 text-blue-700",
      escrow_hold:          "bg-slate-100 text-slate-600",
    };
    return `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || "bg-gray-100 text-gray-600"}`;
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── TOP BAR ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl tracking-tight">SkillSwap Admin</h1>
            <p className="text-slate-400 text-xs">{adminEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastRefreshed && (
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchData}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Button variant="outline"
            className="border-white/20 text-white hover:bg-white/10 rounded-full text-sm"
            onClick={() => setLocation("/dashboard")}>
            ← Exit Admin
          </Button>
        </div>
      </div>

      <div className="flex">

        {/* ── SIDEBAR ── */}
        <aside className="w-56 min-h-screen bg-white border-r border-gray-200 p-3 space-y-0.5 shadow-sm z-10">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              }`}>
              <span className="flex items-center gap-2.5">
                <t.icon className="w-4 h-4" />
                {t.label}
              </span>
              {t.badge ? (
                <span className="bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 p-6 min-h-screen">

          {/* ══ DASHBOARD ══ */}
          {tab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-900">Platform Overview</h2>
                <button onClick={() => setTab("notifications")}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors">
                  <Bell className="w-3.5 h-3.5" /> Send Notification
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[
                  { label: "Total Users",         value: stats?.totalUsers,          color: "text-blue-600",    bg: "bg-blue-50",    icon: Users },
                  { label: "Active Today",        value: stats?.activeUsersToday,    color: "text-cyan-600",    bg: "bg-cyan-50",    icon: Users },
                  { label: "New Today",           value: stats?.newUsersToday,       color: "text-indigo-600",  bg: "bg-indigo-50",  icon: Users },
                  { label: "Total Sessions",      value: stats?.totalSessions,       color: "text-purple-600",  bg: "bg-purple-50",  icon: BookOpen },
                  { label: "Ongoing",             value: stats?.ongoingSessions,     color: "text-violet-600",  bg: "bg-violet-50",  icon: BookOpen },
                  { label: "Completed",           value: stats?.completedSessions,   color: "text-green-600",   bg: "bg-green-50",   icon: CheckCircle },
                  { label: "Cancelled",           value: stats?.cancelledSessions,   color: "text-red-500",     bg: "bg-red-50",     icon: X },
                  { label: "Platform Profit",     value: `₹${stats?.platformRevenue ?? 0}`, color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp },
                  { label: "Credits in System",   value: stats?.totalCreditsInSystem ?? 0, color: "text-orange-600", bg: "bg-orange-50", icon: CreditCard },
                  { label: "Pending Withdrawals", value: stats?.pendingWithdrawalsCount ?? 0, color: "text-amber-600", bg: "bg-amber-50", icon: AlertTriangle },
                  { label: "Total Withdrawals",   value: `${stats?.totalWithdrawals ?? 0} cr`, color: "text-pink-600", bg: "bg-pink-50", icon: CreditCard },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 leading-none mb-1">{s.label}</p>
                      <p className="text-xl font-black text-gray-900">{s.value ?? "—"}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pending withdrawals alert */}
              {pendingWithdrawals.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-orange-800">
                        {pendingWithdrawals.length} Pending Withdrawal{pendingWithdrawals.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-orange-600">Users are waiting for their payout.</p>
                    </div>
                  </div>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl"
                    onClick={() => setTab("withdrawals")}>
                    Review Now →
                  </Button>
                </div>
              )}

              {/* Recent Users */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-bold text-gray-700 mb-3 text-sm">Recent Signups</h3>
                <div className="space-y-2">
                  {(stats?.recentUsers || []).map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <span className="font-semibold text-gray-800">{u.name}</span>
                      <span className="text-gray-400 text-xs">{u.email}</span>
                    </div>
                  ))}
                  {!stats?.recentUsers?.length && <p className="text-gray-400 text-sm">No recent users.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ══ USERS ══ */}
          {tab === "users" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  Platform Users
                  <span className="text-gray-400 font-normal text-lg ml-2">
                    ({filteredUsers.length}{filteredUsers.length !== users.length ? ` of ${users.length}` : ""})
                  </span>
                </h2>
                <button onClick={exportUsers}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full max-w-sm bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">User</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Credits</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Sessions</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Rating</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Status</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u: any) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                              {u.avatar
                                ? <img src={u.avatar} className="w-full h-full object-cover" alt="" />
                                : u.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 flex items-center gap-1">
                                {u.name}
                                {u.isPremium && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                              </p>
                              <p className="text-xs text-gray-400">#{u.id} · {new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{u.email}</td>
                        <td className="py-3 px-4 font-black text-blue-600">{u.credits} cr</td>
                        <td className="py-3 px-4 text-gray-700">{u.sessionsCompleted}</td>
                        <td className="py-3 px-4">
                          {u.averageRating > 0
                            ? <span className="flex items-center gap-1 text-amber-600 font-bold text-xs">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{u.averageRating}
                              </span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          {u.trustScore <= -999
                            ? <span className={statusBadge("cancelled")}>BANNED</span>
                            : u.isPremium
                            ? <span className={statusBadge("completed")}>VERIFIED</span>
                            : <span className={statusBadge("active")}>ACTIVE</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => handleViewHistory(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors">
                              <History className="w-3 h-3" /> History
                            </button>
                            <button onClick={() => handleVerify(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors">
                              <BadgeCheck className="w-3 h-3" /> {u.isPremium ? "Unverify" : "Verify"}
                            </button>
                            <button onClick={() => setCreditModal(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition-colors">
                              <CreditCard className="w-3 h-3" /> Credits
                            </button>
                            <button onClick={() => handleLoginAs(u.id, u.name)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold transition-colors">
                              <LogIn className="w-3 h-3" /> Login As
                            </button>
                            <button onClick={() => handleSuspend(u.id, !(u as any).isSuspended, u.name)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold transition-colors">
                              <UserX className="w-3 h-3" /> {(u as any).isSuspended ? "Unsuspend" : "Suspend"}
                            </button>
                            <button onClick={() => handleBanUser(u.id, u.name)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors">
                              <Ban className="w-3 h-3" /> Ban
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={7} className="py-10 text-center text-gray-400">
                        {userSearch ? `No users matching "${userSearch}"` : "No users yet."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ SESSIONS ══ */}
          {tab === "sessions" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  All Sessions
                  <span className="text-gray-400 font-normal text-lg ml-2">
                    ({filteredSessions.length}{filteredSessions.length !== sessions.length ? ` of ${sessions.length}` : ""})
                  </span>
                </h2>
                <button onClick={exportSessions}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>

              {/* Search + Status filter */}
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search skill, ID, mentor/student..."
                    value={sessionSearch}
                    onChange={e => setSessionSearch(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 w-72"
                  />
                </div>
                <select value={sessionStatusFilter} onChange={e => setSessionStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-700 font-medium focus:outline-none focus:border-slate-400 cursor-pointer">
                  <option value="all">All Statuses</option>
                  <option value="requested">Requested</option>
                  <option value="accepted">Accepted</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_clearance">Pending Clearance</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Skill</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Mentor</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Student</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Credits</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Meet</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Status</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-mono text-xs text-gray-400">#{s.id}</td>
                        <td className="py-3 px-4 font-bold text-gray-900 max-w-[120px] truncate">{s.skill}</td>
                        <td className="py-3 px-4 text-blue-600 font-semibold text-xs">#{s.mentorId}</td>
                        <td className="py-3 px-4 text-purple-600 font-semibold text-xs">#{s.studentId}</td>
                        <td className="py-3 px-4 font-black text-gray-700">{s.creditsAmount} cr</td>
                        <td className="py-3 px-4">
                          {s.meetLink
                            ? <a href={s.meetLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[#6C3BFF] text-xs font-bold hover:underline">
                                <ExternalLink className="w-3 h-3" /> Join
                              </a>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="py-3 px-4"><span className={statusBadge(s.status)}>{s.status.replace(/_/g, " ")}</span></td>
                        <td className="py-3 px-4 text-right">
                          {!["completed","cancelled"].includes(s.status) ? (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleResolve(s.id, "refund_student")}
                                className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors">
                                Refund
                              </button>
                              <button onClick={() => handleResolve(s.id, "pay_mentor")}
                                className="px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition-colors">
                                Pay Mentor
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredSessions.length === 0 && (
                      <tr><td colSpan={8} className="py-10 text-center text-gray-400">No sessions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ PENDING WITHDRAWALS ══ */}
          {tab === "withdrawals" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Pending Withdrawals
                {pendingWithdrawals.length > 0 && (
                  <span className="ml-2 bg-orange-100 text-orange-600 text-sm font-bold px-2.5 py-0.5 rounded-full">
                    {pendingWithdrawals.length} pending
                  </span>
                )}
              </h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Tx ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">User ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">UPI ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Details</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Requested</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWithdrawals.map((t: any) => {
                      const upiMatch = t.description?.match(/UPI:\s*([^\s)]+)/);
                      const upiId = upiMatch?.[1] || "—";
                      return (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-orange-50/30">
                          <td className="py-3 px-4 font-mono text-xs text-gray-400">#{t.id}</td>
                          <td className="py-3 px-4 font-bold text-blue-600">#{t.userId}</td>
                          <td className="py-3 px-4 font-black text-red-500">{Math.abs(t.amount)} cr</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">
                                {upiId}
                              </span>
                              {upiId !== "—" && (
                                <button
                                  onClick={() => { navigator.clipboard.writeText(upiId); toast({ title: "Copied!", description: upiId }); }}
                                  className="text-gray-400 hover:text-gray-700 text-[10px] font-semibold underline">
                                  Copy
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-600 max-w-[220px] truncate">{t.description}</td>
                          <td className="py-3 px-4 text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleApprove(t.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors shadow-sm">
                                <CheckCircle className="w-3 h-3" /> Mark Paid
                              </button>
                              <button onClick={() => handleReject(t.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-sm">
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pendingWithdrawals.length === 0 && (
                      <tr><td colSpan={7} className="py-12 text-center">
                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-gray-400 font-medium">All caught up! No pending withdrawals.</p>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ ALL TRANSACTIONS ══ */}
          {tab === "transactions" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  All Transactions
                  <span className="text-gray-400 font-normal text-lg ml-2">
                    ({filteredTransactions.length}{filteredTransactions.length !== transactions.length ? ` of ${transactions.length}` : ""})
                  </span>
                </h2>
                <button onClick={exportTransactions}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>

              {/* Search + Type filter */}
              <div className="flex gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search user ID, description..."
                    value={txSearch}
                    onChange={e => setTxSearch(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 w-72"
                  />
                </div>
                <select value={txTypeFilter} onChange={e => setTxTypeFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm text-gray-700 font-medium focus:outline-none focus:border-slate-400 cursor-pointer">
                  <option value="all">All Types</option>
                  <option value="earned">Earned</option>
                  <option value="bonus">Bonus</option>
                  <option value="refund">Refund</option>
                  <option value="escrow_hold">Escrow Hold</option>
                  <option value="withdrawal_pending">Withdrawal Pending</option>
                  <option value="withdrawal_completed">Withdrawal Completed</option>
                  <option value="withdrawal_rejected">Withdrawal Rejected</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">User</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Description</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((t: any) => {
                      const isDebit = t.amount < 0 || t.type === "spent" || t.type.includes("withdrawal");
                      return (
                        <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-mono text-xs text-gray-400">#{t.id}</td>
                          <td className="py-3 px-4 font-bold text-blue-600">#{t.userId}</td>
                          <td className={`py-3 px-4 font-black ${isDebit ? "text-red-500" : "text-green-600"}`}>
                            {isDebit ? "−" : "+"}{Math.abs(t.amount)} cr
                          </td>
                          <td className="py-3 px-4">
                            <span className={statusBadge(t.type)}>{t.type.replace(/_/g, " ")}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-500 max-w-[200px] truncate">{t.description}</td>
                          <td className="py-3 px-4 text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                    {filteredTransactions.length === 0 && (
                      <tr><td colSpan={6} className="py-10 text-center text-gray-400">No transactions found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ NOTIFICATIONS ══ */}
          {tab === "notifications" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">Send Broadcast Notification</h2>

              <div className="max-w-xl bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Target Audience</label>
                  <div className="flex gap-3">
                    {(["all", "mentors", "students"] as const).map(g => (
                      <button key={g} onClick={() => setNotifTarget(g)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize border transition-all ${
                          notifTarget === g
                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                        }`}>
                        {g === "all" ? "🌐 All Users" : g === "mentors" ? "🎓 Mentors" : "📚 Students"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. New Feature Launched 🚀"
                    value={notifTitle}
                    onChange={e => setNotifTitle(e.target.value)}
                    maxLength={100}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Message *</label>
                  <textarea
                    placeholder="Write your message here..."
                    value={notifMessage}
                    onChange={e => setNotifMessage(e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">{notifMessage.length}/500</p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  ⚠️ This will create an in-app notification for{" "}
                  <strong>
                    {notifTarget === "all" ? `all ${users.length}` : notifTarget === "mentors" ? "all mentors" : "all students"}
                  </strong>{" "}users. This action is logged in Audit Logs and cannot be undone.
                </div>

                <button onClick={handleSendNotification} disabled={notifLoading}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
                  {notifLoading
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <><Send className="w-4 h-4" /> Send Notification</>}
                </button>
              </div>
            </div>
          )}

          {/* ══ AUDIT LOGS ══ */}
          {tab === "audit" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">Audit Logs</h2>
              <p className="text-gray-500 text-sm">All admin actions — credit grants, refunds, withdrawal decisions, notifications.</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left py-3 px-4 rounded-tl-2xl font-semibold">Log ID</th>
                      <th className="text-left py-3 px-4 font-semibold">User</th>
                      <th className="text-left py-3 px-4 font-semibold">Action</th>
                      <th className="text-left py-3 px-4 font-semibold">Details</th>
                      <th className="text-right py-3 px-4 rounded-tr-2xl font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions
                      .filter((t: any) => ["bonus","refund","withdrawal_rejected","withdrawal_completed"].includes(t.type))
                      .map((log: any) => (
                        <tr key={log.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-gray-400">#{log.id}</td>
                          <td className="py-3 px-4 font-bold text-blue-600">#{log.userId}</td>
                          <td className="py-3 px-4">
                            <span className={statusBadge(log.type)}>{log.type.replace(/_/g, " ")}</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 max-w-[300px]">{log.description}</td>
                          <td className="py-3 px-4 text-right text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    {transactions.filter((t: any) => ["bonus","refund","withdrawal_rejected","withdrawal_completed"].includes(t.type)).length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-gray-400">No admin actions recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ FEEDBACK ══ */}
          {tab === "feedback" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">
                User Feedback <span className="text-gray-400 font-normal text-lg">({feedbacks.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedbacks.length === 0
                  ? <p className="text-gray-400">No feedback yet.</p>
                  : feedbacks.map((f: any) => (
                    <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < f.rating ? "fill-orange-400 text-orange-400" : "text-gray-200"}`} />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-gray-700 italic">"{f.text}"</p>
                      <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                        {f.userId ? `User #${f.userId}` : "Anonymous"}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ══ NEWSLETTER ══ */}
          {tab === "newsletter" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  Subscribers <span className="text-gray-400 font-normal text-lg">({subscribers.length})</span>
                </h2>
                <button onClick={exportSubscribers}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Source</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Subscribed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-bold text-gray-900">{s.email}</td>
                        <td className="py-3 px-4">
                          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-semibold">{s.source}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {subscribers.length === 0 && (
                      <tr><td colSpan={3} className="py-10 text-center text-gray-400">No subscribers yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* ══ ANALYTICS ══ */}
          {tab === "analytics" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">Analytics</h2>
              {!analytics ? (
                <div className="py-20 text-center text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><LineChart className="w-4 h-4 text-blue-500" /> User Growth (30 days)</h3>
                    <div className="space-y-1">{(analytics.userGrowth||[]).slice(-7).map((d:any)=>(
                      <div key={d.date} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 w-24 text-xs">{d.date}</span>
                        <div className="flex-1 bg-blue-50 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{width:`${Math.min(100,d.count*5)}%`}}/></div>
                        <span className="font-bold text-blue-600 w-8 text-right">{d.count}</span>
                      </div>
                    ))}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-purple-500" /> Sessions (30 days)</h3>
                    <div className="space-y-1">{(analytics.sessionGrowth||[]).slice(-7).map((d:any)=>(
                      <div key={d.date} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 w-24 text-xs">{d.date}</span>
                        <div className="flex-1 bg-purple-50 rounded-full h-2"><div className="bg-purple-500 h-2 rounded-full" style={{width:`${Math.min(100,d.count*10)}%`}}/></div>
                        <span className="font-bold text-purple-600 w-8 text-right">{d.count}</span>
                      </div>
                    ))}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Revenue (30 days)</h3>
                    <div className="space-y-1">{(analytics.revenueData||[]).slice(-7).map((d:any)=>(
                      <div key={d.date} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-400 w-24 text-xs">{d.date}</span>
                        <div className="flex-1 bg-green-50 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{width:`${Math.min(100,d.revenue/2)}%`}}/></div>
                        <span className="font-bold text-green-600 w-12 text-right">{d.revenue} cr</span>
                      </div>
                    ))}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-orange-500" /> Top Skills</h3>
                    <div className="space-y-2">{(analytics.topSkills||[]).map((s:any,i:number)=>(
                      <div key={s.skill} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">{i+1}</span>{s.skill}</span>
                        <span className="font-bold text-gray-700">{s.count} sessions</span>
                      </div>
                    ))}</div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-2">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Top Mentors</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100"><th className="text-left py-2 px-3 text-gray-500">Mentor</th><th className="text-left py-2 px-3 text-gray-500">Sessions</th><th className="text-left py-2 px-3 text-gray-500">Earned</th><th className="text-left py-2 px-3 text-gray-500">Rating</th></tr></thead>
                      <tbody>{(analytics.topMentors||[]).map((m:any)=>(
                        <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-bold">{m.name}</td>
                          <td className="py-2 px-3 text-purple-600 font-bold">{m.session_count}</td>
                          <td className="py-2 px-3 text-green-600 font-bold">{m.total_earned} cr</td>
                          <td className="py-2 px-3 text-yellow-500 font-bold">{m.average_rating||"N/A"}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ GLOBAL SEARCH ══ */}
          {tab === "search" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">Global Search</h2>
              <div className="flex gap-3">
                <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()}
                  placeholder="Search users, sessions, transactions..." className="flex-1 h-11 px-4 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 outline-none"/>
                <button onClick={handleSearch} className="px-5 h-11 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2">
                  {searchLoading?<RefreshCw className="w-4 h-4 animate-spin"/>:<Search className="w-4 h-4"/>} Search
                </button>
              </div>
              {searchResults && (
                <div className="space-y-5">
                  {searchResults.users?.length>0&&(<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Users className="w-4 h-4"/>Users ({searchResults.users.length})</h3>
                    {searchResults.users.map((u:any)=>(<div key={u.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm">
                      <div><p className="font-bold text-gray-900">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                      <span className="text-gray-500">{u.credits} cr</span>
                    </div>))}
                  </div>)}
                  {searchResults.sessions?.length>0&&(<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4"/>Sessions ({searchResults.sessions.length})</h3>
                    {searchResults.sessions.map((s:any)=>(<div key={s.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm">
                      <div><p className="font-bold text-gray-900">{s.skill}</p><p className="text-xs text-gray-400">{s.student_name} → {s.mentor_name}</p></div>
                      <span className={statusBadge(s.status)}>{s.status}</span>
                    </div>))}
                  </div>)}
                  {searchResults.transactions?.length>0&&(<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4"/>Transactions ({searchResults.transactions.length})</h3>
                    {searchResults.transactions.map((t:any)=>(<div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm">
                      <div><p className="font-bold text-gray-900">{t.name}</p><p className="text-xs text-gray-400 max-w-xs truncate">{t.description}</p></div>
                      <span className={`font-bold ${t.amount<0?"text-red-500":"text-green-600"}`}>{t.amount>0?"+":""}{t.amount} cr</span>
                    </div>))}
                  </div>)}
                  {!searchResults.users?.length&&!searchResults.sessions?.length&&!searchResults.transactions?.length&&(
                    <p className="text-center text-gray-400 py-10">No results for "{searchQuery}"</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ REPORTS ══ */}
          {tab === "reports" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">Reports & Monitoring</h2>
              {!reports?(<div className="py-20 text-center text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2"/>Loading...</div>):(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                    <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4"/>High Cancellation Users</h3>
                    {reports.highRefundUsers?.length===0?<p className="text-sm text-gray-400">No suspicious activity.</p>:reports.highRefundUsers?.map((u:any)=>(
                      <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                        <div><p className="font-bold">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                        <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">{u.cancelled_count} cancels</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm p-5">
                    <h3 className="font-bold text-yellow-600 mb-4 flex items-center gap-2"><UserX className="w-4 h-4"/>Inactive New Users (7d+)</h3>
                    {reports.inactiveNewUsers?.length===0?<p className="text-sm text-gray-400">No inactive users.</p>:reports.inactiveNewUsers?.map((u:any)=>(
                      <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                        <div><p className="font-bold">{u.name}</p><p className="text-xs text-gray-400">{u.email}</p></div>
                        <span className="text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 md:col-span-2">
                    <h3 className="font-bold text-green-600 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4"/>Top Earners</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-gray-100"><th className="text-left py-2 px-3 text-gray-500">Mentor</th><th className="text-left py-2 px-3 text-gray-500">Sessions</th><th className="text-left py-2 px-3 text-gray-500">Earned</th></tr></thead>
                      <tbody>{reports.topEarners?.map((e:any)=>(
                        <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-bold">{e.name}</td>
                          <td className="py-2 px-3 text-purple-600 font-bold">{e.sessions}</td>
                          <td className="py-2 px-3 text-green-600 font-bold">{e.earned} cr</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>

                  {/* ✅ USER-SUBMITTED REPORTS */}
                  <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 md:col-span-2">
                    <h3 className="font-bold text-purple-600 mb-4 flex items-center gap-2">
                      <Flag className="w-4 h-4" />
                      User-Submitted Reports
                      <span className="ml-auto text-xs font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
                        {userReports.filter(r => r.status === "pending").length} pending
                      </span>
                    </h3>
                    {userReports.length === 0 ? (
                      <p className="text-sm text-gray-400 py-4 text-center">No reports submitted yet.</p>
                    ) : (
                      userReports.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50 text-sm last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900">
                              <span className="text-indigo-600">{r.reporterName}</span>
                              <span className="text-gray-400 font-normal mx-1">reported</span>
                              <span className="text-red-600">{r.reportedName}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase text-[10px]">
                                {r.reason?.replace(/_/g, " ")}
                              </span>
                              {r.message && <span className="text-gray-400 truncate max-w-[200px]">"{r.message}"</span>}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(r.createdAt).toLocaleString()}
                              {r.reportedEmail && <span className="ml-2 text-gray-300">• {r.reportedEmail}</span>}
                            </p>
                          </div>
                          {r.status === "pending" ? (
                            <div className="flex gap-1.5 shrink-0 ml-3">
                              <button
                                onClick={() => handleResolveUserReport(r.id, "reviewed")}
                                className="px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition-colors">
                                Reviewed
                              </button>
                              <button
                                onClick={() => handleResolveUserReport(r.id, "dismissed")}
                                className="px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-semibold transition-colors">
                                Dismiss
                              </button>
                            </div>
                          ) : (
                            <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full shrink-0 ml-3 ${
                              r.status === "reviewed" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                            }`}>
                              {r.status}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ══ SETTINGS ══ */}
          {tab === "settings" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-900">Platform Settings</h2>
                <button onClick={handleSaveSettings} disabled={settingsSaving}
                  className="px-5 h-10 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {settingsSaving?<RefreshCw className="w-4 h-4 animate-spin"/>:<Settings className="w-4 h-4"/>} Save Settings
                </button>
              </div>
              {platformSettings?(
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    {key:"sessionFeePercent",label:"Session Platform Fee (%)"},
                    {key:"withdrawalFeePercent",label:"Withdrawal Fee (%)"},
                    {key:"referralBonus",label:"Referral Bonus Credits"},
                    {key:"welcomeCredits",label:"Welcome Credits"},
                    {key:"minWithdrawal",label:"Min Withdrawal Credits"},
                    {key:"creditLockDays",label:"Credit Lock Days"},
                  ].map(f=>(
                    <div key={f.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">{f.label}</label>
                      <input type="number" value={platformSettings[f.key]??""} onChange={e=>setPlatformSettings((s:any)=>({...s,[f.key]:Number(e.target.value)}))}
                        className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl text-lg font-black focus:border-indigo-500 outline-none"/>
                    </div>
                  ))}
                  <div className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 flex items-center justify-between">
                    <div><p className="font-bold text-gray-900">Maintenance Mode</p><p className="text-xs text-gray-400">Disable all user actions</p></div>
                    <button onClick={()=>setPlatformSettings((s:any)=>({...s,maintenanceMode:!s.maintenanceMode}))}
                      className={`w-12 h-6 rounded-full transition-colors ${platformSettings.maintenanceMode?"bg-red-500":"bg-gray-200"}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${platformSettings.maintenanceMode?"translate-x-6":"translate-x-0"}`}/>
                    </button>
                  </div>
                </div>
              ):(<div className="py-20 text-center text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2"/>Loading settings...</div>)}
            </div>
          )}

        </main>
      </div>

      {/* ══ CREDIT MODAL ══ */}
      {creditModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-extrabold text-xl">Manage Credits</h3>
              <button onClick={() => { setCreditModal(null); setCreditAmount(""); setCreditReason(""); }}
                className="text-gray-400 hover:text-gray-900 bg-gray-100 p-1.5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-5">
              <p className="text-xs text-gray-400 mb-0.5">Target User</p>
              <p className="font-bold text-blue-700 flex items-center justify-between">
                {creditModal.name}
                <span className="text-gray-500 font-normal text-xs">Balance: {creditModal.credits} cr</span>
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Amount (Credits)</label>
                <Input type="number" placeholder="e.g. 500" value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)} className="h-10 font-bold" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Reason (for audit log)</label>
                <Input placeholder="e.g. Marketing Bonus, Manual Refund" value={creditReason}
                  onChange={e => setCreditReason(e.target.value)} className="h-10 text-sm" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => handleCredits(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold h-11 rounded-xl shadow-md shadow-green-500/20 transition-colors">
                  <Plus className="w-4 h-4" /> Add Credits
                </button>
                <button onClick={() => handleCredits(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold h-11 rounded-xl shadow-md shadow-red-500/20 transition-colors">
                  <Minus className="w-4 h-4" /> Deduct
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ USER HISTORY MODAL ══ */}
      {historyModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-xl">User History</h3>
                <p className="text-sm text-gray-400">{historyModal.name} · #{historyModal.id} · {historyModal.email}</p>
              </div>
              <button onClick={() => { setHistoryModal(null); setHistoryData(null); }}
                className="text-gray-400 hover:text-gray-900 bg-gray-100 p-1.5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              {historyLoading ? (
                <div className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading history...
                </div>
              ) : historyData ? (
                <>
                  <div>
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Sessions ({historyData.sessions?.length || 0})
                    </h4>
                    {historyData.sessions?.length === 0
                      ? <p className="text-sm text-gray-400">No sessions found.</p>
                      : historyData.sessions?.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm">
                          <div>
                            <p className="font-semibold text-gray-900">{s.skill}</p>
                            <p className="text-xs text-gray-400">
                              {s.mentorId === historyModal.id ? "As Mentor" : "As Student"} · #{s.id}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={statusBadge(s.status)}>{s.status}</span>
                            <p className="text-xs text-gray-400 mt-1">{s.creditsAmount} cr</p>
                          </div>
                        </div>
                      ))
                    }
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Transactions ({historyData.transactions?.length || 0})
                    </h4>
                    {historyData.transactions?.length === 0
                      ? <p className="text-sm text-gray-400">No transactions found.</p>
                      : historyData.transactions?.map((t: any) => {
                          const isDebit = t.amount < 0;
                          return (
                            <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 text-sm">
                              <div>
                                <p className="text-xs text-gray-500 max-w-[340px]">{t.description}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{new Date(t.createdAt).toLocaleString()}</p>
                              </div>
                              <span className={`font-black text-sm ${isDebit ? "text-red-500" : "text-green-600"}`}>
                                {isDebit ? "−" : "+"}{Math.abs(t.amount)} cr
                              </span>
                            </div>
                          );
                        })
                    }
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}