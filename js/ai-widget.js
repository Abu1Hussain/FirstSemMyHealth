/**
 * AI Care Navigator Widget
 * Standalone floating AI assistant for MyHealth dashboards.
 * Self-injects React 18, ReactDOM, and builds the widget.
 * Connects to Gemini API for text chat.
 */
(function () {
  "use strict";

  /* ── Config ── */
  const GEMINI_API_KEY = "AIzaSyC0ys1cMFP4l1kRYBSeB-mBSdCdsSJk8-w";
  const GEMINI_TEXT_MODEL = "gemini-2.0-flash";
  const SYSTEM_PROMPT =
    "You are a helpful navigation assistant for a healthcare website called MyHealth. Your ONLY purpose is to guide users to the correct pages on our website. YOU MUST NEVER PROVIDE MEDICAL ADVICE, DIAGNOSES, OR ANSWER HEALTH-RELATED QUESTIONS. If a user asks a medical question, politely redirect them to book an appointment with a doctor. The website has these pages: Dashboard, Appointments (book and view), Medical Records, Prescriptions, Profile. Help users navigate to these sections.";

  /* ── Helpers: load external scripts ── */
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

  /* ── Boot ── */
  async function boot() {
    // Load React + ReactDOM via CDN
    await loadScript(
      "https://unpkg.com/react@18/umd/react.production.min.js"
    );
    await loadScript(
      "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
    );

    // Create mount point
    const root = document.createElement("div");
    root.id = "ai-widget-root";
    document.body.appendChild(root);

    // Render
    const R = window.React;
    const RD = window.ReactDOM;
    const h = R.createElement;

    /* ── SVG Icons as components ── */
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

    /* ── Gemini Text Chat API ── */
    async function sendToGemini(messages) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const contents = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
        }),
      });
      const data = await res.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm sorry, I couldn't process that right now."
      );
    }

    /* ── Inject Widget CSS ── */
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      #ai-widget-root * { box-sizing: border-box; }
      @keyframes ai-pulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.6);opacity:0} }
      @keyframes ai-fade-in { from{opacity:0;transform:scale(.95) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      @keyframes ai-slide-right { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(100px)} }
      @keyframes ai-slide-left  { from{opacity:0;transform:translateX(100px)} to{opacity:1;transform:translateX(0)} }
      @keyframes ai-tab-in  { from{transform:translateX(100%)} to{transform:translateX(0)} }
      @keyframes ai-tab-out { from{transform:translateX(0)} to{transform:translateX(100%)} }
      @keyframes ai-ring-pulse { 0%{box-shadow:0 0 0 0 rgba(59,130,246,.4)} 70%{box-shadow:0 0 0 20px rgba(59,130,246,0)} 100%{box-shadow:0 0 0 0 rgba(59,130,246,0)} }
      .ai-fab-enter { animation: ai-slide-left .35s ease forwards; }
      .ai-fab-exit  { animation: ai-slide-right .35s ease forwards; }
      .ai-tab-enter { animation: ai-tab-in .3s ease forwards; }
      .ai-tab-exit  { animation: ai-tab-out .3s ease forwards; }
      .ai-modal-enter { animation: ai-fade-in .3s ease forwards; }
      .ai-chat-scroll::-webkit-scrollbar { width:6px; }
      .ai-chat-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
      .ai-chat-scroll::-webkit-scrollbar-track { background:transparent; }
      .ai-voice-ring { animation: ai-ring-pulse 1.5s infinite; }
    `;
    document.head.appendChild(styleEl);

    /* ── Main Widget Component ── */
    function AIWidget() {
      const [fabVisible, setFabVisible] = R.useState(true);
      const [fabHiding, setFabHiding] = R.useState(false);
      const [tabVisible, setTabVisible] = R.useState(false);
      const [tabHiding, setTabHiding] = R.useState(false);
      const [modalOpen, setModalOpen] = R.useState(false);

      // Expose global opener so sidebar can trigger it directly
      R.useEffect(() => {
        window.openAIWidget = () => setModalOpen(true);
        return () => { delete window.openAIWidget; };
      }, []);
      const [activeTab, setActiveTab] = R.useState("text"); // text | voice
      const [messages, setMessages] = R.useState([
        {
          role: "model",
          text: "Hello! 👋 I'm your Care Navigator. I can help you find your way around MyHealth. What are you looking for?",
        },
      ]);
      const [input, setInput] = R.useState("");
      const [loading, setLoading] = R.useState(false);
      const [voiceActive, setVoiceActive] = R.useState(false);
      const [voiceTranscript, setVoiceTranscript] = R.useState("");
      const chatRef = R.useRef(null);

      // Dark mode detection — re-check on every render
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
        if (modalOpen) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
        }
        return () => {
          document.body.style.overflow = "";
        };
      }, [modalOpen]);

      /* ── FAB hide/show toggle ── */
      function hideFab() {
        setFabHiding(true);
        setTimeout(() => {
          setFabVisible(false);
          setFabHiding(false);
          setTabVisible(true);
        }, 350);
      }

      function showFab() {
        setTabHiding(true);
        setTimeout(() => {
          setTabVisible(false);
          setTabHiding(false);
          setFabVisible(true);
        }, 300);
      }

      /* ── Text chat send ── */
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

      /* ── Voice (browser SpeechRecognition) ── */
      function toggleVoice() {
        if (voiceActive) {
          setVoiceActive(false);
          if (window._aiSpeechRec) {
            window._aiSpeechRec.stop();
          }
          return;
        }
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setVoiceTranscript("Voice recognition is not supported in this browser.");
          return;
        }
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        window._aiSpeechRec = rec;

        rec.onresult = (event) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setVoiceTranscript(transcript);
        };

        rec.onend = () => {
          setVoiceActive(false);
          // Send the transcript as a message
          if (window._aiLastTranscript) {
            const userMsg = { role: "user", text: window._aiLastTranscript };
            setMessages((prev) => [...prev, userMsg]);
            setLoading(true);
            sendToGemini([...messages, userMsg]).then((reply) => {
              setMessages((prev) => [...prev, { role: "model", text: reply }]);
              setLoading(false);
              // Speak the reply
              if ("speechSynthesis" in window) {
                const u = new SpeechSynthesisUtterance(reply);
                u.rate = 1;
                u.pitch = 1;
                window.speechSynthesis.speak(u);
              }
            });
            window._aiLastTranscript = "";
          }
        };

        rec.onerror = () => {
          setVoiceActive(false);
          setVoiceTranscript("Could not access microphone.");
        };

        setVoiceActive(true);
        setVoiceTranscript("Listening...");
        rec.start();

        // Track transcript
        const origOnResult = rec.onresult;
        rec.onresult = (event) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          window._aiLastTranscript = transcript;
          setVoiceTranscript(transcript);
        };
      }

      /* ── Render: Floating Action Button ── */
      const fab =
        fabVisible &&
        h(
          "div",
          {
            className: fabHiding ? "ai-fab-exit" : "ai-fab-enter",
            style: {
              position: "fixed",
              bottom: 32,
              right: 32,
              zIndex: 9999,
            },
          },
          // Close mini-button
          h(
            "button",
            {
              onClick: (e) => {
                e.stopPropagation();
                hideFab();
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
          // Main FAB
          h(
            "button",
            {
              onClick: () => setModalOpen(true),
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
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow =
                  "0 12px 40px rgba(37,99,235,.55)";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 8px 32px rgba(37,99,235,.45)";
              },
              title: "AI Care Navigator",
            },
            h(BotIcon, null)
          )
        );

      /* ── Render: Slide-in tab ── */
      const tab =
        tabVisible &&
        h(
          "button",
          {
            onClick: showFab,
            className: tabHiding ? "ai-tab-exit" : "ai-tab-enter",
            style: {
              position: "fixed",
              bottom: 32,
              right: 0,
              zIndex: 9999,
              width: 40,
              height: 64,
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "#fff",
              border: "none",
              borderRadius: "16px 0 0 16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "-4px 4px 16px rgba(37,99,235,.3)",
            },
            title: "Show AI assistant",
          },
          h(ChevronLeftIcon, null)
        );

      /* ── Render: Modal ── */
      const modal =
        modalOpen &&
        h(
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
          // Backdrop
          h("div", {
            onClick: () => setModalOpen(false),
            style: {
              position: "absolute",
              inset: 0,
              background: isDark ? "rgba(0,0,0,.55)" : "rgba(15,23,42,.45)",
              backdropFilter: "blur(4px)",
            },
          }),
          // Widget container — smaller height, X inside header
          h(
            "div",
            {
              className: "ai-modal-enter",
              style: {
                position: "relative",
                width: "92%",
                maxWidth: 400,
                height: 500,
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
            // Header with X button inside
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
              // X close button inside header
              h(
                "button",
                {
                  onClick: () => setModalOpen(false),
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
            // Tabs
            h(
              "div",
              {
                style: {
                  display: "flex",
                  background: isDark ? "#111827" : "#f8fafc",
                  borderBottom: isDark ? "1px solid #374151" : "1px solid #e2e8f0",
                  flexShrink: 0,
                },
              },
              h(
                "button",
                {
                  onClick: () => setActiveTab("text"),
                  style: {
                    flex: 1,
                    padding: "10px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === "text" ? (isDark ? "#1f2937" : "#fff") : "transparent",
                    color: activeTab === "text" ? "#3b82f6" : (isDark ? "#9ca3af" : "#64748b"),
                    borderBottom:
                      activeTab === "text"
                        ? "2px solid #3b82f6"
                        : "2px solid transparent",
                    transition: "all .2s",
                  },
                },
                h(MsgIcon, null),
                "Text Chat"
              ),
              h(
                "button",
                {
                  onClick: () => setActiveTab("voice"),
                  style: {
                    flex: 1,
                    padding: "10px 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: activeTab === "voice" ? (isDark ? "#1f2937" : "#fff") : "transparent",
                    color: activeTab === "voice" ? "#3b82f6" : (isDark ? "#9ca3af" : "#64748b"),
                    borderBottom:
                      activeTab === "voice"
                        ? "2px solid #3b82f6"
                        : "2px solid transparent",
                    transition: "all .2s",
                  },
                },
                h(MicIcon, null),
                "Voice Call"
              )
            ),
            // Content area
            activeTab === "text"
              ? // TEXT CHAT
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
                  // Input
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
                      placeholder: "Ask me anything about MyHealth...",
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
              : // VOICE CALL
                h(
                  "div",
                  {
                    style: {
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 32,
                      gap: 24,
                    },
                  },
                  // Transcript
                  voiceTranscript &&
                    h(
                      "div",
                      {
                        style: {
                          width: "100%",
                          maxHeight: 120,
                          overflowY: "auto",
                          padding: "12px 16px",
                          background: isDark ? "#374151" : "#f1f5f9",
                          borderRadius: 12,
                          fontSize: 14,
                          color: isDark ? "#d1d5db" : "#334155",
                          textAlign: "center",
                          lineHeight: 1.5,
                        },
                      },
                      voiceTranscript
                    ),
                  // Mic button with rings
                  h(
                    "div",
                    {
                      style: { position: "relative" },
                    },
                    voiceActive &&
                      h("div", {
                        style: {
                          position: "absolute",
                          inset: -16,
                          borderRadius: "50%",
                          border: "3px solid rgba(59,130,246,.3)",
                          animation: "ai-pulse 1.5s ease infinite",
                        },
                      }),
                    voiceActive &&
                      h("div", {
                        style: {
                          position: "absolute",
                          inset: -8,
                          borderRadius: "50%",
                          border: "2px solid rgba(59,130,246,.2)",
                          animation: "ai-pulse 1.5s ease .3s infinite",
                        },
                      }),
                    h(
                      "button",
                      {
                        onClick: toggleVoice,
                        className: voiceActive ? "ai-voice-ring" : "",
                        style: {
                          width: 100,
                          height: 100,
                          borderRadius: "50%",
                          background: voiceActive
                            ? "linear-gradient(135deg, #dc2626, #ef4444)"
                            : "linear-gradient(135deg, #2563eb, #3b82f6)",
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: voiceActive
                            ? "0 8px 32px rgba(220,38,38,.4)"
                            : "0 8px 32px rgba(37,99,235,.4)",
                          transition: "all .3s",
                        },
                      },
                      voiceActive
                        ? h(StopIcon, null)
                        : h(MicLargeIcon, null)
                    )
                  ),
                  h(
                    "p",
                    {
                      style: {
                        fontSize: 14,
                        color: isDark ? "#9ca3af" : "#64748b",
                        fontWeight: 500,
                        textAlign: "center",
                      },
                    },
                    voiceActive
                      ? "Listening... Tap to stop"
                      : "Tap the microphone to start talking"
                  ),
                  h(
                    "p",
                    {
                      style: {
                        fontSize: 11,
                        color: isDark ? "#6b7280" : "#94a3b8",
                        textAlign: "center",
                        maxWidth: 260,
                      },
                    },
                    "Voice recognition uses your browser's built-in speech engine. The AI will respond with text and speech."
                  )
                )
          )
        );

      return h(R.Fragment, null, fab, tab, modal);
    }

    /* ── Mount ── */
    RD.createRoot(root).render(h(AIWidget, null));
  }

  // Start after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
