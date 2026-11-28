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
