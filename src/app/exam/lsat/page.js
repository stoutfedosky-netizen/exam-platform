"use client";
import { useState, useEffect, useMemo } from "react";
import { useExam } from "@/context/ExamContext";
import ExamInterface from "@/components/ExamInterface";

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

  // Fetch sections from the DB (authenticated user can read via RLS)
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // When an exam is active, render ExamInterface full-screen
  if (activeExam) {
    return (
      <ExamInterface
        questions={activeExam.questions}
        examTitle={activeExam.examTitle}
        sectionName={activeExam.sectionCode || "LSAT"}
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

  // Launch page
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2b579a] text-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Law School Admission Test</h1>
            <p className="text-sm opacity-80">LSAT Practice</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-80">{displayName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-10 px-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Start a Session</h2>

        {/* Section picker */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Section</label>
          <div className="grid grid-cols-2 gap-3">
            {loadingSections ? (
              <div className="col-span-2 text-sm text-gray-500">Loading sections...</div>
            ) : sections.map(section => (
              <button key={section.id} onClick={() => setSelectedSection(section.code)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${selectedSection === section.code
                  ? "border-[#2b579a] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: section.color }} />
                  <span className="font-semibold text-gray-900">{section.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{section.abbr}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Mode picker */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Mode</label>
          <div className="flex gap-3">
            {[
              { id: "practice", label: "Practice", desc: "Untimed, review as you go" },
              { id: "timed", label: "Timed", desc: "35-minute section timer" },
            ].map(m => (
              <button key={m.id} onClick={() => setSelectedMode(m.id)}
                className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${selectedMode === m.id
                  ? "border-[#2b579a] bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                <div className="font-semibold text-sm text-gray-900">{m.label}</div>
                <div className="text-xs text-gray-500">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Question count */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Questions</label>
          <input type="number" min={1} max={100} value={questionCount}
            onChange={e => setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button onClick={handleStart} disabled={!selectedSection || starting}
          className="px-8 py-3 bg-[#2b579a] text-white rounded-lg font-semibold hover:bg-[#1e3a5f] disabled:opacity-50 transition-colors">
          {starting ? "Starting..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}
