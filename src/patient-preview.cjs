const { arrow, config } = require('./components.cjs');

const screens = [
  ['home', 'Home', 'The MyHealth patient home screen with an appointment card, report tools, and services'],
  ['appointments', 'Appointments', 'The MyHealth patient appointments screen'],
  ['records', 'Health records', 'The MyHealth patient health records screen']
];

module.exports = () => `<section class="section" id="patient-preview" aria-labelledby="patient-preview-title">
  <div class="wrap app-preview-grid">
    <div class="app-preview-copy">
      <h2 id="patient-preview-title">See the patient app</h2>
      <p>Scroll through real screens from MyHealth, then open the app and choose the Patient demo to try it yourself.</p>
      <div class="app-preview-controls" role="group" aria-label="Choose a patient screen">
        ${screens.map(([key, label], index) => `<button type="button" class="app-preview-tab" data-preview-screen="${key}" aria-pressed="${index === 0}" aria-controls="app-phone-screen">${label}</button>`).join('')}
      </div>
      <div class="button-row">
        <a class="button" href="${config.demo}" target="_blank" rel="noopener noreferrer">Try the app ${arrow}</a>
        <a class="button secondary" href="#patient-chat">Open AI chat</a>
      </div>
    </div>
    <figure class="app-preview-figure">
      <div class="app-phone">
        <div id="app-phone-screen" class="app-phone-screen" tabindex="0" role="region" aria-label="Scrollable patient app screenshot">
          ${screens.map(([key, , alt], index) => `<img src="assets/patient-preview-${key}.png" data-preview-image="${key}" alt="${alt}" width="390" height="1500" loading="lazy"${index === 0 ? '' : ' hidden'}>`).join('')}
        </div>
      </div>
      <figcaption>MyHealth Flutter app · sample account</figcaption>
    </figure>
  </div>
  <div class="wrap">
    <section id="patient-chat" class="app-preview-chat" aria-labelledby="patient-chat-title">
      <header class="app-chat-header">
        <img src="assets/ai-guide.png" alt="" width="54" height="54" loading="lazy">
        <div><h3 id="patient-chat-title">MyHealth AI chat</h3><p>Ask how to use the app. Use sample information in messages.</p></div>
      </header>
      <p data-chat-offline>The website chat is awaiting gateway setup. <a href="${config.demo}" target="_blank" rel="noopener noreferrer">Open the MyHealth app ${arrow}</a></p>
      <div data-chat-panel hidden>
        <div class="app-chat-log" data-chat-log role="log" aria-label="Chat messages" tabindex="0"></div>
        <form class="app-chat-form" data-chat-form>
          <label for="patient-chat-question">Your question</label>
          <textarea id="patient-chat-question" name="question" required maxlength="2000" rows="2"></textarea>
          <div class="app-chat-actions">
            <button class="button small" type="submit">Send message</button>
            <button class="app-preview-tab" type="button" data-chat-retry hidden>Retry last message</button>
            <button class="app-preview-tab" type="button" data-chat-clear hidden>Clear chat</button>
          </div>
        </form>
        <p class="small-text">The current message and recent chat turns go to the MyHealth gateway. Chat history is saved in this browser.</p>
      </div>
      <p class="app-chat-status" data-chat-status role="status"></p>
    </section>
  </div>
</section>`;
