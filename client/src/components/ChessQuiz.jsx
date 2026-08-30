import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const OPTION_KEYS = ['a', 'b', 'c', 'd'];
const OPTION_LABELS = { a: 'A', b: 'B', c: 'C', d: 'D' };
const TIMER_SECONDS = 15;
const ELO_PER_CORRECT = 2;

function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'sine'; o1.frequency.setValueAtTime(523, ctx.currentTime);
    o2.type = 'sine'; o2.frequency.setValueAtTime(659, ctx.currentTime);
    o2.frequency.setValueAtTime(784, ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    o1.start(ctx.currentTime); o2.start(ctx.currentTime);
    o1.stop(ctx.currentTime + 0.35); o2.stop(ctx.currentTime + 0.35);
    setTimeout(() => ctx.close(), 400);
  } catch {}
}

function playWrongSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(220, ctx.currentTime);
    o.frequency.setValueAtTime(165, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 350);
  } catch {}
}

function playTickSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.06);
    setTimeout(() => ctx.close(), 80);
  } catch {}
}

function playStartSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [392, 523, 659].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.1); o.stop(ctx.currentTime + i * 0.1 + 0.25);
    });
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function playFinishSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
      g.gain.linearRampToValueAtTime(0.14, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.35);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {}
}

export default function ChessQuiz({ onEloUpdate }) {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalElo, setTotalElo] = useState(0);
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [animClass, setAnimClass] = useState('');
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuestions();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/chess-quiz/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error('Quiz load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        if (prev <= 6) playTickSound();
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (started && questions.length > 0 && !finished && !showResult) {
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, finished, showResult, questions.length, startTimer, started]);

  const handleStart = () => {
    playStartSound();
    setStarted(true);
  };

  const handleAnswer = async (optionKey) => {
    if (selectedAnswer !== null || finished) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedAnswer(optionKey);
    const q = questions[currentIdx];

    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/chess-quiz/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: q.id, answer: optionKey })
      });
      const data = await res.json();

      if (data.ok) {
        setResult(data.correct ? 'correct' : 'wrong');
        setShowResult(true);

        if (data.correct) {
          playCorrectSound();
          setScore(s => s + 1);
          setStreak(s => {
            const next = s + 1;
            setBestStreak(b => Math.max(b, next));
            return next;
          });
          setTotalElo(data.newElo);
          setAnimClass('cq-flash-correct');
          if (onEloUpdate) onEloUpdate(data.newElo);
        } else {
          playWrongSound();
          setStreak(0);
          setAnimClass('cq-flash-wrong');
        }

        setTimeout(() => {
          setAnimClass('');
          setShowResult(false);
          setSelectedAnswer(null);
          setResult(null);

          if (currentIdx + 1 >= questions.length) {
            playFinishSound();
            setFinished(true);
          } else {
            setCurrentIdx(i => i + 1);
          }
        }, 1200);
      }
    } catch (e) {
      console.error('Quiz check error:', e);
      setSelectedAnswer(null);
      setResult(null);
    }
  };

  useEffect(() => {
    if (timer === 0 && selectedAnswer === null && !finished && started) {
      playWrongSound();
      handleAnswer('_timeout');
    }
  }, [timer]);

  const restartQuiz = () => {
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setResult(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTotalElo(0);
    setFinished(false);
    setShowResult(false);
    setAnimClass('');
    setLoading(true);
    setStarted(false);
    fetchQuestions();
  };

  if (loading) {
    return (
      <div className="cq-container">
        <div className="cq-loading">
          <div className="cq-spinner" />
          <span>Loading quiz...</span>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="cq-container">
        <div className="cq-empty">No quiz questions available</div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="cq-container cq-start-screen">
        <div className="cq-start-content">
          <div className="cq-start-icon">&#9818;</div>
          <div className="cq-start-title">Chess IQ Quiz</div>
          <div className="cq-start-desc">20 questions about chess knowledge. Answer fast — each correct answer earns you <strong>+2 ELO</strong>. You have <strong>15 seconds</strong> per question.</div>
          <div className="cq-start-meta">
            <span>20 Questions</span>
            <span className="cq-start-dot" />
            <span>15s Timer</span>
            <span className="cq-start-dot" />
            <span>+2 ELO each</span>
          </div>
          <button className="cq-start-btn" onClick={handleStart}>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? 'S' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';
    const gradeClass = grade === 'S' ? 'cq-grade-s' : grade === 'A' ? 'cq-grade-a' : grade === 'B' ? 'cq-grade-b' : grade === 'C' ? 'cq-grade-c' : 'cq-grade-d';

    return (
      <div className="cq-container cq-finish">
        <div className="cq-finish-card">
          <div className={`cq-grade ${gradeClass}`}>{grade}</div>
          <div className="cq-finish-title">Quiz Complete!</div>
          <div className="cq-finish-score">{score}/{questions.length}</div>
          <div className="cq-finish-pct">{pct}% Accuracy</div>
          <div className="cq-finish-stats">
            <div className="cq-finish-stat">
              <span className="cq-finish-stat-label">Best Streak</span>
              <span className="cq-finish-stat-val cq-streak-color">{bestStreak}</span>
            </div>
            <div className="cq-finish-stat">
              <span className="cq-finish-stat-label">ELO Earned</span>
              <span className="cq-finish-stat-val cq-elo-color">+{score * ELO_PER_CORRECT}</span>
            </div>
          </div>
          <button className="cq-restart-btn" onClick={restartQuiz}>Play Again</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;
  const timerPct = (timer / TIMER_SECONDS) * 100;
  const timerClass = timer <= 5 ? 'cq-timer-low' : timer <= 10 ? 'cq-timer-mid' : '';

  return (
    <div className={`cq-container ${animClass}`}>
      <div className="cq-header">
        <div className="cq-label">CHESS QUIZ</div>
        <div className="cq-progress-row">
          <div className="cq-progress-bar">
            <div className="cq-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="cq-progress-text">{currentIdx + 1}/{questions.length}</span>
        </div>
        <div className="cq-timer-bar">
          <div className={`cq-timer-fill ${timerClass}`} style={{ width: `${timerPct}%` }} />
        </div>
        <div className="cq-meta-row">
          <div className="cq-score">Score: {score}</div>
          {streak >= 2 && <div className="cq-streak-badge">🔥 {streak} streak!</div>}
          <div className="cq-timer-text">{timer}s</div>
        </div>
      </div>

      <div className="cq-question-card">
        <div className="cq-question-text">{q.question}</div>
      </div>

      <div className="cq-options">
        {OPTION_KEYS.map((key) => {
          let cls = 'cq-option';
          if (showResult && key === q.correct_option) cls += ' cq-option-correct';
          if (showResult && key === selectedAnswer && key !== q.correct_option) cls += ' cq-option-wrong';
          if (!showResult && selectedAnswer === key) cls += ' cq-option-selected';
          return (
            <button key={key} className={cls} onClick={() => handleAnswer(key)} disabled={selectedAnswer !== null}>
              <span className="cq-option-label">{OPTION_LABELS[key]}</span>
              <span className="cq-option-text">{q[`option_${key}`]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
