"use client";
import { useState, useEffect, useRef, useMemo } from "react";

/* ═══════════════════════════════════════════
   DESIGN TOKENS
   ═══════════════════════════════════════════ */
const PRIMARY = "#246BFD";
const DARK_BUTTON = "#18243A";
const DARK_TEXT = "#172033";
const MUTED_TEXT = "#68758A";
const BORDER = "#DCE3ED";
const PAGE_BG = "#F1F4F9";
const TOOLBAR_BG = "#FBFCFE";
const SELECTED_BG = "#EEF4FF";
const ANSWERED_GREEN = "#1A7F5A";
const FLAGGED_AMBER = "#D99A00";

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
const FONT_SIZES = { small: "16px", medium: "18px", large: "20px" };
const LINE_HEIGHTS = { compact: 1.5, normal: 1.65, relaxed: 1.85 };

/* ═══════════════════════════════════════════
   ICONS (Lucide-style)
   ═══════════════════════════════════════════ */
const PauseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const PlayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const BookmarkIcon = ({ filled }) => <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const XMarkIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const SlashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><line x1="6" y1="18" x2="18" y2="6"/></svg>;
const ClockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const ArrowLeft = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const ArrowRight = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>;
const UnderlineIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>;
const LineSpacingIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/><polyline points="4 8 7 5 4 2" transform="rotate(90 5.5 5)"/><polyline points="4 22 7 19 4 16" transform="rotate(90 5.5 19)"/></svg>;
const EyeOffIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const EyeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const FlagIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const FlagSmall = () => <svg width="9" height="9" viewBox="0 0 24 24" fill={FLAGGED_AMBER} stroke={FLAGGED_AMBER} strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/></svg>;
const ListIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const SourceIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>;

