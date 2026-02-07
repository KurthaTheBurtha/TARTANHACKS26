"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  MessageCircle,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowRight,
  DollarSign,
  Shield,
  Activity,
  StickyNote,
  Plus,
  X,
  FileBarChart,
  Loader2,
} from "lucide-react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_CAREMAP_BACKEND_URL ||
  "http://localhost:8000";
import Link from "next/link";

type Note = {
  id: string;
  subject: string;
  description: string;
  createdAt: string;
};

const quickActions = [
  {
    icon: FileText,
    title: "Upload Bill",
    description: "Analyze a new medical document",
    path: "/documents",
    color: "secondary",
  },
  {
    icon: MessageCircle,
    title: "Ask Question",
    description: "Get insurance-aware answers",
    path: "/chat",
    color: "primary",
  },
  {
    icon: MapPin,
    title: "Find Care",
    description: "Locate in-network providers",
    path: "/care-map",
    color: "success",
  },
];

const recentBills = [
  { id: 1, provider: "City Medical Center", date: "Jan 15, 2024", amount: 450.00, status: "pending" },
  { id: 2, provider: "Valley Lab Services", date: "Jan 8, 2024", amount: 125.50, status: "paid" },
  { id: 3, provider: "Downtown Imaging", date: "Dec 28, 2023", amount: 875.00, status: "insurance" },
];

const upcomingAppointments = [
  { id: 1, provider: "Dr. Sarah Chen", specialty: "Primary Care", date: "Feb 12, 2024", time: "10:30 AM" },
  { id: 2, provider: "Quest Diagnostics", specialty: "Lab Work", date: "Feb 18, 2024", time: "8:00 AM" },
];

const NOTES_STORAGE_KEY = "caremap-dashboard-notes";

