
/**
 * AI Care Navigator Widget — Vanilla JS Edition
 * ================================================
 * Standalone floating AI assistant for MyHealth dashboards.
 * 
 * State Machine (4 phases):
 *  MINIMIZED  → Slim tab flush against bottom-right edge
 *  CORNER_IDLE → Floating robot icon in bottom-right corner
 *  WALKING   → Robot physically moves to center with wiggle animation
 *  MODAL_OPEN → Full chat modal with blurred backdrop
 */
(function () {
 "use strict";

 /* -- Config -- */
 const GEMINI_API_KEY = "AIzaSyDhLYX0y12fw4Sri1YDIUfLTP8iXX-7f_s";
 const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

 const FALLBACK_SYSTEM_PROMPT =
  "You are a helpful navigation assistant for a healthcare website called MyHealth. Help users navigate to Dashboard, Appointments, Medical Records, Prescriptions, or Profile. If asked a medical question, politely redirect them to book an appointment with a doctor.";

 const USE_SERVER_PROXY = true;
 const SERVER_PROXY_URL = "../Ai/ai_chat.php";

 /* -- State Machine -- */
 const STATE = {
  MINIMIZED:  'MINIMIZED',
  CORNER_IDLE: 'CORNER_IDLE',
  WALKING:   'WALKING',
  MODAL_OPEN: 'MODAL_OPEN',
 };

 let widgetState = STATE.CORNER_IDLE;
 let messages = [
  {
   role: "model",
   text: "Hello! 👋 I'm your Care Navigator. I can help you find your way around MyHealth. What are you looking for?",
  },
 ];
 let loading = false;
 let isRecording = false;
 let walkTimer = null;
 let recognition = null;
 
 let rootEl = null;

 /* -- Setup Speech Recognition -- */
 const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
 if (SpeechRec) {
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
   const transcript = event.results[0][0].transcript;
   sendMessageText(transcript);
  };
  recognition.onerror = (event) => {
   console.error("Speech recognition error", event.error);
   stopRecording();
  };
  recognition.onend = () => {
   stopRecording();
  };
 }

 /* -- CSS Styles -- */
 function injectStyles() {
  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
   .ai-fab-slide-in { animation: ai-fab-slide-in .4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
   @keyframes ai-fab-slide-in {
    0%  { transform: translateY(100px) scale(0.5); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
   }
   .ai-modal-reveal { animation: ai-modal-reveal .4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
   @keyframes ai-modal-reveal {
    0%  { opacity: 0; transform: scale(0.95) translateY(20px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
   }
   .ai-backdrop-in { animation: ai-backdrop-in .3s ease forwards; }
   @keyframes ai-backdrop-in {
    0%  { opacity: 0; backdrop-filter: blur(0px); }
    100% { opacity: 1; backdrop-filter: blur(4px); }
   }
   .ai-walking { animation: ai-walk-to-center 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
   @keyframes ai-walk-to-center {
    0%  { bottom: 32px; right: 32px; transform: scale(1); }
    100% { bottom: 50%; right: 50%; transform: translate(50%, 50%) scale(1.5); }
   }
   .ai-walking-wiggle-inner { animation: ai-walking-wiggle 1.2s linear forwards; }
   @keyframes ai-walking-wiggle {
    0%, 100% { transform: rotate(0deg); }
    15% { transform: rotate(-15deg); }
    30% { transform: rotate(15deg); }
    45% { transform: rotate(-15deg); }
    60% { transform: rotate(15deg); }
    75% { transform: rotate(-15deg); }
    90% { transform: rotate(15deg); }
   }
   .ai-ring-pulse { animation: ai-ring-pulse 2s infinite; }
   @keyframes ai-ring-pulse {
    0%  { box-shadow: 0 0 0 0 rgba(59,130,246,.4); }
    70% { box-shadow: 0 0 0 18px rgba(59,130,246,0); }
    100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
   }
   .ai-chat-scroll::-webkit-scrollbar { width:6px; }
   .ai-chat-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
   .ai-chat-scroll::-webkit-scrollbar-track { background:transparent; }
   .markdown-body p { margin-bottom: 0.5em; }
   .markdown-body strong { font-weight: bold; }
  `;
  document.head.appendChild(styleEl);
 }

 /* -- API & Logic -- */
 function handleAIAction(action) {
  if (!action) return;
  if (action.type === 'navigate' && action.target) {
   if (typeof window.showSection === 'function') {
    window.showSection(action.target);
   }
  }
  if (action.type === 'book_appointment') {
   if (typeof window.showSection === 'function') {
    window.showSection('appointments');
   }
  }
  if (action.type === 'emergency_alert') {
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

 async function sendToServerProxy(msgs) {
  const res = await fetch(SERVER_PROXY_URL, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ messages: msgs }),
  });
  const data = await res.json();
  if (data.status === 'success') {
   if (data.action) setTimeout(() => handleAIAction(data.action), 500);
   return data.reply;
  }
  throw new Error(data.message || "Proxy error");
 }

 async function sendToGeminiFallback(msgs) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const contents = msgs.map((m) => ({
   role: m.role,
   parts: [{ text: m.text }],
  }));
  contents.unshift({ role: "user", parts: [{ text: FALLBACK_SYSTEM_PROMPT }] });
  contents.unshift({ role: "model", parts: [{ text: "Understood." }] });

  const res = await fetch(apiUrl, {
   method: "POST",
   headers: { "Content-Type": "application/json" },
   body: JSON.stringify({ contents }),
  });
  const data = await res.json();
  if (data.candidates && data.candidates.length> 0) {
   return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Invalid API response");
 }

 async function sendToGemini(msgs) {
  if (USE_SERVER_PROXY) {
   try {
    return await sendToServerProxy(msgs);
   } catch (e) {
    console.warn("Server proxy failed, falling back to direct API", e);
   }
  }
  return await sendToGeminiFallback(msgs);
 }

 async function sendMessageText(text) {
  if (!text.trim() || loading) return;
  const userMsg = { role: "user", text: text.trim() };
  messages.push(userMsg);
  loading = true;
  render();
  
  try {
   const reply = await sendToGemini(messages);
   messages.push({ role: "model", text: reply });
  } catch (e) {
   messages.push({ role: "model", text: "Sorry, I had trouble connecting. Please try again." });
  }
  loading = false;
  render();
 }

 function toggleRecording() {
  if (!recognition) return;
  if (isRecording) {
   stopRecording();
  } else {
   isRecording = true;
   recognition.start();
   render();
  }
 }

 function stopRecording() {
  isRecording = false;
  if (recognition) recognition.stop();
  render();
 }

 /* -- Render Engine -- */
 function render() {
  if (!rootEl) return;
  const isDark = document.documentElement.classList.contains("dark");
  
  // Clear root
  rootEl.innerHTML = '';
  
  if (widgetState === STATE.MINIMIZED) {
   const btn = document.createElement("button");
   btn.className = "ai-tab-enter";
   btn.style.cssText = `position:fixed; bottom:32px; right:0; z-index:9999; width:28px; height:64px; background:linear-gradient(135deg, #2563eb, #3b82f6); color:#fff; border:none; border-radius:14px 0 0 14px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:-4px 4px 16px rgba(37,99,235,.3); font-size:16px; transition:width 0.2s;`;
   btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>`;
   btn.onmouseenter = () => btn.style.width = "36px";
   btn.onmouseleave = () => btn.style.width = "28px";
   btn.onclick = () => { widgetState = STATE.CORNER_IDLE; render(); };
   rootEl.appendChild(btn);
  } 
  else if (widgetState === STATE.CORNER_IDLE) {
   const container = document.createElement("div");
   container.className = "ai-fab-slide-in";
   container.style.cssText = `position:fixed; bottom:32px; right:32px; z-index:9999;`;
   
   const closeBtn = document.createElement("button");
   closeBtn.style.cssText = `position:absolute; top:-6px; right:-6px; width:22px; height:22px; border-radius:50%; background:#ef4444; color:white; border:2px solid white; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; box-shadow:0 2px 4px rgba(0,0,0,0.1);`;
   closeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
   closeBtn.onclick = (e) => { e.stopPropagation(); widgetState = STATE.MINIMIZED; render(); };
   
   const fabBtn = document.createElement("button");
   fabBtn.className = "ai-ring-pulse";
   fabBtn.style.cssText = `width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, #2563eb, #3b82f6); border:none; color:white; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 10px 25px -5px rgba(37,99,235,0.4);`;
   fabBtn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="m2 14 2 2 2-2"/><path d="m22 14-2 2-2-2"/><path d="M9.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/><path d="M15.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/></svg>`;
   fabBtn.onclick = () => { 
    widgetState = STATE.WALKING; 
    render();
    walkTimer = setTimeout(() => {
     widgetState = STATE.MODAL_OPEN;
     render();
    }, 1200);
   };
   
   container.appendChild(closeBtn);
   container.appendChild(fabBtn);
   rootEl.appendChild(container);
  }
  else if (widgetState === STATE.WALKING) {
   const container = document.createElement("div");
   container.className = "ai-walking";
   container.style.cssText = `position:fixed; z-index:10000; pointer-events:none;`;
   
   const inner = document.createElement("div");
   inner.className = "ai-walking-wiggle-inner";
   
   const fab = document.createElement("div");
   fab.style.cssText = `width:64px; height:64px; border-radius:50%; background:linear-gradient(135deg, #2563eb, #3b82f6); color:white; display:flex; align-items:center; justify-content:center; box-shadow:0 15px 35px -5px rgba(37,99,235,0.6);`;
   fab.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="m2 14 2 2 2-2"/><path d="m22 14-2 2-2-2"/><path d="M9.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/><path d="M15.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/></svg>`;
   
   inner.appendChild(fab);
   container.appendChild(inner);
   
   const backdrop = document.createElement("div");
   backdrop.className = "ai-backdrop-in";
   backdrop.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.3); z-index:9999; pointer-events:none;`;
   
   rootEl.appendChild(backdrop);
   rootEl.appendChild(container);
  }
  else if (widgetState === STATE.MODAL_OPEN) {
   const backdrop = document.createElement("div");
   backdrop.className = "ai-backdrop-in";
   backdrop.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9998;`;
   backdrop.onclick = () => { widgetState = STATE.CORNER_IDLE; render(); };
   
   const modalContainer = document.createElement("div");
   modalContainer.style.cssText = `position:fixed; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px; pointer-events:none;`;
   
   const modal = document.createElement("div");
   modal.className = "ai-modal-reveal";
   modal.style.cssText = `width:100%; max-width:500px; height:85vh; max-height:800px; background:${isDark ? '#1f2937' : '#ffffff'}; border-radius:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); display:flex; flex-direction:column; overflow:hidden; pointer-events:auto; border:1px solid ${isDark ? '#374151' : '#f3f4f6'};`;
   
   // Header
   const header = document.createElement("div");
   header.style.cssText = `padding:20px; border-bottom:1px solid ${isDark ? '#374151' : '#f3f4f6'}; display:flex; justify-content:space-between; align-items:center; background:${isDark ? '#111827' : '#f8fafc'};`;
   header.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
     <div style="width:40px; height:40px; border-radius:10px; background:linear-gradient(135deg, #2563eb, #3b82f6); display:flex; align-items:center; justify-content:center; color:white;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="m2 14 2 2 2-2"/><path d="m22 14-2 2-2-2"/><path d="M9.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/><path d="M15.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/></svg>
     </div>
     <div>
      <h2 style="margin:0; font-size:16px; font-weight:700; color:${isDark ? '#fff' : '#111827'};">Care Navigator</h2>
      <div style="display:flex; align-items:center; gap:6px;">
       <span style="width:8px; height:8px; border-radius:50%; background:#22c55e;"></span>
       <span style="font-size:12px; color:${isDark ? '#9ca3af' : '#6b7280'};">Online</span>
      </div>
     </div>
    </div>
   `;
   const closeBtn = document.createElement("button");
   closeBtn.style.cssText = `width:36px; height:36px; border-radius:50%; border:none; background:${isDark ? '#374151' : '#e5e7eb'}; color:${isDark ? '#d1d5db' : '#4b5563'}; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:background 0.2s;`;
   closeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
   closeBtn.onclick = () => { widgetState = STATE.CORNER_IDLE; render(); };
   header.appendChild(closeBtn);
   
   // Chat area
   const chatArea = document.createElement("div");
   chatArea.className = "ai-chat-scroll";
   chatArea.style.cssText = `flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; background:${isDark ? '#1f2937' : '#ffffff'};`;
   
   messages.forEach(msg => {
    const isUser = msg.role === 'user';
    const msgRow = document.createElement("div");
    msgRow.style.cssText = `display:flex; justify-content:${isUser ? 'flex-end' : 'flex-start'}; width:100%;`;
    
    const bubble = document.createElement("div");
    if (isUser) {
     bubble.style.cssText = `max-width:80%; padding:12px 16px; border-radius:20px 20px 4px 20px; background:#2563eb; color:white; font-size:14px; line-height:1.5; box-shadow:0 2px 4px rgba(37,99,235,0.2);`;
    } else {
     bubble.className = "markdown-body";
     bubble.style.cssText = `max-width:85%; padding:16px; border-radius:20px 20px 20px 4px; background:${isDark ? '#374151' : '#f1f5f9'}; color:${isDark ? '#f3f4f6' : '#1e293b'}; font-size:14px; line-height:1.6; box-shadow:0 1px 2px rgba(0,0,0,0.05);`;
    }
    
    // Basic markdown parser
    let htmlText = msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlText = htmlText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    htmlText = htmlText.replace(/`(.*?)`/g, '<code style="background:rgba(128,128,128,0.2);padding:2px 4px;border-radius:4px;">$1</code>');
    htmlText = htmlText.replace(/\n/g, '<br>');
    
    bubble.innerHTML = htmlText;
    msgRow.appendChild(bubble);
    chatArea.appendChild(msgRow);
   });
   
   if (loading) {
    const loadRow = document.createElement("div");
    loadRow.style.cssText = `display:flex; justify-content:flex-start; width:100%;`;
    loadRow.innerHTML = `<div style="padding:16px; border-radius:20px; background:${isDark ? '#374151' : '#f1f5f9'}; color:${isDark ? '#9ca3af' : '#6b7280'}; font-size:14px; display:flex; gap:6px; align-items:center;">
     <span style="animation:pulse 1s infinite;">●</span><span style="animation:pulse 1s 0.2s infinite;">●</span><span style="animation:pulse 1s 0.4s infinite;">●</span>
    </div>`;
    chatArea.appendChild(loadRow);
   }
   
   // Footer
   const footer = document.createElement("div");
   footer.style.cssText = `padding:16px; border-top:1px solid ${isDark ? '#374151' : '#f3f4f6'}; background:${isDark ? '#1f2937' : '#ffffff'};`;
   
   const inputWrap = document.createElement("div");
   inputWrap.style.cssText = `display:flex; align-items:center; gap:8px; padding:8px 16px; background:${isDark ? '#374151' : '#f8fafc'}; border-radius:24px; border:1px solid ${isDark ? '#4b5563' : '#e2e8f0'};`;
   
   const inputEl = document.createElement("input");
   inputEl.type = "text";
   inputEl.placeholder = "Type your question...";
   inputEl.style.cssText = `flex:1; background:transparent; border:none; outline:none; font-size:15px; color:${isDark ? '#fff' : '#111827'}; min-width:0; padding:4px 0;`;
   inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
     sendMessageText(inputEl.value);
    }
   };
   
   const micBtn = document.createElement("button");
   micBtn.style.cssText = `width:36px; height:36px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; background:${isRecording ? '#ef4444' : 'transparent'}; color:${isRecording ? '#fff' : (isDark ? '#9ca3af' : '#6b7280')}; transition:all 0.2s;`;
   if (isRecording) {
    micBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;
   } else {
    micBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>`;
   }
   micBtn.onclick = toggleRecording;
   
   const sendBtn = document.createElement("button");
   sendBtn.style.cssText = `width:36px; height:36px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; background:#2563eb; color:white; transition:background 0.2s;`;
   sendBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`;
   sendBtn.onclick = () => sendMessageText(inputEl.value);
   
   inputWrap.appendChild(inputEl);
   inputWrap.appendChild(micBtn);
   inputWrap.appendChild(sendBtn);
   footer.appendChild(inputWrap);
   
   modal.appendChild(header);
   modal.appendChild(chatArea);
   modal.appendChild(footer);
   modalContainer.appendChild(modal);
   
   rootEl.appendChild(backdrop);
   rootEl.appendChild(modalContainer);
   
   // Auto-scroll
   setTimeout(() => chatArea.scrollTop = chatArea.scrollHeight, 50);
   
   // Focus input
   setTimeout(() => inputEl.focus(), 100);
   
   // Handle body scroll lock
   document.body.style.overflow = "hidden";
  }
  
  if (widgetState !== STATE.MODAL_OPEN) {
   document.body.style.overflow = "";
  }
 }

 /* -- Setup Global Opener -- */
 window.openAIWidget = () => {
  if (widgetState === STATE.MODAL_OPEN) return;
  widgetState = STATE.WALKING;
  render();
  setTimeout(() => {
   widgetState = STATE.MODAL_OPEN;
   render();
  }, 1200);
 };

 /* -- Initialize -- */
 function boot() {
  injectStyles();
  rootEl = document.createElement("div");
  rootEl.id = "ai-widget-root";
  document.body.appendChild(rootEl);
  
  // Listen for dark mode toggle to re-render
  const obs = new MutationObserver(() => render());
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  
  render();
 }

 if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
 } else {
  boot();
 }

})();
