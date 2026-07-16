"use client";
import { useState, useEffect, useRef, useMemo } from "react";

/* ─── ICONS ─── */
const FlagIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M3 2v12M3 2l9 4-9 4" /></svg>
);
const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 3L5 8l5 5" /></svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 3l5 5-5 5" /></svg>
);

/* ─── HIGHLIGHT HELPERS ─── */
function mergeRangesForDisplay(ranges) {
  if (!ranges || !ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

function renderPassageWithHighlights(text, ranges) {
  if (!text) return null;
  const merged = mergeRangesForDisplay(ranges);
  if (!merged.length) return text;
  const parts = [];
  let pos = 0;
  for (const { start, end } of merged) {
    if (start > pos) parts.push(<span key={`t-${pos}`}>{text.slice(pos, start)}</span>);
    parts.push(
      <mark key={`h-${start}`} style={{ backgroundColor: "#fef08a", borderRadius: "2px", padding: 0 }}>
        {text.slice(start, end)}
      </mark>
    );
    pos = end;
  }
  if (pos < text.length) parts.push(<span key={`t-${pos}`}>{text.slice(pos)}</span>);
  return parts;
}

/* ─── TIMER HELPERS ─── */
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TimerSettingsModal({ onSave, onCancel }) {
  const [timeStr, setTimeStr] = useState("00:00:00");
  const handleSave = () => {
    const parts = timeStr.split(":").map(p => parseInt(p) || 0);
    onSave((parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-2xl w-[340px]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Set time in Timer</h3>
        </div>
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-600 mb-2">Time:</label>
          <input type="text" value={timeStr} onChange={e => setTimeStr(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="00:00:00" />
        </div>
        <div className="px-5 py-3 flex items-center gap-3 border-t border-gray-100">
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 border border-gray-300 rounded text-sm font-medium hover:bg-gray-200">Save Time</button>
          <button onClick={onCancel} className="px-4 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN EXAM INTERFACE

   Data contract: `questions` arrive from /api/exam/start (or /session/[id])
   as snake_case rows with correct_answer + explanations STRIPPED. The score
   screen and review mode receive answer data via the `answerKey` prop
   (from /api/exam/complete), NOT from question objects.

   `examTools` is an array of { key, label } from the TOOLS registry —
   rendered as bottom-bar buttons. Empty for LSAT.
   ═══════════════════════════════════════════ */
export default function ExamInterface({
  questions = [],
  examTitle = "Exam",
  sectionName = "Section",
  sectionAbbr = "SEC",
  sectionColor = "#1a73e8",
  timeLimit = null,
  testMode = false,
  examTools = [],
  answerKey = null,
  onComplete = null,
  onExit = null,
  onReattemptMissed = null,
  onReviewMissed = null,
  initialAnswers = null,
  initialFlagged = null,
  initialHighlights = null,
  initialStruck = null,
  startIndex = 0,
  initialSeconds = null,
  startPaused = false,
  onProgress = null,
  startInReview = false,
}) {
  const [currentIdx, setCurrentIdx] = useState(startIndex || 0);
  const [answers, setAnswers] = useState(initialAnswers || {});
  const [flagged, setFlagged] = useState(initialFlagged || {});
  const [struck, setStruck] = useState(initialStruck || {});
  const [highlights, setHighlights] = useState(initialHighlights || {});
  const [timerSeconds, setTimerSeconds] = useState(
    initialSeconds ?? (testMode && timeLimit ? timeLimit : 0)
  );
  const [timerDirection, setTimerDirection] = useState(testMode && timeLimit ? "down" : "up");
  const [countdownTarget, setCountdownTarget] = useState(testMode && timeLimit ? timeLimit : 0);
  const [timerPaused, setTimerPaused] = useState(startPaused);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [mode, setMode] = useState(startInReview ? "review" : "exam");
  const [showPassage, setShowPassage] = useState(true);
  const [highlightActive, setHighlightActive] = useState(false);
  const [strikeActive, setStrikeActive] = useState(false);
  const passageRef = useRef(null);
  const questionRef = useRef(null);

  const q = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;

  // answerKey is { id, correct, explanations }[] from /api/exam/complete
  const answerMap = useMemo(() => {
    if (!answerKey) return {};
    return Object.fromEntries(answerKey.map(a => [a.id, a]));
  }, [answerKey]);

  // Passage resolution: questions use snake_case fields from the API
  const passageSource = useMemo(() => {
    if (!q) return null;
    if (q.passage) return q;
    if (!q.use_prev_passage) return null;
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (questions[i].batch !== q.batch || questions[i].section_id !== q.section_id) break;
      if (questions[i].passage) return questions[i];
      if (!questions[i].use_prev_passage) break;
    }
    return null;
  }, [q, currentIdx, questions]);

  const currentPassage = passageSource?.passage || null;
  const currentPassageImage = passageSource?.passage_image || null;
  const currentPassageImageCaption = passageSource?.passage_image_caption || null;
  const hasPassage = !!currentPassage;

  // Timer tick
  useEffect(() => {
    if (timerPaused || mode === "review" || mode === "score") return;
    if (timerDirection === "down" && timerSeconds <= 0) return;
    const t = setInterval(() => {
      setTimerSeconds(prev => {
        if (timerDirection === "down") {
          if (prev <= 1) return 0;
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timerPaused, mode, timerDirection, timerSeconds, testMode]);

  // Auto-end when timed section runs out
  useEffect(() => {
    if (!testMode || timerDirection !== "down" || timerSeconds > 0) return;
    if (mode !== "exam" && mode !== "nav") return;
    endExam();
  }, [timerSeconds, testMode, timerDirection, mode]);

  // Progress snapshot ref
  const progressRef = useRef(null);
  progressRef.current = { answers, flagged, currentIdx, timerSeconds, highlights, struck };
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const flushProgress = async () => {
    if (onProgress) await onProgress(progressRef.current);
  };

  // Debounced autosave on state change
  useEffect(() => {
    if (!onProgress || mode === "review" || mode === "score") return;
    const t = setTimeout(() => {
      if (modeRef.current === "score") return;
      onProgress(progressRef.current);
    }, 800);
    return () => clearTimeout(t);
  }, [answers, flagged, highlights, struck, currentIdx, onProgress, mode]);

  // Periodic save (timer accuracy for resume)
  useEffect(() => {
    if (!onProgress) return;
    const t = setInterval(() => {
      if (modeRef.current === "exam" || modeRef.current === "nav") {
        onProgress(progressRef.current);
      }
    }, 30000);
    return () => clearInterval(t);
  }, [onProgress]);

  const handleTimerSave = (totalSeconds) => {
    setShowTimerSettings(false);
    if (totalSeconds > 0) {
      setTimerDirection("down");
      setCountdownTarget(totalSeconds);
      setTimerSeconds(totalSeconds);
    } else {
      setTimerDirection("up");
      setTimerSeconds(0);
    }
  };

  const resetTimer = () => {
    if (timerDirection === "down") setTimerSeconds(countdownTarget);
    else setTimerSeconds(0);
    setTimerPaused(false);
  };

  const goTo = (idx) => {
    setCurrentIdx(idx);
    setMode(prev => prev === "nav" ? "exam" : prev);
    if (passageRef.current) passageRef.current.scrollTop = 0;
    if (questionRef.current) questionRef.current.scrollTop = 0;
  };
  const goNext = () => { if (currentIdx < totalQ - 1) goTo(currentIdx + 1); };
  const goPrev = () => { if (currentIdx > 0) goTo(currentIdx - 1); };
  const selectAnswer = (label) => {
    setAnswers(p => ({ ...p, [q.id]: label }));
    setStruck(p => (p[q.id]?.[label] ? { ...p, [q.id]: { ...p[q.id], [label]: false } } : p));
  };
  const toggleFlag = () => { setFlagged(p => ({ ...p, [q.id]: !p[q.id] })); };
  const toggleStrike = (label) => { setStruck(p => ({ ...p, [q.id]: { ...(p[q.id] || {}), [label]: !(p[q.id]?.[label]) } })); };
  const handleChoiceClick = (label) => {
    if (isReview) return;
    if (strikeActive) toggleStrike(label);
    else selectAnswer(label);
  };

  const handlePassageMouseUp = () => {
    if (!highlightActive || !q || !passageSource) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const passageEl = passageRef.current?.querySelector(".passage-text");
    if (!passageEl) return;
    const range = sel.getRangeAt(0);
    if (!passageEl.contains(range.commonAncestorContainer)) return;
    const fullRange = document.createRange();
    fullRange.selectNodeContents(passageEl);
    const startRange = document.createRange();
    startRange.setStart(fullRange.startContainer, fullRange.startOffset);
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;
    const endRange = document.createRange();
    endRange.setStart(fullRange.startContainer, fullRange.startOffset);
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;
    if (end <= start) return;
    sel.removeAllRanges();
    const hKey = passageSource.id;
    setHighlights(prev => {
      const existing = prev[hKey] || [];
      const exactIdx = existing.findIndex(h => h.start === start && h.end === end);
      if (exactIdx !== -1) {
        return { ...prev, [hKey]: existing.filter((_, i) => i !== exactIdx) };
      }
      return { ...prev, [hKey]: [...existing, { start, end }] };
    });
  };

  // Score computed from answerKey (server-graded), not from question objects
  const score = useMemo(() => {
    if (!answerKey) return null;
    let correct = 0;
    questions.forEach(question => {
      const key = answerMap[question.id];
      if (key && answers[question.id] === key.correct) correct++;
    });
    return { correct, total: totalQ, pct: totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0 };
  }, [answerKey, answerMap, answers, questions, totalQ]);

  const missedQuestionIds = useMemo(() => {
    if (!answerKey) return [];
    return questions.filter(q => {
      const key = answerMap[q.id];
      return answers[q.id] && key && answers[q.id] !== key.correct;
    }).map(q => q.id);
  }, [answerKey, answerMap, answers, questions]);

  const endExam = () => {
    setMode("score");
    if (onComplete) onComplete({ answers, flagged });
  };

  const isReview = mode === "review";

  const NAV_BG = "#2b579a";
  const TOOLBAR_BG = "#4a7ec7";
  const STRIP_BG = "#1e3a5f";

  /* ── SCORE SCREEN ── */
  if (mode === "score") {
    if (!score) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-500">Scoring...</div></div>;
    return (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-exam)" }}>
        <div className="text-white px-6 py-3 flex items-center justify-between" style={{ background: NAV_BG }}>
          <span className="font-semibold text-sm">{sectionAbbr} — Score Report</span>
        </div>
        <div className="max-w-3xl mx-auto py-12 px-6">
          <div className="text-center mb-10">
            <div className="text-6xl font-bold mb-2" style={{ color: sectionColor }}>{score.pct}%</div>
            <div className="text-gray-600 text-lg">{score.correct} of {score.total} correct</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 font-semibold text-xs text-gray-600 grid grid-cols-12 gap-2">
              <div className="col-span-1">#</div><div className="col-span-5">Topic</div>
              <div className="col-span-2 text-center">Yours</div><div className="col-span-2 text-center">Correct</div>
              <div className="col-span-2 text-center">Result</div>
            </div>
            {questions.map((question, idx) => {
              const ua = answers[question.id];
              const key = answerMap[question.id];
              const correctAns = key?.correct;
              const ic = ua === correctAns;
              return (
                <div key={question.id} className={`px-4 py-2.5 grid grid-cols-12 gap-2 items-center text-sm border-t border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <div className="col-span-1 text-gray-500">{idx + 1}</div>
                  <div className="col-span-5 text-gray-800">{question.topic}</div>
                  <div className="col-span-2 text-center font-medium">{ua || "—"}</div>
                  <div className="col-span-2 text-center font-medium">{correctAns || "—"}</div>
                  <div className="col-span-2 text-center">
                    {ua ? <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${ic ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{ic ? "Correct" : "Incorrect"}</span> : <span className="text-xs text-gray-400">—</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => { setMode("review"); setCurrentIdx(0); }} className="px-6 py-2.5 text-white rounded-md font-medium hover:opacity-90 transition-opacity" style={{ background: NAV_BG }}>Review Answers</button>
            {missedQuestionIds.length > 0 && onReviewMissed && (
              <button onClick={() => onReviewMissed(missedQuestionIds, answers)} className="px-6 py-2.5 text-white rounded-md font-medium hover:opacity-90 transition-opacity" style={{ background: "#7c3aed" }}>
                Review Missed ({missedQuestionIds.length})
              </button>
            )}
            {missedQuestionIds.length > 0 && onReattemptMissed && (
              <button onClick={() => onReattemptMissed(missedQuestionIds, answers)} className="px-6 py-2.5 text-white rounded-md font-medium hover:opacity-90 transition-opacity" style={{ background: "#e11d48" }}>
                Reattempt Missed ({missedQuestionIds.length})
              </button>
            )}
            {onExit && (
              <button onClick={onExit} className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300">Back to Dashboard</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── NAV/REVIEW SCREEN ── */
  if (mode === "nav") {
    return (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "var(--font-exam)" }}>
        <div className="text-white px-6 py-3 flex items-center justify-between" style={{ background: NAV_BG }}>
          <span className="font-semibold text-sm">{sectionAbbr} — Review Screen</span>
          <div className="text-sm font-mono tabular-nums">{formatTime(timerSeconds)}</div>
        </div>
        <div className="max-w-3xl mx-auto py-8 px-6">
          <p className="text-gray-600 mb-6 text-sm">Below is a summary of your answers. Click any question to return to it.</p>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gray-100 px-4 py-2.5 font-semibold text-xs text-gray-600 grid grid-cols-6 gap-2">
              <div className="col-span-1">#</div><div className="col-span-2">Status</div>
              <div className="col-span-2">Answer</div><div className="col-span-1 text-center">Flag</div>
            </div>
            {questions.map((question, idx) => (
              <button key={question.id} onClick={() => goTo(idx)} className="w-full px-4 py-2 grid grid-cols-6 gap-2 items-center text-sm border-t border-gray-100 hover:bg-blue-50 transition-colors text-left">
                <div className="col-span-1 font-medium text-gray-700">{idx + 1}</div>
                <div className="col-span-2">{answers[question.id] ? <span className="text-green-600 font-medium">Complete</span> : <span className="text-orange-500 font-medium">Incomplete</span>}</div>
                <div className="col-span-2 text-gray-600">{answers[question.id] || "—"}</div>
                <div className="col-span-1 text-center">{flagged[question.id] && <span className="text-amber-500"><FlagIcon filled /></span>}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <div className="flex gap-3">
              <button onClick={() => setMode("exam")} className="px-5 py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300">Return to Exam</button>
              {onExit && (
                <button onClick={async () => {
                  if (onProgress) { await flushProgress(); onExit(); }
                  else if (window.confirm("Leave this exam? Your progress will be lost.")) onExit();
                }}
                  className="px-5 py-2 bg-gray-100 text-gray-500 rounded font-medium hover:bg-gray-200">Back to Dashboard</button>
              )}
            </div>
            <button onClick={endExam} className="px-5 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700">End Section & Score</button>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  /* ═══ MAIN EXAM LAYOUT ═══ */
  return (
    <div className="h-screen flex flex-col bg-gray-200 overflow-hidden" style={{ fontFamily: "var(--font-exam)" }}>

      {showTimerSettings && <TimerSettingsModal onSave={handleTimerSave} onCancel={() => setShowTimerSettings(false)} />}

      {/* ── ROW 1: TOP NAV BAR ── */}
      <div className="flex items-center justify-between px-4 h-[34px] flex-shrink-0 text-white text-sm" style={{ background: NAV_BG }}>
        <div className="flex items-center gap-3">
          {onExit && (
            <button onClick={async () => {
              if (isReview) { onExit(); return; }
              if (onProgress) { await flushProgress(); onExit(); }
              else if (window.confirm("Leave this exam? Your progress will be lost.")) onExit();
            }}
              className="opacity-70 hover:opacity-100 text-xs flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8l5 5" /></svg>
              Exit
            </button>
          )}
          <span className="font-medium text-xs">{examTitle}</span>
        </div>
        <div className="flex items-center gap-4">
          {!isReview && (
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-70">{timerDirection === "down" ? "Countdown:" : "Timer:"}</span>
              {!testMode && (
                <button onClick={() => setShowTimerSettings(true)} className="opacity-80 hover:opacity-100" title="Timer settings">&#9881;</button>
              )}
              <button onClick={() => setTimerPaused(p => !p)}
                className="opacity-80 hover:opacity-100"
                title={timerPaused ? "Start timer" : "Pause timer"}
                aria-label={timerPaused ? "Start timer" : "Pause timer"}>
                {timerPaused ? "▶" : "⏸"}
              </button>
              <button onClick={resetTimer} className="opacity-80 hover:opacity-100" title="Reset timer">&#8634;</button>
              <span className={`font-mono tabular-nums ${timerPaused ? "opacity-50" : ""}`}>{formatTime(timerSeconds)}</span>
              {timerPaused && (
                <button onClick={() => setTimerPaused(false)}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 hover:bg-amber-300"
                  title="Start timer">
                  PAUSED
                </button>
              )}
            </div>
          )}
          <span className="text-xs opacity-80">{currentIdx + 1} of {totalQ}</span>
        </div>
      </div>

      {/* ── ROW 2: TOOLBAR ── */}
      <div className="flex items-center justify-between px-3 h-[32px] flex-shrink-0 text-white text-xs" style={{ background: TOOLBAR_BG }}>
        <div className="flex items-center gap-1">
          <button onClick={() => setHighlightActive(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${highlightActive ? "bg-white/25" : "hover:bg-white/15"}`}>
            <span className="inline-block w-3.5 h-3.5 rounded-sm border border-white/50" style={{ background: "#fef08a" }} />
            Highlight
          </button>
          <button onClick={() => setStrikeActive(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${strikeActive ? "bg-white/25" : "hover:bg-white/15"}`}>
            <span className="line-through">S</span> Strikethrough
          </button>
        </div>
        <div className="flex items-center gap-1">
          {!isReview && (
            <button onClick={toggleFlag}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${flagged[q.id] ? "bg-amber-500/30 text-amber-200" : "hover:bg-white/15"}`}>
              <FlagIcon filled={flagged[q.id]} />
              Flag for Review
            </button>
          )}
          {isReview && (
            <button onClick={() => setMode("score")} className="px-2.5 py-1 rounded hover:bg-white/15">Back to Score</button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT SPLIT ── */}
      <div className="flex-1 flex overflow-hidden border-t border-gray-400">

        {/* PASSAGE PANEL */}
        {hasPassage && showPassage && (
          <div className="w-1/2 border-r border-gray-400 flex flex-col bg-white">
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-gray-600">{(() => {
                let holderIdx = currentIdx;
                if (!q.passage) {
                  for (let i = currentIdx - 1; i >= 0; i--) {
                    if (questions[i].batch !== q.batch || questions[i].section_id !== q.section_id) break;
                    if (questions[i].passage) { holderIdx = i; break; }
                  }
                }
                let end = holderIdx;
                for (let i = holderIdx + 1; i < totalQ; i++) {
                  if (questions[i].passage ||
                    questions[i].batch !== q.batch ||
                    questions[i].section_id !== q.section_id ||
                    !questions[i].use_prev_passage) break;
                  end = i;
                }
                let pNum = 0;
                for (let i = 0; i <= holderIdx; i++) {
                  if (questions[i].passage) pNum++;
                }
                if (pNum === 0) pNum = 1;
                return `Passage ${pNum} (Questions ${holderIdx + 1}${end > holderIdx ? ` - ${end + 1}` : ""})`;
              })()}</span>
            </div>
            <div ref={passageRef} className="flex-1 overflow-y-auto exam-scroll p-5" onMouseUp={handlePassageMouseUp}
              style={{ userSelect: highlightActive ? "text" : "auto", cursor: highlightActive ? "text" : "default" }}>
              <div className={`passage-text whitespace-pre-line ${highlightActive ? "selection:bg-yellow-200" : ""}`}>
                {renderPassageWithHighlights(currentPassage, highlights[passageSource?.id] || [])}
              </div>
              {currentPassageImage && (
                <div className="mt-5 border border-gray-200 rounded bg-[#f9f9f9] p-3">
                  <img src={currentPassageImage} alt={currentPassageImageCaption || "Figure"} className="max-w-full h-auto mx-auto block" />
                  {currentPassageImageCaption && (
                    <p className="text-center text-xs italic text-gray-600 mt-2">{currentPassageImageCaption}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTION PANEL */}
        <div className={`${hasPassage && showPassage ? "w-1/2" : "w-full"} flex flex-col bg-white`}>
          <div ref={questionRef} className="flex-1 overflow-y-auto exam-scroll p-6">
            <div className="mb-5">
              <h2 className="font-bold text-base text-gray-900 mb-3">Question {currentIdx + 1}</h2>
              {isReview && (
                <div className="flex gap-2 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">{q.topic}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${q.difficulty === "Easy" ? "bg-green-50 text-green-600" : q.difficulty === "Hard" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{q.difficulty}</span>
                </div>
              )}
              <p className="text-sm text-gray-800 leading-relaxed">{q.stem}</p>
            </div>

            <div className="space-y-3">
              {q.choices.map(choice => {
                const isSel = answers[q.id] === choice.label;
                const isStr = struck[q.id]?.[choice.label];
                const key = answerMap[q.id];
                const isCor = isReview && key && choice.label === key.correct;
                const isIncSel = isReview && isSel && key && choice.label !== key.correct;

                let border = "border-gray-200"; let bg = "bg-white";
                if (isReview) {
                  if (isCor) { border = "border-green-400"; bg = "bg-green-50"; }
                  else if (isIncSel) { border = "border-red-400"; bg = "bg-red-50"; }
                } else if (isSel) { border = "border-blue-500"; bg = "bg-blue-50"; }

                return (
                  <button key={choice.label} onClick={() => handleChoiceClick(choice.label)} disabled={isReview}
                    className={`answer-choice w-full flex items-start gap-3 p-3 rounded border-2 ${border} ${bg} text-left hover:shadow-sm`}>
                    <div className={`w-[22px] h-[22px] rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${isReview && isCor ? "border-green-500" : isIncSel ? "border-red-500" : isSel ? "border-blue-500" : "border-gray-300"
                      }`}>
                      {(isSel || isCor) && (
                        <div className={`w-3 h-3 rounded-full ${isReview && isCor ? "bg-green-500" : isIncSel ? "bg-red-500" : "bg-blue-500"}`} />
                      )}
                    </div>
                    <span className={`text-sm leading-relaxed ${isStr && !isReview ? "line-through text-gray-400" : "text-gray-800"}`}>
                      <strong className="mr-1">{choice.label}.</strong>{choice.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Review explanations — from answerKey, not question objects */}
            {isReview && answerMap[q.id] && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Explanation</h3>
                {q.choices.map(choice => {
                  const key = answerMap[q.id];
                  const isCor = choice.label === key.correct;
                  const isSel = answers[q.id] === choice.label;
                  return (
                    <div key={choice.label} className={`mb-3 p-3.5 rounded-md text-sm leading-relaxed ${isCor ? "bg-green-50 border border-green-200" : isSel ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-100"}`}>
                      <div className="font-semibold mb-1">
                        <span className={isCor ? "text-green-700" : isSel ? "text-red-700" : "text-gray-500"}>
                          {choice.label}. {isCor ? "✓ Correct" : isSel ? "✗ Your answer" : ""}
                        </span>
                      </div>
                      <div className="text-gray-700">{key.explanations?.[choice.label]}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="flex items-center justify-between px-3 h-[38px] flex-shrink-0 text-white text-xs" style={{ background: STRIP_BG }}>
        {/* Exam tools (from config registry — empty for LSAT) */}
        <div className="flex items-center gap-1">
          {examTools.map(tool => (
            <button key={tool.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/15 transition-colors font-medium">
              {tool.label}
            </button>
          ))}
          {examTools.length === 0 && <div className="w-1" />}
        </div>

        {/* Question nav strip */}
        <div className="flex items-center gap-0.5 overflow-x-auto max-w-[50%] py-1">
          <button onClick={goPrev} disabled={currentIdx === 0} className={`p-1 rounded ${currentIdx === 0 ? "opacity-30" : "hover:bg-white/15"}`}><ChevronLeft /></button>
          {questions.map((question, idx) => {
            const isAct = idx === currentIdx;
            const isAns = !!answers[question.id];
            const isFlg = flagged[question.id];
            const key = answerMap[question.id];
            const isCor = isReview && key && answers[question.id] === key.correct;
            const isInc = isReview && key && answers[question.id] && answers[question.id] !== key.correct;
            let bg = "bg-white/10";
            if (isAct) bg = "bg-blue-400";
            else if (isCor) bg = "bg-green-500/60";
            else if (isInc) bg = "bg-red-500/60";
            else if (isAns) bg = "bg-white/25";
            return (
              <button key={question.id} onClick={() => goTo(idx)}
                className={`relative w-6 h-6 rounded text-[10px] font-semibold flex items-center justify-center flex-shrink-0 ${bg} hover:ring-1 hover:ring-white/40`}>
                {idx + 1}
                {isFlg && <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            );
          })}
          <button onClick={goNext} disabled={currentIdx === totalQ - 1} className={`p-1 rounded ${currentIdx === totalQ - 1 ? "opacity-30" : "hover:bg-white/15"}`}><ChevronRight /></button>
        </div>

        {/* Navigation + Next */}
        <div className="flex items-center gap-2">
          {!isReview && (
            <button onClick={() => setMode("nav")} className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-white/15 font-medium">
              Navigation
            </button>
          )}
          {currentIdx < totalQ - 1 ? (
            <button onClick={goNext} className="flex items-center gap-1 px-3 py-1.5 rounded font-semibold hover:bg-white/15" style={{ background: "rgba(255,255,255,0.15)" }}>
              Next <ChevronRight />
            </button>
          ) : !isReview ? (
            <button onClick={() => setMode("nav")} className="px-3 py-1.5 rounded font-semibold" style={{ background: "rgba(255,255,255,0.15)" }}>
              End Section
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
