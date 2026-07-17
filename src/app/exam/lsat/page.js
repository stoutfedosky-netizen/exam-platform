"use client";
import { useState, useEffect } from "react";
import { useExam } from "@/context/ExamContext";
import ExamInterface from "@/components/ExamInterface";

const PRIMARY = "#246BFD";
const DARK_TEXT = "#172033";
const MUTED_TEXT = "#68758A";
const BORDER = "#DCE3ED";
const PAGE_BG = "#F1F4F9";

export default function LSATPage() {
  const {
    user, authLoading, displayName, supabase,
    activeExam, starting, completing,
    startExam, saveProgress, completeExam, exitExam,
  } = useExam();

  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedMode, setSelectedMode] = useState("practice");
  const [questionCount, setQuestionCount] = useState(10);
  const [error, setError] = useState(null);
  const [loadingSections, setLoadingSections] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("sections")
      .select("*")
      .eq("exam_id", "lsat")
      .order("sort_order")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setSections(data || []);
        setLoadingSections(false);
      });
  }, [user, supabase]);

  const handleStart = async () => {
    setError(null);
    try {
      await startExam({
        examId: "lsat",
        sectionCode: selectedSection,
        mode: selectedMode,
        count: questionCount,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const selectedSectionData = sections.find(s => s.code === selectedSection);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAGE_BG }}>
        <div style={{ color: MUTED_TEXT }} className="text-lg">Loading...</div>
      </div>
    );
  }

  if (activeExam) {
    return (
      <ExamInterface
        questions={activeExam.questions}
        examTitle={activeExam.examTitle}
        sectionName={selectedSectionData?.name || activeExam.sectionCode || "LSAT"}
        sectionAbbr={activeExam.sectionAbbr}
        sectionColor={activeExam.sectionColor}
        timeLimit={activeExam.timeLimit}
        testMode={activeExam.testMode}
        examTools={activeExam.examTools}
        answerKey={activeExam.answerKey}
        onComplete={completeExam}
        onExit={exitExam}
        onProgress={saveProgress}
        initialAnswers={activeExam.initialAnswers}
        initialFlagged={activeExam.initialFlagged}
        initialHighlights={activeExam.initialHighlights}
        initialStruck={activeExam.initialStruck}
        startIndex={activeExam.startIndex}
        initialSeconds={activeExam.initialSeconds}
        startPaused={activeExam.startPaused}
        startInReview={activeExam.startInReview}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG, fontFamily: "var(--font-exam)" }}>
      {/* Header */}
      <header className="flex items-center px-6 bg-white border-b" style={{ height: "74px", borderColor: BORDER }}>
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: PRIMARY }}>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="white"><rect x="2" y="3" width="12" height="1.8" rx=".9"/><rect x="2" y="7.1" width="12" height="1.8" rx=".9"/><rect x="2" y="11.2" width="8" height="1.8" rx=".9"/></svg>
            </div>
            <div>
              <div className="font-bold text-[12px] tracking-[0.06em] uppercase leading-tight" style={{ color: DARK_TEXT }}>The Academy</div>
              <div className="text-[12px] leading-tight" style={{ color: MUTED_TEXT }}>LSAT Practice</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: MUTED_TEXT }}>
              {displayName?.[0]?.toUpperCase() || "S"}
            </div>
            <span className="text-sm" style={{ color: MUTED_TEXT }}>{displayName}</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto py-10 px-6">
        <div className="bg-white rounded-2xl border p-8" style={{ borderColor: BORDER, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: DARK_TEXT }}>Start a Session</h2>
          <p className="text-sm mb-8" style={{ color: MUTED_TEXT }}>Choose a section and mode to begin practicing.</p>

          {/* Section picker */}
          <div className="mb-8">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: MUTED_TEXT }}>Section</label>
            <div className="grid grid-cols-2 gap-3">
              {loadingSections ? (
                <div className="col-span-2 text-sm" style={{ color: MUTED_TEXT }}>Loading sections...</div>
              ) : sections.map(section => (
                <button key={section.id} onClick={() => setSelectedSection(section.code)}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{
                    border: `2px solid ${selectedSection === section.code ? PRIMARY : BORDER}`,
                    background: selectedSection === section.code ? "#EEF4FF" : "white",
                  }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: section.color }} />
                    <span className="font-semibold" style={{ color: DARK_TEXT }}>{section.name}</span>
                  </div>
                  <div className="text-xs mt-1 ml-[22px]" style={{ color: MUTED_TEXT }}>{section.abbr}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode picker */}
          <div className="mb-8">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: MUTED_TEXT }}>Mode</label>
            <div className="flex gap-3">
              {[
                { id: "practice", label: "Practice", desc: "Untimed, review as you go" },
                { id: "timed", label: "Timed", desc: "35-minute section timer" },
              ].map(m => (
                <button key={m.id} onClick={() => setSelectedMode(m.id)}
                  className="flex-1 p-4 rounded-xl text-left transition-all"
                  style={{
                    border: `2px solid ${selectedMode === m.id ? PRIMARY : BORDER}`,
                    background: selectedMode === m.id ? "#EEF4FF" : "white",
                  }}>
                  <div className="font-semibold text-sm" style={{ color: DARK_TEXT }}>{m.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: MUTED_TEXT }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div className="mb-8">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: MUTED_TEXT }}>Questions</label>
            <input type="number" min={1} max={100} value={questionCount}
              onChange={e => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              style={{ border: `1px solid ${BORDER}` }} />
          </div>

          {error && <p className="text-sm text-red-500 mb-4 p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>}

          <button onClick={handleStart} disabled={!selectedSection || starting}
            className="px-8 py-3 text-white rounded-lg font-semibold disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: PRIMARY }}>
            {starting ? "Starting..." : "Start Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
