import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PrimaryButton from "../components/PrimaryButton";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { cn } from "../lib/utils";
import { apiGetSessions, apiToggleSession, apiGetProgress, apiSaveNote, type ApiSession } from "../lib/api";

export default function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const refresh = useCallback(async () => {
    if (!planId) return;
    try {
      const [s, p] = await Promise.all([apiGetSessions(planId), apiGetProgress(planId)]);
      setSessions(s);
      setTotal(p.total_sessions);
      setCompleted(p.completed_sessions);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [planId]);

  useEffect(() => { refresh(); }, [refresh]);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = async (sessionId: string) => {
    try { await apiToggleSession(sessionId); await refresh(); } catch { /* ignore */ }
  };

  const handleSaveNote = async (sessionId: string) => {
    try {
      await apiSaveNote(sessionId, editingNoteText);
      setEditingNoteId(null);
      setEditingNoteText("");
      await refresh();
    } catch { /* ignore */ }
  };

  const startEditNote = (sessionId: string, currentNote: string | null) => {
    setEditingNoteId(sessionId);
    setEditingNoteText(currentNote ?? "");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted">Loading sessions...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-text-muted mb-4">No sessions found for this plan.</p>
          <PrimaryButton onClick={() => navigate("/dashboard")}>Back to Dashboard</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <PrimaryButton variant="secondary" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={16} /> Back to Dashboard
          </PrimaryButton>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <p className="text-lg font-bold text-text">{total}</p>
            <p className="text-xs text-text-muted">Total Sessions</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <p className="text-lg font-bold text-text">{completed}</p>
            <p className="text-xs text-text-muted">Sessions Done</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 text-center">
            <p className="text-lg font-bold text-text">{progress}%</p>
            <p className="text-xs text-text-muted">Progress</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm mb-8">
          <h2 className="text-base font-semibold text-text mb-4">Day-by-Day Schedule</h2>
          <div className="flex flex-col gap-3">
            {sessions.map((session) => {
              const done = session.is_completed;
              const isEditing = editingNoteId === session.id;
              const hasNote = !!session.note;

              return (
                <div key={session.id} className="rounded-xl">
                  <label
                    className={cn(
                      "flex items-center gap-4 rounded-xl p-3 transition-colors cursor-pointer",
                      done ? "opacity-60 bg-gray-50" : "bg-white",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => handleToggle(session.id)}
                      className="h-5 w-5 rounded cursor-pointer accent-primary"
                    />
                    <div className="flex-shrink-0 w-20 text-center">
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-lg",
                          done ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600",
                        )}
                      >
                        {new Date(session.session_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                      </span>
                      <p className="text-xs text-text-muted mt-0.5">
                        {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", done ? "line-through text-text-muted" : "text-text")}>
                        {session.task_name}
                      </p>
                    </div>
                    {done && <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />}
                  </label>

                  {(done || hasNote) && (
                    <div className="pl-12 pr-3 pb-2 pt-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value.slice(0, 50))}
                            placeholder="Add a note... (max 50 characters)"
                            maxLength={50}
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-white text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNote(session.id)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingNoteId(null); setEditingNoteText(""); }}
                            className="text-xs font-medium px-2 py-1.5 rounded-lg text-text-muted hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : hasNote ? (
                        <div className={cn("flex items-center gap-2", !done && "opacity-50")}>
                          <p className="text-xs text-text-muted italic">{session.note}</p>
                          {done && (
                            <button
                              type="button"
                              onClick={() => startEditNote(session.id, session.note)}
                              className="text-text-muted hover:text-primary transition-colors cursor-pointer"
                              aria-label="Edit note"
                            >
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      ) : done ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingNoteId === session.id ? editingNoteText : ""}
                            onChange={(e) => {
                              setEditingNoteId(session.id);
                              setEditingNoteText(e.target.value.slice(0, 50));
                            }}
                            onFocus={() => {
                              if (editingNoteId !== session.id) {
                                setEditingNoteId(session.id);
                                setEditingNoteText("");
                              }
                            }}
                            placeholder="Add a note... (max 50 characters)"
                            maxLength={50}
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-border bg-white text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          {editingNoteId === session.id && editingNoteText.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleSaveNote(session.id)}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {progress === 100 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-text mb-1">Congratulations!</h2>
            <p className="text-sm text-text-muted">You have completed all sessions for this plan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
