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
