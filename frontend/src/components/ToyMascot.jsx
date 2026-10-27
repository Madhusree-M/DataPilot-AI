import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, Zap, FileSpreadsheet, Smile } from 'lucide-react';

export default function ToyMascot({ isDragging = false, uploading = false }) {
  const [clickCount, setClickCount] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [bubbleText, setBubbleText] = useState('');
  const [hearts, setHearts] = useState([]);

  const funQuotes = [
    "Feed me a dataset! I'm super hungry for CSV, Excel, or JSON! 🍬",
    "Drop your data below and I'll find all the secret trends! 🔍",
    "Don't worry about messy or missing data—I clean it in 1 click! 🧹",
    "Did you know? I can benchmark 7 machine learning models in seconds! ⚡",
    "I love Random Forests... they have great shade and top accuracy! 🌲",
    "Counterfactual simulations are my favorite game! Try the What-If lab! 🎮",
    "Beep-boop! Numbers are my love language! 💕",
  ];

  // Pick initial quote
  useEffect(() => {
    setBubbleText(funQuotes[0]);
  }, []);

  // Update speech bubble based on props
  useEffect(() => {
    if (uploading) {
      setBubbleText("Munching on your data right now! Crunching stats... 🚀✨");
    } else if (isDragging) {
      setBubbleText("OOH YES! Drop it right here! I'm ready to catch it! 🤩🎉");
    } else {
      setBubbleText(funQuotes[clickCount % funQuotes.length]);
    }
  }, [isDragging, uploading]);

  const handleToyClick = () => {
    setIsJumping(true);
    setClickCount((prev) => prev + 1);
    const nextQuote = funQuotes[(clickCount + 1) % funQuotes.length];
    setBubbleText(nextQuote);

    // Spawn floating heart effect
    const newHeart = { id: Date.now(), x: Math.random() * 60 - 30 };
    setHearts((prev) => [...prev, newHeart]);
    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 1200);

    setTimeout(() => {
      setIsJumping(false);
    }, 600);
  };

  return (
    <div className="toy-mascot-container">
      {/* Interactive Speech Bubble */}
      <div className={`toy-speech-bubble ${isDragging ? 'excited' : ''}`}>
        <div className="toy-speech-header">
          <span className="toy-name-tag">
            <Sparkles size={13} className="spin-slow" /> DataPilot Bot
          </span>
          <span className="toy-hint">Click me for jokes!</span>
        </div>
        <p className="toy-speech-text">{bubbleText}</p>
        <div className="toy-speech-pointer" />
      </div>

      {/* Floating Hearts on click */}
      {hearts.map((h) => (
        <div
          key={h.id}
          className="floating-heart"
          style={{ transform: `translateX(${h.x}px)` }}
        >
          <Heart size={20} fill="#ec4899" color="#ec4899" />
        </div>
      ))}

      {/* The Animated Toy Robot Figure */}
      <div
        className={`toy-figure ${isJumping ? 'toy-jump' : ''} ${isDragging ? 'toy-excited' : ''}`}
        onClick={handleToyClick}
        title="Hi! Click me to interact!"
      >
        <svg
          viewBox="0 0 240 260"
          className="toy-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#eef2ff" />
              <stop offset="100%" stopColor="#c7d2fe" />
            </linearGradient>

            <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>

            <linearGradient id="earGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>

            <linearGradient id="glowThrust" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>

            {/* Neon Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Hover Thruster Glow */}
          <ellipse
            cx="120"
            cy="234"
            rx="28"
            ry="14"
            fill="url(#glowThrust)"
            className="thruster-glow"
          />

          {/* Left Foot / Floating Thruster */}
          <rect
            x="86"
            y="210"
            width="24"
            height="16"
            rx="8"
            fill="url(#earGrad)"
            stroke="#4338ca"
            strokeWidth="2"
          />
          {/* Right Foot / Floating Thruster */}
          <rect
            x="130"
            y="210"
            width="24"
            height="16"
            rx="8"
            fill="url(#earGrad)"
            stroke="#4338ca"
            strokeWidth="2"
          />

          {/* Left Arm (Waving) */}
          <g className={`toy-arm-left ${isDragging ? 'arm-excited-left' : 'arm-wave'}`}>
            <path
              d="M 68 150 C 46 142 36 126 38 106 C 44 104 54 116 58 126"
              fill="none"
              stroke="#6366f1"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Left Hand / Glove */}
            <circle cx="37" cy="104" r="10" fill="#818cf8" stroke="#4f46e5" strokeWidth="2" />
            <circle cx="34" cy="98" r="4" fill="#a5b4fc" />
          </g>

          {/* Right Arm */}
          <g className={`toy-arm-right ${isDragging ? 'arm-excited-right' : 'arm-rest'}`}>
            <path
              d="M 172 150 C 194 146 206 136 204 118"
              fill="none"
              stroke="#6366f1"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Right Hand / Glove holding mini glowing star or pointing */}
            <circle cx="204" cy="116" r="10" fill="#818cf8" stroke="#4f46e5" strokeWidth="2" />
            <circle cx="206" cy="112" r="4" fill="#a5b4fc" />
          </g>

          {/* Torso / Body */}
          <g className="toy-body">
            <rect
              x="72"
              y="134"
              width="96"
              height="80"
              rx="28"
              fill="url(#bodyGrad)"
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />

            {/* Belly Screen with Data Core */}
            <rect
              x="88"
              y="150"
              width="64"
              height="50"
              rx="14"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="2"
            />

            {/* Belly Graphic: Spinning Disc or Heartbeat Wave */}
            {uploading ? (
              <g className="spin-fast" style={{ transformOrigin: '120px 175px' }}>
                <circle cx="120" cy="175" r="14" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="18 10" />
                <circle cx="120" cy="175" r="5" fill="#f43f5e" />
              </g>
            ) : isDragging ? (
              <g className="pulse-fast" style={{ transformOrigin: '120px 175px' }}>
                <polygon
                  points="120,165 125,173 134,174 127,180 129,188 120,183 111,188 113,180 106,174 115,173"
                  fill="#fbbf24"
                  filter="url(#neonGlow)"
                />
              </g>
            ) : (
              <g>
                {/* Mini Audio / Data Pulse Waves */}
                <rect x="98" y="172" width="6" height="12" rx="3" fill="#38bdf8" className="bar-bounce-1" />
                <rect x="108" y="165" width="6" height="20" rx="3" fill="#818cf8" className="bar-bounce-2" />
                <rect x="118" y="160" width="6" height="26" rx="3" fill="#a855f7" className="bar-bounce-3" />
                <rect x="128" y="167" width="6" height="18" rx="3" fill="#818cf8" className="bar-bounce-2" />
                <rect x="138" y="174" width="6" height="10" rx="3" fill="#38bdf8" className="bar-bounce-1" />
              </g>
            )}

            {/* Small Bowtie / Accent badge */}
            <polygon
              points="114,136 126,136 122,143 126,150 114,150 118,143"
              fill="url(#accentGrad)"
            />
          </g>

          {/* Neck joint */}
          <rect x="106" y="126" width="28" height="12" rx="5" fill="#94a3b8" />

          {/* Head & Antenna Group */}
          <g className="toy-head-group">
            {/* Antenna stalk */}
            <line x1="120" y1="46" x2="120" y2="22" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            <circle cx="120" cy="18" r="9" fill="#f43f5e" className="antenna-bulb" filter="url(#neonGlow)" />
            {/* Antenna radio rings */}
            <circle cx="120" cy="18" r="16" fill="none" stroke="#f43f5e" strokeWidth="2" opacity="0.6" className="antenna-wave" />

            {/* Left Ear / Headphone */}
            <g>
              <rect x="44" y="66" width="16" height="34" rx="8" fill="url(#earGrad)" stroke="#4338ca" strokeWidth="2" />
              <circle cx="52" cy="83" r="5" fill="#c7d2fe" />
            </g>

            {/* Right Ear / Headphone */}
            <g>
              <rect x="180" y="66" width="16" height="34" rx="8" fill="url(#earGrad)" stroke="#4338ca" strokeWidth="2" />
              <circle cx="188" cy="83" r="5" fill="#c7d2fe" />
            </g>

            {/* Head Helmet / Dome */}
            <rect
              x="54"
              y="42"
              width="132"
              height="88"
              rx="34"
              fill="url(#bodyGrad)"
              stroke="#cbd5e1"
              strokeWidth="2.5"
            />

            {/* Glossy Head Highlight */}
            <path
              d="M 68 56 Q 120 48 172 56"
              fill="none"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.9"
            />

            {/* Digital Screen Visor */}
            <rect
              x="68"
              y="56"
              width="104"
              height="60"
              rx="20"
              fill="url(#screenGrad)"
              stroke="#312e81"
              strokeWidth="2"
            />

            {/* Screen Glass Reflection */}
            <path
              d="M 74 62 L 140 62 L 95 110 L 74 110 Z"
              fill="rgba(255, 255, 255, 0.07)"
            />

            {/* EYES */}
            {uploading ? (
              // Uploading / Thinking Eyes: Rotating spiral or bright dots
              <g className="spin-fast" style={{ transformOrigin: '120px 84px' }}>
                <circle cx="98" cy="84" r="8" fill="#38bdf8" filter="url(#neonGlow)" />
                <circle cx="142" cy="84" r="8" fill="#38bdf8" filter="url(#neonGlow)" />
              </g>
            ) : isDragging ? (
              // Dragging Excited Star Eyes!
              <g>
                {/* Left Star Eye */}
                <polygon
                  points="98,73 101,80 108,81 103,86 104,93 98,89 92,93 93,86 88,81 95,80"
                  fill="#38bdf8"
                  filter="url(#neonGlow)"
                  className="star-eye"
                />
                {/* Right Star Eye */}
                <polygon
                  points="142,73 145,80 152,81 147,86 148,93 142,89 136,93 137,86 132,81 139,80"
                  fill="#38bdf8"
                  filter="url(#neonGlow)"
                  className="star-eye"
                />
              </g>
            ) : (
              // Normal Happy Blinking Eyes
              <g className="toy-eyes-normal">
                {/* Left Eye */}
                <g className="toy-eye">
                  <ellipse cx="98" cy="82" rx="10" ry="12" fill="#38bdf8" filter="url(#neonGlow)" />
                  <circle cx="95" cy="78" r="4" fill="#ffffff" />
                  <circle cx="102" cy="86" r="2" fill="#ffffff" />
                </g>
                {/* Right Eye */}
                <g className="toy-eye">
                  <ellipse cx="142" cy="82" rx="10" ry="12" fill="#38bdf8" filter="url(#neonGlow)" />
                  <circle cx="139" cy="78" r="4" fill="#ffffff" />
                  <circle cx="146" cy="86" r="2" fill="#ffffff" />
                </g>
              </g>
            )}

            {/* Cute Rosy Blushing Cheeks */}
            <circle cx="82" cy="94" r="6" fill="#f472b6" opacity="0.6" filter="url(#neonGlow)" />
            <circle cx="158" cy="94" r="6" fill="#f472b6" opacity="0.6" filter="url(#neonGlow)" />

            {/* Cute Smiling Mouth */}
            {isDragging ? (
              // Open joyful mouth: ':D'
              <path
                d="M 112 94 Q 120 106 128 94 Z"
                fill="#38bdf8"
                stroke="#38bdf8"
                strokeWidth="1.5"
                filter="url(#neonGlow)"
              />
            ) : (
              // Gentle sweet smile
              <path
                d="M 113 94 Q 120 101 127 94"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#neonGlow)"
              />
            )}
          </g>
        </svg>
      </div>

      {/* Floating 3D Shadow underneath the toy */}
      <div className={`toy-shadow ${isJumping ? 'toy-shadow-jump' : ''} ${isDragging ? 'toy-shadow-excited' : ''}`} />
    </div>
  );
}
