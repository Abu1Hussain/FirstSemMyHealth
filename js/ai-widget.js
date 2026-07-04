/**
 * AI Care Navigator Widget — Multi-State Edition
 * ================================================
 * Standalone floating AI assistant for MyHealth dashboards.
 * Self-injects React 18, ReactDOM, and builds the widget.
 * Connects to Gemini API for text chat.
 *
 * State Machine (4 phases):
 *   MINIMIZED   → Slim tab flush against bottom-right edge
 *   CORNER_IDLE → Floating robot icon in bottom-right corner
 *   WALKING     → Robot physically moves to center with wiggle animation
 *   MODAL_OPEN  → Full chat modal with blurred backdrop
 */
(function () {
  "use strict";

  /* -- Config -- */
  const GEMINI_API_KEY = "AIzaSyDhLYX0y12fw4Sri1YDIUfLTP8iXX-7f_s";
  const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

  // Fallback system prompt used ONLY if the server proxy is unreachable
  const FALLBACK_SYSTEM_PROMPT =
    "You are a helpful navigation assistant for a healthcare website called MyHealth. Help users navigate to Dashboard, Appointments, Medical Records, Prescriptions, or Profile. If asked a medical question, politely redirect them to book an appointment with a doctor.";

  // Whether to use server-side proxy (enables deep context, role-based prompts, emergency detection)
  const USE_SERVER_PROXY = true;
  const SERVER_PROXY_URL = "../Ai/ai_chat.php";

  /* -- Helpers: load external scripts -- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* -- Boot -- */
  async function boot() {
    // Load React + ReactDOM via CDN
    await loadScript(
      "../js/react.production.min.js"
    );
    await loadScript(
      "../js/react-dom.production.min.js"
    );

    // Create mount point
    const root = document.createElement("div");
    root.id = "ai-widget-root";
    document.body.appendChild(root);

    // Render
    const R = window.React;
    const RD = window.ReactDOM;
    const h = R.createElement;

    /* -- SVG Icons as components -- */
    const BotIcon = () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: 32,
          height: 32,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        h("path", { d: "M12 8V4H8" }),
        h("rect", { width: 16, height: 12, x: 4, y: 8, rx: 2 }),
        h("path", { d: "m2 14 2 2 2-2" }),
        h("path", { d: "m22 14-2 2-2-2" }),
        h("path", { d: "M9.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" }),
        h("path", { d: "M15.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" })
      );

    const SendIcon = () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: 20,
          height: 20,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        h("path", { d: "m22 2-7 20-4-9-9-4Z" }),
        h("path", { d: "M22 2 11 13" })
      );

    const XIcon = ({ size = 18 }) =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        h("path", { d: "M18 6 6 18" }),
        h("path", { d: "m6 6 12 12" })
      );

    const ChevronLeftIcon = () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: 20,
          height: 20,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        h("path", { d: "m15 18-6-6 6-6" })
      );

    const MsgIcon = () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: 18,
          height: 18,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        h("path", {
          d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z",
        })
      );

    const MicIcon = () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: 18,
          height: 18,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        h("path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }),
        h("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
        h("line", { x1: 12, x2: 12, y1: 19, y2: 22 })
      );

    const MicLargeIcon = ({ size = 48 }) =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.5,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        },
        h("path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }),
        h("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
        h("line", { x1: 12, x2: 12, y1: 19, y2: 22 })
      );

    const StopIcon = () =>
      h(
        "svg",
        {
          xmlns: "http://www.w3.org/2000/svg",
          width: 48,
          height: 48,
          viewBox: "0 0 24 24",
          fill: "currentColor",
          stroke: "none",
        },
        h("rect", { x: 6, y: 6, width: 12, height: 12, rx: 2 })
      );

    /* -- Handle AI Action Triggers -- */
    function handleAIAction(action) {
      if (!action) return;
      if (action.type === 'navigate' && action.target) {
        // Try to navigate using the showSection function available in dashboards
        if (typeof window.showSection === 'function') {
          window.showSection(action.target);
        }
      }
      if (action.type === 'book_appointment') {
        // Navigate to appointments section and highlight the specialty
        if (typeof window.showSection === 'function') {
          window.showSection('appointments');
        }
      }
      if (action.type === 'emergency_alert') {
        // Show a full-screen emergency alert
        if (typeof Swal !== 'undefined') {
          Swal.fire({
            icon: 'error',
            title: '🚨 Emergency Detected',
            html: '<p style="font-size:16px;">Please <strong>call emergency services (999/911)</strong> immediately or go to the nearest Emergency Room.</p>',
            confirmButtonText: 'I understand',
            confirmButtonColor: '#dc2626',
            allowOutsideClick: false,
          });
        }
      }
    }

    /* -- Server-Side Proxy API Call -- */
    async function sendToServerProxy(messages) {
      const res = await fetch(SERVER_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        // Handle action triggers
        if (data.action) {
          setTimeout(() => handleAIAction(data.action), 500);
        }
        return data.reply || "I'm sorry, I couldn't process that right now.";
      }
      return "I'm sorry, I couldn't process that right now.";
    }

    /* -- Direct Gemini API Call (Fallback) -- */
    async function sendToGeminiFallback(messages) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const contents = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: FALLBACK_SYSTEM_PROMPT }] },
          contents,
        }),
      });
      const data = await res.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't process that right now."
      );
    }

    /* -- Unified Send Function -- */
    async function sendToGemini(messages) {
      if (USE_SERVER_PROXY) {
        try {
          return await sendToServerProxy(messages);
        } catch (e) {
          console.warn("AI Proxy unreachable, falling back to direct Gemini:", e);
          return await sendToGeminiFallback(messages);
        }
      }
      return await sendToGeminiFallback(messages);
    }

    /* ═══════════════════════════════════════════
       Inject Widget CSS — State Machine Animations
       ═══════════════════════════════════════════ */
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      #ai-widget-root * { box-sizing: border-box; }

      /* ── State transition animations ── */

      /* Corner FAB slide in/out */
      @keyframes ai-fab-slide-in {
        from { opacity: 0; transform: translateX(80px) scale(0.5); }
        to   { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes ai-fab-slide-out {
        from { opacity: 1; transform: translateX(0) scale(1); }
        to   { opacity: 0; transform: translateX(80px) scale(0.5); }
      }

      /* Minimized tab slide in/out */
      @keyframes ai-tab-slide-in {
        from { transform: translateX(100%); }
        to   { transform: translateX(0); }
      }
      @keyframes ai-tab-slide-out {
        from { transform: translateX(0); }
        to   { transform: translateX(100%); }
      }

      /* Walking: spring-physics move from corner to center */
      @keyframes ai-walk-to-center {
        0%   { 
          bottom: 32px; right: 32px; 
          transform: scale(1); 
        }
        25%  { 
          transform: scale(1.2); 
        }
        60%  { 
          bottom: calc(50vh - 32px); right: calc(50vw - 32px); 
          transform: scale(1.05); 
        }
        80%  { 
          bottom: calc(50vh - 38px); right: calc(50vw - 38px); 
          transform: scale(1.15); 
        }
        90%  {
          bottom: calc(50vh - 28px); right: calc(50vw - 28px);
          transform: scale(0.95);
        }
        100% { 
          bottom: calc(50vh - 32px); right: calc(50vw - 32px); 
          transform: scale(1); 
        }
      }

      /* Walking wiggle effect */
      @keyframes ai-walking-wiggle {
        0%, 100% { transform: rotate(0deg) translateY(0); }
        12.5%    { transform: rotate(-14deg) translateY(-7px); }
        25%      { transform: rotate(0deg) translateY(0); }
        37.5%    { transform: rotate(14deg) translateY(-7px); }
        50%      { transform: rotate(0deg) translateY(0); }
        62.5%    { transform: rotate(-14deg) translateY(-7px); }
        75%      { transform: rotate(0deg) translateY(0); }
        87.5%    { transform: rotate(14deg) translateY(-7px); }
      }

      /* Modal fade in/out */
      @keyframes ai-modal-reveal {
        from { opacity: 0; transform: scale(0.85) translateY(20px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes ai-modal-dismiss {
        from { opacity: 1; transform: scale(1) translateY(0); }
        to   { opacity: 0; transform: scale(0.85) translateY(20px); }
      }

      /* Backdrop fade */
      @keyframes ai-backdrop-in {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes ai-backdrop-out {
        from { opacity: 1; }
        to   { opacity: 0; }
      }

      /* Ring pulse on idle FAB */
      @keyframes ai-ring-pulse {
        0%   { box-shadow: 0 0 0 0 rgba(59,130,246,.4); }
        70%  { box-shadow: 0 0 0 18px rgba(59,130,246,0); }
        100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
      }

      /* Applied classes */
      .ai-fab-enter   { animation: ai-fab-slide-in .4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      .ai-fab-exit    { animation: ai-fab-slide-out .3s ease forwards; }
      .ai-tab-enter   { animation: ai-tab-slide-in .3s ease forwards; }
      .ai-tab-exit    { animation: ai-tab-slide-out .25s ease forwards; }
      .ai-modal-enter { animation: ai-modal-reveal .4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      .ai-modal-exit  { animation: ai-modal-dismiss .25s ease forwards; }
      .ai-backdrop-enter { animation: ai-backdrop-in .3s ease forwards; }
      .ai-backdrop-exit  { animation: ai-backdrop-out .25s ease forwards; }

      .ai-walking {
        animation: ai-walk-to-center 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      }
      .ai-walking-wiggle-inner {
        animation: ai-walking-wiggle 1.2s linear forwards;
      }

      /* Chat scroll */
      .ai-chat-scroll::-webkit-scrollbar { width:6px; }
      .ai-chat-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
      .ai-chat-scroll::-webkit-scrollbar-track { background:transparent; }
    `;
    document.head.appendChild(styleEl);

    /* ═══════════════════════════════════════════
       STATE MACHINE CONSTANTS
       ═══════════════════════════════════════════ */
    const STATE = {
      MINIMIZED:   'MINIMIZED',
      CORNER_IDLE: 'CORNER_IDLE',
      WALKING:     'WALKING',
      MODAL_OPEN:  'MODAL_OPEN',
    };

    /* ═══════════════════════════════════════════
       Main Widget Component
       ═══════════════════════════════════════════ */
    function AIWidget() {
      const [widgetState, setWidgetState] = R.useState(STATE.CORNER_IDLE);
      const [prevState, setPrevState] = R.useState(null);
      const walkTimerRef = R.useRef(null);

      // Expose global opener so sidebar can trigger it directly
      R.useEffect(() => {
        window.openAIWidget = () => {
          if (widgetState === STATE.MODAL_OPEN) return;
          startWalking();
        };
        return () => { delete window.openAIWidget; };
      }, [widgetState]);

      const [messages, setMessages] = R.useState([
        {
          role: "model",
          text: "Hello! 👋 I'm your Care Navigator. I can help you find your way around MyHealth. What are you looking for?",
        },
      ]);
      const [input, setInput] = R.useState("");
      const [loading, setLoading] = R.useState(false);
      const chatRef = R.useRef(null);

      // Dark mode detection - re-check on every render
      const isDark = document.documentElement.classList.contains("dark");

      // Also listen for class changes on <html>
      const [, forceUpdate] = R.useState(0);
      R.useEffect(() => {
        const obs = new MutationObserver(() => forceUpdate(n => n + 1));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => obs.disconnect();
      }, []);

      // Scroll chat to bottom on new messages
      R.useEffect(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      }, [messages]);

      // Lock body scroll when modal open
      R.useEffect(() => {
        if (widgetState === STATE.MODAL_OPEN) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
        }
        return () => {
          document.body.style.overflow = "";
        };
      }, [widgetState]);

      // Cleanup walk timer
      R.useEffect(() => {
        return () => { if (walkTimerRef.current) clearTimeout(walkTimerRef.current); };
      }, []);

      /* ── State Transitions ── */
      function startWalking() {
        setPrevState(widgetState);
        setWidgetState(STATE.WALKING);
        walkTimerRef.current = setTimeout(() => {
          setWidgetState(STATE.MODAL_OPEN);
          walkTimerRef.current = null;
        }, 1200);
      }

      function closeToMinimized() {
        setPrevState(STATE.MODAL_OPEN);
        setWidgetState(STATE.MINIMIZED);
      }

      function closeToCorner() {
        setPrevState(STATE.MODAL_OPEN);
        setWidgetState(STATE.CORNER_IDLE);
      }

      function restoreFromMinimized() {
        setPrevState(STATE.MINIMIZED);
        setWidgetState(STATE.CORNER_IDLE);
      }

      function hideFabToMinimized() {
        setPrevState(STATE.CORNER_IDLE);
        setWidgetState(STATE.MINIMIZED);
      }

      /* -- Text chat send -- */
      async function sendMessage() {
        if (!input.trim() || loading) return;
        const userMsg = { role: "user", text: input.trim() };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);
        setInput("");
        setLoading(true);
        try {
          const reply = await sendToGemini(newMsgs);
          setMessages((prev) => [...prev, { role: "model", text: reply }]);
        } catch (e) {
          setMessages((prev) => [
            ...prev,
            {
              role: "model",
              text: "Sorry, I had trouble connecting. Please try again.",
            },
          ]);
        }
        setLoading(false);
      }

      function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }

      /* ═══════════════════════════════════════
         RENDER: MINIMIZED STATE
         Slim tab flush against bottom-right edge
         ═══════════════════════════════════════ */
      const minimizedTab = widgetState === STATE.MINIMIZED && h(
        "button",
        {
          onClick: restoreFromMinimized,
          className: "ai-tab-enter",
          style: {
            position: "fixed",
            bottom: 32,
            right: 0,
            zIndex: 9999,
            width: 28,
            height: 64,
            background: "linear-gradient(135deg, #2563eb, #3b82f6)",
            color: "#fff",
            border: "none",
            borderRadius: "14px 0 0 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "-4px 4px 16px rgba(37,99,235,.3)",
            transition: "width .2s",
            fontSize: 16,
          },
          onMouseEnter: (e) => { e.currentTarget.style.width = "36px"; },
          onMouseLeave: (e) => { e.currentTarget.style.width = "28px"; },
          title: "Show AI assistant",
        },
        h(ChevronLeftIcon, null)
      );

      /* ═══════════════════════════════════════
         RENDER: CORNER IDLE STATE
         Floating robot FAB in bottom-right corner
         ═══════════════════════════════════════ */
      const cornerFab = widgetState === STATE.CORNER_IDLE && h(
        "div",
        {
          className: "ai-fab-enter",
          style: {
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 9999,
          },
        },
        // Close mini-button (sends to minimized)
        h(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              hideFabToMinimized();
            },
            style: {
              position: "absolute",
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#1e293b",
              color: "#fff",
              border: "2px solid #fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              zIndex: 2,
              padding: 0,
            },
            title: "Hide assistant",
          },
          h(XIcon, { size: 12 })
        ),
        // Red notification dot
        h("div", {
          style: {
            position: "absolute",
            top: 2,
            right: 2,
            width: 14,
            height: 14,
            background: "#ef4444",
            borderRadius: "50%",
            border: "2px solid #fff",
            zIndex: 1,
          },
        }),
        // Main FAB — click triggers walking
        h(
          "button",
          {
            onClick: startWalking,
            style: {
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(37,99,235,.45)",
              transition: "transform .2s, box-shadow .2s",
              position: "relative",
              animation: "ai-ring-pulse 2s infinite",
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(37,99,235,.55)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,.45)";
            },
            title: "AI Care Navigator",
          },
          h(BotIcon, null)
        )
      );

      /* ═══════════════════════════════════════
         RENDER: WALKING STATE
         Robot physically moves to center with wiggle
         ═══════════════════════════════════════ */
      const walkingRobot = widgetState === STATE.WALKING && h(
        "div",
        {
          className: "ai-walking",
          style: {
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 10001,
            pointerEvents: "none",
          },
        },
        h(
          "div",
          {
            className: "ai-walking-wiggle-inner",
            style: {
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(37,99,235,.5)",
            },
          },
          h(BotIcon, null)
        )
      );

      /* ═══════════════════════════════════════
         RENDER: MODAL OPEN STATE
         Full chat modal with blurred backdrop
         ═══════════════════════════════════════ */
      const modal = widgetState === STATE.MODAL_OPEN && h(
        "div",
        {
          style: {
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        // Backdrop — clicking goes back to corner idle
        h("div", {
          onClick: closeToCorner,
          className: "ai-backdrop-enter",
          style: {
            position: "absolute",
            inset: 0,
            background: isDark ? "rgba(0,0,0,.55)" : "rgba(15,23,42,.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          },
        }),
        // Widget container
        h(
          "div",
          {
            className: "ai-modal-enter",
            style: {
              position: "relative",
              width: "92%",
              maxWidth: 420,
              height: 520,
              maxHeight: "85vh",
              background: isDark ? "#1f2937" : "#fff",
              borderRadius: 20,
              boxShadow: isDark ? "0 25px 60px rgba(0,0,0,.5)" : "0 25px 60px rgba(0,0,0,.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              zIndex: 1,
            },
          },
          // Header
          h(
            "div",
            {
              style: {
                background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                color: "#fff",
                padding: "14px 18px",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              },
            },
            h(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                },
              },
              h(
                "div",
                {
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(255,255,255,.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                },
                h(
                  "svg",
                  {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: 22,
                    height: 22,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: 2,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  h("path", { d: "M12 8V4H8" }),
                  h("rect", { width: 16, height: 12, x: 4, y: 8, rx: 2 }),
                  h("path", { d: "M9.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" }),
                  h("path", { d: "M15.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" })
                )
              ),
              h(
                "div",
                null,
                h(
                  "div",
                  {
                    style: {
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: "-.3px",
                    },
                  },
                  "Care Navigator"
                ),
                h(
                  "div",
                  {
                    style: {
                      fontSize: 11,
                      opacity: 0.8,
                      marginTop: 1,
                    },
                  },
                  "Always here to help"
                )
              )
            ),
            // X close button — sends to MINIMIZED
            h(
              "button",
              {
                onClick: closeToMinimized,
                style: {
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.2)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .2s",
                  flexShrink: 0,
                },
                onMouseEnter: (e) => { e.currentTarget.style.background = "rgba(255,255,255,.35)"; },
                onMouseLeave: (e) => { e.currentTarget.style.background = "rgba(255,255,255,.2)"; },
                title: "Close",
              },
              h(XIcon, { size: 16 })
            )
          ),
          // Chat content area
          h(
            R.Fragment,
            null,
                // Messages
                h(
                  "div",
                  {
                    ref: chatRef,
                    className: "ai-chat-scroll",
                    style: {
                      flex: 1,
                      overflowY: "auto",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    },
                  },
                  messages.map((m, i) =>
                    h(
                      "div",
                      {
                        key: i,
                        style: {
                          display: "flex",
                          justifyContent:
                            m.role === "user" ? "flex-end" : "flex-start",
                        },
                      },
                      h(
                        "div",
                        {
                          style: {
                            maxWidth: "80%",
                            padding: "10px 14px",
                            borderRadius:
                              m.role === "user"
                                ? "16px 16px 4px 16px"
                                : "16px 16px 16px 4px",
                            background:
                              m.role === "user"
                                ? "linear-gradient(135deg, #2563eb, #3b82f6)"
                                : (isDark ? "#374151" : "#f1f5f9"),
                            color: m.role === "user" ? "#fff" : (isDark ? "#e5e7eb" : "#1e293b"),
                            fontSize: 14,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            boxShadow:
                              m.role === "user"
                                ? "0 2px 8px rgba(37,99,235,.2)"
                                : (isDark ? "0 1px 4px rgba(0,0,0,.2)" : "0 1px 4px rgba(0,0,0,.06)"),
                          },
                        },
                        m.text
                      )
                    )
                  ),
                  loading &&
                    h(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "flex-start",
                        },
                      },
                      h(
                        "div",
                        {
                          style: {
                            padding: "10px 18px",
                            borderRadius: "16px 16px 16px 4px",
                            background: isDark ? "#374151" : "#f1f5f9",
                            color: isDark ? "#9ca3af" : "#94a3b8",
                            fontSize: 14,
                          },
                        },
                        "Thinking..."
                      )
                    )
                ),
                // Input bar
                h(
                  "div",
                  {
                    style: {
                      padding: "10px 14px",
                      borderTop: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexShrink: 0,
                      background: isDark ? "#1f2937" : "#fff",
                    },
                  },
                  h("input", {
                    value: input,
                    onChange: (e) => setInput(e.target.value),
                    onKeyDown: handleKeyDown,
                    placeholder: window.location.pathname.includes('doctor_dashboard') ? "Ask about patient data, clinical insights, or summaries..." : "Ask me anything about MyHealth...",
                    disabled: loading,
                    style: {
                      flex: 1,
                      border: isDark ? "1px solid #4b5563" : "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontSize: 14,
                      outline: "none",
                      color: isDark ? "#f3f4f6" : "#1e293b",
                      background: isDark ? "#111827" : "#f8fafc",
                      transition: "border-color .2s",
                    },
                    onFocus: (e) => {
                      e.target.style.borderColor = "#3b82f6";
                    },
                    onBlur: (e) => {
                      e.target.style.borderColor = isDark ? "#4b5563" : "#e2e8f0";
                    },
                  }),
                  h(
                    "button",
                    {
                      onClick: sendMessage,
                      disabled: loading || !input.trim(),
                      style: {
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background:
                          !input.trim() || loading ? (isDark ? "#4b5563" : "#cbd5e1") : "#2563eb",
                        color: "#fff",
                        border: "none",
                        cursor:
                          !input.trim() || loading
                            ? "not-allowed"
                            : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background .2s",
                        flexShrink: 0,
                      },
                    },
                    h(SendIcon, null)
                  )
                )
              )

        )
      );

      return h(R.Fragment, null, minimizedTab, cornerFab, walkingRobot, modal);
    }

    /* -- Mount -- */
    RD.createRoot(root).render(h(AIWidget, null));
  }

  // Start after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
