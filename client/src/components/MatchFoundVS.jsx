import React, { useState, useEffect, useRef } from 'react';

const MatchFoundVS = ({ whiteName, blackName, playerRole, onComplete }) => {
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1800);
    const t4 = setTimeout(() => { if (onCompleteRef.current) onCompleteRef.current(); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const myColor = playerRole || 'w';
  const myName = myColor === 'w' ? whiteName : blackName;
  const oppName = myColor === 'w' ? blackName : whiteName;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,3,10,0.97)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      opacity: phase >= 3 ? 0 : 1,
      transition: 'opacity 0.6s ease-out',
      pointerEvents: phase >= 3 ? 'none' : 'auto',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.15) 0%, transparent 70%)',
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }} />

      <div style={{
        position: 'absolute',
        width: '100%', height: '2px',
        top: '50%', left: 0,
        background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)',
        transform: 'translateY(-1px)',
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 0.3s ease',
        filter: 'blur(0.5px)',
        boxShadow: '0 0 20px rgba(139,92,246,0.4)',
      }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 'clamp(20px, 6vw, 80px)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          transform: phase >= 1 ? 'translateX(0) scale(1)' : 'translateX(-60px) scale(0.7)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            width: 'clamp(60px, 12vw, 90px)', height: 'clamp(60px, 12vw, 90px)',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(168,85,247,0.15))',
            border: '2px solid rgba(139,92,246,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(28px, 5vw, 40px)',
            boxShadow: '0 0 30px rgba(139,92,246,0.3)',
            color: '#e8e3ee',
          }}>
            {myName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span style={{
            fontSize: 'clamp(11px, 2vw, 13px)', fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>YOU</span>
          <span style={{
            fontSize: 'clamp(16px, 3.5vw, 24px)', fontWeight: 800,
            color: '#e8e3ee',
            textShadow: '0 0 20px rgba(139,92,246,0.5)',
            maxWidth: 140, textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{myName || 'Player'}</span>
        </div>

        <div style={{
          fontSize: 'clamp(40px, 10vw, 72px)', fontWeight: 900,
          fontFamily: "'Inter', sans-serif",
          background: 'linear-gradient(135deg, #f97316, #ef4444, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: 'none',
          filter: phase >= 2 ? 'drop-shadow(0 0 24px rgba(249,115,22,0.6))' : 'none',
          transform: phase >= 2 ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-15deg)',
          opacity: phase >= 2 ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          userSelect: 'none',
        }}>VS</div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          transform: phase >= 1 ? 'translateX(0) scale(1)' : 'translateX(60px) scale(0.7)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            width: 'clamp(60px, 12vw, 90px)', height: 'clamp(60px, 12vw, 90px)',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(220,38,38,0.15))',
            border: '2px solid rgba(239,68,68,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 'clamp(28px, 5vw, 40px)',
            boxShadow: '0 0 30px rgba(239,68,68,0.3)',
            color: '#fee2e2',
          }}>
            {oppName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <span style={{
            fontSize: 'clamp(11px, 2vw, 13px)', fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.12em',
          }}>OPPONENT</span>
          <span style={{
            fontSize: 'clamp(16px, 3.5vw, 24px)', fontWeight: 800,
            color: '#e8e3ee',
            textShadow: '0 0 20px rgba(239,68,68,0.5)',
            maxWidth: 140, textAlign: 'center',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{oppName || 'Opponent'}</span>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 'clamp(30px, 6vh, 60px)',
        fontSize: 'clamp(11px, 2vw, 13px)', fontWeight: 600,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: '0.2em', textTransform: 'uppercase',
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 0.4s ease 0.3s',
      }}>GET READY — MATCH STARTING</div>
    </div>
  );
};

export default MatchFoundVS;
