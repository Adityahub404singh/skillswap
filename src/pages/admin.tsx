import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "@/lib/api-utils";
import {
  Users, LayoutDashboard, ClipboardList, BookOpen, CreditCard,
  Trash2, Plus, Minus, X, Shield, TrendingUp, CheckCircle,
  MessageSquare, Mail, Star, History, AlertTriangle, RefreshCw,
  BadgeCheck, Ban, Search, Download, Bell, Send, Filter, Flag,
  ExternalLink, Clock, ChevronDown, Menu,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [adminEmail, setAdminEmail] = useState("");

  // Search / filter states
  const [userSearch, setUserSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("all");

  // Advanced control-room state. These controls operate only on routes
  // implemented by the supplied admin router; unsupported actions are not shown.
  const [controlQuery, setControlQuery] = useState("");
  const [controlResource, setControlResource] = useState("users");
  const [controlPage, setControlPage] = useState(1);
  const [controlPageSize, setControlPageSize] = useState(20);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkReason, setBulkReason] = useState("Reviewed by admin");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailResource, setDetailResource] = useState("user");
  const [detailLoading, setDetailLoading] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [operationLog, setOperationLog] = useState<Array<{id:string; label:string; detail:string; at:string; ok:boolean}>>([]);
  const [quickActionUserId, setQuickActionUserId] = useState("");
  const [quickActionAmount, setQuickActionAmount] = useState("");
  const [quickActionReason, setQuickActionReason] = useState("");
  const [quickActionBusy, setQuickActionBusy] = useState(false);
  const [globalDatePreset, setGlobalDatePreset] = useState("all");

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
  const apiFetch = (path: string, opts?: RequestInit) => {
    const headers = new Headers(opts?.headers);
    headers.set("Accept", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (opts?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(`${API_BASE_URL}/api${path}`, {
      ...opts,
      headers,
      cache: "no-store",
    });
  };

  const readApiJson = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({}))
      : {};
    if (!response.ok) {
      const message = (payload as any)?.error || (payload as any)?.message ||
        `Request failed (${response.status})`;
      throw new Error(message);
    }
    return payload;
  };

  // ─── Fetch all admin data ─────────────────────────────────────
  const getArray = (payload: any, ...keys: string[]): any[] => {
    if (Array.isArray(payload)) return payload;
    for (const key of keys) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    return [];
  };

  const fetchData = async () => {
    setLoading(true);

    // Backend caps page size at 100. Tables show the newest 100 records per resource.
    const requests = [
      ["stats", "/admin/stats"],
      ["users", "/admin/users?page=1&limit=100"],
      ["sessions", "/admin/sessions?page=1&limit=100"],
      ["transactions", "/admin/transactions?page=1&limit=100"],
      ["withdrawals", "/admin/pending-withdrawals"],
    ] as const;

    try {
      const results = await Promise.allSettled(
        requests.map(([, path]) => apiFetch(path).then(readApiJson))
      );

      const payloads: Record<string, any> = {};
      const failed: string[] = [];

      results.forEach((result, index) => {
        const key = requests[index][0];
        if (result.status === "fulfilled") {
          payloads[key] = result.value;
        } else {
          payloads[key] = null;
          failed.push(key);
          console.error(`Admin ${key} request failed:`, result.reason);
        }
      });

      const statsPayload = payloads.stats;
      setStats(statsPayload ?? null);

      setUsers(getArray(payloads.users, "users", "data").map((u: any) => ({
        ...u,
        isPremium: Boolean(u.isPremiumUser ?? u.isPremium),
        isSuspended: Boolean(u.isSuspended),
      })));
      setSessions(getArray(payloads.sessions, "sessions", "data"));
      setTransactions(getArray(payloads.transactions, "transactions", "data"));
      setPendingWithdrawals(getArray(payloads.withdrawals, "withdrawals", "transactions", "data"));

      setLastRefreshed(new Date());

      if (failed.length) {
        toast({
          variant: "destructive",
          title: "Some admin data could not be loaded",
          description: `Failed sections: ${failed.join(", ")}. Check the backend logs.`,
        });
      }
    } catch (error) {
      console.error("Admin dashboard fetch failed:", error);
      toast({
        variant: "destructive",
        title: "Fetch Error",
        description: error instanceof Error ? error.message : "Could not load admin data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) { setLocation("/login"); return; }
    apiFetch("/users/me").then(readApiJson).then(u => setAdminEmail(u.email || "")).catch(() => toast({ variant: "destructive", title: "Admin profile unavailable" }));
    apiFetch("/admin/analytics").then(readApiJson).then(setAnalytics).catch(error => console.error("Analytics fetch failed:", error));
    setCapabilitiesLoading(true);
    apiFetch("/admin/capabilities").then(readApiJson).then(setCapabilities).catch(error => {
      console.error("Admin capabilities fetch failed:", error);
      setCapabilities({ success: false, error: error instanceof Error ? error.message : "Unavailable" });
    }).finally(() => setCapabilitiesLoading(false));
    apiFetch("/admin/health").then(readApiJson).then(setSystemHealth).catch(error => {
      setSystemHealth({ success: false, database: "unavailable", error: error instanceof Error ? error.message : "Health check failed" });
    });
    apiFetch("/admin/reports").then(readApiJson).then(setReports).catch(() => {});
    apiFetch("/admin/user-reports")
      .then(readApiJson)
      .then(d => setUserReports(getArray(d, "reports", "userReports", "data")))
      .catch(error => console.error("User reports fetch failed:", error));
    apiFetch("/admin/settings").then(readApiJson).then(d => setPlatformSettings(d.settings ?? null)).catch(error => {
      console.error("Admin settings fetch failed:", error);
    });
    fetchData();
  }, [token]);

  // Optional live refresh. Disabled by default to avoid unnecessary API traffic.
  useEffect(() => {
    if (!token || !autoRefresh) return;
    const intervalId = window.setInterval(() => {
      void fetchData();
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [token, autoRefresh]);

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
    if (!creditModal || !creditAmount.trim()) return;
    if (!/^\\d+$/.test(creditAmount.trim())) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Enter a whole-number credit amount." });
      return;
    }
    const enteredAmount = Number(creditAmount);
    if (!Number.isSafeInteger(enteredAmount) || enteredAmount <= 0) {
      toast({ variant: "destructive", title: "Invalid amount", description: "Amount must be a positive safe integer." });
      return;
    }
    const amount = enteredAmount * (add ? 1 : -1);
    const res = await apiFetch(`/admin/users/${creditModal.id}/credits`, {
      method: "POST",
      body: JSON.stringify({ amount, reason: creditReason || "Admin adjustment" }),
    });
    const data = await readApiJson(res);
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
    try {
      const res = await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      await readApiJson(res);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, trustScore: -999 } : u));
      toast({ title: "🚫 User Banned", description: `${name} has been banned.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Ban failed", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const handleVerify = async (user: any) => {
    const res = await apiFetch(`/admin/users/${user.id}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ isPremium: !user.isPremium }),
    });
    const data = await readApiJson(res);
    if (data.success) {
      setUsers(prev => prev.map(u => u.id === user.id ? {
        ...u, isPremium: !user.isPremium, isPremiumUser: !user.isPremium,
      } : u));
      toast({ title: "Updated", description: `${user.name} ${!user.isPremium ? "was granted premium" : "had premium removed"}.` });
    }
  };

  const handleResolveUserReport = async (id: number, status: "reviewed" | "dismissed") => {
    try {
      const res = await apiFetch(`/admin/user-reports/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await readApiJson(res);
      setUserReports(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast({ title: status === "reviewed" ? "✅ Marked Reviewed" : "Dismissed" });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not update report", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const handleApprove = async (txId: number) => {
    if (!confirm("Confirm that the actual payout has already been transferred to the user's UPI/bank account. Continue?")) return;

    const payoutReference = prompt(
      "Enter the real UPI transaction ID / bank UTR / payout reference:"
    )?.trim();

    if (!payoutReference) {
      toast({
        variant: "destructive",
        title: "Payout reference required",
        description: "Withdrawal was not marked paid. Complete the real transfer first and enter its reference.",
      });
      return;
    }

    try {
      const res = await apiFetch(`/admin/transactions/${txId}/approve`, {
        method: "POST",
        body: JSON.stringify({ payoutReference }),
      });
      const data = await readApiJson(res);

      if (data.success) {
        toast({ title: "✅ Approved", description: "Withdrawal marked as completed." });
        await fetchData();
      } else {
        throw new Error(data.error || "Could not approve withdrawal.");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleReject = async (txId: number) => {
    if (!confirm("Reject this withdrawal? The backend will refund the credits to the user.")) return;
    const reason = prompt("Enter rejection reason (optional):")?.trim() || "Rejected by admin";
    try {
      const res = await apiFetch(`/admin/transactions/${txId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const data = await readApiJson(res);
      if (data.success) {
        toast({ title: "Withdrawal rejected", description: "Credits were refunded to the user." });
        await fetchData();
      } else {
        throw new Error(data.error || "Could not reject withdrawal.");
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Rejection failed", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const handleResolve = async (sessionId: number, action: string) => {
    const msg = action === "refund_student"
      ? "Cancel this session and refund the student's credits?"
      : "Force-complete this session and credit the mentor (15% fee deducted)?";
    if (!confirm(msg)) return;
    const reason = prompt("Add an admin resolution note (optional):")?.trim() || "";
    try {
      const res = await apiFetch(`/admin/sessions/${sessionId}/resolve`, {
        method: "POST",
        body: JSON.stringify({ action, reason }),
      });
      const data = await readApiJson(res);
      if (!data.success) throw new Error(data.error || "Could not resolve session.");
      toast({ title: "Session resolved", description: data.message || "The session was updated." });
      await fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Resolution failed", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const handleViewHistory = async (user: any) => {
    setHistoryModal(user);
    setHistoryData(null);
    setHistoryLoading(true);
    try {
      const res = await apiFetch(`/admin/user/${user.id}/history`);
      setHistoryData(await readApiJson(res));
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
      const data = await readApiJson(res);
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
  const downloadCSV = (rows: unknown[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    { id: "settings",      label: "Settings",          icon: Settings },
    { id: "control",       label: "Advanced Control",   icon: Shield },
  ];

  // ─── New handlers ───────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await apiFetch(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(await readApiJson(res));
    } catch { } finally { setSearchLoading(false); }
  };

  const handleSuspend = async (userId: number, suspend: boolean, name: string) => {
    const reason = suspend ? prompt(`Reason for suspending ${name}?`) : "Unsuspended by admin";
    if (suspend && !reason) return;
    try {
      const res = await apiFetch(`/admin/users/${userId}/suspend`, {
        method: "PATCH", body: JSON.stringify({ suspend, reason }),
      });
      await readApiJson(res);
      toast({ title: suspend ? "User Suspended" : "User Unsuspended", description: name });
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "User status update failed", description: error instanceof Error ? error.message : "Please try again." });
    }
  };

  const handleLoginAs = async (userId: number, name: string) => {
    if (!confirm(`Login as ${name}? This will give you their session token.`)) return;
    const res = await apiFetch(`/admin/users/${userId}/login-as`, { method: "POST" });
    const data = await readApiJson(res);
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
      const data = await readApiJson(res);
      if (data.success) {
        setPlatformSettings(data.settings);
        toast({ title: "Settings updated", description: data.persistence || "Settings saved by the server." });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Settings update failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSettingsSaving(false);
    }
  };

  // Control-room implementation notes:
  // 1. Every mutating request is sent through apiFetch so the current admin
  //    bearer token and JSON headers are consistently applied.
  // 2. Every response is passed through readApiJson so non-2xx responses
  //    become visible errors instead of silently looking like success.
  // 3. Bulk operations are intentionally sequential. This avoids flooding
  //    the API, makes partial success countable, and keeps failures isolated.
  // 4. Financial approvals are never automated here. The operator must make
  //    the real payout externally and provide its reference to the backend.
  // 5. The data explorer only paginates records already loaded into memory.
  //    Backend list endpoints currently cap a request at 100 records.
  // 6. CSV export quotes every cell and escapes embedded quote characters.
  // 7. The operation trace below is a convenience for this browser session;
  //    it is not represented as a persistent server audit log.
  // 8. Detail inspection calls the backend detail route instead of trusting
  //    potentially stale summary rows from the list endpoint.
  // 9. User selection is held by stable numeric IDs, not array positions,
  //    so filtering or changing the visible page does not change the target.
  // 10. The selected-user bulk actions call the same per-user endpoints as
  //     the single-user controls; no imaginary bulk endpoint is assumed.
  // 11. If one bulk request fails, later selected users are still processed.
  // 12. The final toast reports the successful count and a short failure hint.
  // 13. Date filtering in the explorer is local and uses createdAt values.
  // 14. Date-range fetching is a separate explicit operation against the
  //     backend sessions/date-range and transactions/date-range endpoints.
  // 15. Health and capability requests are informational; they do not grant
  //     privileges or bypass the backend's authorization checks.
  // 16. The UI does not expose login-as because the supplied backend disables
  //     restricted impersonation token issuance.
  // 17. Settings are displayed with the backend's in-memory persistence
  //     limitation so an operator does not mistake them for durable config.
  // 18. Notification delivery uses the server's targetGroup contract.
  // 19. Session resolution requires explicit confirmation because refunds
  //     and mentor payouts affect wallet balances.
  // 20. User deletion is kept in the existing single-user area and is not
  //     included in bulk controls to reduce accidental destructive actions.
  // 21. This panel never displays a password or attempts to retrieve one.
  // 22. Password reset remains a backend action and should only be used after
  //     verifying the account owner and following the platform's support flow.
  // 23. A payout reference is required before the backend marks withdrawal
  //     complete, but the reference itself is not proof that money was sent.
  // 24. The admin should reconcile the reference with the external payment
  //     provider or bank statement before approving the transaction.
  // 25. Browser clipboard and CSV actions are convenience features only.
  // 26. The backend remains the source of truth for every account balance,
  //     session state, permission, and transaction status.
  // 27. Refresh after high-impact operations to reconcile local state.
  // 28. If health checks fail, avoid running bulk operations until the API
  //     and database connection have been investigated.
  // 29. This component does not infer or invent permissions from UI state.
  // 30. Any future route should be added only after confirming its schema in
  //     the backend router and its validation behavior.

  // ─── Advanced control-room operations ─────────────────────────
  const recordOperation = (label: string, detail: string, ok = true) => {
    setOperationLog(prev => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      detail,
      at: new Date().toISOString(),
      ok,
    }, ...prev].slice(0, 40));
  };

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectVisibleUsers = (checked: boolean, visibleUsers: any[]) => {
    const ids = visibleUsers.map(u => Number(u.id)).filter(Number.isFinite);
    setSelectedUserIds(prev => checked
      ? Array.from(new Set([...prev, ...ids]))
      : prev.filter(id => !ids.includes(id)));
  };

  const runBulkUserAction = async (action: "suspend" | "unsuspend" | "premium-on" | "premium-off" | "verify") => {
    if (!selectedUserIds.length || bulkBusy) return;
    const labels: Record<string, string> = {
      suspend: "suspend selected users",
      unsuspend: "unsuspend selected users",
      "premium-on": "grant premium to selected users",
      "premium-off": "remove premium from selected users",
      verify: "verify selected users",
    };
    if (!confirm(`Are you sure you want to ${labels[action]}? This will update ${selectedUserIds.length} accounts.`)) return;
    setBulkBusy(true);
    let succeeded = 0;
    const failures: string[] = [];
    for (const id of selectedUserIds) {
      try {
        let response: Response;
        if (action === "suspend" || action === "unsuspend") {
          response = await apiFetch(`/admin/users/${id}/suspend`, {
            method: "PATCH",
            body: JSON.stringify({ suspend: action === "suspend", reason: bulkReason || "Bulk admin action" }),
          });
        } else if (action === "verify") {
          response = await apiFetch(`/admin/users/${id}/verify`, { method: "PATCH", body: JSON.stringify({ isPremium: true }) });
        } else {
          response = await apiFetch(`/admin/users/${id}/premium`, {
            method: "PATCH",
            body: JSON.stringify({ enabled: action === "premium-on" }),
          });
        }
        await readApiJson(response);
        succeeded += 1;
      } catch (error) {
        failures.push(`#${id}: ${error instanceof Error ? error.message : "failed"}`);
      }
    }
    recordOperation(`Bulk ${action}`, `${succeeded}/${selectedUserIds.length} succeeded${failures.length ? `; ${failures.length} failed` : ""}`, failures.length === 0);
    toast({
      title: `Bulk action: ${succeeded}/${selectedUserIds.length} succeeded`,
      description: failures.slice(0, 2).join(" · ") || "All selected accounts were updated.",
      variant: failures.length ? "destructive" : "default",
    });
    setSelectedUserIds([]);
    setBulkBusy(false);
    await fetchData();
  };

  const runQuickCreditAction = async (add: boolean) => {
    const id = Number(quickActionUserId);
    const amount = Number(quickActionAmount);
    if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Invalid user or amount", description: "Enter a valid user ID and positive whole-number credits." });
      return;
    }
    if (!confirm(`${add ? "Add" : "Deduct"} ${amount} credits for user #${id}?`)) return;
    setQuickActionBusy(true);
    try {
      const response = await apiFetch(`/admin/users/${id}/credits`, {
        method: "POST",
        body: JSON.stringify({ amount: add ? amount : -amount, reason: quickActionReason || "Advanced control room adjustment" }),
      });
      const data = await readApiJson(response);
      recordOperation(add ? "Credit added" : "Credit deducted", `User #${id}; amount ${amount}; balance ${data.newBalance ?? "updated"}`);
      toast({ title: "Wallet updated", description: `User #${id} · new balance ${data.newBalance ?? "updated"}` });
      setQuickActionAmount("");
      await fetchData();
    } catch (error) {
      recordOperation(add ? "Credit add failed" : "Credit deduction failed", error instanceof Error ? error.message : "Request failed", false);
      toast({ variant: "destructive", title: "Wallet update failed", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setQuickActionBusy(false);
    }
  };

  const openAdminDetail = async (resource: "user" | "session", record: any) => {
    setDetailResource(resource);
    setDetailRecord(record);
    setDetailLoading(true);
    try {
      const path = resource === "user"
        ? `/admin/users/${record.id}`
        : `/admin/sessions/${record.id}`;
      const response = await apiFetch(path);
      const data = await readApiJson(response);
      setDetailRecord(data.user ?? data.session ?? data.data ?? data);
    } catch (error) {
      toast({ variant: "destructive", title: "Could not load details", description: error instanceof Error ? error.message : "Please try again." });
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredControlRows = (() => {
    const source = controlResource === "users" ? users : controlResource === "sessions" ? sessions : transactions;
    const q = controlQuery.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;
    return source.filter((row: any) => {
      const searchable = [row.id, row.name, row.email, row.skill, row.description, row.type, row.status, row.userId, row.mentorId, row.studentId]
        .map(value => String(value ?? "").toLowerCase()).join(" ");
      const stamp = row.createdAt ? new Date(row.createdAt).getTime() : 0;
      return (!q || searchable.includes(q)) && (from === null || stamp >= from) && (to === null || stamp <= to);
    });
  })();
  const controlPageCount = Math.max(1, Math.ceil(filteredControlRows.length / controlPageSize));
  const safeControlPage = Math.min(controlPage, controlPageCount);
  const pagedControlRows = filteredControlRows.slice((safeControlPage - 1) * controlPageSize, safeControlPage * controlPageSize);

  const exportControlRows = () => {
    const rows = filteredControlRows.map((row: any) => controlResource === "users"
      ? [row.id, row.name, row.email, row.credits, row.isPremiumUser ?? row.isPremium, row.isSuspended, row.trustScore, row.createdAt]
      : controlResource === "sessions"
        ? [row.id, row.skill, row.mentorId, row.studentId, row.creditsAmount, row.status, row.createdAt]
        : [row.id, row.userId, row.amount, row.type, row.description, row.createdAt]);
    const headers = controlResource === "users"
      ? ["id", "name", "email", "credits", "premium", "suspended", "trustScore", "createdAt"]
      : controlResource === "sessions"
        ? ["id", "skill", "mentorId", "studentId", "credits", "status", "createdAt"]
        : ["id", "userId", "amount", "type", "description", "createdAt"];
    downloadCSV([headers, ...rows], `skillswap_${controlResource}_filtered_${Date.now()}.csv`);
    recordOperation("CSV exported", `${filteredControlRows.length} ${controlResource} rows exported`);
  };

  const runGlobalDateFetch = async () => {
    try {
      const query = dateFrom && dateTo ? `?from=${encodeURIComponent(dateFrom)}&to=${encodeURIComponent(dateTo)}` : "";
      const [sessionResponse, transactionResponse] = await Promise.all([
        apiFetch(`/admin/sessions/date-range${query}`),
        apiFetch(`/admin/transactions/date-range${query}`),
      ]);
      const [sessionPayload, transactionPayload] = await Promise.all([readApiJson(sessionResponse), readApiJson(transactionResponse)]);
      setSessions(getArray(sessionPayload, "sessions", "data"));
      setTransactions(getArray(transactionPayload, "transactions", "data"));
      recordOperation("Date-range data loaded", `${dateFrom || "start"} → ${dateTo || "latest"}`);
      toast({ title: "Date-range data refreshed" });
    } catch (error) {
      toast({ variant: "destructive", title: "Date-range request failed", description: error instanceof Error ? error.message : "Check the selected dates." });
    }
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
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── TOP BAR ── */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 sm:px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle admin navigation"
            className="md:hidden w-9 h-9 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-xl tracking-tight">SkillSwap Admin</h1>
            <p className="text-slate-400 text-xs">{adminEmail}</p>
            <p className={`text-[10px] mt-1 ${systemHealth?.database === "connected" ? "text-emerald-400" : "text-amber-300"}`}>
              ● API {systemHealth?.api || "checking"} · DB {systemHealth?.database || "checking"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setAutoRefresh(v => !v)}
            title="Automatically refresh dashboard data every 60 seconds"
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${autoRefresh ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-slate-400 hover:text-white"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            Auto refresh {autoRefresh ? "ON" : "OFF"}
          </button>
          {lastRefreshed && (
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white disabled:opacity-50 text-xs transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Button variant="outline"
            className="border-white/20 text-white hover:bg-white/10 rounded-full text-xs sm:text-sm px-3 sm:px-4"
            onClick={() => setLocation("/dashboard")}>
            ← Exit Admin
          </Button>
        </div>
      </div>

      <div className="flex relative">

        {/* ── SIDEBAR ── */}
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
          />
        )}
        <aside className={`${mobileMenuOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"} md:flex md:sticky md:top-0 md:self-start md:h-screen md:overflow-y-auto w-64 md:w-56 shrink-0 bg-white border-r border-slate-200 p-3 space-y-1 shadow-xl md:shadow-sm flex-col`}>
          <div className="px-3 py-3 mb-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[0.18em] text-slate-400 uppercase">Workspace</p>
              <p className="text-sm font-extrabold text-slate-800">Control Center</p>
            </div>
            <button type="button" onClick={() => setMobileMenuOpen(false)} className="md:hidden p-2 rounded-lg hover:bg-slate-100" aria-label="Close menu"><X className="w-4 h-4" /></button>
          </div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setMobileMenuOpen(false); }}
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
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 min-h-screen">

          {/* ══ DASHBOARD ══ */}
          {tab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-500 mb-1">Admin workspace</p>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Platform Overview</h2>
                  <p className="text-sm text-slate-500 mt-1">Monitor activity, manage users and keep SkillSwap running smoothly.</p>
                </div>
                <button onClick={() => setTab("notifications")}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-colors">
                  <Bell className="w-3.5 h-3.5" /> Send Notification
                </button>
              </div>

              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                  <div key={s.label} className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-4 flex items-center gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={() => setTab("users")} className="text-left bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow">
                  <span className="text-xs text-indigo-100 font-semibold">Manage community</span>
                  <span className="mt-2 flex items-center justify-between text-lg font-extrabold">View users <Users className="w-5 h-5 opacity-80" /></span>
                </button>
                <button onClick={() => setTab("sessions")} className="text-left bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow">
                  <span className="text-xs text-cyan-100 font-semibold">Learning activity</span>
                  <span className="mt-2 flex items-center justify-between text-lg font-extrabold">Review sessions <BookOpen className="w-5 h-5 opacity-80" /></span>
                </button>
                <button onClick={() => setTab("analytics")} className="text-left bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow">
                  <span className="text-xs text-emerald-100 font-semibold">Platform performance</span>
                  <span className="mt-2 flex items-center justify-between text-lg font-extrabold">Open analytics <LineChart className="w-5 h-5 opacity-80" /></span>
                </button>
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
                <button onClick={() => { const visible = filteredUsers.map((u:any) => Number(u.id)); setSelectedUserIds(prev => Array.from(new Set([...prev, ...visible]))); setTab("control"); }} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700">Select visible for bulk</button>
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
                <table className="w-full min-w-[760px] text-sm">
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
                                {u.isPremiumUser && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
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
                            ? <span className={statusBadge("completed")}>PREMIUM</span>
                            : <span className={statusBadge("active")}>ACTIVE</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => toggleUserSelection(Number(u.id))} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${selectedUserIds.includes(Number(u.id)) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-600 border-indigo-200"}`}>{selectedUserIds.includes(Number(u.id)) ? "Selected" : "Select"}</button>
                                <button onClick={() => handleViewHistory(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors">
                              <History className="w-3 h-3" /> History
                            </button>
                            <button onClick={() => handleVerify(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors">
                              <BadgeCheck className="w-3 h-3" /> {u.isPremium ? "Remove Premium" : "Grant Premium"}
                            </button>
                            <button onClick={() => setCreditModal(u)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 text-xs font-semibold transition-colors">
                              <CreditCard className="w-3 h-3" /> Credits
                            </button>
                            <span title="Requires a restricted, short-lived backend impersonation token."
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs font-semibold cursor-not-allowed">
                              <LogIn className="w-3 h-3" /> Login As Disabled
                            </span>
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
                <table className="w-full min-w-[760px] text-sm">
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
                <table className="w-full min-w-[760px] text-sm">
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
                <table className="w-full min-w-[760px] text-sm">
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
                      const isDebit = t.amount < 0 || t.type === "spent" || String(t.type || "").includes("withdrawal");
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
              <p className="text-gray-500 text-sm">Admin activity is represented by admin_action and wallet transaction ledger entries; this backend does not expose a dedicated audit-log table.</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
                <table className="w-full min-w-[760px] text-sm">
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
                      .filter((t: any) => ["admin_action","admin_deduction","bonus","refund","withdrawal_rejected","withdrawal_completed"].includes(t.type))
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
                    {transactions.filter((t: any) => ["admin_action","admin_deduction","bonus","refund","withdrawal_rejected","withdrawal_completed"].includes(t.type)).length === 0 && (
                      <tr><td colSpan={5} className="py-10 text-center text-gray-400">No admin actions recorded yet.</td></tr>
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
                    <table className="w-full min-w-[760px] text-sm">
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
                    <table className="w-full min-w-[760px] text-sm">
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
                <>
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Backend note: {platformSettings ? "Settings are currently stored in memory and reset when the server restarts. Maintenance mode is a setting value; this backend does not automatically block API actions." : ""}
                </div>
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
                </>
              ):(<div className="py-20 text-center text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2"/>Loading settings...</div>)}
            </div>
          )}

          {/* ══ ADVANCED CONTROL ROOM ══ */}
          {tab === "control" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-600 mb-1">Operator workspace</p>
                  <h2 className="text-3xl font-black tracking-tight text-slate-900">Advanced Control Room</h2>
                  <p className="text-sm text-slate-500 mt-1">Bulk account operations, filtered data explorer, wallet controls and backend capability status.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={fetchData} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh all data
                  </button>
                  <button onClick={() => setTab("audit")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700">
                    <ClipboardList className="h-4 w-4" /> View audit ledger
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  { label: "Loaded users", value: users.length, hint: "Latest API page", tone: "blue" },
                  { label: "Loaded sessions", value: sessions.length, hint: "Latest API page", tone: "violet" },
                  { label: "Transactions", value: transactions.length, hint: "Latest API page", tone: "emerald" },
                  { label: "Pending withdrawals", value: pendingWithdrawals.length, hint: "Needs manual payout review", tone: "amber" },
                ].map(card => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-black text-slate-900 tabular-nums">{card.value}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{card.hint}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-5 gap-5">
                <section className="2xl:col-span-3 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900">Data explorer</h3>
                      <p className="text-xs text-slate-500 mt-1">Search and export the records currently loaded from the backend.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select value={controlResource} onChange={e => { setControlResource(e.target.value); setControlPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold">
                        <option value="users">Users</option><option value="sessions">Sessions</option><option value="transactions">Transactions</option>
                      </select>
                      <button onClick={exportControlRows} className="h-10 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700"><Download className="inline h-3.5 w-3.5 mr-1" /> Export CSV</button>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="md:col-span-3 relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input value={controlQuery} onChange={e => { setControlQuery(e.target.value); setControlPage(1); }} placeholder="Search ID, email, skill, status, description..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400" />
                      </div>
                      <label className="text-[11px] font-bold text-slate-500">From<input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setControlPage(1); }} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-700" /></label>
                      <label className="text-[11px] font-bold text-slate-500">To<input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setControlPage(1); }} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-700" /></label>
                      <label className="text-[11px] font-bold text-slate-500">Rows per page<select value={controlPageSize} onChange={e => { setControlPageSize(Number(e.target.value)); setControlPage(1); }} className="mt-1 block h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-700"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-600"><strong>{filteredControlRows.length}</strong> matching records · page {safeControlPage} of {controlPageCount}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setControlPage(1)} disabled={safeControlPage === 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-40">First</button>
                        <button onClick={() => setControlPage(p => Math.max(1, p - 1))} disabled={safeControlPage === 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-40">Previous</button>
                        <button onClick={() => setControlPage(p => Math.min(controlPageCount, p + 1))} disabled={safeControlPage === controlPageCount} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
                        <button onClick={() => setControlPage(controlPageCount)} disabled={safeControlPage === controlPageCount} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold disabled:opacity-40">Last</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full min-w-[650px] text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr>
                          <th className="px-3 py-3">ID</th><th className="px-3 py-3">Primary detail</th><th className="px-3 py-3">Status / type</th><th className="px-3 py-3">Date</th><th className="px-3 py-3 text-right">Inspect</th>
                        </tr></thead>
                        <tbody>
                          {pagedControlRows.map((row: any) => (
                            <tr key={`${controlResource}-${row.id}`} className="border-t border-slate-100 hover:bg-indigo-50/30">
                              <td className="px-3 py-3 font-mono font-bold text-slate-500">#{row.id}</td>
                              <td className="px-3 py-3"><p className="font-bold text-slate-800">{controlResource === "users" ? (row.name || row.email || "User") : controlResource === "sessions" ? (row.skill || "Session") : (row.description || row.type || "Transaction")}</p><p className="mt-0.5 text-[10px] text-slate-400">{controlResource === "users" ? row.email : controlResource === "sessions" ? `Mentor #${row.mentorId} · Student #${row.studentId}` : `User #${row.userId} · ${row.amount} credits`}</p></td>
                              <td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{row.status || row.type || (row.isSuspended ? "suspended" : "active")}</span></td>
                              <td className="px-3 py-3 text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td>
                              <td className="px-3 py-3 text-right"><button onClick={() => controlResource === "users" || controlResource === "sessions" ? openAdminDetail(controlResource === "users" ? "user" : "session", row) : setDetailRecord(row)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-bold text-indigo-600 hover:bg-indigo-50">View</button></td>
                            </tr>
                          ))}
                          {pagedControlRows.length === 0 && <tr><td colSpan={5} className="px-3 py-12 text-center text-slate-400">No matching records. Try changing the filters.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400">Important: the backend currently caps list requests at 100 rows. This explorer paginates the loaded data locally; it does not claim to show records beyond the fetched API page. CSV export uses the filtered loaded rows.</p>
                  </div>
                </section>

                <section className="2xl:col-span-2 space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between"><div><h3 className="font-extrabold text-slate-900">Bulk user operations</h3><p className="mt-1 text-xs text-slate-500">Select accounts from the Users tab, then apply an action.</p></div><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">{selectedUserIds.length} selected</span></div>
                    <div className="mt-4 rounded-xl bg-slate-50 p-3"><p className="text-[11px] text-slate-600">Selected IDs</p><p className="mt-1 break-all font-mono text-xs font-bold text-slate-800">{selectedUserIds.length ? selectedUserIds.join(", ") : "No users selected"}</p></div>
                    <label className="mt-3 block text-[11px] font-bold text-slate-500">Reason / audit note<input value={bulkReason} onChange={e => setBulkReason(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-normal" /></label>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button disabled={!selectedUserIds.length || bulkBusy} onClick={() => runBulkUserAction("suspend")} className="rounded-xl bg-rose-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">Suspend selected</button>
                      <button disabled={!selectedUserIds.length || bulkBusy} onClick={() => runBulkUserAction("unsuspend")} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">Unsuspend selected</button>
                      <button disabled={!selectedUserIds.length || bulkBusy} onClick={() => runBulkUserAction("premium-on")} className="rounded-xl bg-violet-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40">Grant premium</button>
                      <button disabled={!selectedUserIds.length || bulkBusy} onClick={() => runBulkUserAction("premium-off")} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40">Remove premium</button>
                      <button disabled={!selectedUserIds.length || bulkBusy} onClick={() => runBulkUserAction("verify")} className="col-span-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-bold text-indigo-700 disabled:opacity-40">Verify selected accounts</button>
                    </div>
                    {bulkBusy && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-600"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing selected accounts one by one…</p>}
                    <button onClick={() => setTab("users")} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">Go to Users to select accounts →</button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="font-extrabold text-slate-900">Wallet quick action</h3>
                    <p className="mt-1 text-xs text-slate-500">Uses the backend credit adjustment endpoint and records the reason.</p>
                    <div className="mt-4 space-y-3">
                      <label className="block text-[11px] font-bold text-slate-500">User ID<input value={quickActionUserId} onChange={e => setQuickActionUserId(e.target.value)} placeholder="e.g. 42" inputMode="numeric" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
                      <label className="block text-[11px] font-bold text-slate-500">Credits<input value={quickActionAmount} onChange={e => setQuickActionAmount(e.target.value)} placeholder="e.g. 100" inputMode="numeric" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
                      <label className="block text-[11px] font-bold text-slate-500">Reason<input value={quickActionReason} onChange={e => setQuickActionReason(e.target.value)} placeholder="Reason for adjustment" className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm" /></label>
                      <div className="grid grid-cols-2 gap-2"><button disabled={quickActionBusy} onClick={() => runQuickCreditAction(true)} className="rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-40">Add credits</button><button disabled={quickActionBusy} onClick={() => runQuickCreditAction(false)} className="rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white disabled:opacity-40">Deduct credits</button></div>
                    </div>
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">Backend capability & health</h3><p className="mt-1 text-xs text-slate-500">Live information from /admin/capabilities and /admin/health.</p></div><button onClick={() => { setCapabilitiesLoading(true); Promise.all([apiFetch("/admin/capabilities").then(readApiJson), apiFetch("/admin/health").then(readApiJson)]).then(([c,h]) => { setCapabilities(c); setSystemHealth(h); }).catch(e => toast({ variant: "destructive", title: "Refresh failed", description: e instanceof Error ? e.message : "Request failed" })).finally(() => setCapabilitiesLoading(false)); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">{capabilitiesLoading ? "Checking…" : "Recheck"}</button></div>
                  <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase text-slate-400">API</p><p className="mt-1 text-sm font-black text-slate-800">{systemHealth?.api || "Unknown"}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] uppercase text-slate-400">Database</p><p className="mt-1 text-sm font-black text-slate-800">{systemHealth?.database || "Unknown"}</p></div></div>
                  <div className="mt-4 space-y-2 text-xs">
                    {[
                      ["Login as / impersonation", capabilities?.loginAs ?? capabilities?.impersonation ?? "Disabled / not advertised"],
                      ["Settings persistence", capabilities?.settingsPersistence ?? capabilities?.settings ?? "In-memory in supplied backend"],
                      ["Payout provider", capabilities?.payoutProvider ?? "Manual external payout"],
                      ["Audit source", capabilities?.auditLog ?? "admin_action transactions"],
                    ].map(([label, value]) => <div key={String(label)} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2"><span className="text-slate-500">{label}</span><strong className="max-w-[60%] text-right text-slate-800">{String(value)}</strong></div>)}
                  </div>
                  {capabilities?.error && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-700">Capability response unavailable: {capabilities.error}</p>}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">Date-range operations</h3><p className="mt-1 text-xs text-slate-500">Load sessions and transactions using backend date-range routes.</p></div><Clock className="h-5 w-5 text-slate-400" /></div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-[11px] font-bold text-slate-500">Start date<input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs" /></label><label className="text-[11px] font-bold text-slate-500">End date<input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-xs" /></label></div>
                  <button onClick={runGlobalDateFetch} disabled={!dateFrom || !dateTo} className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-xs font-bold text-white disabled:opacity-40">Fetch date-range sessions + transactions</button>
                  <p className="mt-2 text-[10px] text-slate-400">Both dates are required. This refreshes the sessions and transactions currently held in the dashboard state.</p>
                </section>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="font-extrabold text-slate-900">This-session operation log</h3><p className="mt-1 text-xs text-slate-500">A local activity trace for actions performed in this browser session.</p></div><button onClick={() => setOperationLog([])} className="text-xs font-bold text-slate-500 hover:text-rose-600">Clear log</button></div>
                <div className="divide-y divide-slate-100">
                  {operationLog.length ? operationLog.map(item => <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3"><div className="flex items-start gap-2"><span className={`mt-1 h-2 w-2 rounded-full ${item.ok ? "bg-emerald-500" : "bg-rose-500"}`} /><div><p className="text-xs font-bold text-slate-800">{item.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{item.detail}</p></div></div><time className="text-[10px] text-slate-400">{new Date(item.at).toLocaleString()}</time></div>) : <p className="px-5 py-10 text-center text-xs text-slate-400">No operations recorded in this browser session yet.</p>}
                </div>
              </section>

              {/* Backend route inventory: deliberately limited to endpoints
                  present in the supplied admin router. This is an operator
                  reference, not a claim that every route is exposed as a button. */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div><h3 className="font-extrabold text-slate-900">Backend control inventory</h3><p className="mt-1 text-xs text-slate-500">Route map for the admin API reviewed for this panel.</p></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">Router aligned</span>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[
                    { title: "Platform overview", method: "GET", routes: ["/admin/stats", "/admin/overview", "/admin/health", "/admin/capabilities"] },
                    { title: "User management", method: "GET / PATCH / POST / DELETE", routes: ["/admin/users", "/admin/users/:id", "/admin/users/:id/suspend", "/admin/users/:id/verify", "/admin/users/:id/premium", "/admin/users/:id/credits", "/admin/users/:id/credits/deduct", "/admin/users/:id/reset-password"] },
                    { title: "User activity", method: "GET", routes: ["/admin/user/:id/history", "/admin/users/:id/sessions", "/admin/users/:id/transactions", "/admin/users/search", "/admin/users/status/suspended", "/admin/users/status/premium", "/admin/users/status/unverified"] },
                    { title: "Session operations", method: "GET / PATCH / POST", routes: ["/admin/sessions", "/admin/sessions/:id", "/admin/sessions/:id/cancel", "/admin/sessions/:id/resolve", "/admin/sessions/:id/flag", "/admin/sessions/date-range"] },
                    { title: "Wallet & payouts", method: "GET / POST / PATCH", routes: ["/admin/transactions", "/admin/transactions/date-range", "/admin/pending-withdrawals", "/admin/transactions/:id/complete", "/admin/transactions/:id/approve", "/admin/transactions/:id/reject"] },
                    { title: "Communication", method: "POST", routes: ["/admin/notifications/send", "/admin/notifications/user/:id"] },
                    { title: "Insights & reports", method: "GET / PATCH", routes: ["/admin/analytics", "/admin/analytics/summary", "/admin/reports", "/admin/user-reports", "/admin/user-reports/:id/resolve", "/admin/search"] },
                    { title: "Configuration", method: "GET / PATCH", routes: ["/admin/settings"] },
                  ].map(group => (
                    <div key={group.title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between gap-2"><h4 className="text-xs font-extrabold text-slate-800">{group.title}</h4><span className="rounded-md bg-white px-2 py-1 text-[9px] font-black text-slate-500">{group.method}</span></div>
                      <ul className="mt-3 space-y-1.5">
                        {group.routes.map(route => <li key={route} className="break-all font-mono text-[10px] leading-relaxed text-slate-500">{route}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-extrabold text-amber-900">Sensitive financial actions</p><p className="mt-1 text-[11px] leading-relaxed text-amber-800">Withdrawal approval only marks a payout completed after an actual external transfer and a valid UTR/reference. This panel does not initiate a bank or UPI transfer. Rejection follows the backend refund behavior.</p></div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><p className="text-xs font-extrabold text-indigo-900">Access and persistence limits</p><p className="mt-1 text-[11px] leading-relaxed text-indigo-800">Impersonation is disabled by the backend capability. Settings are in-memory in the supplied router. The operation log on this page is browser-session-local; the backend audit source is admin-action transaction records.</p></div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-extrabold text-slate-900">Operational safety checklist</h3>
                <p className="mt-1 text-xs text-slate-500">Use this checklist before making account, session or wallet changes.</p>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    ["Confirm identity", "Match the user ID and email before changing an account."],
                    ["Keep a reason", "Write a clear reason for suspensions and wallet adjustments."],
                    ["Verify payout first", "Transfer money outside SkillSwap before approving a withdrawal."],
                    ["Resolve disputes carefully", "Review both participants and session history before refunding or paying."],
                    ["Refresh after changes", "Reload server data after important operations to confirm the final state."],
                    ["Export for review", "Download filtered CSV data before offline reconciliation."],
                    ["Protect credentials", "Never share admin tokens or reset links in screenshots or chat."],
                    ["Check backend status", "Confirm API and database health before bulk operations."],
                  ].map(([title, description], index) => (
                    <div key={title} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-indigo-600">{index + 1}</span>
                      <div><p className="text-xs font-extrabold text-slate-800">{title}</p><p className="mt-1 text-[10px] leading-relaxed text-slate-500">{description}</p></div>
                    </div>
                  ))}
                </div>
              </section>
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

      {/* ══ ADVANCED RECORD INSPECTOR ══ */}
      {detailRecord && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={() => { setDetailRecord(null); setDetailLoading(false); }}>
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div><p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Record inspector</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">{detailResource === "user" ? "User details" : detailResource === "session" ? "Session details" : "Transaction details"} · #{detailRecord.id}</h3></div>
              <button onClick={() => setDetailRecord(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-5">
              {detailLoading ? <div className="py-12 text-center text-sm text-slate-400"><RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading authoritative record…</div> : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(detailRecord).map(([key, value]) => (
                    <div key={key} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{key.replace(/([A-Z])/g, " $1")}</p>
                      <p className="mt-1 break-words text-xs font-semibold text-slate-800">{value === null || value === undefined ? "—" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 p-4 text-right"><button onClick={() => { navigator.clipboard.writeText(JSON.stringify(detailRecord, null, 2)); toast({ title: "Record JSON copied" }); }} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">Copy record JSON</button></div>
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