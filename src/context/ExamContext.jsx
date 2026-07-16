"use client";
import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { getExam, TOOLS } from "@/config/exams.config";

const ExamContext = createContext(null);

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error("useExam must be used within ExamProvider");
  return ctx;
}

export function ExamProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Active exam state (null = not in an exam)
  const [activeExam, setActiveExam] = useState(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/login";
        return;
      }
      setUser(session.user);
      setAuthLoading(false);
    });
  }, [supabase]);

  // Start a new exam via POST /api/exam/start
  const startExam = useCallback(async ({ examId, sectionCode, mode = "practice", count = 25 }) => {
    setStarting(true);
    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, sectionCode, mode, count }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to start exam");

      const exam = getExam(examId);
      const isTimed = mode === "timed" || mode === "exam";

      setActiveExam({
        sessionId: body.sessionId,
        examId,
        sectionCode,
        mode,
        questions: body.questions,
        timeLimit: body.timeLimit,
        testMode: isTimed,
        examTitle: exam.title,
        sectionAbbr: sectionCode?.toUpperCase() || exam.shortName,
        sectionColor: exam.theme?.accent || "#2b579a",
        examTools: (exam.tools || []).map(key => ({ key, label: TOOLS[key]?.label || key })),
        answerKey: null,
        completionResult: null,
      });
    } finally {
      setStarting(false);
    }
  }, []);

  // Resume a session via GET /api/exam/session/[id]
  const resumeSession = useCallback(async (sessionId) => {
    const res = await fetch(`/api/exam/session/${sessionId}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Failed to load session");

    const { session, questions } = body;
    const exam = getExam(session.exam_id);
    const isTimed = session.mode === "timed" || session.mode === "exam";

    if (session.status === "completed") {
      // Already completed — show review with answer key from complete endpoint
      const completeRes = await fetch("/api/exam/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const completeBody = await completeRes.json();

      setActiveExam({
        sessionId,
        examId: session.exam_id,
        sectionCode: session.section_id,
        mode: session.mode,
        questions,
        timeLimit: null,
        testMode: false,
        examTitle: exam.title,
        sectionAbbr: session.section_id?.replace(`${session.exam_id}_`, "").toUpperCase() || exam.shortName,
        sectionColor: exam.theme?.accent || "#2b579a",
        examTools: [],
        answerKey: completeBody.answerKey || null,
        completionResult: completeBody,
        initialAnswers: session.answers || {},
        startInReview: true,
      });
    } else {
      const storedSeconds = session.time_remaining ?? 0;
      setActiveExam({
        sessionId,
        examId: session.exam_id,
        sectionCode: session.section_id,
        mode: session.mode,
        questions,
        timeLimit: isTimed ? Math.max(storedSeconds, 1) : null,
        testMode: isTimed,
        examTitle: exam.title,
        sectionAbbr: session.section_id?.replace(`${session.exam_id}_`, "").toUpperCase() || exam.shortName,
        sectionColor: exam.theme?.accent || "#2b579a",
        examTools: (exam.tools || []).map(key => ({ key, label: TOOLS[key]?.label || key })),
        answerKey: null,
        completionResult: null,
        initialAnswers: session.answers || {},
        initialFlagged: session.flags || {},
        initialHighlights: session.highlights || {},
        initialStruck: session.strikes || {},
        startIndex: Math.min(session.current_index || 0, questions.length - 1),
        initialSeconds: isTimed ? Math.max(storedSeconds, 1) : storedSeconds,
        startPaused: true,
      });
    }
  }, []);

  // Autosave progress to the user's own exam_sessions row (RLS permits this)
  const saveProgress = useCallback(async (progress) => {
    if (!activeExam?.sessionId) return;
    await supabase
      .from("exam_sessions")
      .update({
        answers: progress.answers || {},
        flags: progress.flagged || {},
        highlights: progress.highlights || {},
        strikes: progress.struck || {},
        current_index: progress.currentIdx ?? 0,
        time_remaining: progress.timerSeconds ?? null,
      })
      .eq("id", activeExam.sessionId);
  }, [activeExam?.sessionId, supabase]);

  // Complete an exam via POST /api/exam/complete
  const completeExam = useCallback(async ({ answers, flagged }) => {
    if (!activeExam?.sessionId) return;
    setCompleting(true);
    try {
      // Final autosave so answers are persisted before grading
      await supabase
        .from("exam_sessions")
        .update({
          answers: answers || {},
          flags: flagged || {},
        })
        .eq("id", activeExam.sessionId);

      const res = await fetch("/api/exam/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeExam.sessionId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to complete exam");

      setActiveExam(prev => ({
        ...prev,
        answerKey: body.answerKey,
        completionResult: body,
      }));
    } finally {
      setCompleting(false);
    }
  }, [activeExam?.sessionId, supabase]);

  const exitExam = useCallback(() => {
    setActiveExam(null);
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Student";

  const value = {
    user,
    authLoading,
    displayName,
    supabase,
    activeExam,
    starting,
    completing,
    startExam,
    resumeSession,
    saveProgress,
    completeExam,
    exitExam,
  };

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}
