import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";
import { Users, LayoutDashboard, BookOpen, CreditCard, Trash2, Plus, Minus, X, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_EMAILS = ["singhaditya456610@gmail.com", "admin@skillswap.com"];

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const token = useAuthStore(s => s.token);
  const [tab, setTab] = useState("dashboard");
  const [creditModal, setCreditModal] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState("");

  const apiFetch = (path: string, opts?: any) =>
    fetch(`${API_BASE_URL}/api${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...opts?.headers }
    });

  useEffect(() => {
    if (!token) { setLocation("/login"); return; }
    apiFetch("/users/me").then(r => r.json()).then(u => {
      setUserEmail(u.email);
      // admin check disabled
    });
    apiFetch("/admin/stats").then(r => r.json()).then(setStats);
    apiFetch("/admin/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    apiFetch("/admin/sessions").then(r => r.json()).then(d => setSessions(Array.isArray(d) ? d : []));
    apiFetch("/admin/transactions").then(r => r.json()).then(d => setTransactions(Array.isArray(d) ? d : []));
  }, [token]);

  const handleCredits = async (add: boolean) => {
    if (!creditModal || !creditAmount) return;
    const amount = parseInt(creditAmount) * (add ? 1 : -1);
    await apiFetch(`/admin/users/${creditModal.id}/credits`, {
      method: "POST",
      body: JSON.stringify({ amount, reason: creditReason || "Admin adjustment" })
    });
    setCreditModal(null); setCreditAmount(""); setCreditReason("");
    apiFetch("/admin/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    apiFetch("/admin/stats").then(r => r.json()).then(setStats);
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    setUsers(users.filter(u => u.id !== id));
  };

  const handleCancelSession = async (id: number) => {
    await apiFetch(`/admin/sessions/${id}/cancel`, { method: "PATCH" });
    setSessions(sessions.map(s => s.id === id ? { ...s, status: "cancelled" } : s));
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "sessions", label: "Sessions", icon: BookOpen },
    { id: "transactions", label: "Transactions", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Header */}
      <div className="bg-gradient-premium px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl">SkillSwap Admin</h1>
            <p className="text-white/70 text-xs">{userEmail}</p>
          </div>
        </div>
        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full text-sm"
          onClick={() => setLocation("/dashboard")}>
          Back to App
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-52 min-h-screen border-r border-border/50 p-3 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-muted'
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">

          {tab === "dashboard" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold">Platform Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Total Sessions", value: stats?.totalSessions, icon: BookOpen, color: "text-cyan-500", bg: "bg-cyan-500/10" },
                  { label: "Completed", value: stats?.completedSessions, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
                  { label: "Credits in System", value: stats?.totalCreditsInSystem, icon: CreditCard, color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map(s => (
                  <div key={s.label} className="card-premium flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-xl font-bold">{s.value ?? '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card-premium">
                <h3 className="font-bold mb-4">Recent Signups</h3>
                <div className="space-y-3">
                  {stats?.recentUsers?.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{u.credits} cr</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold">Users ({users.length})</h2>
              <div className="card-premium overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">User</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Email</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Credits</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Sessions</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Actions</th>
                  </tr></thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">{u.name.charAt(0)}</div>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{u.email}</td>
                        <td className="py-3 px-2 font-bold text-primary">{u.credits}</td>
                        <td className="py-3 px-2">{u.sessionsCompleted}</td>
                        <td className="py-3 px-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg" onClick={() => setCreditModal(u)}>
                              <CreditCard className="w-3 h-3 mr-1" />Credits
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg text-destructive border-destructive/30" onClick={() => handleDeleteUser(u.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "sessions" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold">Sessions ({sessions.length})</h2>
              <div className="card-premium overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">ID</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Skill</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Status</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Date</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Action</th>
                  </tr></thead>
                  <tbody>
                    {sessions.map((s: any) => (
                      <tr key={s.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 text-muted-foreground">#{s.id}</td>
                        <td className="py-3 px-2 font-medium">{s.skill}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                            s.status === 'pending' ? 'bg-amber-500/10 text-amber-600' :
                            s.status === 'cancelled' ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'
                          }`}>{s.status}</span>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{new Date(s.scheduledDate).toLocaleDateString()}</td>
                        <td className="py-3 px-2">
                          {s.status !== 'cancelled' && s.status !== 'completed' && (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive border-destructive/30 rounded-lg" onClick={() => handleCancelSession(s.id)}>
                              <X className="w-3 h-3 mr-1" />Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "transactions" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-extrabold">Transactions</h2>
              <div className="card-premium overflow-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">User</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Amount</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Type</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Description</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-semibold">Date</th>
                  </tr></thead>
                  <tbody>
                    {transactions.map((t: any) => (
                      <tr key={t.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-2 text-muted-foreground">#{t.userId}</td>
                        <td className="py-3 px-2 font-bold">
                          <span className={t.amount > 0 ? 'text-green-600' : 'text-red-600'}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
                        </td>
                        <td className="py-3 px-2"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">{t.type}</span></td>
                        <td className="py-3 px-2 text-muted-foreground text-xs max-w-xs truncate">{t.description}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Credit Modal */}
      {creditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-premium w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Manage Credits</h3>
              <button onClick={() => setCreditModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              <span className="font-semibold text-foreground">{creditModal.name}</span> — {creditModal.credits} credits
            </p>
            <div className="space-y-3">
              <Input placeholder="Amount (e.g. 50)" type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} />
              <Input placeholder="Reason" value={creditReason} onChange={e => setCreditReason(e.target.value)} />
              <div className="flex gap-3">
                <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleCredits(true)}>
                  <Plus className="w-4 h-4 mr-1" />Add
                </Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={() => handleCredits(false)}>
                  <Minus className="w-4 h-4 mr-1" />Remove
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
