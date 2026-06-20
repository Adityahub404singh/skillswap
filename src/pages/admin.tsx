import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";
import {
  Users, LayoutDashboard, ClipboardList, BookOpen, CreditCard,
  Trash2, Plus, Minus, X, Shield, TrendingUp, CheckCircle,
  MessageSquare, Mail, Star, History, AlertTriangle, RefreshCw,
  ChevronDown, ChevronUp, BadgeCheck, Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const token = useAuthStore(s => s.token);
  const { toast } = useToast();

  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [adminEmail, setAdminEmail] = useState("");

  // Modal states
  const [creditModal, setCreditModal] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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
          apiFetch("/admin/pending-withdrawals").then(r => r.json()),    // ✅ NEW endpoint
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
    } catch (e) {
      toast({ variant: "destructive", title: "Fetch Error", description: "Could not load admin data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { setLocation("/login"); return; }
    apiFetch("/users/me").then(r => r.json()).then(u => setAdminEmail(u.email || ""));
    fetchData();
  }, [token]);

  // ─── Actions ─────────────────────────────────────────────────

  // Credits add/deduct
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

  // Ban user
  const handleBanUser = async (id: number, name: string) => {
    if (!confirm(`Ban ${name}? Their trust score will be set to -999.`)) return;
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    setUsers(users.map(u => u.id === id ? { ...u, trustScore: -999 } : u));
    toast({ title: "🚫 User Banned", description: `${name} has been banned.` });
  };

  // Toggle Premium/Verified
  const handleVerify = async (user: any) => {
    const res = await apiFetch(`/admin/users/${user.id}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ isPremium: !user.isPremium }),
    });
    const data = await res.json();
    if (data.success) {
      setUsers(users.map(u => u.id === user.id ? { ...u, isPremium: !u.isPremium } : u));
      toast({ title: "Updated", description: `${user.name} is now ${!user.isPremium ? "✅ Verified" : "Unverified"}.` });
    }
  };

  // Approve withdrawal
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

  // Reject & refund withdrawal
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

  // Resolve session dispute
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

  // View user history  ← NEW endpoint /admin/user/:id/history
  const handleViewHistory = async (user: any) => {
    setHistoryModal(user);
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      const res = await apiFetch(`/admin/user/${user.id}/history`);
      const data = await res.json();
      setHistoryData(data);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not load history." });
    } finally {
      setHistoryLoading(false);
    }
  };

  // Export subscribers CSV
  const exportCSV = () => {
    const csv = ["Email,Source,Subscribed On",
      ...subscribers.map(s => `${s.email},${s.source},${new Date(s.createdAt).toLocaleDateString()}`)
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "skillswap_subscribers.csv";
    a.click();
  };

  // ─── Tabs config ─────────────────────────────────────────────
  const tabs = [
    { id: "dashboard",    label: "Dashboard",        icon: LayoutDashboard },
    { id: "users",        label: "Users",             icon: Users },
    { id: "sessions",     label: "Sessions",          icon: BookOpen },
    { id: "withdrawals",  label: "Withdrawals",       icon: CreditCard, badge: pendingWithdrawals.length },
    { id: "transactions", label: "All Transactions",  icon: TrendingUp },
    { id: "audit",        label: "Audit Logs",        icon: ClipboardList },
    { id: "feedback",     label: "Feedback",          icon: MessageSquare, badge: feedbacks.length },
    { id: "newsletter",   label: "Subscribers",       icon: Mail },
  ];

  // ─── Helpers ─────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: "bg-green-100 text-green-700",
      requested: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-700",
      active:    "bg-purple-100 text-purple-700",
      withdrawal_pending:   "bg-orange-100 text-orange-700",
      withdrawal_completed: "bg-green-100 text-green-700",
      withdrawal_rejected:  "bg-red-100 text-red-700",
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
        <div className="flex items-center gap-3">
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
              <h2 className="text-2xl font-extrabold text-gray-900">Platform Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Users",      value: stats?.totalUsers,         color: "text-blue-600",   bg: "bg-blue-50",   icon: Users },
                  { label: "Total Sessions",   value: stats?.totalSessions,      color: "text-purple-600", bg: "bg-purple-50", icon: BookOpen },
                  { label: "Completed",        value: stats?.completedSessions,  color: "text-green-600",  bg: "bg-green-50",  icon: CheckCircle },
                  { label: "Platform Profit",  value: `₹${stats?.platformRevenue ?? 0}`, color: "text-emerald-600", bg: "bg-emerald-50", icon: TrendingUp },
                  { label: "Credits in System",value: stats?.totalCreditsInSystem ?? 0, color: "text-orange-600", bg: "bg-orange-50", icon: CreditCard },
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
                <h2 className="text-2xl font-extrabold text-gray-900">Platform Users <span className="text-gray-400 font-normal text-lg">({users.length})</span></h2>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">User</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Credits</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Sessions</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Status</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {u.name?.[0] || "?"}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 flex items-center gap-1">
                                {u.name}
                                {u.isPremium && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                              </p>
                              <p className="text-xs text-gray-400">#{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{u.email}</td>
                        <td className="py-3 px-4 font-black text-blue-600">{u.credits} cr</td>
                        <td className="py-3 px-4 text-gray-700">{u.sessionsCompleted}</td>
                        <td className="py-3 px-4">
                          {u.trustScore <= -999
                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">BANNED</span>
                            : u.isPremium
                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-600">VERIFIED</span>
                            : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">ACTIVE</span>
                          }
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
                            <button onClick={() => handleBanUser(u.id, u.name)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors">
                              <Ban className="w-3 h-3" /> Ban
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ SESSIONS ══ */}
          {tab === "sessions" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">All Sessions <span className="text-gray-400 font-normal text-lg">({sessions.length})</span></h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/70">
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Skill</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Mentor ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Student ID</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Credits</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Status</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-mono text-xs text-gray-400">#{s.id}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{s.skill}</td>
                        <td className="py-3 px-4 text-blue-600 font-semibold">#{s.mentorId}</td>
                        <td className="py-3 px-4 text-purple-600 font-semibold">#{s.studentId}</td>
                        <td className="py-3 px-4 font-black text-gray-700">{s.creditsAmount} cr</td>
                        <td className="py-3 px-4"><span className={statusBadge(s.status)}>{s.status}</span></td>
                        <td className="py-3 px-4 text-right">
                          {s.status !== "completed" && s.status !== "cancelled" && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleResolve(s.id, "refund_student")}
                                className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors">
                                Refund Student
                              </button>
                              <button onClick={() => handleResolve(s.id, "pay_mentor")}
                                className="px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition-colors">
                                Pay Mentor
                              </button>
                            </div>
                          )}
                          {(s.status === "completed" || s.status === "cancelled") && (
                            <span className="text-xs text-gray-400">Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr><td colSpan={7} className="py-10 text-center text-gray-400">No sessions yet.</td></tr>
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
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">UPI / Details</th>
                      <th className="text-left py-3 px-4 text-gray-500 font-semibold">Requested</th>
                      <th className="text-right py-3 px-4 text-gray-500 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWithdrawals.map((t: any) => (
                      <tr key={t.id} className="border-b border-gray-50 hover:bg-orange-50/30">
                        <td className="py-3 px-4 font-mono text-xs text-gray-400">#{t.id}</td>
                        <td className="py-3 px-4 font-bold text-blue-600">#{t.userId}</td>
                        <td className="py-3 px-4 font-black text-red-500">{Math.abs(t.amount)} cr</td>
                        <td className="py-3 px-4 text-xs text-gray-600 max-w-[240px] truncate">{t.description}</td>
                        <td className="py-3 px-4 text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleApprove(t.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors shadow-sm">
                              <CheckCircle className="w-3 h-3" /> Mark Paid
                            </button>
                            <button onClick={() => handleReject(t.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors shadow-sm">
                              <X className="w-3 h-3" /> Reject & Refund
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pendingWithdrawals.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center">
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
              <h2 className="text-2xl font-extrabold text-gray-900">All Transactions <span className="text-gray-400 font-normal text-lg">({transactions.length})</span></h2>
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
                    {transactions.map((t: any) => {
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
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ AUDIT LOGS ══ */}
          {tab === "audit" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold text-gray-900">Audit Logs</h2>
              <p className="text-gray-500 text-sm">All admin actions — credit grants, refunds, withdrawal decisions.</p>
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
                      .filter((t: any) => ["bonus", "refund", "withdrawal_rejected", "withdrawal_completed"].includes(t.type))
                      .map((log: any) => (
                        <tr key={log.id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-xs text-gray-400">#{log.id}</td>
                          <td className="py-3 px-4 font-bold text-blue-600">#{log.userId}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              log.type === "bonus"                 ? "bg-green-100 text-green-700" :
                              log.type === "refund"               ? "bg-amber-100 text-amber-700" :
                              log.type === "withdrawal_rejected"  ? "bg-red-100 text-red-700" :
                                                                    "bg-blue-100 text-blue-700"
                            }`}>
                              {log.type.replace(/_/g, " ")}
                            </span>
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
              <h2 className="text-2xl font-extrabold text-gray-900">User Feedback <span className="text-gray-400 font-normal text-lg">({feedbacks.length})</span></h2>
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
                <h2 className="text-2xl font-extrabold text-gray-900">Subscribers <span className="text-gray-400 font-normal text-lg">({subscribers.length})</span></h2>
                <Button size="sm" variant="outline" onClick={exportCSV} className="rounded-xl">
                  Export CSV
                </Button>
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
                <p className="text-sm text-gray-400">{historyModal.name} · #{historyModal.id}</p>
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
                  {/* Sessions */}
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

                  {/* Transactions */}
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