const LogoIcon = () => (
  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: PRIMARY }}>
    <svg width="18" height="18" viewBox="0 0 16 16" fill="white"><rect x="2" y="3" width="12" height="1.8" rx=".9"/><rect x="2" y="7.1" width="12" height="1.8" rx=".9"/><rect x="2" y="11.2" width="8" height="1.8" rx=".9"/></svg>
  </div>
);

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
      <div className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="font-bold text-lg" style={{ color: DARK_TEXT }}>Directions</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" style={{ color: MUTED_TEXT }}><XMarkIcon /></button>
        </div>
        <div className="px-6 py-5 text-sm leading-relaxed overflow-y-auto" style={{ color: MUTED_TEXT }}>
          <p className="mb-4 font-semibold" style={{ color: DARK_TEXT }}>General Directions</p>
          <p className="mb-3">Each set of questions in this section is based on a single passage or a pair of passages. After reading the passage or pair of passages, choose the best answer to each question based on what is stated or implied in the passage or passages.</p>
          <p className="mb-3">All questions in this section are worth one point. There is no penalty for guessing, so you should answer every question even if you are unsure of your answer.</p>
          <p className="mb-3">You may refer to the passages as often as necessary while answering the questions.</p>
          <p className="text-xs italic mt-6 opacity-60">Placeholder directions for development.</p>
        </div>
        <div className="px-6 py-3 border-t flex justify-end" style={{ borderColor: BORDER }}>
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: PRIMARY }}>Close</button>
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
      <div className="bg-white rounded-2xl shadow-2xl w-[360px]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: BORDER }}>
          <h3 className="font-bold" style={{ color: DARK_TEXT }}>Set Timer</h3>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" style={{ color: MUTED_TEXT }}><XMarkIcon /></button>
        </div>
        <div className="p-5">
          <label className="block text-sm font-medium mb-2" style={{ color: MUTED_TEXT }}>Time (HH:MM:SS):</label>
          <input type="text" value={timeStr} onChange={e => setTimeStr(e.target.value)}
            className="w-full px-4 py-2.5 border rounded-lg text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{ borderColor: BORDER }}
            placeholder="00:35:00" />
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: BORDER }}>
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100" style={{ color: MUTED_TEXT }}>Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: PRIMARY }}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXAM INTERFACE (LSATExamLayout)

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
  sectionColor = "#246BFD",
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

  /* ── UI state ── */
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

  /* ── Derive section type from question data ── */
  const sectionType = useMemo(() => {
    const code = sectionAbbr?.toLowerCase();
    if (code === "rc") return "reading_comprehension";
    return "logical_reasoning";
  }, [sectionAbbr]);

  const sourceLabel = sectionType === "reading_comprehension" ? "PASSAGE" : "STIMULUS";

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

  const timerWarning = timerDirection === "down" && timerSeconds <= 300 && timerSeconds > 0;

  /* ── Shared ExamHeader for all modes ── */
  const renderHeader = (extras) => (
    <header className="flex items-center px-6 flex-shrink-0 bg-white border-b" style={{ height: "74px", borderColor: BORDER }}>
      <div className="flex items-center gap-3 min-w-0">
        <LogoIcon />
        <div className="min-w-0">
          <div className="font-bold text-[12px] tracking-[0.06em] uppercase leading-tight" style={{ color: DARK_TEXT }}>The Academy</div>
          <div className="text-[12px] leading-tight" style={{ color: MUTED_TEXT }}>LSAT Practice</div>
        </div>
        <div className="w-px h-8 mx-3" style={{ background: BORDER }} />
        <div className="min-w-0">
          <div className="font-semibold text-[14px] leading-tight" style={{ color: DARK_TEXT }}>Practice Test 01</div>
          <div className="text-[12px] leading-tight mt-0.5" style={{ color: MUTED_TEXT }}>Section 1 · {sectionName}</div>
        </div>
      </div>
      <div className="flex-1" />
      {extras}
    </header>
  );

  /* ═══════════════════════════════════════════
     SCORE SCREEN
     ═══════════════════════════════════════════ */
  if (mode === "score") {
    if (!score) return <div className="h-screen flex items-center justify-center" style={{ background: PAGE_BG }}><div style={{ color: MUTED_TEXT }} className="text-lg">Scoring...</div></div>;
    return (
      <div className="h-screen flex flex-col" style={{ background: PAGE_BG, fontFamily: "var(--font-exam)" }}>
        {renderHeader(
          <button onClick={onExit} className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50" style={{ borderColor: BORDER, color: MUTED_TEXT }}>
            Back to Dashboard
          </button>
        )}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-10 px-6">
            <div className="bg-white rounded-2xl border p-8 text-center mb-8" style={{ borderColor: BORDER }}>
              <div className="text-6xl font-bold mb-2" style={{ color: PRIMARY }}>{score.pct}%</div>
              <div className="text-lg" style={{ color: MUTED_TEXT }}>{score.correct} of {score.total} correct</div>
            </div>
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
              <div className="px-5 py-3 font-semibold text-[11px] uppercase tracking-wider grid grid-cols-12 gap-2 border-b" style={{ color: MUTED_TEXT, background: "#F8FAFC", borderColor: BORDER }}>
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
                  <div key={question.id} className={`px-5 py-3 grid grid-cols-12 gap-2 items-center text-sm border-b last:border-0 ${idx % 2 === 0 ? "bg-white" : ""}`} style={{ borderColor: BORDER, background: idx % 2 !== 0 ? "#F8FAFC" : undefined }}>
                    <div className="col-span-1 font-medium" style={{ color: MUTED_TEXT }}>{idx + 1}</div>
                    <div className="col-span-5" style={{ color: DARK_TEXT }}>{question.topic || "—"}</div>
                    <div className="col-span-2 text-center font-medium">{ua || "—"}</div>
                    <div className="col-span-2 text-center font-medium">{correctAns || "—"}</div>
                    <div className="col-span-2 text-center">
                      {ua ? <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ic ? "text-white" : "text-white"}`} style={{ background: ic ? ANSWERED_GREEN : "#DC2626" }}>{ic ? "Correct" : "Incorrect"}</span> : <span className="text-xs" style={{ color: MUTED_TEXT }}>—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button onClick={() => { setMode("review"); setCurrentIdx(0); }} className="px-6 py-2.5 text-white rounded-lg font-semibold hover:opacity-90" style={{ background: PRIMARY }}>Review Answers</button>
              {missedQuestionIds.length > 0 && onReattemptMissed && (
                <button onClick={() => onReattemptMissed(missedQuestionIds, answers)} className="px-6 py-2.5 text-white rounded-lg font-semibold bg-rose-500 hover:bg-rose-600">Reattempt Missed ({missedQuestionIds.length})</button>
              )}
              {onExit && <button onClick={onExit} className="px-6 py-2.5 rounded-lg font-semibold border hover:bg-gray-50" style={{ borderColor: BORDER, color: MUTED_TEXT }}>Back to Dashboard</button>}
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
        {renderHeader(
          <div className="flex items-center gap-2">
            <button onClick={() => setMode("exam")} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50" style={{ borderColor: BORDER, color: DARK_TEXT }}>
              Return to Exam
            </button>
            <button onClick={endExam} className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: "#DC2626" }}>
              Finish &amp; Score
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-10 px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: DARK_TEXT }}>Review Your Answers</h2>
                <p className="text-sm mt-1" style={{ color: MUTED_TEXT }}>{answeredCount} of {totalQ} answered · Click any question to return to it.</p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider font-medium" style={{ color: MUTED_TEXT }}>Time</div>
                <div className="font-mono text-lg font-semibold tabular-nums" style={{ color: DARK_TEXT }}>{formatTime(timerSeconds)}</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border overflow-hidden mb-6" style={{ borderColor: BORDER }}>
              <div className="px-5 py-2.5 font-semibold text-[11px] uppercase tracking-wider grid grid-cols-6 gap-2 border-b" style={{ color: MUTED_TEXT, background: "#F8FAFC", borderColor: BORDER }}>
                <div className="col-span-1">#</div><div className="col-span-2">Status</div>
                <div className="col-span-2">Answer</div><div className="col-span-1 text-center">Flag</div>
              </div>
              {questions.map((question, idx) => (
                <button key={question.id} onClick={() => goTo(idx)} className="w-full px-5 py-2.5 grid grid-cols-6 gap-2 items-center text-sm border-b last:border-0 hover:bg-blue-50/50 transition-colors text-left" style={{ borderColor: BORDER }}>
                  <div className="col-span-1 font-medium" style={{ color: MUTED_TEXT }}>{idx + 1}</div>
                  <div className="col-span-2">{answers[question.id] ? <span className="font-medium" style={{ color: ANSWERED_GREEN }}>Complete</span> : <span className="font-medium" style={{ color: FLAGGED_AMBER }}>Incomplete</span>}</div>
                  <div className="col-span-2 font-medium" style={{ color: DARK_TEXT }}>{answers[question.id] || "—"}</div>
                  <div className="col-span-1 text-center">{flagged[question.id] && <span style={{ color: FLAGGED_AMBER }}><BookmarkIcon filled /></span>}</div>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {onExit && (
                  <button onClick={async () => {
                    if (onProgress) { await flushProgress(); onExit(); }
                    else if (window.confirm("Leave this exam? Your progress will be lost.")) onExit();
                  }} className="px-5 py-2.5 rounded-lg font-medium border hover:bg-gray-50" style={{ borderColor: BORDER, color: MUTED_TEXT }}>Back to Dashboard</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!q) return null;

  /* ═══════════════════════════════════════════
     MAIN EXAM LAYOUT (LSATExamLayout)
     ═══════════════════════════════════════════ */
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: PAGE_BG, fontFamily: "var(--font-exam)" }}>

      {showDirections && <DirectionsModal onClose={() => setShowDirections(false)} />}
      {showTimerSettings && <TimerSettingsModal onSave={handleTimerSave} onCancel={() => setShowTimerSettings(false)} />}

      {/* ── ExamHeader ── */}
      {renderHeader(
        <div className="flex items-center gap-2">
          {!isReview && (
            <>
              <button onClick={() => setTimerPaused(p => !p)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:opacity-80 transition-colors"
                style={{ borderColor: BORDER, background: "#F5F7FA", color: DARK_TEXT }}>
                {timerPaused ? <><PlayIcon /> Resume</> : <><PauseIcon /> Pause</>}
              </button>
              {hasPassage && (
                <button onClick={() => setPassageFullView(p => !p)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#C8D2E1", color: DARK_TEXT }}>
                  <SourceIcon /> {passageFullView ? "Split view" : "Passage view"}
                </button>
              )}
              <button onClick={() => setMode("nav")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: DARK_BUTTON }}>
                Finish section
              </button>
            </>
          )}
          {isReview && (
            <button onClick={() => setMode("score")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90"
              style={{ background: DARK_BUTTON }}>
              Back to Score
            </button>
          )}
        </div>
      )}

      {/* ── Unified Exam Workspace ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ margin: "24px 26px 24px 26px", minHeight: 0 }}>
        <div className="flex-1 flex flex-col bg-white rounded-[20px] overflow-hidden" style={{ border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)" }}>

          {/* ── ExamToolbar ── */}
          <div className="flex items-center justify-between px-6 flex-shrink-0 border-b" style={{ height: "62px", borderColor: BORDER, background: TOOLBAR_BG }}>
            {/* Left: passage indicator + Directions */}
            <div className="flex items-center gap-3">
              {passageCounter && (
                <span className="px-3 py-1.5 rounded-lg text-[12.5px] font-bold" style={{ background: "#EAF1FF", color: "#215BD8" }}>
                  Passage {passageCounter.current} of {passageCounter.total}
                </span>
              )}
              <button onClick={() => setShowDirections(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-semibold hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#D5DEEA", color: DARK_TEXT }}>
                <ListIcon /> Directions
              </button>
            </div>

            {/* Center: annotation tools */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] tracking-[0.06em] uppercase font-medium hidden lg:block" style={{ color: MUTED_TEXT }}>Select text to annotate</span>
              <div className="flex items-center gap-1.5">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-gray-50 transition-colors" style={{ borderColor: BORDER, color: MUTED_TEXT }} title="Underline">
                  <UnderlineIcon />
                </button>
                {Object.entries(HIGHLIGHT_COLORS).map(([key, bg]) => (
                  <button key={key} onClick={() => handleSwatchClick(key)} title={`Highlight ${key}`}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${highlightActive && highlightColor === key ? "ring-2 ring-offset-1 scale-110" : "hover:scale-105"}`}
                    style={{ background: bg, borderColor: HIGHLIGHT_SWATCH_BORDER[key], ringColor: PRIMARY }} />
                ))}
              </div>
              <div className="w-px h-6" style={{ background: BORDER }} />
              <button onClick={cycleFontSize} title={`Font size: ${fontSize}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border hover:bg-gray-50 transition-colors"
                style={{ borderColor: fontSize !== "medium" ? PRIMARY : BORDER, color: fontSize !== "medium" ? PRIMARY : MUTED_TEXT, background: fontSize !== "medium" ? SELECTED_BG : "transparent" }}>
                Aa
              </button>
              <button onClick={cycleLineSpacing} title={`Line spacing: ${lineSpacing}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center border hover:bg-gray-50 transition-colors"
                style={{ borderColor: lineSpacing !== "normal" ? PRIMARY : BORDER, color: lineSpacing !== "normal" ? PRIMARY : MUTED_TEXT, background: lineSpacing !== "normal" ? SELECTED_BG : "transparent" }}>
                <LineSpacingIcon />
              </button>
            </div>

            {/* Right: timer */}
            <div className="flex items-center gap-2">
              {showTimer ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                  style={{ borderColor: timerWarning ? "#FBBF24" : "#D5E4DC", background: timerWarning ? "#FFFBEB" : "#F4F8F6" }}>
                  <div style={{ color: ANSWERED_GREEN }}><ClockIcon /></div>
                  <div className="text-right">
                    <div className="text-[10.5px] uppercase tracking-wider font-bold leading-none" style={{ color: MUTED_TEXT, letterSpacing: "0.6px" }}>Time remaining</div>
                    <button onClick={() => !testMode && setShowTimerSettings(true)}
                      className="font-mono text-[13.5px] font-extrabold tabular-nums leading-none mt-0.5 hover:opacity-70"
                      style={{ color: timerWarning ? "#DC2626" : DARK_TEXT, fontVariantNumeric: "tabular-nums" }}>
                      {formatTime(timerSeconds)}
                    </button>
                  </div>
                  <button onClick={() => setShowTimer(false)} className="ml-1 text-[11.5px] font-bold hover:opacity-70" style={{ color: ANSWERED_GREEN }} title="Hide timer">
                    Hide
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowTimer(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm hover:bg-gray-50" style={{ borderColor: BORDER, color: MUTED_TEXT }}>
                  <EyeIcon /> Show Timer
                </button>
              )}
            </div>
          </div>

          {/* ── Panel area ── */}
          <div className="flex-1 flex overflow-hidden min-h-0">

            {/* ── SourcePanel (left, always 52%) ── */}
            <div className={passageFullView ? "w-full" : "flex-none"} style={passageFullView ? undefined : { width: "52%" }}>
              <div ref={passageRef}
                className="h-full overflow-y-auto exam-scroll"
                onMouseUp={handlePassageMouseUp}
                style={{ padding: "32px 36px", userSelect: highlightActive ? "text" : "auto", cursor: highlightActive ? "text" : "default" }}>
                <div className="text-[11px] uppercase tracking-[0.1em] font-semibold mb-4" style={{ color: MUTED_TEXT }}>{sourceLabel}</div>
                {hasPassage ? (
                  <>
                    <div className={`passage-text whitespace-pre-line ${highlightActive ? "selection:bg-blue-200" : ""}`}
                      style={{ fontSize: FONT_SIZES[fontSize], lineHeight: LINE_HEIGHTS[lineSpacing], maxWidth: "58ch" }}>
                      {renderPassageWithHighlights(
                        currentPassage,
                        highlights[passageSource?.id] || []
                      )}
                    </div>
                    {currentPassageImage && (
                      <div className="mt-6 border rounded-lg p-4" style={{ borderColor: BORDER, background: "#F8FAFC" }}>
                        <img src={currentPassageImage} alt={currentPassageImageCaption || "Figure"} className="max-w-full h-auto mx-auto block" />
                        {currentPassageImageCaption && <p className="text-center text-xs italic mt-2" style={{ color: MUTED_TEXT }}>{currentPassageImageCaption}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`passage-text whitespace-pre-line`}
                    style={{ fontSize: FONT_SIZES[fontSize], lineHeight: LINE_HEIGHTS[lineSpacing], maxWidth: "58ch" }}>
                    {q.passage || q.stem_context || (
                      <span style={{ color: MUTED_TEXT, fontStyle: "italic", fontFamily: "var(--font-exam)" }}>No stimulus provided for this question.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Vertical divider ── */}
            {!passageFullView && <div className="w-px flex-shrink-0" style={{ background: BORDER }} />}

            {/* ── QuestionPanel (right, always 48%) ── */}
            {!passageFullView && (
              <div className="flex-none" style={{ width: "48%" }}>
                <div ref={questionRef} className="h-full overflow-y-auto exam-scroll" style={{ padding: "24px 28px" }}>
                  {/* QuestionHeader */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="text-[11px] uppercase tracking-[0.1em] font-semibold" style={{ color: MUTED_TEXT }}>
                      Question {currentIdx + 1} of {totalQ}
                    </div>
                    {!isReview && (
                      <button onClick={toggleFlag}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
                        style={{
                          borderColor: flagged[q.id] ? FLAGGED_AMBER : BORDER,
                          background: flagged[q.id] ? "#FFF8E1" : "transparent",
                          color: flagged[q.id] ? FLAGGED_AMBER : MUTED_TEXT,
                        }}>
                        <FlagIcon /> Flag
                      </button>
                    )}
                    {isReview && (
                      <div className="flex gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "#F1F4F9", color: MUTED_TEXT }}>{q.topic}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${q.difficulty === "Easy" ? "bg-green-50 text-green-600" : q.difficulty === "Hard" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>{q.difficulty}</span>
                      </div>
                    )}
                  </div>

                  {/* QuestionStem */}
                  <h2 className="font-bold text-[18px] leading-[1.4] mb-4" style={{ color: DARK_TEXT }}>{q.stem}</h2>

                  {/* AnswerChoiceList */}
                  <div className="flex flex-col" style={{ gap: "8px" }}>
                    {q.choices.map(choice => {
                      const isSel = answers[q.id] === choice.label;
                      const isStr = struck[q.id]?.[choice.label];
                      const key = answerMap[q.id];
                      const isCor = isReview && key && choice.label === key.correct;
                      const isIncSel = isReview && isSel && key && choice.label !== key.correct;

                      let borderCol = "#D8E0EB";
                      let bgCol = "#ffffff";
                      let badgeBg = "#F5F7FA";
                      let badgeBorder = "#C7D1DF";
                      let badgeText = DARK_TEXT;

                      if (isReview) {
                        if (isCor) { borderCol = ANSWERED_GREEN; bgCol = "#ECFDF5"; badgeBg = ANSWERED_GREEN; badgeBorder = ANSWERED_GREEN; badgeText = "#ffffff"; }
                        else if (isIncSel) { borderCol = "#DC2626"; bgCol = "#FEF2F2"; badgeBg = "#DC2626"; badgeBorder = "#DC2626"; badgeText = "#ffffff"; }
                      } else if (isSel) {
                        borderCol = PRIMARY;
                        bgCol = SELECTED_BG;
                        badgeBg = PRIMARY;
                        badgeBorder = PRIMARY;
                        badgeText = "#ffffff";
                      }

                      return (
                        <div key={choice.label}
                          className={`flex items-center transition-all ${isStr && !isReview ? "opacity-45" : ""} ${!isReview ? "cursor-pointer" : ""}`}
                          style={{ borderRadius: "10px", border: `${isSel && !isReview ? "2px" : "1.5px"} solid ${borderCol}`, background: bgCol }}>
                          <button onClick={() => { if (!isReview) selectAnswer(choice.label); }} disabled={isReview}
                            className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                            style={{ padding: "10px 12px" }}>
                            <div className="rounded-full flex-shrink-0 flex items-center justify-center text-[12px] font-bold"
                              style={{ width: "26px", height: "26px", border: `1.5px solid ${badgeBorder}`, background: badgeBg, color: badgeText }}>
                              {(isSel && !isReview) || isCor ? <CheckIcon /> : isIncSel ? <XMarkIcon /> : choice.label}
                            </div>
                            <span className={`leading-snug ${isStr && !isReview ? "line-through" : ""}`}
                              style={{ fontSize: "14px", color: isStr && !isReview ? MUTED_TEXT : DARK_TEXT, fontWeight: isSel && !isReview ? 600 : 400 }}>
                              {choice.text}
                            </span>
                          </button>
                          <div className="flex items-center gap-1.5 flex-shrink-0" style={{ paddingRight: "10px" }}>
                            {isSel && !isReview && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#D6E4FF", color: PRIMARY }}>Selected</span>
                            )}
                            {!isSel && !isReview && (
                              <button onClick={(e) => { e.stopPropagation(); toggleStrike(choice.label); }}
                                className="rounded-full flex items-center justify-center transition-colors"
                                style={{
                                  width: "26px", height: "26px",
                                  color: isStr ? "#E45E3B" : "#8B97A9",
                                  background: isStr ? "#FEF0EC" : "#F7F9FC",
                                  border: `1.5px solid ${isStr ? "#E45E3B" : "#C7D1DF"}`,
                                }}
                                title="Eliminate">
                                <SlashIcon />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ResetResponse */}
                  {!isReview && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-[12px]" style={{ color: MUTED_TEXT }}>Select an answer, or use the slash icon to eliminate a choice.</p>
                      {(answers[q.id] || (struck[q.id] && Object.values(struck[q.id]).some(Boolean))) && (
                        <button onClick={resetQuestion}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold hover:bg-gray-50 flex-shrink-0"
                          style={{ borderColor: "#D5DEEA", color: DARK_TEXT }}>
                          <XMarkIcon /> Reset
                        </button>
                      )}
                    </div>
                  )}

                  {/* Review explanations */}
                  {isReview && answerMap[q.id] && (
                    <div className="mt-8 border-t pt-6" style={{ borderColor: BORDER }}>
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] mb-4" style={{ color: MUTED_TEXT }}>Explanation</h3>
                      {q.choices.map(choice => {
                        const key = answerMap[q.id];
                        const isCor = choice.label === key.correct;
                        const isSel = answers[q.id] === choice.label;
                        return (
                          <div key={choice.label} className="mb-3 p-4 rounded-lg text-sm leading-relaxed border" style={{
                            background: isCor ? "#ECFDF5" : isSel ? "#FEF2F2" : "#F8FAFC",
                            borderColor: isCor ? "#A7F3D0" : isSel ? "#FECACA" : BORDER,
                          }}>
                            <div className="font-semibold mb-1" style={{ color: isCor ? ANSWERED_GREEN : isSel ? "#DC2626" : MUTED_TEXT }}>
                              {choice.label}. {isCor ? "Correct" : isSel ? "Your answer" : ""}
                            </div>
                            <div style={{ color: DARK_TEXT }}>{key.explanations?.[choice.label]}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── SectionQuestionBar ── */}
          <div className="flex items-center justify-between px-6 flex-shrink-0 border-t" style={{ height: "92px", borderColor: BORDER, background: TOOLBAR_BG }}>
            {/* Left: label */}
            <div className="flex-shrink-0" style={{ width: "120px" }}>
              <span className="text-[11px] uppercase tracking-[0.08em] font-semibold" style={{ color: MUTED_TEXT }}>Section Progress</span>
            </div>

            {/* Center: question bubbles */}
            <div className="flex-1 flex items-center justify-center overflow-x-auto py-2" style={{ gap: sectionType === "reading_comprehension" ? "0" : "4px" }}>
              {passageGroups.map((group, gIdx) => (
                <div key={gIdx} className="flex items-center">
                  {sectionType === "reading_comprehension" && gIdx > 0 && (
                    <div className="flex-shrink-0 mx-1.5" style={{ width: "1px", height: "28px", background: BORDER }} />
                  )}
                  <div className="flex items-center" style={{ gap: "4px" }}>
                    {group.map(qIdx => {
                      const isAct = qIdx === currentIdx;
                      const isAns = !!answers[questions[qIdx]?.id];
                      const isFlg = flagged[questions[qIdx]?.id];
                      const key = answerMap[questions[qIdx]?.id];
                      const isCor = isReview && key && answers[questions[qIdx]?.id] === key.correct;
                      const isInc = isReview && key && answers[questions[qIdx]?.id] && answers[questions[qIdx]?.id] !== key.correct;

                      let bg = "transparent";
                      let border = "#C8D1DE";
                      let textColor = MUTED_TEXT;

                      if (isAct) {
                        bg = PRIMARY; border = PRIMARY; textColor = "#ffffff";
                      } else if (isCor) {
                        bg = "#DCFCE7"; border = "#86EFAC"; textColor = ANSWERED_GREEN;
                      } else if (isInc) {
                        bg = "#FEE2E2"; border = "#FECACA"; textColor = "#DC2626";
                      } else if (isFlg) {
                        bg = "#FFF8E1"; border = FLAGGED_AMBER; textColor = FLAGGED_AMBER;
                      } else if (isAns) {
                        bg = "#E8F5E9"; border = "#A5D6A7"; textColor = ANSWERED_GREEN;
                      }

                      return (
                        <button key={qIdx} onClick={() => goTo(qIdx)}
                          className="relative rounded-full flex items-center justify-center flex-shrink-0 transition-colors font-semibold"
                          style={{ width: "30px", height: "30px", fontSize: "12px", background: bg, border: `1.5px solid ${border}`, color: textColor }}>
                          {qIdx + 1}
                          {isFlg && !isAct && <div className="absolute -top-1.5 -right-0.5"><FlagSmall /></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Previous / Next */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={goPrev} disabled={currentIdx === 0}
                className="flex items-center gap-1.5 px-5 rounded-xl border text-[12.5px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                style={{ height: "44px", borderColor: "#C8D2E1", color: DARK_TEXT }}>
                <ArrowLeft /> Previous
              </button>
              <button onClick={goNext} disabled={currentIdx === totalQ - 1}
                className="flex items-center gap-1.5 px-6 rounded-xl text-[12.5px] font-bold text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                style={{ height: "44px", background: PRIMARY }}>
                Next <ArrowRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
