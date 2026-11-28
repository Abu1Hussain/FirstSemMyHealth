(() => {
'use strict';
const patientAiConfig = {"gateway":"https://myhealth-ai-gateway.onrender.com","clientId":"","relayUrl":""};
let database;

function openDatabase() {
  if (database) return database;
  database = new Promise((resolve, reject) => {
  try {
    const request = indexedDB.open('myhealth-website-patient', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  } catch (error) {
    reject(error);
  }
  });
  return database;
}

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function newWorkspace() {
  return {
    profile: { name: 'Demo patient', email: '', notes: '', reminders: true },
    appointments: [{ id: 'sample-visit', clinician: 'Family medicine', date: dateAfter(3), time: '10:30', status: 'Booked' }],
    records: [
      { id: 'sample-lab', title: 'Sample routine blood panel', kind: 'Lab result', date: dateAfter(-8), status: 'Sample record', notes: 'A synthetic record for exploring the timeline. No clinical results are attached.' },
      { id: 'sample-visit-note', title: 'Sample visit summary', kind: 'Visit note', date: dateAfter(-14), status: 'Sample record', notes: 'Example follow-up visit recorded in the patient timeline.' }
    ],
    medicines: [], documents: [], family: [], messages: [], chat: [], journal: [],
    invoices: [{ id: 'sample-invoice', title: 'Example consultation', amount: 12500, paid: false }],
    alerts: [{ id: 'welcome', title: 'Welcome to your patient workspace', detail: 'Try a workflow with sample information.', read: false }]
  };
}

async function accessWorkspace(update) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', update ? 'readwrite' : 'readonly');
    const store = transaction.objectStore('workspace');
    const request = store.get('patient');
    let result;
    let failure;
    request.onsuccess = () => {
      try {
        const saved = request.result || newWorkspace();
        saved.journal ??= [];
        result = update ? update(saved) : saved;
        if (update) store.put(result, 'patient');
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(failure || transaction.error || new Error('Browser storage is unavailable.'));
  });
}

const gatewayActions = {
  open_appointments: ['appointments', 'Open appointments'],
  book_appointment: ['appointments', 'Book an appointment'],
  open_records: ['records', 'Open health records'],
  upload_report: ['records', 'Add a sample report'],
  open_messages: ['messages', 'Open message drafts'],
  open_medications: ['medicines', 'Open medicines'],
  open_sick_leave: ['documents', 'Request a document'],
  open_profile: ['settings', 'Open profile']
};

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
  const options = Array.isArray(body.actions) ? body.actions : [body.action];
  return { content: body.reply.trim().slice(0, 16000), actions: [...new Set(options)].filter(key => Object.hasOwn(gatewayActions, key)) };
}

function initPatient(root = document, assets = {}) {
  const app = root.querySelector('#patient-app');
  if (!app || app.dataset.mounted) return;
  app.dataset.mounted = 'true';
  const image = name => assets[`assets/${name}`] || `assets/${name}`;
  const chatReady = window.location.protocol !== 'file:' && Boolean(patientAiConfig.clientId || patientAiConfig.relayUrl);
  const content = app.querySelector('#patient-screen');
  const notice = app.querySelector('#patient-status');
  const routes = [
    ['home', 'Overview', '⌂'], ['appointments', 'Appointments', '▦'], ['records', 'Health records', '▤'],
    ['medicines', 'Medicines', '✚'], ['journal', 'Health journal', '♡'], ['documents', 'Documents', '▧'],
    ['family', 'Family', '♧'], ['messages', 'Messages', '✉'], ['billing', 'Billing', '≋'], ['notifications', 'Notifications', '◉'],
    ['tools', 'Health tools', '↔'], ['chat', 'AI chat', '✦'], ['settings', 'Settings', '⚙']
  ];

  const descriptions = {
    appointments: 'Schedule, reschedule, or cancel a sample visit.', records: 'Browse your timeline and keep sample reports on this device.',
    medicines: 'Keep a personal list of sample medicines and reminders.', documents: 'Request a document and download a sample copy.',
    journal: 'Keep sample vitals, allergies, and nutrition notes in one place.',
    family: 'Save family profiles for this browser demo.', messages: 'Keep local care-team message drafts.',
    billing: 'Try paying an example invoice with a simulated payment.', notifications: 'Review activity from this workspace.',
    tools: 'Convert common measurements and find an emergency contact.', chat: 'Ask MyHealth how to use the patient workspace.',
    settings: 'Manage your demo profile, activity reminders, and browser data.'
  };

  const escape = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const id = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  const dateLabel = value => new Intl.DateTimeFormat('en-BH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  const price = value => new Intl.NumberFormat('en-BH', { style: 'currency', currency: 'BHD' }).format(value / 1000);
  const action = (verb, label, key = '', className = 'ps-button secondary') => `<button class="${className}" type="button" data-action="${verb}" data-key="${escape(key)}">${label}</button>`;
  const openScreen = (key, label) => `<button class="ps-button" type="button" data-screen="${key}">${label}</button>`;
  const field = (label, name, value = '', options = 'required maxlength="100"') => `<label>${label}<input name="${name}" value="${escape(value)}" ${options}></label>`;
  const area = (label, name, value = '', options = 'maxlength="2400"') => `<label>${label}<textarea name="${name}" ${options}>${escape(value)}</textarea></label>`;
  const select = (label, name, values, selected) => `<label>${label}<select name="${name}">${values.map(value => `<option${value === selected ? ' selected' : ''}>${escape(value)}</option>`).join('')}</select></label>`;
  const form = (key, fields, label, data = '') => `<form class="ps-form" data-form="${key}" ${data}>${fields}<div class="ps-actions"><button class="ps-button" type="submit">${label}</button></div></form>`;
  const card = (title, body) => `<section class="ps-card"><h4>${title}</h4>${body}</section>`;
  const badge = (label, tone = '') => `<span class="ps-badge ${tone}">${escape(label)}</span>`;
  const row = (title, detail, actions = '') => `<li class="ps-row"><div><strong>${escape(title)}</strong><p>${escape(detail)}</p></div>${actions && `<div class="ps-actions">${actions}</div>`}</li>`;
  const rows = (items, empty) => items.length ? `<ul class="ps-list">${items.join('')}</ul>` : `<p class="ps-empty">${empty}</p>`;
  const localDate = () => {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  let state;
  let screen = 'home';
  let editingVisit = '';
  let busy = false;
  let chatRequest;

  function setStatus(message, error = false) {
    notice.textContent = message;
    notice.dataset.error = String(error);
  }

  function note(workspace, title, detail) {
    if (workspace.profile.reminders) workspace.alerts.unshift({ id: id(), title, detail, read: false });
  }

  const panels = {
    home() {
      const name = state.profile.name;
      const upcoming = state.appointments.filter(visit => visit.status === 'Booked' && new Date(`${visit.date}T${visit.time}`) >= new Date()).sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
      const shortcuts = [['appointments', 'Book a visit', 'Choose a service and time'], ['records', 'View health records', 'Open your timeline'], ['documents', 'Request a document', 'Get a sample copy'], ['chat', 'Ask MyHealth', 'Open the AI assistant']];
      return `<div class="ps-welcome"><div><span class="ps-kicker">PATIENT OVERVIEW</span><h3>Welcome, ${escape(name)}.</h3><p>Appointments, records, and care tools in one place.</p>${openScreen('appointments', 'Manage appointments')}</div><img src="${image('ai-peek.png')}" alt="" width="144" height="144"></div>
        <div class="ps-shortcuts">${shortcuts.map(([key, title, subtitle]) => `<button type="button" data-screen="${key}"><span aria-hidden="true">${routes.find(route => route[0] === key)[2]}</span><strong>${title}</strong><small>${subtitle}</small></button>`).join('')}</div>
        <div class="ps-columns">${card('Next appointment', upcoming ? `${badge('Upcoming', 'accent')}${rows([row(upcoming.clinician, `${dateLabel(upcoming.date)} · ${upcoming.time}`)], '')}` : '<p class="ps-empty">No upcoming appointments.</p>')}${card('Recent records', rows(state.records.slice(0, 2).map(record => row(record.title, `${record.kind} · ${dateLabel(record.date)}`)), 'No records saved.'))}</div>`;
    },
    appointments() {
      const visit = state.appointments.find(item => item.id === editingVisit && item.status === 'Booked');
      const services = ['Family medicine', 'Dental care', 'Nursing follow-up', 'Dermatology', 'General practice', 'Home visit'];
      const times = ['08:30', '09:30', '10:30', '11:30', '13:00', '14:00', '15:00'];
      const fields = select('Clinic service', 'clinician', services, visit?.clinician) + field('Date', 'date', visit?.date, `type="date" min="${localDate()}" required`) + select('Time', 'time', times, visit?.time);
      return `<div class="ps-columns">${card(visit ? 'Reschedule visit' : 'Book a sample visit', form('appointment', fields, visit ? 'Save new time' : 'Book visit') + (visit ? action('stop-edit', 'Keep original time') : ''))}${card('Your appointments', rows(state.appointments.map(item => row(item.clinician, `${dateLabel(item.date)} · ${item.time} · ${item.status}`, item.status === 'Booked' ? action('reschedule', 'Reschedule', item.id) + action('cancel-visit', 'Cancel', item.id) : '')), 'No appointments yet.'))}</div>`;
    },
    records() {
      const fields = field('Record title', 'title') + select('Type', 'kind', ['Lab result', 'Visit note', 'Imaging', 'Other']) + field('Record date', 'date', localDate(), 'type="date" required') + area('Sample notes', 'notes') + '<label>Sample PDF <small>Optional, up to 10 MB</small><input type="file" name="file" accept=".pdf,application/pdf"></label>';
      return `<div class="ps-columns">${card('Add a record', form('record', fields, 'Save record'))}${card('Your timeline', state.records.length ? `<div class="ps-records">${state.records.map(item => `<details class="ps-record"><summary><strong>${escape(item.title)}</strong><small>${escape(item.kind)} · ${dateLabel(item.date)} · ${escape(item.status)}</small></summary><p>${escape(item.notes || 'No notes for this record.')}</p><div class="ps-actions">${item.file ? action('download-record', 'Download PDF', item.id) : ''}${action('remove-record', 'Delete record', item.id)}</div></details>`).join('')}</div>` : '<p class="ps-empty">Your timeline is empty.</p>')}</div>`;
    },
    medicines() {
      const fields = field('Sample medicine name', 'name') + field('Label instructions', 'instructions') + field('Reminder time', 'time', '', 'type="time"');
      return `<div class="ps-columns">${card('Add a medicine', form('medicine', fields, 'Save medicine'))}${card('Medicine list', rows(state.medicines.map(item => row(item.name, item.instructions + (item.time ? ` · ${item.time}` : ''), action('dose', item.taken === localDate() ? 'Undo taken' : 'Mark taken today', item.id) + action('remove-medicine', 'Remove', item.id))), 'No medicines saved.'))}</div>`;
    },
    journal() {
      const fields = select('Entry type', 'kind', ['Vital sign', 'Allergy', 'Nutrition note']) + field('Entry name', 'title') + field('Date', 'date', localDate(), 'type="date" required') + area('Sample details', 'notes', '', 'required maxlength="500"');
      return `<div class="ps-columns">${card('Add a journal entry', form('journal', fields, 'Save entry'))}${card('Your health journal', rows(state.journal.map(item => row(item.title, `${item.kind} · ${dateLabel(item.date)} · ${item.notes}`, action('remove-journal', 'Remove', item.id))), 'No journal entries yet.'))}</div>`;
    },
    documents() {
      const fields = select('Document type', 'title', ['Visit confirmation', 'Appointment history', 'Sample medical letter', 'Sample sick leave request']) + area('Request note', 'notes');
      return `<div class="ps-columns">${card('Request a document', '<p class="ps-muted">Requests generate an unofficial sample PDF immediately.</p>' + form('document', fields, 'Generate sample PDF'))}${card('Your documents', rows(state.documents.map(item => row(item.title, `${dateLabel(item.date)} · Sample copy ready`, action('download-document', 'Download PDF', item.id) + action('remove-document', 'Remove', item.id))), 'No documents requested.'))}</div>`;
    },
    family() {
      const fields = field('Sample name', 'name') + select('Relationship', 'relationship', ['Child', 'Parent', 'Spouse', 'Other']) + '<label class="ps-check"><input type="checkbox" name="permission" required> I have permission to add this demo profile.</label>';
      return `<div class="ps-columns">${card('Add a family profile', form('family', fields, 'Add profile'))}${card('Family profiles', rows(state.family.map(item => row(item.name, `${item.relationship} · Local profile`, action('remove-family', 'Remove', item.id))), 'No family profiles saved.'))}</div>`;
    },
    messages() {
      const draft = state.messages.find(item => item.id === editingDraft);
      const fields = field('Subject', 'title', draft?.title) + area('Message', 'body', draft?.body, 'required maxlength="2400"');
      return `<div class="ps-columns">${card(draft ? 'Edit draft' : 'Write a draft', '<p class="ps-muted">Drafts stay in this browser. No message is sent to a clinic.</p>' + form('message', fields, 'Save draft'))}${card('Saved drafts', rows(state.messages.map(item => row(item.title, `${dateLabel(item.date)} · Draft`, action('edit-message', 'Open', item.id) + action('remove-message', 'Delete', item.id))), 'No saved messages.'))}</div>`;
    },
    billing() {
      return card('Example invoices', '<p class="ps-muted">This simulation records a payment without collecting card details.</p>' + rows(state.invoices.map(item => row(item.title, `${price(item.amount)} · ${item.paid ? 'Paid in demo' : 'Open'}`, item.paid ? badge('Paid', 'accent') : action('pay', 'Simulate payment', item.id))), 'No invoices.'));
    },
    notifications() {
      return card('Workspace activity', rows(state.alerts.map(item => row(item.title, item.detail, item.read ? '' : action('read', 'Mark as read', item.id))), 'No notifications.') + (state.alerts.some(item => !item.read) ? action('read-all', 'Mark all as read') : ''));
    },
    tools() {
      return `<div class="ps-columns">${card('Unit converter', form('convert', select('Convert', 'kind', ['Kilograms to pounds', 'Pounds to kilograms', 'Celsius to Fahrenheit', 'Fahrenheit to Celsius']) + field('Value', 'value', '', 'type="number" step="any" required'), 'Calculate') + '<output id="ps-conversion" class="ps-output" aria-live="polite"></output>')}${card('Emergency contacts', '<p class="ps-muted">Call your local emergency service if you need immediate help.</p><a class="ps-button secondary" href="tel:999">Bahrain emergency services · 999</a>')}</div>`;
    },
    chat() {
      const pending = state.chat.at(-1)?.role === 'user';
      const prompts = ['How do I book an appointment?', 'Where can I find my records?'];
      return `<section class="ps-card ps-chat"><div class="ps-chat-head"><img src="${image('ai-guide.png')}" width="54" height="54" alt=""><div><h4>MyHealth assistant</h4><p>${chatReady ? 'Online replies via the MyHealth gateway' : 'Live chat is unavailable on this copy of the site.'}</p></div></div>
        <p class="ps-muted">Only the chat text and recent chat turns are sent to the gateway. Use sample information. Keep personal details and real medical reports out of the chat.</p>
        <div class="ps-chat-log" role="log" aria-label="Chat messages" tabindex="0">${state.chat.length ? state.chat.map(item => `<div class="ps-bubble ${item.role}"><strong>${item.role === 'user' ? 'You' : 'MyHealth assistant'}</strong><p>${escape(item.content)}</p>${item.actions?.length ? `<div class="ps-actions">${item.actions.map(key => openScreen(...gatewayActions[key])).join('')}</div>` : ''}</div>`).join('') : '<p class="ps-empty">Ask a question to start a conversation.</p>'}${chatRequest ? '<p class="ps-muted">Waiting for a reply…</p>' : ''}</div>
        <div class="ps-actions">${!state.chat.length && prompts.map(item => `<button type="button" class="ps-button secondary" data-prompt="${escape(item)}">${escape(item)}</button>`).join('') || ''}${pending && chatReady && !chatRequest ? action('retry-chat', 'Retry last message') : ''}${state.chat.length ? action('clear-chat', 'Clear chat') : ''}</div>
        ${form('chat', area('Your question', 'question', '', 'required maxlength="2000"'), 'Send message')}
      </section>`;
    },
    settings() {
      const fields = field('Display name', 'name', state.profile.name) + field('Sample email', 'email', state.profile.email, 'type="email" maxlength="150"') + area('Sample health preferences', 'notes', state.profile.notes, 'maxlength="500"') + `<label class="ps-check"><input type="checkbox" name="reminders"${state.profile.reminders ? ' checked' : ''}> Save activity reminders in the workspace</label>`;
      return `<div class="ps-columns">${card('Patient profile', form('profile', fields, 'Save settings'))}${card('Browser data', '<p class="ps-muted">Your workspace belongs to this browser profile and website address. Clearing site data removes the workspace.</p>' + action('reset', 'Reset demo data'))}</div>`;
    }
  };

  let editingDraft = '';

  function render(moveFocus = false) {
    for (const button of app.querySelectorAll('.ps-nav [data-screen]')) {
      if (button.dataset.screen === screen) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      if (button.dataset.screen === 'notifications') {
        const unread = state.alerts.filter(item => !item.read).length;
        button.querySelector('.ps-count').textContent = unread || '';
      }
    }
    const title = routes.find(route => route[0] === screen)[1];
    content.innerHTML = (screen === 'home' ? '' : `<header class="ps-screen-head"><h3 tabindex="-1">${title}</h3><p>${descriptions[screen]}</p></header>`) + panels[screen]();
    if (screen === 'chat') {
      const log = content.querySelector('.ps-chat-log');
      log.scrollTop = log.scrollHeight;
      content.querySelector('[data-form="chat"] button').disabled = !chatReady || Boolean(chatRequest);
      content.querySelector('[data-form="chat"] textarea').readOnly = Boolean(chatRequest);
    }
    if (moveFocus) (content.querySelector('h3[tabindex]') || content).focus({ preventScroll: true });
  }

  async function save(update, message) {
    state = await accessWorkspace(workspace => {
      update(workspace);
      return workspace;
    });
    render();
    if (message) setStatus(message);
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function documentPdf(item) {
    const lines = ['MyHealth patient simulator', 'SAMPLE DOCUMENT - FOR DEMONSTRATION', item.title, `Created: ${item.date}`];
    const stream = 'BT /F1 16 Tf 50 775 Td 27 TL ' + lines.map(line => `(${line.replace(/[()\\]/g, '\\$&')}) Tj T*`).join(' ') + ' ET';
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
    let pdf = '%PDF-1.4\n';
    const offsets = objects.map((object, index) => {
      const offset = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
      return offset;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new Blob([pdf], { type: 'application/pdf' });
  }

  const submissions = {
    appointment(data) {
      if (`${data.date}T${data.time}` <= new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)) throw new Error('Choose a future appointment time.');
      const key = editingVisit;
      return save(workspace => {
        const visit = workspace.appointments.find(item => item.id === key && item.status === 'Booked');
        if (key && !visit) throw new Error('This appointment is no longer available to reschedule.');
        if (workspace.appointments.some(item => item.id !== key && item.status === 'Booked' && item.date === data.date && item.time === data.time)) throw new Error('You already have a booking at this time.');
        if (visit) Object.assign(visit, data);
        else workspace.appointments.unshift({ ...data, id: id(), status: 'Booked' });
        note(workspace, visit ? 'Appointment rescheduled' : 'Appointment booked', `${data.clinician} · ${dateLabel(data.date)} · ${data.time}`);
      }, key ? 'Appointment rescheduled.' : 'Appointment booked on this device.').then(() => { editingVisit = ''; render(); });
    },
    async record({ file, ...data }) {
      if (file?.size) {
        if (file.size > 10 * 1024 * 1024) throw new Error('Choose a PDF no larger than 10 MB.');
        const signature = await file.slice(0, 5).text();
        if (signature !== '%PDF-') throw new Error('Choose a valid sample PDF.');
      }
      return save(w => w.records.unshift({ ...data, id: id(), status: file?.size ? 'PDF saved locally' : 'Local record', file: file?.size ? file : null }), 'Record saved on this device.');
    },
    medicine(data) { return save(w => w.medicines.unshift({ ...data, id: id(), taken: '' }), 'Medicine saved.'); },
    journal(data) { return save(w => w.journal.unshift({ ...data, id: id() }), 'Journal entry saved.'); },
    document(data) {
      return save(w => {
        w.documents.unshift({ ...data, id: id(), date: localDate() });
        note(w, 'Sample document ready', data.title);
      }, 'Sample PDF is ready to download.');
    },
    family({ name, relationship }) { return save(w => w.family.unshift({ name, relationship, id: id() }), 'Family profile saved.'); },
    message(data) {
      const key = editingDraft;
      return save(w => {
        const draft = w.messages.find(item => item.id === key);
        if (key && !draft) throw new Error('This draft was removed.');
        if (draft) Object.assign(draft, data, { date: localDate() });
        else w.messages.unshift({ ...data, id: id(), date: localDate() });
      }, 'Draft saved on this device.').then(() => { editingDraft = ''; render(); });
    },
    profile(data) { return save(w => { w.profile = { ...data, reminders: Boolean(data.reminders) }; }, 'Settings saved.'); },
    convert(data) {
      const value = Number(data.value);
      const results = {
        'Kilograms to pounds': [value * 2.2046226218, 'lb'], 'Pounds to kilograms': [value / 2.2046226218, 'kg'],
        'Celsius to Fahrenheit': [value * 1.8 + 32, '°F'], 'Fahrenheit to Celsius': [(value - 32) / 1.8, '°C']
      };
      const [answer, unit] = results[data.kind];
      content.querySelector('#ps-conversion').textContent = `${new Intl.NumberFormat('en-BH', { maximumFractionDigits: 2 }).format(answer)} ${unit}`;
    },
  };

  async function sendChat(question) {
    if (!chatReady || chatRequest) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), 75000);
    chatRequest = controller;
    try {
      if (question) await save(w => w.chat.push({ id: id(), role: 'user', content: question }));
      else if (screen === 'chat') render();
      const last = state.chat.at(-1);
      if (last?.role !== 'user') return;
      const context = state.chat.slice(-13);
      const reply = await askGateway(patientAiConfig, context, controller.signal);
      if (!controller.signal.aborted) await save(w => {
        const message = w.chat.find(item => item.id === last.id);
        if (message && !w.chat.some(item => item.replyTo === last.id)) {
          w.chat.splice(w.chat.indexOf(message) + 1, 0, { id: id(), role: 'assistant', ...reply, replyTo: last.id });
        }
      });
    } catch (error) {
      if (!controller.signal.aborted || controller.signal.reason === 'timeout') {
        if (screen === 'chat') setStatus(error.message, true);
      }
    } finally {
      clearTimeout(timer);
      chatRequest = undefined;
      if (screen === 'chat') render();
    }
  }

  const remove = (collection, key) => save(w => { w[collection] = w[collection].filter(item => item.id !== key); }, 'Entry removed.');
  const actions = {
    'stop-edit': () => { editingVisit = ''; render(true); },
    reschedule: key => { editingVisit = key; render(true); },
    'cancel-visit': key => {
      if (!confirm('Cancel this sample appointment?')) return;
      return save(w => {
        const visit = w.appointments.find(item => item.id === key && item.status === 'Booked');
        if (!visit) throw new Error('This appointment was already cancelled.');
        visit.status = 'Cancelled';
        note(w, 'Appointment cancelled', `${visit.clinician} · ${dateLabel(visit.date)}`);
      }, 'Appointment cancelled.');
    },
    'remove-record': key => { if (confirm('Delete this record and its saved PDF?')) return remove('records', key); },
    'download-record': key => {
      const file = state.records.find(item => item.id === key)?.file;
      if (file) download(file, file.name || 'myhealth-record.pdf');
    },
    dose: key => save(w => {
      const medicine = w.medicines.find(item => item.id === key);
      if (medicine) medicine.taken = medicine.taken === localDate() ? '' : localDate();
    }, 'Medicine log updated.'),
    'remove-medicine': key => remove('medicines', key),
    'remove-journal': key => remove('journal', key),
    'download-document': key => {
      const item = state.documents.find(item => item.id === key);
      if (item) download(documentPdf(item), 'myhealth-demo-document.pdf');
    },
    'remove-document': key => remove('documents', key),
    'remove-family': key => remove('family', key),
    'edit-message': key => { editingDraft = key; render(true); },
    'remove-message': key => remove('messages', key),
    pay: key => save(w => {
      const invoice = w.invoices.find(item => item.id === key);
      if (!invoice || invoice.paid) throw new Error('That example invoice has already been paid.');
      invoice.paid = true;
      note(w, 'Sample payment recorded', `${invoice.title} · ${price(invoice.amount)}`);
    }, 'Simulated payment recorded.'),
    read: key => save(w => w.alerts.filter(item => item.id === key).forEach(item => { item.read = true; }), 'Notification marked as read.'),
    'read-all': () => save(w => w.alerts.forEach(item => { item.read = true; }), 'All notifications marked as read.'),
    'clear-chat': () => {
      if (!confirm('Clear this browser’s chat history?')) return;
      chatRequest?.abort();
      return save(w => { w.chat = []; }, 'Local chat history cleared.');
    },
    reset: async () => {
      if (!confirm('Remove all saved patient data from this browser and restore the sample workspace?')) return;
      chatRequest?.abort();
      state = await accessWorkspace(newWorkspace);
      editingVisit = editingDraft = '';
      screen = 'home';
      render(true);
      setStatus('Demo data reset.');
    }
  };

  async function perform(work) {
    if (busy) return;
    busy = true;
    setStatus('');
    try { await work(); }
    catch (error) { setStatus(error.message || 'The action could not be completed.', true); }
    finally { busy = false; }
  }

  app.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !state) return;
    const next = button.dataset.screen;
    if (next) {
      screen = next;
      editingVisit = editingDraft = '';
      setStatus('');
      render(true);
      if (window.matchMedia('(max-width: 710px)').matches) content.scrollIntoView({ block: 'start' });
      return;
    }
    if (button.dataset.prompt) {
      const question = content.querySelector('[name="question"]');
      question.value = button.dataset.prompt;
      question.focus();
    }
    if (button.dataset.action === 'retry-chat') {
      setStatus('');
      sendChat();
    } else if (button.dataset.action) perform(() => actions[button.dataset.action](button.dataset.key));
  });

  app.addEventListener('submit', event => {
    event.preventDefault();
    const name = event.target.dataset.form;
    if (!name) return;
    const entries = [...new FormData(event.target)].map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]);
    for (const [key, value] of entries) {
      const input = event.target.elements.namedItem(key);
      if (input?.required && value === '') {
        setStatus('Fill in the required field before continuing.', true);
        input.focus();
        return;
      }
    }
    if (name === 'chat') {
      setStatus('');
      sendChat(Object.fromEntries(entries).question);
    } else perform(() => submissions[name](Object.fromEntries(entries)));
  });

  app.querySelector('.ps-nav').innerHTML = routes.map(([key, label, icon]) => `<button type="button" data-screen="${key}"><span aria-hidden="true">${icon}</span>${label}${key === 'notifications' ? '<span class="ps-count" aria-label="Unread notifications"></span>' : ''}</button>`).join('');
  accessWorkspace().then(workspace => {
    state = workspace;
    render();
  }).catch(() => {
    content.textContent = 'Browser storage is unavailable. Open the website in a browser that allows site storage to use the simulator.';
    app.querySelector('.ps-nav').hidden = true;
  });
}

window.MyHealthPatient = { init: initPatient };
})();
window.MyHealthPatient.init();
