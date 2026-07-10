function fetchForecast() {
  const container = document.getElementById('forecast-container');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full py-6 text-center text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 text-sm">
      <div class="spinner mx-auto mb-3 border-semantic-accent"></div>
      Generating AI predictions...
    </div>
  `;

  fetch('../Ai/predictive_schedule.php')
    .then(response => response.json())
    .then(res => {
      if (res.status === 'error') {
        container.innerHTML = `<div class="col-span-full py-4 text-center text-red-500 font-bold">${res.message}</div>`;
        return;
      }

      container.innerHTML = '';
      
      if (!res.forecast || res.forecast.length === 0) {
        container.innerHTML = `<div class="col-span-full py-4 text-center text-semantic-text opacity-70 font-bold">No historical data available for forecast.</div>`;
        return;
      }

      res.forecast.forEach(f => {
        const isRisk = f.overflow_risk;
        const riskBadge = isRisk 
          ? `<span class="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Overflow Risk</span>`
          : `<span class="bg-semantic-accent text-[var(--color-ink-navy)] text-[var(--color-ink-navy)] dark:bg-semantic-accent/30 dark:text-[var(--color-ink-navy)] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Adequate</span>`;

        const card = document.createElement('div');
        card.className = `bg-semantic-bg dark:bg-semantic-surface rounded-xl p-4 border ${isRisk ? 'border-red-200 dark:border-red-900/50 shadow-sm shadow-red-100 dark:shadow-none' : 'border-semantic-border dark:border-semantic-border'} flex flex-col gap-2 relative transition-transform hover:-translate-y-1`;
        
        card.innerHTML = `
          <div class="flex justify-between items-start mb-2">
            <div class="font-bold text-semantic-text dark:text-semantic-text">${f.day}</div>
            ${riskBadge}
          </div>
          <div class="text-xs text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 flex items-center gap-2">
            <ion-icon name="time-outline" class="${isRisk ? 'text-red-500' : 'text-semantic-text'}"></ion-icon> 
            <span class="font-semibold text-semantic-text opacity-90 dark:text-semantic-text dark:opacity-90">Peak: ${f.peak_hours}</span>
          </div>
          <div class="mt-auto pt-3 border-t ${isRisk ? 'border-red-100 dark:border-red-900/30' : 'border-semantic-border dark:border-semantic-border'} text-[11px] leading-snug ${isRisk ? 'text-red-600 dark:text-red-400 font-medium' : 'text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80'}">
            ${f.suggestion}
          </div>
        `;
        container.appendChild(card);
      });
    })
    .catch(err => {
      console.error("Forecast Error:", err);
      container.innerHTML = `<div class="col-span-full py-4 text-center text-red-500 font-bold">Failed to load forecast data.</div>`;
    });
}

document.addEventListener("DOMContentLoaded", () => {
  fetchForecast();
});

