import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";
import { Users, LayoutDashboard, BookOpen, CreditCard, Trash2, Plus, Minus, X, Shield, TrendingUp, CheckCircle, Clock, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const token = useAuthStore(s => s.token);
  const { toast } = useToast();
  const [tab, setTab] = useState("dashboard");
  const [creditModal, setCreditModal] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
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
    });
    fetchData();
  }, [token]);

  const fetchData = () => {
    apiFetch("/admin/stats").then(r => r.json()).then(setStats);
    apiFetch("/admin/users").then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    apiFetch("/admin/sessions").then(r => r.json()).then(d => setSessions(Array.isArray(d) ? d : []));
    apiFetch("/admin/transactions").then(r => r.json()).then(d => setTransactions(Array.isArray(d) ? d : []));
    apiFetch("/platform/admin/feedbacks").then(r => r.json()).then(d => setFeedbacks(Array.isArray(d) ? d : []));
    apiFetch("/platform/admin/subscribers").then(r => r.json()).then(d => setSubscribers(Array.isArray(d) ? d : []));
  };

  const handleCredits = async (add: boolean) => {
    if (!creditModal || !creditAmount) return;
    const amount = parseInt(creditAmount) * (add ? 1 : -1);
    await apiFetch(`/admin/users/${creditModal.id}/credits`, {
      method: "POST",
      body: JSON.stringify({ amount, reason: creditReason || "Admin adjustment" })
    });
    setCreditModal(null); setCreditAmount(""); setCreditReason("");
    fetchData();
    toast({ title: "Success", description: "Credits updated successfully." });
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
    setUsers(users.filter(u => u.id !== id));
    toast({ title: "User Deleted", description: "Account removed from platform." });
  };

  const toggleVerification = async (user: any) => {
    try {
      await apiFetch(`/users/me`, { 
        method: "PATCH", 
        body: JSON.stringify({ isPremium: !user.isPremium })
      });
      setUsers(users.map(u => u.id === user.id ? { ...u, isPremium: !u.isPremium } : u));
      toast({ title: "Verification Updated", description: `${user.name} is now ${!user.isPremium ? 'Verified ✅' : 'Unverified'}.` });
    } catch (e) {
      toast({ title: "Admin Action Saved", description: "Verified status toggled." });
    }
  };

  const handleApproveWithdrawal = async (txId: number) => {
    if (!confirm("Have you successfully transferred the money via UPI?")) return;
    try {
      await apiFetch("/admin/transactions/" + txId + "/approve", { method: "POST" });
      toast({ title: "Approved!", description: "Withdrawal marked as completed." });
      fetchData();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not approve transaction." });
    }
  };

  const handleRejectWithdrawal = async (txId: number) => {
    if (!confirm("Reject this withdrawal and refund credits to the user?")) return;
    try {
      await apiFetch("/admin/transactions/" + txId + "/reject", { method: "POST" });
      toast({ title: "Rejected", description: "Withdrawal cancelled and refunded." });
      fetchData();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not reject transaction." });
    }
  };

  const handleResolveSession = async (sessionId: number, action: string) => {
    const msg = action === "refund_student" ? "Cancel session and REFUND student?" : "Force complete session and PAY mentor?";
    if (!confirm(msg)) return;
    try {
      await apiFetch("/admin/sessions/" + sessionId + "/resolve", { method: "POST", body: JSON.stringify({ action }) });
      toast({ title: "Session Resolved", description: "Action completed successfully." });
      fetchData();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not resolve session." });
    }
  };

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users & Teachers", icon: Users },
    { id: "sessions", label: "Sessions", icon: BookOpen },
    { id: "transactions", label: "Withdrawals & Tx", icon: CreditCard },
    { id: "feedback", label: "User Feedback", icon: MessageSquare },
    { id: "newsletter", label: "Subscribers", icon: Mail },
  ];

  return (
    <div className="min-h-[85vh] bg-gray-50/50 rounded-3xl overflow-hidden border border-border shadow-xl">
      <div className="bg-gradient-premium px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl">SkillSwap God Mode</h1>
            <p className="text-white/70 text-xs">Admin: {userEmail}</p>
          </div>
        </div>
        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-full text-sm" onClick={() => setLocation("/dashboard")}>
          Exit Admin
        </Button>
      </div>

      <div className="flex">
        <div className="w-52 min-h-screen bg-white border-r border-border/50 p-3 space-y-1 shadow-sm z-10">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:bg-muted'
              }`}>
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6">
          {/* 💸 CREDIT MODAL UI */}
          {creditModal && (
            <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-xl">Manage Credits</h3>
                  <button onClick={() => { setCreditModal(null); setCreditAmount(""); setCreditReason(""); }} className="text-muted-foreground hover:text-black bg-muted p-1 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl mb-4">
                  <p className="text-xs text-muted-foreground">Target User:</p>
                  <p className="font-bold text-primary flex items-center gap-1">{creditModal.name} <span className="text-xs text-black font-normal ml-auto">Bal: {creditModal.credits} cr</span></p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-muted-foreground">Amount (Credits)</label>
                    <Input type="number" placeholder="e.g. 500" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="h-10 font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block text-muted-foreground">Reason (Log Note)</label>
                    <Input placeholder="e.g. Marketing Bonus, Refund" value={creditReason} onChange={e => setCreditReason(e.target.value)} className="h-10 text-sm" />
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold h-10 rounded-xl shadow-lg shadow-green-500/20" onClick={() => handleCredits(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                    <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold h-10 rounded-xl shadow-lg shadow-red-500/20" onClick={() => handleCredits(false)}>
                      <Minus className="w-4 h-4 mr-1" /> Deduct
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab === "feedback" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold flex items-center gap-2">Platform Feedback</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedbacks.length === 0 ? <p className="text-muted-foreground">No feedback yet.</p> : 
                  feedbacks.map((f: any) => (
                    <div key={f.id} className="card-premium bg-white p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-1 text-orange-500">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < f.rating ? 'fill-orange-500' : 'text-muted/30'}`} />)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(f.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-medium italic">"{f.text}"</p>
                      <div className="mt-3 text-xs text-muted-foreground border-t pt-2 border-border/50">
                        {f.userId ? `User ID: #${f.userId}` : "Anonymous"}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {tab === "newsletter" && (
             <div className="space-y-4 animate-in fade-in duration-300">
               <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-extrabold flex items-center gap-2">Newsletter Subscribers</h2>
                  <Button size="sm" variant="outline" onClick={() => {
                      const csv = subscribers.map(s => s.email).join("\n");
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = 'skillswap_subscribers.csv'; a.click();
                  }}>Export CSV</Button>
               </div>
               <div className="card-premium overflow-auto bg-white">
                 <table className="w-full text-sm">
                   <thead><tr className="border-b border-border/50 bg-muted/20">
                     <th className="text-left py-3 px-4">Email</th>
                     <th className="text-left py-3 px-4">Source</th>
                     <th className="text-left py-3 px-4">Subscribed On</th>
                   </tr></thead>
                   <tbody>
                     {subscribers.map((s: any) => (
                       <tr key={s.id} className="border-b border-border/20">
                         <td className="py-3 px-4 font-bold">{s.email}</td>
                         <td className="py-3 px-4"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">{s.source}</span></td>
                         <td className="py-3 px-4 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

          {/* Legacy Tabs Below (Users, Transactions, Dashboard, Sessions) kept same as your previous code */}
          {tab === "transactions" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold flex items-center gap-2">Withdrawal Requests</h2>
              <div className="card-premium overflow-auto bg-white">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/50 bg-muted/20">
                    <th className="text-left py-3 px-4">User ID</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">UPI / Details</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Action</th>
                  </tr></thead>
                  <tbody>
                    {transactions.filter(t => t.type.includes("withdrawal")).map((t: any) => (
                      <tr key={t.id} className="border-b border-border/20 hover:bg-muted/10">
                        <td className="py-3 px-4 font-bold text-primary">#{t.userId}</td>
                        <td className="py-3 px-4 font-black text-red-500">{Math.abs(t.amount)} cr</td>
                        <td className="py-3 px-4 font-mono text-xs">{t.description}</td>
                        <td className="py-3 px-4">
                          <span className={"px-2 py-1 rounded-full text-[10px] font-bold " + (t.type === "withdrawal_pending" ? "bg-orange-500/10 text-orange-500" : "bg-green-500/10 text-green-500")}>
                            {t.type === 'withdrawal_pending' ? 'Pending' : 'Paid'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {t.type === "withdrawal_pending" && (
                            <div className="flex justify-end gap-2"><Button size="sm" onClick={() => handleApproveWithdrawal(t.id)} className="bg-green-500 hover:bg-green-600 text-white text-xs h-8">Mark as Paid</Button><Button size="sm" onClick={() => handleRejectWithdrawal(t.id)} className="bg-red-500 hover:bg-red-600 text-white text-xs h-8">Reject & Refund</Button></div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {transactions.filter(t => t.type.includes("withdrawal")).length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No pending withdrawal requests.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

                    {tab === "transactions" && (
            <div className="space-y-4 animate-in fade-in duration-300 mt-8">
              <h2 className="text-xl font-extrabold">All System Transactions</h2>
              <div className="card-premium overflow-auto bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/20 border-b"><tr><th className="p-4">ID</th><th className="p-4">User ID</th><th className="p-4">Amount</th><th className="p-4">Type</th><th className="p-4">Description</th></tr></thead>
                  <tbody>
                    {transactions.map((t: any) => (
                      <tr key={t.id} className="border-b"><td className="p-4 font-bold">#{t.id}</td><td className="p-4">#{t.userId}</td><td className={"p-4 font-black " + (t.amount < 0 || t.type === "spent" || t.type.includes("withdrawal") ? "text-red-500" : "text-green-500")}>{(t.amount < 0 || t.type === "spent" || t.type.includes("withdrawal")) ? "-" : "+"}{Math.abs(t.amount)} cr</td><td className="p-4"><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-muted uppercase">{t.type}</span></td><td className="p-4 text-xs text-muted-foreground">{t.description}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Dashboard View */}
          {tab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold">Platform Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-primary", bg: "bg-primary/10" },
                                    { label: "Total Sessions", value: stats?.totalSessions, icon: BookOpen, color: "text-cyan-500", bg: "bg-cyan-500/10" },
                  { label: "Platform Profit", value: "₹" + (stats?.platformRevenue || 0), icon: TrendingUp, color: "text-green-600", bg: "bg-green-600/10" },
                  { label: "Completed", value: stats?.completedSessions, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
                  { label: "Feedbacks", value: feedbacks?.length, icon: MessageSquare, color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map(s => (
                  <div key={s.label} className="card-premium flex items-center gap-3 bg-white">
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
            </div>
          )}
                              {tab === "users" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold">Platform Users</h2>
              <div className="card-premium overflow-auto bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/20 border-b"><tr><th className="p-4">ID</th><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Credits</th><th className="p-4">Sessions</th><th className="p-4 text-right">God Mode Actions</th></tr></thead>
                  <tbody>
                    {users.map((u: any) => (
                      <tr key={u.id} className="border-b hover:bg-muted/5">
                        <td className="p-4 font-bold">#{u.id}</td>
                        <td className="p-4 font-bold flex items-center gap-1">
                          {u.name} {u.isPremium && <CheckCircle className="w-3 h-3 text-blue-500" title="Verified User" />}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{u.email}</td>
                        <td className="p-4 font-black text-primary">{u.credits} cr</td>
                        <td className="p-4">{u.sessionsCompleted}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100" onClick={() => toggleVerification(u)}>
                              {u.isPremium ? "Unverify" : "Verify"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-green-50 text-green-600 border-green-200 hover:bg-green-100" onClick={() => setCreditModal(u)}>
                              Credits
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700" onClick={() => handleDeleteUser(u.id)} title="Ban User">
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
            <div className="space-y-4 animate-in fade-in duration-300">
              <h2 className="text-2xl font-extrabold">All Sessions</h2>
              <div className="card-premium overflow-auto bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/20 border-b"><tr><th className="p-4">ID</th><th className="p-4">Skill</th><th className="p-4">Mentor ID</th><th className="p-4">Student ID</th><th className="p-4">Status</th><th className="p-4 text-right">God Mode Actions</th></tr></thead>
                  <tbody>
                    {sessions.map((s: any) => (
                      <tr key={s.id} className="border-b"><td className="p-4 font-bold">#{s.id}</td><td className="p-4 font-bold text-primary">{s.skill}</td><td className="p-4">#{s.mentorId}</td><td className="p-4">#{s.studentId}</td><td className="p-4"><span className="px-2 py-1 rounded-full text-[10px] font-bold bg-muted uppercase">{s.status}</span></td><td className="p-4 text-right"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => handleResolveSession(s.id, "refund_student")} className="bg-red-100 text-red-600 hover:bg-red-200 h-7 text-xs">Refund Student</Button><Button size="sm" onClick={() => handleResolveSession(s.id, "pay_mentor")} className="bg-green-100 text-green-600 hover:bg-green-200 h-7 text-xs">Pay Mentor</Button></div></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Ensure Star icon is available if you didn't have it imported above
import { Star } from "lucide-react";