export default function Dashboard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<{ summary: string; history: string } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const NOTES_TO_SHOW = 3;
  const visibleNotes = showAllNotes || notes.length <= NOTES_TO_SHOW ? notes : notes.slice(0, NOTES_TO_SHOW);
  const hasMoreNotes = notes.length > NOTES_TO_SHOW;

  const isInitialMount = useRef(true);

  const loadNotesFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(NOTES_STORAGE_KEY);
      if (stored) setNotes(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadNotesFromStorage();
  }, [loadNotesFromStorage]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadNotesFromStorage();
    };
    const handleNotesUpdated = () => loadNotesFromStorage();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("caremap-notes-updated", handleNotesUpdated);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("caremap-notes-updated", handleNotesUpdated);
    };
  }, [loadNotesFromStorage]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      /* ignore */
    }
  }, [notes]);

  const handleAddNote = () => {
    if (!newSubject.trim()) return;
    const note: Note = {
      id: `note_${Date.now()}`,
      subject: newSubject.trim(),
      description: newDescription.trim(),
      createdAt: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setNewSubject("");
    setNewDescription("");
    setShowAddNote(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSummaryClick = useCallback(async () => {
    if (notes.length === 0) {
      setSummaryData({ summary: "No notes yet.", history: "Add notes from the chat or here to track symptoms and health concerns." });
      setShowSummaryModal(true);
      return;
    }
    setSummaryLoading(true);
    setShowSummaryModal(true);
    setSummaryData(null);
    try {
      const res = await fetch(`${BACKEND_URL}/v1/notes/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes.map((n) => ({ subject: n.subject, description: n.description, createdAt: n.createdAt })),
        }),
      });
      const data = res.ok ? await res.json() : null;
      setSummaryData(data ?? { summary: "Could not load summary.", history: "Please try again." });
    } catch {
      setSummaryData({ summary: "Could not load summary.", history: "Backend may be unreachable." });
    } finally {
      setSummaryLoading(false);
    }
  }, [notes]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl lg:text-3xl text-foreground mb-2">
          Welcome back, Alex
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your healthcare information
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-secondary" />
            </div>
            <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
              -12%
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$1,250</p>
          <p className="text-sm text-muted-foreground">Pending Bills</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
              2024
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$850/$2,500</p>
          <p className="text-sm text-muted-foreground">Deductible Met</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-success" />
            </div>
            <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
              +2
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">$1,420</p>
          <p className="text-sm text-muted-foreground">HSA Balance</p>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground mb-1">1</p>
          <p className="text-sm text-muted-foreground">Action Required</p>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mb-8 bg-card rounded-xl border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-secondary" />
            Notes
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSummaryClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium text-sm text-foreground transition-colors"
            >
              <FileBarChart className="w-4 h-4" />
              Summary
            </button>
            {!showAddNote ? (
              <button
                onClick={() => setShowAddNote(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Note
              </button>
            ) : null}
          </div>
        </div>

        {showSummaryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSummaryModal(false)}>
            <div
              className="bg-card rounded-xl shadow-lg max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Health Summary & History</h3>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {summaryLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                  </div>
                ) : summaryData ? (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Summary</h4>
                      <p className="text-foreground whitespace-pre-wrap">{summaryData.summary}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">History of Concerns</h4>
                      <p className="text-foreground whitespace-pre-wrap">{summaryData.history}</p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {showAddNote && (
          <div className="px-5 py-4 border-b border-border bg-muted/30">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                placeholder="Description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddNote}
                  disabled={!newSubject.trim()}
                  className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Note
                </button>
                <button
                  onClick={() => {
                    setShowAddNote(false);
                    setNewSubject("");
                    setNewDescription("");
                  }}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted font-medium text-sm text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-border">
          {notes.length === 0 && !showAddNote ? (
            <div className="px-5 py-8 text-center text-muted-foreground">
              <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notes yet. Click &quot;Add Note&quot; to create one.</p>
            </div>
          ) : (
            <>
              {visibleNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{note.subject}</p>
                    {note.description && (
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{note.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                    aria-label="Delete note"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {hasMoreNotes && (
                <button
                  onClick={() => setShowAllNotes((prev) => !prev)}
                  className="w-full px-5 py-3 text-sm text-secondary hover:bg-muted/30 transition-colors font-medium"
                >
                  {showAllNotes ? "See less" : `... ${notes.length - NOTES_TO_SHOW} more`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-display font-semibold text-lg text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.path}
              className="group bg-card rounded-xl p-5 border border-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                action.color === 'secondary' ? 'bg-secondary/10' :
                action.color === 'primary' ? 'bg-primary/10' :
                'bg-success/10'
              }`}>
                <action.icon className={`w-6 h-6 ${
                  action.color === 'secondary' ? 'text-secondary' :
                  action.color === 'primary' ? 'text-primary' :
                  'text-success'
                }`} />
              </div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-secondary transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Recent Bills</h2>
            <Link href="/documents" className="text-sm text-secondary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{bill.provider}</p>
                    <p className="text-sm text-muted-foreground">{bill.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">${bill.amount.toFixed(2)}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    bill.status === 'paid' ? 'bg-success/10 text-success' :
                    bill.status === 'pending' ? 'bg-destructive/10 text-destructive' :
                    'bg-secondary/10 text-secondary'
                  }`}>
                    {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-foreground">Upcoming Appointments</h2>
            <Link href="/appointments" className="text-sm text-secondary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingAppointments.map((apt) => (
              <div key={apt.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{apt.provider}</p>
                    <p className="text-sm text-muted-foreground">{apt.specialty}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{apt.date}</p>
                  <p className="text-sm text-muted-foreground">{apt.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-border">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-foreground font-medium">
              <Calendar className="w-4 h-4" />
              Schedule Appointment
            </button>
          </div>
        </div>
      </div>

      {/* Insurance Summary Card */}
      <div className="mt-6 bg-hero-gradient rounded-xl p-6 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg mb-2">Your Insurance Plan</h3>
            <p className="text-primary-foreground/80 mb-4">UPMC Health Plan (Find Care uses this for in-network)</p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-primary-foreground/60">Primary Care Copay</p>
                <p className="font-semibold">$25</p>
              </div>
              <div>
                <p className="text-primary-foreground/60">Specialist Copay</p>
                <p className="font-semibold">$50</p>
              </div>
              <div>
                <p className="text-primary-foreground/60">Out-of-Pocket Max</p>
                <p className="font-semibold">$6,500</p>
              </div>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground font-medium text-sm transition-colors">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
