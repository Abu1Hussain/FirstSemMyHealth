(() => {
'use strict';
const patientAiConfig = {"gateway":"https://myhealth-ai-gateway.onrender.com","clientId":"","relayUrl":""};
const gatewayErrors = {
  unauthorized: 'The gateway did not recognise this website’s client identifier.',
  origin_not_allowed: 'The gateway has not allowed requests from this website address.',
  rate_limited: 'Chat is receiving too many requests. Wait a minute and try again.',
  not_configured: 'The gateway is reachable and its AI provider still needs setup.',
  provider_busy: 'The AI provider is busy. Try again shortly.',
  provider_timeout: 'The AI provider took too long. Try again shortly.'
};

async function askGateway(config, messages, signal) {
  const direct = !config.relayUrl;
  const url = direct ? new URL('/v1/chat', config.gateway) : new URL(config.relayUrl, window.location.href);
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (direct) headers.Authorization = `Bearer ${config.clientId}`;
  const message = messages.at(-1).content;
  const history = messages.slice(0, -1).slice(-12).map(turn => ({ role: turn.role, text: turn.content.slice(0, 2000) }));
  let response;
  try {
    response = await fetch(url, {
      method: 'POST', credentials: direct ? 'omit' : 'same-origin', redirect: 'error', signal,
      headers, body: JSON.stringify({ message, history })
    });
  } catch {
    if (signal.aborted) throw new Error('The chat request was stopped or timed out.');
    throw new Error('Could not reach the chat gateway. Check your connection and the gateway origin settings.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(Object.hasOwn(gatewayErrors, body?.code) ? gatewayErrors[body.code] : `The chat gateway returned HTTP ${response.status}. Try again later.`);
  if (typeof body?.reply !== 'string' || !body.reply.trim()) throw new Error('The gateway did not return a readable reply.');
  return body.reply.trim().slice(0, 16000);
}

function initPatientPreview(root = document) {
  const preview = root.querySelector('#patient-preview');
  if (!preview || preview.dataset.mounted) return;
  preview.dataset.mounted = 'true';

  const screen = preview.querySelector('#app-phone-screen');
  const buttons = [...preview.querySelectorAll('[data-preview-screen]')];
  const captures = [...screen.querySelectorAll('[data-preview-image]')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const choice of buttons) choice.setAttribute('aria-pressed', String(choice === button));
      for (const capture of captures) capture.hidden = capture.dataset.previewImage !== button.dataset.previewScreen;
      screen.scrollTop = 0;
    });
  }

  const online = window.location.protocol !== 'file:' && Boolean(patientAiConfig.clientId || patientAiConfig.relayUrl);
  if (!online) return;
  preview.querySelector('[data-chat-panel]').hidden = false;
  preview.querySelector('[data-chat-offline]').hidden = true;

  const form = preview.querySelector('[data-chat-form]');
  const question = form.elements.namedItem('question');
  const send = form.querySelector('[type="submit"]');
  const retry = preview.querySelector('[data-chat-retry]');
  const clear = preview.querySelector('[data-chat-clear]');
  const transcript = preview.querySelector('[data-chat-log]');
  const status = preview.querySelector('[data-chat-status]');
  const storageKey = 'myhealth-public-chat-v1';
  let active;
  let messages = [];
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) messages = saved.filter(turn => ['user', 'assistant'].includes(turn?.role) && typeof turn.content === 'string').slice(-80);
  } catch { /* Chat is still usable if browser storage is unavailable. */ }

  function showStatus(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
  }

  function save() {
    messages = messages.slice(-80);
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); }
    catch { return false; }
    return true;
  }

  function render() {
    const bubbles = messages.map(turn => {
      const bubble = document.createElement('div');
      bubble.className = `app-chat-bubble ${turn.role}`;
      const name = document.createElement('strong');
      name.textContent = turn.role === 'user' ? 'You' : 'MyHealth AI';
      const text = document.createElement('p');
      text.textContent = turn.content;
      bubble.append(name, text);
      return bubble;
    });
    transcript.replaceChildren(...bubbles);
    if (!bubbles.length) transcript.textContent = 'Try asking how to book an appointment.';
    transcript.scrollTop = transcript.scrollHeight;
    send.disabled = Boolean(active);
    question.readOnly = Boolean(active);
    retry.hidden = Boolean(active) || messages.at(-1)?.role !== 'user';
    clear.hidden = !messages.length;
  }

  async function requestReply(text) {
    if (active) return;
    if (text) messages.push({ role: 'user', content: text });
    if (messages.at(-1)?.role !== 'user') return;
    const controller = new AbortController();
    active = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 75000);
    const stored = save();
    showStatus('Waiting for a reply…');
    render();
    try {
      const reply = await askGateway(patientAiConfig, messages, controller.signal);
      if (active !== controller) return;
      messages.push({ role: 'assistant', content: reply });
      showStatus(save() && stored ? '' : 'This browser could not save the conversation.');
    } catch (error) {
      if (active === controller) showStatus(error.message, true);
    } finally {
      clearTimeout(timeout);
      if (active === controller) {
        active = undefined;
        render();
      }
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const text = question.value.trim();
    if (!text || active) return;
    question.value = '';
    requestReply(text);
  });
  retry.addEventListener('click', () => requestReply());
  clear.addEventListener('click', () => {
    if (!window.confirm('Clear the chat history saved in this browser?')) return;
    active?.abort();
    active = undefined;
    messages = [];
    showStatus(save() ? 'Chat cleared.' : 'This browser could not clear the saved conversation.');
    render();
  });
  render();
}

window.MyHealthPatient = { init: initPatientPreview };
})();
window.MyHealthPatient.init();
