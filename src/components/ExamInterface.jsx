"use client";
import { useState, useEffect, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════ */
const HEADER_BG = "#1a2332";
const ACCENT = "#2563eb";
const ACCENT_HOVER = "#1d4ed8";
const PAGE_BG = "#f1f5f9";

const HIGHLIGHT_COLORS = {
  yellow: "#fef08a",
  pink: "#fecaca",
  green: "#bbf7d0",
  blue: "#bfdbfe",
};
const HIGHLIGHT_SWATCH_BORDER = {
  yellow: "#eab308",
  pink: "#f87171",
  green: "#4ade80",
  blue: "#60a5fa",
};
const FONT_SIZES = { small: "13px", medium: "15px", large: "17px" };
const LINE_HEIGHTS = { compact: 1.5, normal: 1.8, relaxed: 2.2 };

/* ═══════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════ */
const PauseIcon = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" rx="1"/><rect x="9.5" y="2" width="3.5" height="12" rx="1"/></svg>;
const PlayIcon = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z"/></svg>;
const BookmarkIcon = ({ filled }) => <svg width="15" height="15" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M4 2h8v12l-4-2.5L4 14V2z"/></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3L12.5 5"/></svg>;
const XMarkIcon = () => <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>;
const SlashIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5"/><line x1="5" y1="15" x2="15" y2="5"/></svg>;
const ClockIcon = () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 4v4.5l3 1.5" strokeLinecap="round"/></svg>;
const DirectionBarsIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"><path d="M4 3v10M8 3v10M12 3v10"/></svg>;
const ArrowLeft = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3L5 8l5 5"/></svg>;
const ArrowRight = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5"/></svg>;
const UnderlineIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 2v5.5a4 4 0 008 0V2"/><line x1="3" y1="14.5" x2="13" y2="14.5"/></svg>;
const LineSpacingIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M5 3h8M5 6.5h8M5 10h8M5 13.5h8M2 5l1-2 1 2M2 11.5l1 2 1-2"/></svg>;
const LogoIcon = () => (
  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><rect x="2" y="3" width="12" height="1.8" rx=".9"/><rect x="2" y="7.1" width="12" height="1.8" rx=".9"/><rect x="2" y="11.2" width="8" height="1.8" rx=".9"/></svg>
  </div>
);
const FlagSmall = () => <svg width="8" height="8" viewBox="0 0 16 16" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"><path d="M3 2v12M3 2l9 4-9 4"/></svg>;

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */
function mergeRangesForDisplay(ranges) {
  if (!ranges?.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end && (sorted[i].color || "yellow") === (last.color || "yellow")) {
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
  for (const { start, end, color } of merged) {
    const bg = HIGHLIGHT_COLORS[color] || HIGHLIGHT_COLORS.yellow;
    if (start > pos) parts.push(<span key={`t-${pos}`}>{text.slice(pos, start)}</span>);
    parts.push(<mark key={`h-${start}`} style={{ backgroundColor: bg, borderRadius: "2px", padding: "1px 0" }}>{text.slice(start, end)}</mark>);
    pos = end;
  }
  if (pos < text.length) parts.push(<span key={`t-${pos}`}>{text.slice(pos)}</span>);
  return parts;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ═══════════════════════════════════════════
   DIRECTIONS MODAL
   ═══════════════════════════════════════════ */
function DirectionsModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[560px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-lg">Directions</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"><XMarkIcon /></button>
        </div>
        <div className="px-6 py-5 text-sm text-gray-700 leading-relaxed overflow-y-auto">
          <p className="mb-4 font-semibold text-gray-900">General Directions</p>
          <p className="mb-3">Each set of questions in this section is based on a single passage or a pair of passages. After reading the passage or pair of passages, choose the best answer to each question based on what is stated or implied in the passage or passages.</p>
          <p className="mb-3">All questions in this section are worth one point. There is no penalty for guessing, so you should answer every question even if you are unsure of your answer.</p>
          <p className="mb-3">You may refer to the passages as often as necessary while answering the questions.</p>
          <p className="text-xs text-gray-400 italic mt-6">Placeholder directions for development.</p>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: ACCENT }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   TIMER SETTINGS MODAL
   ═══════════════════════════════════════════ */
function TimerSettingsModal({ onSave, onCancel }) {
  const [timeStr, setTimeStr] = useState("00:35:00");
  const handleSave = () => {
    const parts = timeStr.split(":").map(p => parseInt(p) || 0);
    onSave((parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-[360px]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Set Timer</h3>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><XMarkIcon /></button>
        </div>
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-600 mb-2">Time (HH:MM:SS):</label>
          <input type="text" value={timeStr} onChange={e => setTimeStr(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="00:35:00" />
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: ACCENT }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXAM INTERFACE

   Data contract unchanged: `questions` arrive from /api/exam/start
   (or /session/[id]) as snake_case rows with correct_answer +
   explanations STRIPPED. Score/review uses `answerKey` prop
   (from /api/exam/complete), NOT question objects.
   ═══════════════════════════════════════════════════════════════ */
export default function ExamInterface({
  questions = [],
  examTitle = "Exam",
  sectionName = "Section",
  sectionAbbr = "SEC",
  sectionColor = "#2563eb",
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
  /* ── Core state (unchanged) ── */
  const [currentIdx, setCurrentIdx] = useState(startIndex || 0);
  const [answers, setAnswers] = useState(initialAnswers || {});
  const [flagged, setFlagged] = useState(initialFlagged || {});
  const [struck, setStruck] = useState(initialStruck || {});
  const [highlights, setHighlights] = useState(initialHighlights || {});
  const [timerSeconds, setTimerSeconds] = useState(initialSeconds ?? (testMode && timeLimit ? timeLimit : 0));
  const [timerDirection, setTimerDirection] = useState(testMode && timeLimit ? "down" : "up");
  const [countdownTarget, setCountdownTarget] = useState(testMode && timeLimit ? timeLimit : 0);
  const [timerPaused, setTimerPaused] = useState(startPaused);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [mode, setMode] = useState(startInReview ? "review" : "exam");

  /* ── New UI state ── */
  const [highlightActive, setHighlightActive] = useState(false);
  const [highlightColor, setHighlightColor] = useState("yellow");
  const [showDirections, setShowDirections] = useState(false);
  const [passageFullView, setPassageFullView] = useState(false);
  const [showTimer, setShowTimer] = useState(true);
  const [fontSize, setFontSize] = useState("medium");
  const [lineSpacing, setLineSpacing] = useState("normal");

  const passageRef = useRef(null);
  const questionRef = useRef(null);

  const q = questions[currentIdx];
  const totalQ = questions.length;
  const answeredCount = Object.keys(answers).length;
  const isReview = mode === "review";

  /* ── Answer key map ── */
  const answerMap = useMemo(() => {
    if (!answerKey) return {};
    return Object.fromEntries(answerKey.map(a => [a.id, a]));
  }, [answerKey]);

  /* ── Passage resolution ── */
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

  /* ── Passage groups (for bottom bar clustering) ── */
  const passageGroups = useMemo(() => {
    const groups = [];
    let i = 0;
    while (i < questions.length) {
      const group = [i];
      let j = i + 1;
      while (j < questions.length &&
        questions[j].use_prev_passage &&
        questions[j].batch === questions[i].batch &&
        questions[j].section_id === questions[i].section_id) {
        group.push(j);
        j++;
      }
      groups.push(group);
      i = j;
    }
    return groups;
  }, [questions]);

  /* ── Passage counter ("Passage 2 of 4") ── */
  const passageCounter = useMemo(() => {
    const sets = passageGroups.filter(g => g.length > 1);
    if (sets.length === 0) return null;
    const idx = sets.findIndex(g => g.includes(currentIdx));
    if (idx === -1) return null;
    return { current: idx + 1, total: sets.length };
  }, [passageGroups, currentIdx]);

  /* ── Passage title (from the head question's passage, first line or bold intro) ── */
  const passageTitle = useMemo(() => {
    if (!currentPassage) return null;
    const firstLine = currentPassage.split("\n")[0].trim();
    if (firstLine.length < 80) return firstLine;
    return null;
  }, [currentPassage]);

  /* ── Timer tick ── */
  useEffect(() => {
    if (timerPaused || mode === "review" || mode === "score") return;
    if (timerDirection === "down" && timerSeconds <= 0) return;
    const t = setInterval(() => {
      setTimerSeconds(prev => timerDirection === "down" ? Math.max(prev - 1, 0) : prev + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [timerPaused, mode, timerDirection, timerSeconds]);

  /* ── Auto-end on time expiry ── */
  useEffect(() => {
    if (!testMode || timerDirection !== "down" || timerSeconds > 0) return;
    if (mode !== "exam" && mode !== "nav") return;
    endExam();
  }, [timerSeconds, testMode, timerDirection, mode]);

  /* ── Progress snapshot ── */
  const progressRef = useRef(null);
  progressRef.current = { answers, flagged, currentIdx, timerSeconds, highlights, struck };
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const flushProgress = async () => { if (onProgress) await onProgress(progressRef.current); };

  /* ── Debounced autosave ── */
  useEffect(() => {
    if (!onProgress || mode === "review" || mode === "score") return;
    const t = setTimeout(() => { if (modeRef.current === "score") return; onProgress(progressRef.current); }, 800);
    return () => clearTimeout(t);
  }, [answers, flagged, highlights, struck, currentIdx, onProgress, mode]);

  /* ── Periodic save ── */
  useEffect(() => {
    if (!onProgress) return;
    const t = setInterval(() => { if (modeRef.current === "exam" || modeRef.current === "nav") onProgress(progressRef.current); }, 30000);
    return () => clearInterval(t);
  }, [onProgress]);

  /* ── Timer settings handler ── */
  const handleTimerSave = (totalSeconds) => {
    setShowTimerSettings(false);
    if (totalSeconds > 0) { setTimerDirection("down"); setCountdownTarget(totalSeconds); setTimerSeconds(totalSeconds); }
    else { setTimerDirection("up"); setTimerSeconds(0); }
  };
  const resetTimer = () => { timerDirection === "down" ? setTimerSeconds(countdownTarget) : setTimerSeconds(0); setTimerPaused(false); };

  /* ── Navigation ── */
  const goTo = (idx) => {
    setCurrentIdx(idx);
    setMode(prev => prev === "nav" ? "exam" : prev);
    setPassageFullView(false);
    if (passageRef.current) passageRef.current.scrollTop = 0;
    if (questionRef.current) questionRef.current.scrollTop = 0;
  };
  const goNext = () => { if (currentIdx < totalQ - 1) goTo(currentIdx + 1); };
  const goPrev = () => { if (currentIdx > 0) goTo(currentIdx - 1); };

  /* ── Answer / Flag / Strike ── */
  const selectAnswer = (label) => {
    setAnswers(p => ({ ...p, [q.id]: label }));
    setStruck(p => (p[q.id]?.[label] ? { ...p, [q.id]: { ...p[q.id], [label]: false } } : p));
  };
  const toggleFlag = () => setFlagged(p => ({ ...p, [q.id]: !p[q.id] }));
  const toggleStrike = (label) => setStruck(p => ({ ...p, [q.id]: { ...(p[q.id] || {}), [label]: !(p[q.id]?.[label]) } }));
  const resetQuestion = () => {
    setAnswers(p => { const n = { ...p }; delete n[q.id]; return n; });
    setStruck(p => { const n = { ...p }; delete n[q.id]; return n; });
  };

  /* ── Highlight handler ── */
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
      if (exactIdx !== -1) return { ...prev, [hKey]: existing.filter((_, i) => i !== exactIdx) };
      return { ...prev, [hKey]: [...existing, { start, end, color: highlightColor }] };
    });
  };

  /* ── Highlight swatch click ── */
  const handleSwatchClick = (color) => {
    if (highlightActive && highlightColor === color) setHighlightActive(false);
    else { setHighlightActive(true); setHighlightColor(color); }
  };

  /* ── Font / spacing cycling ── */
  const cycleFontSize = () => setFontSize(p => p === "small" ? "medium" : p === "medium" ? "large" : "small");
  const cycleLineSpacing = () => setLineSpacing(p => p === "compact" ? "normal" : p === "normal" ? "relaxed" : "compact");

  /* ── Score (from answerKey) ── */
  const score = useMemo(() => {
    if (!answerKey) return null;
    let correct = 0;
    questions.forEach(question => { const key = answerMap[question.id]; if (key && answers[question.id] === key.correct) correct++; });
    return { correct, total: totalQ, pct: totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0 };
  }, [answerKey, answerMap, answers, questions, totalQ]);

  const missedQuestionIds = useMemo(() => {
    if (!answerKey) return [];
    return questions.filter(q => { const key = answerMap[q.id]; return answers[q.id] && key && answers[q.id] !== key.correct; }).map(q => q.id);
  }, [answerKey, answerMap, answers, questions]);

  const endExam = () => { setMode("score"); if (onComplete) onComplete({ answers, flagged }); };

  /* ── Shared header for all modes ── */
  const renderHeader = (centerText, centerSub) => (
    <header className="h-14 flex items-center px-5 flex-shrink-0" style={{ background: HEADER_BG }}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <LogoIcon />
        <div className="min-w-0">
          <div className="text-white font-bold text-[11px] tracking-[0.1em] uppercase leading-tight">THE ACADEMY</div>
          <div className="text-gray-400 text-[11px] leading-tight">LSAT Practice</div>
        </div>
      </div>
      <div className="text-center flex-1">
        <div className="text-white font-semibold text-sm leading-tight">{centerText || examTitle}</div>
        {centerSub && <div className="text-gray-400 text-xs leading-tight mt-0.5">{centerSub}</div>}
      </div>
      <div className="flex-1" />
    </header>
  );

  /* ═══════════════════════════════════════════
     SCORE SCREEN
     ═══════════════════════════════════════════ */
  if (mode === "score") {
    if (!score) return <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}><div className="text-gray-400 text-lg">Scoring...</div></div>;
    return (
      <div className="h-screen flex flex-col" style={{ background: PAGE_BG, fontFamily: "var(--font-exam)" }}>
        {renderHeader("Score Report", `${sectionAbbr} · ${sectionName}`)}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-10 px-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center mb-8">
              <div className="text-6xl font-bold mb-2" style={{ color: ACCENT }}>{score.pct}%</div>
              <div className="text-gray-500 text-lg">{score.correct} of {score.total} correct</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 font-semibold text-[11px] text-gray-500 uppercase tracking-wider grid grid-cols-12 gap-2 border-b border-gray-200">
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
                  <div key={question.id} className={`px-5 py-3 grid grid-cols-12 gap-2 items-center text-sm border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <div className="col-span-1 text-gray-400 font-medium">{idx + 1}</div>
                    <div className="col-span-5 text-gray-800">{question.topic || "—"}</div>
                    <div className="col-span-2 text-center font-medium">{ua || "—"}</div>
                    <div className="col-span-2 text-center font-medium">{correctAns || "—"}</div>
                    <div className="col-span-2 text-center">
                      {ua ? <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ic ? "bg-green-50 text-green-600 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>{ic ? "Correct" : "Incorrect"}</span> : <span className="text-xs text-gray-300">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => { setMode("review"); setCurrentIdx(0); }} className="px-6 py-2.5 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>Review Answers</button>
              {missedQuestionIds.length > 0 && onReattemptMissed && (
                <button onClick={() => onReattemptMissed(missedQuestionIds, answers)} className="px-6 py-2.5 text-white rounded-lg font-semibold bg-rose-500 hover:bg-rose-600">Reattempt Missed ({missedQuestionIds.length})</button>
              )}
              {onExit && <button onClick={onExit} className="px-6 py-2.5 bg-white text-gray-600 rounded-lg font-semibold border border-gray-200 hover:bg-gray-50">Back to Dashboard</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     NAV / REVIEW SUMMARY SCREEN
     ═══════════════════════════════════════════ */
  if (mode === "nav") {
    return (
      <div className="h-screen flex flex-col" style={{ background: PAGE_BG, fontFamily: "var(--font-exam)" }}>
        {renderHeader("Review", `${sectionAbbr} · ${sectionName}`)}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-10 px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review Your Answers</h2>
                <p className="text-sm text-gray-500 mt-1">{answeredCount} of {totalQ} answered · Click any question to return to it.</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-medium">Time</div>
                <div className="font-mono text-lg font-semibold text-gray-700 tabular-nums">{formatTime(timerSeconds)}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
              <div className="bg-gray-50 px-5 py-2.5 font-semibold text-[11px] text-gray-500 uppercase tracking-wider grid grid-cols-6 gap-2 border-b border-gray-200">
                <div className="col-span-1">#</div><div className="col-span-2">Status</div>
                <div className="col-span-2">Answer</div><div className="col-span-1 text-center">Flag</div>
              </div>
              {questions.map((question, idx) => (
                <button key={question.id} onClick={() => goTo(idx)} className="w-full px-5 py-2.5 grid grid-cols-6 gap-2 items-center text-sm border-b border-gray-100 last:border-0 hover:bg-blue-50/50 transition-colors text-left">
                  <div className="col-span-1 font-medium text-gray-500">{idx + 1}</div>
                  <div className="col-span-2">{answers[question.id] ? <span className="text-green-600 font-medium">Complete</span> : <span className="text-amber-500 font-medium">Incomplete</span>}</div>
                  <div className="col-span-2 text-gray-600 font-medium">{answers[question.id] || "—"}</div>
                  <div className="col-span-1 text-center">{flagged[question.id] && <span className="text-amber-500"><BookmarkIcon filled /></span>}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button onClick={() => setMode("exam")} className="px-5 py-2.5 bg-white text-gray-700 rounded-lg font-semibold border border-gray-200 hover:bg-gray-50">Return to Exam</button>
                {onExit && (
                  <button onClick={async () => {
                    if (onProgress) { await flushProgress(); onExit(); }
                    else if (window.confirm("Leave this exam? Your progress will be lost.")) onExit();
                  }} className="px-5 py-2.5 bg-white text-gray-400 rounded-lg font-medium border border-gray-200 hover:bg-gray-50">Back to Dashboard</button>
                )}
              </div>
              <button onClick={endExam} className="px-6 py-2.5 text-white rounded-lg font-semibold hover:opacity-90" style={{ background: "#dc2626" }}>Finish &amp; Score</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  /* ═══════════════════════════════════════════
     MAIN EXAM LAYOUT
     ═══════════════════════════════════════════ */
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: PAGE_BG, fontFamily: "var(--font-exam)" }}>

      {showDirections && <DirectionsModal onClose={() => setShowDirections(false)} />}
      {showTimerSettings && <TimerSettingsModal onSave={handleTimerSave} onCancel={() => setShowTimerSettings(false)} />}

      {/* ── HEADER BAR ── */}
      <header className="h-14 flex items-center px-5 flex-shrink-0" style={{ background: HEADER_BG }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <LogoIcon />
          <div className="min-w-0">
            <div className="text-white font-bold text-[11px] tracking-[0.1em] uppercase leading-tight">THE ACADEMY</div>
            <div className="text-gray-400 text-[11px] leading-tight">LSAT Practice</div>
          </div>
        </div>
        <div className="text-center flex-1">
          <div className="text-white font-semibold text-sm leading-tight">{examTitle}</div>
          <div className="text-gray-400 text-xs leading-tight mt-0.5">{sectionAbbr} · {sectionName}</div>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          {!isReview && (
            <>
              <button onClick={() => setTimerPaused(p => !p)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-500/40 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                {timerPaused ? <><PlayIcon /> Resume</> : <><PauseIcon /> Pause</>}
              </button>
              {hasPassage && (
                <button onClick={() => setPassageFullView(p => !p)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-500/40 text-white text-sm font-medium hover:bg-white/10 transition-colors">
                  <PlayIcon /> {passageFullView ? "Question view" : "Passage view"}
                </button>
              )}
              <button onClick={() => setMode("nav")}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>
                Finish section
              </button>
            </>
          )}
          {isReview && (
            <button onClick={() => setMode("score")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-sm font-semibold hover:opacity-90" style={{ background: ACCENT }}>
              Back to Score
            </button>
          )}
        </div>
      </header>

      {/* ── TOOLBAR ── */}
      <div className="h-12 flex items-center justify-between px-5 flex-shrink-0 bg-white border-b border-gray-200">
        {/* Left: passage counter + directions */}
        <div className="flex items-center gap-2">
          {passageCounter && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ background: "#4f46e5" }}>
              Passage {passageCounter.current} of {passageCounter.total}
            </span>
          )}
          <button onClick={() => setShowDirections(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <DirectionBarsIcon /> Directions
          </button>
        </div>

        {/* Center: annotation tools */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] tracking-[0.08em] uppercase text-gray-400 font-medium hidden lg:block">Select text to annotate</span>
          <div className="flex items-center gap-1">
            <button className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 border border-transparent hover:border-gray-200" title="Underline (placeholder)">
              <UnderlineIcon />
            </button>
            {Object.entries(HIGHLIGHT_COLORS).map(([key, bg]) => (
              <button key={key} onClick={() => handleSwatchClick(key)} title={`Highlight ${key}`}
                className={`w-6 h-6 rounded-full border-2 transition-all ${highlightActive && highlightColor === key ? "ring-2 ring-offset-1 ring-blue-400 scale-110" : "hover:scale-105"}`}
                style={{ background: bg, borderColor: HIGHLIGHT_SWATCH_BORDER[key] }} />
            ))}
          </div>
        </div>

        {/* Right: font, spacing, timer */}
        <div className="flex items-center gap-2">
          <button onClick={cycleFontSize} title={`Font size: ${fontSize}`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold hover:bg-gray-100 ${fontSize !== "medium" ? "text-blue-600 bg-blue-50" : "text-gray-500"}`}>
            Aa
          </button>
          <button onClick={cycleLineSpacing} title={`Line spacing: ${lineSpacing}`}
            className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 ${lineSpacing !== "normal" ? "text-blue-600 bg-blue-50" : "text-gray-500"}`}>
            <LineSpacingIcon />
          </button>
          <div className="h-6 w-px bg-gray-200 mx-1" />
          {showTimer ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50">
              <ClockIcon />
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-wider text-gray-400 font-medium leading-none">Time {timerDirection === "down" ? "remaining" : "elapsed"}</div>
                <button onClick={() => !testMode && setShowTimerSettings(true)} className="font-mono text-sm font-bold tabular-nums text-gray-800 leading-none mt-0.5 hover:text-blue-600">{formatTime(timerSeconds)}</button>
              </div>
              <button onClick={() => setShowTimer(false)} className="text-[10px] text-gray-400 hover:text-gray-600 font-medium ml-1">Hide</button>
            </div>
          ) : (
            <button onClick={() => setShowTimer(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-500 hover:bg-gray-100">
              <ClockIcon /> Show
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT SPLIT ── */}
      <div className="flex-1 flex gap-5 p-5 overflow-hidden min-h-0">

        {/* PASSAGE PANEL */}
        {hasPassage && (
          <div className={`${passageFullView ? "w-full" : "w-[45%]"} bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden`}>
            <div ref={passageRef}
              className="flex-1 overflow-y-auto exam-scroll px-7 py-6"
              onMouseUp={handlePassageMouseUp}
              style={{ userSelect: highlightActive ? "text" : "auto", cursor: highlightActive ? "text" : "default" }}>
              <div className="text-[10px] uppercase tracking-[0.1em] text-gray-400 font-semibold mb-3">Passage</div>
              {passageTitle && <h3 className="font-bold text-gray-900 text-lg mb-4 leading-snug">{passageTitle}</h3>}
              <div className={`passage-text whitespace-pre-line ${highlightActive ? "selection:bg-blue-200" : ""}`}
                style={{ fontSize: FONT_SIZES[fontSize], lineHeight: LINE_HEIGHTS[lineSpacing] }}>
                {renderPassageWithHighlights(
                  passageTitle ? currentPassage.slice(passageTitle.length).trimStart() : currentPassage,
                  highlights[passageSource?.id] || []
                )}
              </div>
              {currentPassageImage && (
                <div className="mt-6 border border-gray-200 rounded-lg bg-gray-50 p-4">
                  <img src={currentPassageImage} alt={currentPassageImageCaption || "Figure"} className="max-w-full h-auto mx-auto block" />
                  {currentPassageImageCaption && <p className="text-center text-xs italic text-gray-500 mt-2">{currentPassageImageCaption}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTION PANEL */}
        {!passageFullView && (
          <div className={`${hasPassage ? "flex-1" : "w-full max-w-3xl mx-auto"} bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden`}>
            <div ref={questionRef} className="flex-1 overflow-y-auto exam-scroll px-7 py-6">
              {/* Question header */}
              <div className="flex items-center justify-between mb-5">
                <div className="text-[10px] uppercase tracking-[0.1em] text-gray-400 font-semibold">Question {currentIdx + 1} of {totalQ}</div>
                {!isReview && (
                  <button onClick={toggleFlag}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${flagged[q.id]
                      ? "border-amber-300 bg-amber-50 text-amber-600"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                    <BookmarkIcon filled={!!flagged[q.id]} /> Flag
                  </button>
                )}
                {isReview && (
                  <div className="flex gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">{q.topic}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${q.difficulty === "Easy" ? "bg-green-50 text-green-600" : q.difficulty === "Hard" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{q.difficulty}</span>
                  </div>
                )}
              </div>

              {/* Stem */}
              <h2 className="font-bold text-gray-900 text-[17px] leading-relaxed mb-6">{q.stem}</h2>

              {/* Choices */}
              <div className="space-y-3">
                {q.choices.map(choice => {
                  const isSel = answers[q.id] === choice.label;
                  const isStr = struck[q.id]?.[choice.label];
                  const key = answerMap[q.id];
                  const isCor = isReview && key && choice.label === key.correct;
                  const isIncSel = isReview && isSel && key && choice.label !== key.correct;

                  let borderCol = "#e2e8f0", bgCol = "#ffffff", badgeBg = "#ffffff", badgeBorder = "#d1d5db", badgeText = "#6b7280";
                  if (isReview) {
                    if (isCor) { borderCol = "#4ade80"; bgCol = "#f0fdf4"; badgeBg = "#16a34a"; badgeBorder = "#16a34a"; badgeText = "#ffffff"; }
                    else if (isIncSel) { borderCol = "#f87171"; bgCol = "#fef2f2"; badgeBg = "#dc2626"; badgeBorder = "#dc2626"; badgeText = "#ffffff"; }
                  } else if (isSel) { borderCol = ACCENT; bgCol = "#eff6ff"; badgeBg = ACCENT; badgeBorder = ACCENT; badgeText = "#ffffff"; }

                  return (
                    <div key={choice.label}
                      className={`flex items-center gap-3 rounded-xl border-2 transition-all ${isStr && !isReview ? "opacity-50" : ""} ${!isReview ? "cursor-pointer hover:shadow-sm" : ""}`}
                      style={{ borderColor: borderCol, background: bgCol }}>
                      {/* Click area: letter badge + text */}
                      <button onClick={() => { if (!isReview) selectAnswer(choice.label); }} disabled={isReview}
                        className="flex items-center gap-3 flex-1 p-4 text-left min-w-0">
                        {/* Letter badge */}
                        <div className="w-8 h-8 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-sm font-bold"
                          style={{ borderColor: badgeBorder, background: badgeBg, color: badgeText }}>
                          {(isSel && !isReview) || isCor ? <CheckIcon /> : isIncSel ? <XMarkIcon /> : choice.label}
                        </div>
                        {/* Choice text */}
                        <span className={`text-sm leading-relaxed ${isStr && !isReview ? "line-through text-gray-400" : isSel && !isReview ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          {choice.text}
                        </span>
                      </button>
                      {/* Right: Selected badge OR eliminate icon */}
                      <div className="flex items-center gap-2 pr-4 flex-shrink-0">
                        {isSel && !isReview && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Selected</span>
                        )}
                        {!isSel && !isReview && (
                          <button onClick={(e) => { e.stopPropagation(); toggleStrike(choice.label); }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isStr ? "text-orange-500 bg-orange-50" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"}`}
                            title="Eliminate">
                            <SlashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Instructions + Reset */}
              {!isReview && (
                <div className="flex items-center justify-between mt-5">
                  <p className="text-xs text-gray-400 italic">Select an answer, or use the slash icon to eliminate a choice.</p>
                  {(answers[q.id] || (struck[q.id] && Object.values(struck[q.id]).some(Boolean))) && (
                    <button onClick={resetQuestion} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium">
                      <XMarkIcon /> Reset
                    </button>
                  )}
                </div>
              )}

              {/* Review explanations */}
              {isReview && answerMap[q.id] && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-4">Explanation</h3>
                  {q.choices.map(choice => {
                    const key = answerMap[q.id];
                    const isCor = choice.label === key.correct;
                    const isSel = answers[q.id] === choice.label;
                    return (
                      <div key={choice.label} className={`mb-3 p-4 rounded-lg text-sm leading-relaxed ${isCor ? "bg-green-50 border border-green-200" : isSel ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-100"}`}>
                        <div className="font-semibold mb-1">
                          <span className={isCor ? "text-green-700" : isSel ? "text-red-700" : "text-gray-500"}>
                            {choice.label}. {isCor ? "Correct" : isSel ? "Your answer" : ""}
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
        )}
      </div>

      {/* ── BOTTOM BAR ── */}
      <div className="h-16 flex items-center justify-between px-6 flex-shrink-0 bg-white border-t border-gray-200">
        {/* Left: label */}
        <div className="flex-shrink-0 w-36">
          <span className="text-[10px] uppercase tracking-[0.1em] text-gray-400 font-semibold">Section progress</span>
        </div>

        {/* Center: question bubbles with passage grouping */}
        <div className="flex-1 flex items-center justify-center overflow-x-auto py-1 gap-3">
          {passageGroups.map((group, gIdx) => (
            <div key={gIdx} className="flex items-center gap-[3px]">
              {group.map(qIdx => {
                const isAct = qIdx === currentIdx;
                const isAns = !!answers[questions[qIdx]?.id];
                const isFlg = flagged[questions[qIdx]?.id];
                const key = answerMap[questions[qIdx]?.id];
                const isCor = isReview && key && answers[questions[qIdx]?.id] === key.correct;
                const isInc = isReview && key && answers[questions[qIdx]?.id] && answers[questions[qIdx]?.id] !== key.correct;

                let bg = "bg-white border border-gray-300 text-gray-500";
                if (isAct) bg = "text-white border-transparent";
                else if (isCor) bg = "bg-green-100 border border-green-300 text-green-700";
                else if (isInc) bg = "bg-red-100 border border-red-300 text-red-700";
                else if (isAns) bg = "bg-gray-200 border border-gray-300 text-gray-600";

                return (
                  <button key={qIdx} onClick={() => goTo(qIdx)}
                    className={`relative w-7 h-7 rounded-full text-[11px] font-semibold flex items-center justify-center flex-shrink-0 transition-colors hover:ring-2 hover:ring-blue-200 ${bg}`}
                    style={isAct ? { background: ACCENT } : undefined}>
                    {qIdx + 1}
                    {isFlg && <div className="absolute -top-1.5 -right-0.5"><FlagSmall /></div>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right: Previous / Next */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={goPrev} disabled={currentIdx === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <ArrowLeft /> Previous
          </button>
          <button onClick={goNext} disabled={currentIdx === totalQ - 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            style={{ background: ACCENT }}>
            Next <ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}
