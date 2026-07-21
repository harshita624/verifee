"use client";

import {
  useState, useRef, useEffect, useCallback, useMemo,
} from "react";
import { X, Send, Plus, MessageSquare, User, History } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function ChatIcon({ size = 16, color = "currentColor", strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      <line x1="9" y1="10" x2="15" y2="10"/>
      <line x1="9" y1="14" x2="13" y2="14"/>
    </svg>
  );
}

const SUGGESTIONS = [
  "Is Rs 500 fair for an auto ride in Delhi?",
  "Fair price for a Pashmina shawl in Srinagar?",
  "How to say 'what is your best price' in Hindi?",
  "Common scams near the Taj Mahal?",
  "Is Crawford Market safe for tourists?",
];

const DEFAULT_OPENING = {
  role:    "assistant",
  content: "How can I help you shop smarter? Ask me about fair prices, scams, markets, or bargaining tips.",
};

export default function AIChat() {
  // ── Stable session ID — persists for the browser session ──────────────────
  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";
    let sid = sessionStorage.getItem("vf_session_id");
    if (!sid) {
      sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem("vf_session_id", sid);
    }
    return sid;
  }, []);

  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebar, setSidebar] = useState(false);

  const [convs, setConvs] = useState([{
    id:       "default",
    title:    "New conversation",
    messages: [DEFAULT_OPENING],
  }]);
  const [activeId, setActiveId] = useState("default");

  // ── Drag state — button ───────────────────────────────────────────────────
  const [btnPos,       setBtnPos]       = useState({ x: 0, y: 0 });
  const [draggingBtn,  setDraggingBtn]  = useState(false);
  const btnDragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const didDragBtn = useRef(false);

  // ── Drag state — panel ────────────────────────────────────────────────────
  const [panelPos,      setPanelPos]      = useState({ x: 0, y: 0 });
  const [draggingPanel, setDraggingPanel] = useState(false);
  const panelDragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const active = convs.find(c => c.id === activeId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // ── Button drag ───────────────────────────────────────────────────────────
  const onBtnMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    didDragBtn.current = false;
    setDraggingBtn(true);
    btnDragRef.current = {
      startX: e.clientX, startY: e.clientY,
      posX: btnPos.x,    posY: btnPos.y,
    };
    e.preventDefault();
    e.stopPropagation();
  }, [btnPos]);

  useEffect(() => {
    if (!draggingBtn) return;
    const move = (e) => {
      const dx = e.clientX - btnDragRef.current.startX;
      const dy = e.clientY - btnDragRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragBtn.current = true;
      setBtnPos({ x: btnDragRef.current.posX + dx, y: btnDragRef.current.posY + dy });
    };
    const up = () => setDraggingBtn(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup",   up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup",   up);
    };
  }, [draggingBtn]);

  const handleBtnClick = () => {
    if (didDragBtn.current) return;
    setOpen(true);
  };

  // ── Panel drag ────────────────────────────────────────────────────────────
  const onPanelHeaderMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDraggingPanel(true);
    panelDragRef.current = {
      startX: e.clientX, startY: e.clientY,
      posX: panelPos.x,  posY: panelPos.y,
    };
    e.preventDefault();
  }, [panelPos]);

  useEffect(() => {
    if (!draggingPanel) return;
    const move = (e) => setPanelPos({
      x: panelDragRef.current.posX + (e.clientX - panelDragRef.current.startX),
      y: panelDragRef.current.posY + (e.clientY - panelDragRef.current.startY),
    });
    const up = () => setDraggingPanel(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup",   up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup",   up);
    };
  }, [draggingPanel]);

  // ── Conversations ─────────────────────────────────────────────────────────
  const newChat = () => {
    const id = `c_${Date.now()}`;
    setConvs(prev => [...prev, {
      id,
      title:    "New conversation",
      messages: [DEFAULT_OPENING],
    }]);
    setActiveId(id);
    setSidebar(false);
  };

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");

    // Append user message
    setConvs(prev => prev.map(c => c.id !== activeId ? c : {
      ...c,
      title:    c.messages.length === 1 ? msg.slice(0, 40) : c.title,
      messages: [...c.messages, { role: "user", content: msg }],
    }));

    setLoading(true);

    try {
      // Build history from current conversation (skip opening message)
      const history = (active?.messages || [])
        .slice(1)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API}/api/v1/ai/chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          message:   msg,
          history,
          sessionId,          // ← NLP uses this to track context
        }),
      });

      const data  = await res.json();
      const reply = data.data?.reply || "Something went wrong. Please try again.";

      // Show data source badge if available
      const meta       = data.data?.meta;
      const sourceBadge = meta?.dataSource === "community_verified" && meta.dataPoints > 0
        ? ` [${meta.dataPoints} verified community reports]`
        : "";

      setConvs(prev => prev.map(c => c.id !== activeId ? c : {
        ...c,
        messages: [...c.messages, {
          role:    "assistant",
          content: reply,
          meta,
          badge:   sourceBadge,
        }],
      }));
    } catch {
      setConvs(prev => prev.map(c => c.id !== activeId ? c : {
        ...c,
        messages: [...c.messages, {
          role:    "assistant",
          content: "Connection error. Check your network and try again.",
        }],
      }));
    } finally {
      setLoading(false);
    }
  };

  // ── Positions ─────────────────────────────────────────────────────────────
  const btnStyle = {
    position:    "fixed",
    bottom:      24 - btnPos.y,
    right:       24 - btnPos.x,
    zIndex:      50,
    cursor:      draggingBtn ? "grabbing" : "grab",
    userSelect:  "none",
    touchAction: "none",
  };

  const panelStyle = {
    position:      "fixed",
    bottom:        panelPos.y === 0 ? 92 : "auto",
    right:         panelPos.x === 0 ? 24  : "auto",
    top:           panelPos.y !== 0 ? `calc(100vh - 504px + ${panelPos.y}px)` : "auto",
    left:          panelPos.x !== 0 ? `calc(100vw - 360px + ${panelPos.x}px)` : "auto",
    zIndex:        50,
    width:         360,
    height:        492,
    display:       "flex",
    flexDirection: "column",
    background:    "#fff",
    border:        "1px solid #e4e4e7",
    borderRadius:  20,
    boxShadow:     "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
    overflow:      "hidden",
  };

  return (
    <>
      {/* ── Draggable trigger button ── */}
      {!open && (
        <div style={btnStyle}>
          <button
            onMouseDown={onBtnMouseDown}
            onClick={handleBtnClick}
            className="flex items-center gap-2.5 text-white text-[13px] font-semibold px-4 py-3 rounded-2xl select-none"
            style={{
              background: "linear-gradient(135deg,#16a34a,#15803d)",
              boxShadow:  "0 4px 20px rgba(22,163,74,0.35)",
            }}
          >
            <ChatIcon size={17} color="white" />
            Ask Verifee AI
          </button>
        </div>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div style={panelStyle}>
          {/* Header — drag handle */}
          <div
            onMouseDown={onPanelHeaderMouseDown}
            className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0"
            style={{
              cursor:     draggingPanel ? "grabbing" : "grab",
              background: "#fff",
              userSelect: "none",
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "#f0fdf4" }}>
                <ChatIcon size={14} color="#16a34a" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-zinc-900">Verifee Assistant</p>
                <p className="text-[10px] text-zinc-400 truncate max-w-[160px]">
                  {active?.title || "New conversation"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {[
                { icon: Plus,    title: "New chat", action: newChat },
                { icon: History, title: "History",  action: () => setSidebar(!sidebar) },
                { icon: X,       title: "Close",    action: () => { setOpen(false); setPanelPos({ x:0,y:0 }); } },
              ].map(({ icon: Icon, title, action }) => (
                <button key={title}
                  onMouseDown={e => e.stopPropagation()}
                  onClick={action}
                  title={title}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
                  <Icon className="w-4 h-4 text-zinc-500" />
                </button>
              ))}
            </div>
          </div>

          {/* History sidebar */}
          {sidebar && (
            <div className="absolute top-[52px] inset-x-0 bottom-0 bg-white z-20 overflow-y-auto">
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Conversations
                  </p>
                  <button onClick={newChat}
                    className="flex items-center gap-1 text-[11px] font-semibold text-green-600 hover:underline">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                <div className="space-y-0.5">
                  {convs.map(c => (
                    <button key={c.id}
                      onClick={() => { setActiveId(c.id); setSidebar(false); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl transition-colors"
                      style={{
                        background: activeId === c.id ? "#f0fdf4" : "transparent",
                        color:      activeId === c.id ? "#16a34a" : "#3f3f46",
                      }}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        <span className="text-[12px] font-medium truncate">{c.title}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 ml-5">
                        {c.messages.length - 1} message{c.messages.length !== 2 ? "s" : ""}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {/* Suggestions — only on first message */}
            {active?.messages.length === 1 && (
              <div className="space-y-1.5 pb-1">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-1">
                  Try asking
                </p>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="w-full text-left text-[12px] text-zinc-600 border border-zinc-100 bg-zinc-50 hover:bg-green-50 hover:border-green-200 hover:text-green-800 rounded-xl px-3 py-2 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            )}

            {active?.messages.map((msg, i) => (
              <div key={i}
                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mb-0.5"
                  style={{ background: msg.role === "assistant" ? "#f0fdf4" : "#f4f4f5" }}>
                  {msg.role === "assistant"
                    ? <ChatIcon size={11} color="#16a34a" strokeWidth={2.5} />
                    : <User className="w-3.5 h-3.5 text-zinc-500" />}
                </div>
                <div className="max-w-[230px]">
                  <div
                    className="text-[13px] leading-relaxed px-3.5 py-2.5"
                    style={{
                      background:   msg.role === "user" ? "#16a34a" : "#f4f4f5",
                      color:        msg.role === "user" ? "#fff" : "#18181b",
                      borderRadius: msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                    }}>
                    {msg.content}
                  </div>
                  {/* Data source badge — only on assistant messages with community data */}
                  {msg.role === "assistant" && msg.meta?.dataSource === "community_verified" && (
                    <div className="mt-1 ml-1">
                      <span
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #dcfce7" }}>
                        {msg.meta.dataPoints} community reports
                      </span>
                    </div>
                  )}
                  {msg.role === "assistant" && msg.meta?.dataSource === "ai_estimate" && (
                    <div className="mt-1 ml-1">
                      <span
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                        AI estimate — no community data yet
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#f0fdf4" }}>
                  <ChatIcon size={11} color="#16a34a" strokeWidth={2.5} />
                </div>
                <div className="px-3.5 py-3 flex items-center gap-1"
                  style={{ background: "#f4f4f5", borderRadius: "16px 16px 16px 4px" }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-zinc-100 shrink-0">
            <div
              className="flex items-end gap-2 rounded-xl border border-zinc-200 px-3 py-2 transition-all focus-within:border-green-400"
              style={{ background: "#fafafa" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask about prices, scams, markets..."
                rows={1}
                className="flex-1 text-[13px] text-zinc-800 placeholder:text-zinc-400 bg-transparent resize-none no-scrollbar"
                style={{ maxHeight: 72, lineHeight: 1.5 }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mb-0.5 transition-all active:scale-90"
                style={{
                  background: input.trim() && !loading ? "#16a34a" : "#e4e4e7",
                  cursor:     !input.trim() || loading ? "not-allowed" : "pointer",
                }}>
                <Send className="w-3.5 h-3.5"
                  style={{ color: input.trim() && !loading ? "#fff" : "#a1a1aa" }} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 text-center mt-1.5">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  );
}