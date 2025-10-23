import React, { useEffect, useState } from "react";

export default function QuizSection({ api, selected, docs, loadAttemptHistory }) {
  const [quizMode, setQuizMode] = useState("select"); // auto | select | custom
  const [topicDocId, setTopicDocId] = useState(selected || "all");
  const [topicList, setTopicList] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [quizPrompt, setQuizPrompt] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);

  // Counts
  const [quizCount, setQuizCount] = useState(5);
  const [onewordCount, setOnewordCount] = useState(0);
  const [saqCount, setSaqCount] = useState(0);
  const [laqCount, setLaqCount] = useState(0);

  // State flags
  const [validationError, setValidationError] = useState("");
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingScore, setLoadingScore] = useState(false);

  // Reset validation error when inputs change
  useEffect(() => {
    if (validationError) setValidationError("");
  }, [quizCount, onewordCount, saqCount, laqCount, quizMode, selectedTopic, topicDocId, quizPrompt]);

  // Fetch topic list for Select mode
  useEffect(() => {
    const docId = topicDocId === "all" ? null : topicDocId;
    setTopicList([]);
    setSelectedTopic("");
    if (!docId) return;
    let mounted = true;
    fetch(`/api/quiz/topics?documentId=${docId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        if (j && Array.isArray(j.topics)) setTopicList(j.topics);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [topicDocId]);

  // Generate quiz
  const onGenQuiz = async () => {
    setLoadingQuiz(true);
    setValidationError("");
    try {
      const mcqCount = Math.max(0, Math.min(20, Number(quizCount) || 5));
      const saqCountVal = Math.max(0, Math.min(10, Number(saqCount) || 0));
      const laqCountVal = Math.max(0, Math.min(5, Number(laqCount) || 0));
      const onewordCountVal = Math.max(0, Math.min(20, Number(onewordCount) || 0));

      let documentIdToUse = null;
      let instructionsToUse = "";

      if (quizMode === "auto") {
        documentIdToUse = selected === "all" ? null : selected;
      } else if (quizMode === "select") {
        documentIdToUse = topicDocId === "all" ? null : topicDocId;
      } else if (quizMode === "custom") {
        documentIdToUse = selected === "all" ? null : selected;
        instructionsToUse = quizPrompt;
      }

      let combinedInstructions = instructionsToUse || "";
      if (quizMode === "select" && selectedTopic) {
        combinedInstructions =
          (combinedInstructions ? combinedInstructions + "\n" : "") + `Focus topic: ${selectedTopic}`;
      }

      const totalRequested = mcqCount + onewordCountVal + saqCountVal + laqCountVal;
      if (totalRequested > 80) {
        setValidationError("Requested too many questions. Please reduce the total to 80 or fewer.");
        setLoadingQuiz(false);
        return;
      }

      const res = await api.genQuiz(
        documentIdToUse,
        mcqCount,
        onewordCountVal,
        saqCountVal,
        laqCountVal,
        combinedInstructions,
        selectedTopic
      );

      // If no questions generated, show error and log raw output
      if (!res.questions || !Array.isArray(res.questions) || res.questions.length === 0) {
        setValidationError("Quiz generation failed. Please try again, reduce question counts, or adjust your instructions.");
        if (res.raw) {
          // eslint-disable-next-line no-console
          console.error("Quiz generation LLM output:", res.raw);
        }
        setQuiz(null);
        setLoadingQuiz(false);
        return;
      }

      setQuiz(res);
      setAnswers({});
      setScore(null);
    } catch (err) {
      console.error("Quiz generation error:", err);
      setQuiz({ questions: [] });
    } finally {
      setLoadingQuiz(false);
    }
  };

  // Score quiz
  const onScore = async () => {
    if (!quiz?.questions?.length) return;
    setLoadingScore(true);
    try {
      const ordered = quiz.questions.map((q) => answers[q.id]);
      const payload = {
        documentId: selected === "all" ? null : selected,
        answers: ordered,
        questions: quiz.questions,
      };
      const res = await api.scoreQuiz(payload);
      setScore(res);
      // Always refresh attempt history after scoring
      if (typeof loadAttemptHistory === 'function' && selected && selected !== "all") {
        await loadAttemptHistory();
      }
      // Also trigger dashboard refresh if available
      if (window.dispatchEvent) {
        window.dispatchEvent(new Event('refreshDashboard'));
      }
    } finally {
      setLoadingScore(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Configuration form (shown when quiz not yet generated) */}
      {!quiz && (
        <>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "8px", color: "var(--accent)" }}>Quiz Generator</h3>
            <p style={{ color: "var(--muted)", marginBottom: "16px" }}>
              Generate customized quizzes based on your PDF content. Choose question types and counts.
            </p>
          </div>

          {/* Mode selection */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="quizMode" value="auto" checked={quizMode === "auto"} onChange={() => setQuizMode("auto")} />
                <span>Auto (current PDF)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name="quizMode"
                  value="select"
                  checked={quizMode === "select"}
                  onChange={() => docs.length > 0 && setQuizMode("select")}
                  disabled={docs.length === 0}
                />
                <span>Select PDF / Topic</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="radio" name="quizMode" value="custom" checked={quizMode === "custom"} onChange={() => setQuizMode("custom")} />
                <span>Custom instructions</span>
              </label>
            </div>

            {/* Select mode topic dropdown */}
            {quizMode === "select" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                {docs.length === 0 ? (
                  <div style={{ color: "var(--muted)" }}>
                    No uploaded PDFs yet. Upload one to enable the Select option.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      value={topicDocId}
                      onChange={(e) => setTopicDocId(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: 8, background: "#0f1530", color: "var(--text)" }}
                    >
                      <option value="all">All uploaded PDFs</option>
                      {docs.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.title} ({d.pages}p)
                        </option>
                      ))}
                    </select>
                    {topicList.length > 0 && (
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 8, background: "#0f1530", color: "var(--text)" }}
                      >
                        <option value="">All topics</option>
                        {topicList.map((t, idx) => (
                          <option key={idx} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Custom prompt input */}
            {quizMode === "custom" && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <textarea
                  rows={3}
                  value={quizPrompt}
                  onChange={(e) => setQuizPrompt(e.target.value)}
                  placeholder="E.g. Focus on Chapter 3: Kinematics. Make MCQs application-level; include numerical problems."
                  style={{
                    width: "80%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#0f1530",
                    color: "var(--text)",
                    border: "1px solid #1f2b57",
                    resize: "vertical",
                  }}
                />
              </div>
            )}
          </div>

          {/* Question counts grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            {[
              { label: "Multiple Choice Questions (MCQ)", icon: "🔘", desc: "Quick recall & factual knowledge", state: quizCount, setter: setQuizCount, max: 20 },
              { label: "One-Word Answers", icon: "🔤", desc: "Single-word or numeric answers", state: onewordCount, setter: setOnewordCount, max: 20 },
              { label: "Short Answer Questions (SAQ)", icon: "📝", desc: "2–3 sentence conceptual answers", state: saqCount, setter: setSaqCount, max: 10 },
              { label: "Long Answer Questions (LAQ)", icon: "📄", desc: "Detailed analytical explanations", state: laqCount, setter: setLaqCount, max: 5 },
            ].map((q) => (
              <div key={q.label} className="section" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2em", marginBottom: "8px" }}>{q.icon}</div>
                <h4 style={{ marginTop: 0, marginBottom: "8px", color: "var(--accent2)" }}>{q.label}</h4>
                <p style={{ fontSize: "0.9em", color: "var(--muted)", marginBottom: "12px" }}>{q.desc}</p>
                <div>
                  <div style={{ fontSize: "0.85em", color: "var(--muted)", marginBottom: "4px" }}>
                    Number of Questions
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={q.max}
                    value={q.state}
                    onChange={(e) => q.setter(e.target.value)}
                    style={{ width: "100px", textAlign: "center" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Generate button */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <button
              onClick={onGenQuiz}
              disabled={
                loadingQuiz ||
                validationError ||
                (quizCount == 0 && onewordCount == 0 && saqCount == 0 && laqCount == 0)
              }
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 auto",
              }}
            >
              {loadingQuiz ? (
                <>
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "2px solid transparent",
                      borderTop: "2px solid currentColor",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <span>Generating Quiz...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Generate Quiz</span>
                </>
              )}
            </button>

            {(quizCount == 0 && onewordCount == 0 && saqCount == 0 && laqCount == 0) && (
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
                Please select at least one question type
              </div>
            )}

            {validationError && (
              <div
                style={{
                  marginTop: 8,
                  color: "#ffb4b4",
                  background: "#3b1a1a",
                  display: "inline-block",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: "13px",
                }}
              >
                {validationError}
              </div>
            )}
          </div>
        </>
      )}

      {/* Quiz rendering */}
      {quiz && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "8px", color: "var(--accent)" }}>Quiz Questions</h3>
              <p style={{ color: "var(--muted)" }}>
                {quiz.questions?.length || 0} questions generated
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => {
                setQuiz(null);
                setAnswers({});
                setScore(null);
              }}
              style={{
                padding: "8px 16px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              🔄 New Quiz
            </button>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {quiz.questions?.map((q, idx) => {
              const resultMap = score ? Object.fromEntries(score.results.map((r) => [r.id, r])) : {};
              const result = resultMap[q.id];
              const isCorrect = result ? result.correct : null;
              const isPartial = result ? result.partial : false;
              return (
                <div className="section" key={q.id} style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700 }}>
                    {`Q${idx + 1}. [${q.type}] `} {q.question}
                    {score && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: isCorrect ? "#6ee7b7" : isPartial ? "#ffa500" : "#ff7c7c",
                        }}
                      >
                        {isCorrect ? "Correct" : isPartial ? "Partial" : "Wrong"}
                      </span>
                    )}
                  </div>

                  {/* MCQ */}
                  {q.type === "MCQ" && Array.isArray(q.options) && (
                    <div style={{ marginTop: 8 }}>
                      {q.options.map((op, oidx) => {
                        let style = {};
                        if (score && result) {
                          if (oidx === result.expectedIndex) style = { color: "#6ee7b7" };
                          else if (!result.correct && oidx === result.userIndex) style = { color: "#ff7c7c" };
                        }
                        return (
                          <label key={oidx} style={{ display: "block", marginBottom: 6 }}>
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              onChange={() => setAnswers((a) => ({ ...a, [q.id]: oidx }))}
                            />{" "}
                            <span style={style}>{op}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Text questions */}
                  {(q.type === "SAQ" || q.type === "LAQ" || q.type === "ONEWORD") && (
                    <div style={{ marginTop: 8 }}>
                      {q.type === "ONEWORD" ? (
                        <input
                          type="text"
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          placeholder="One-word or numeric answer"
                          style={{
                            width: "50%",
                            padding: 8,
                            borderRadius: 8,
                            background: "#0f1530",
                            color: "var(--text)",
                            border: "1px solid #1f2b57",
                          }}
                        />
                      ) : (
                        <textarea
                          rows={q.type === "LAQ" ? 4 : 2}
                          style={{
                            width: "100%",
                            background: "#0f1530",
                            color: "var(--text)",
                            border: "1px solid #1f2b57",
                            borderRadius: 10,
                            padding: 10,
                          }}
                          placeholder={`Your ${q.type} answer...`}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  )}

                  {/* Explanation / Expected answer */}
                  {score && (
                    <div style={{ marginTop: 8, color: "var(--muted)" }}>
                      <div>p.{q.page} • {q.explanation}</div>
                      {(q.type === "SAQ" || q.type === "LAQ" || q.type === "ONEWORD") && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: 8,
                            background: "#0b1024",
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: "var(--text)" }}>Expected Answer:</div>
                          <div style={{ whiteSpace: "pre-wrap" }}>{q.answer}</div>
                          {result && (
                            <div style={{ marginTop: 4, color: "var(--muted)" }}>
                              Your Answer: {result.userAnswer}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit quiz button */}
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                background: "#0d142c",
                border: "1px solid #1a244d",
                borderRadius: 10,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={onScore}
                  disabled={loadingScore}
                  style={{
                    padding: "12px 24px",
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    margin: "0 auto",
                  }}
                >
                  {loadingScore ? (
                    <>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid transparent",
                          borderTop: "2px solid currentColor",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <span>Scoring…</span>
                    </>
                  ) : (
                    <>
                      ✅ <span>Submit Quiz</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            {score && (
              <div className="section" style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, fontSize: "18px", color: "var(--accent)" }}>
                  Quiz Results
                </div>
                <div style={{ marginBottom: 16, fontSize: "16px" }}>
                  Score:{" "}
                  <span style={{ fontWeight: 700, color: "var(--accent2)" }}>{score.score}</span> /{" "}
                  <span style={{ fontWeight: 700 }}>{score.total}</span>
                  <span style={{ marginLeft: "8px", color: "var(--muted)" }}>
                    ({(score.score / score.total * 100).toFixed(1)}%)
                  </span>
                </div>

                {score.analytics && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "#0b1024",
                      borderRadius: 8,
                      border: "1px solid #1a244d",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>
                      Performance Breakdown
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      {["mcq", "saq", "laq", "oneword"].map((type) => {
                        const acc = score.analytics[`${type}Accuracy`];
                        return (
                          <div key={type} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "0.8em", color: "var(--muted)" }}>
                              {type.toUpperCase()}
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                color:
                                  acc >= 0.8
                                    ? "#6ee7b7"
                                    : acc >= 0.6
                                    ? "#ffa500"
                                    : "#ff7c7c",
                              }}
                            >
                              {(acc * 100).toFixed(0)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {score.analytics.strengths?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: "0.9em", color: "#6ee7b7", marginBottom: 4 }}>
                          Strengths:
                        </div>
                        <div style={{ fontSize: "0.8em" }}>
                          {score.analytics.strengths.join(", ")}
                        </div>
                      </div>
                    )}
                    {score.analytics.weaknesses?.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.9em", color: "#ff7c7c", marginBottom: 4 }}>
                          Focus Areas:
                        </div>
                        <div style={{ fontSize: "0.8em" }}>
                          {score.analytics.weaknesses.join(", ")}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
