window.renderMedicalRecords = function(records) {
 var responseData = { records: records };
   var recordsBody = document.getElementById("records-list");
   if (recordsBody && responseData.records) {
    recordsBody.innerHTML = responseData.records.length
     ? responseData.records
       .map((r) => {
         let visual = '';
         let icon = 'document-text';
         let color = 'blue';
         
         if (r.type.includes('Lab')) {
           icon = 'flask'; color = 'purple';
         } else if (r.type.includes('Vital')) {
           icon = 'pulse'; color = 'red';
           const val = Math.floor(Math.random() * 40) + 60; // Mock metric
           visual = `<div class="mt-4"><div class="flex justify-between text-xs mb-1"><span class="font-semibold text-semantic-text opacity-70">Metric Level</span><span class="font-bold">${val}%</span></div><div class="w-full bg-semantic-surface dark:bg-semantic-surface rounded-full h-1.5"><div class="bg-red-500 h-1.5 rounded-full" style="width: ${val}%"></div></div></div>`;
         } else if (r.type.includes('Note')) {
           icon = 'create'; color = 'emerald';
         }

         return `
         <div class="bg-semantic-bg dark:bg-semantic-surface rounded-2xl p-6 border border-semantic-border dark:border-semantic-border shadow-sm hover:shadow-md hover:border-${color}-300 dark:hover:border-${color}-700 transition-all duration-200 group relative flex flex-col h-full">
           <div class="flex justify-between items-start mb-3">
             <div class="bg-${color}-50 text-${color}-600 dark:bg-${color}-900/20 dark:text-${color}-400 p-2.5 rounded-xl transition-colors">
               <ion-icon name="${icon}-outline" class="text-xl"></ion-icon>
             </div>
             <span class="text-xs font-bold text-semantic-text bg-semantic-surface dark:bg-semantic-surface px-2.5 py-1 rounded-full">${r.date}</span>
           </div>
           <h4 class="font-bold text-semantic-text dark:text-semantic-text text-lg mb-1 group-hover:text-${color}-600 dark:group-hover:text-${color}-400 transition-colors">${r.type}</h4>
           <p class="text-sm text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 line-clamp-2 flex-grow">${r.summary}</p>
           ${visual}
           <div class="mt-5 pt-4 border-t border-semantic-border dark:border-semantic-border/50 flex justify-between items-center">
             <div class="flex items-center gap-2 text-xs font-medium text-semantic-text opacity-80 dark:text-semantic-text dark:opacity-80">
               <ion-icon name="person-circle-outline" class="text-semantic-text text-lg"></ion-icon>
               ${r.doctor}
             </div>
             <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
        <button class="p-1.5 text-semantic-cta dark:text-semantic-accent hover:bg-semantic-surface dark:hover:bg-semantic-brand/20 rounded-lg transition-colors" title="View Details"><ion-icon name="eye-outline"></ion-icon></button>
               <button class="p-1.5 text-semantic-text opacity-80 dark:text-semantic-text dark:opacity-80 hover:bg-semantic-surface dark:hover:bg-semantic-surface rounded-lg transition-colors" title="Download PDF"><ion-icon name="download-outline"></ion-icon></button>
             </div>
           </div>
         </div>`;
       })
       .join("")
     : '<div class="col-span-full py-12 text-center text-semantic-text opacity-70">No records found.</div>';
   }

};

window.renderPrescriptions = function(prescriptions) {
 var responseData = { prescriptions: prescriptions };
   var prescriptionsBody = document.getElementById("prescriptions-list");
   if (prescriptionsBody && responseData.prescriptions) {
    prescriptionsBody.innerHTML = responseData.prescriptions.length
     ? responseData.prescriptions
       .map((p) => {
         let status = 'Active';
         let statusBg = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400';
     let btnColor = 'bg-semantic-surface text-semantic-cta dark:text-semantic-accent hover:bg-semantic-cta dark:bg-semantic-brand/30 dark:hover:bg-semantic-brand/50';
         let btnText = 'Request Refill';
         let progress = Math.floor(Math.random() * 60) + 20;

         if (p.duration.toLowerCase().includes('completed') || p.duration.includes('0 days')) {
           status = 'Completed'; statusBg = 'bg-semantic-surface text-semantic-text opacity-80 dark:bg-semantic-surface dark:text-semantic-text dark:opacity-80';
           btnText = 'View Details'; progress = 100;
         } else if (progress < 30) {
           status = 'Refill Needed'; statusBg = 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
           btnColor = 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-200 dark:shadow-none';
         }

         let timeIcon = p.frequency.toLowerCase().includes('night') ? 'moon' : 'sunny';
         if (p.frequency.toLowerCase().includes('twice')) timeIcon = 'sync';

         return `
         <div class="bg-semantic-bg dark:bg-semantic-surface rounded-2xl p-6 border border-semantic-border dark:border-semantic-border shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col h-full group">
           <div class="flex justify-between items-start mb-5">
             <div>
               <span class="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusBg} mb-2">${status}</span>
               <h4 class="font-bold text-semantic-text dark:text-semantic-text text-xl">${p.medication}</h4>
             </div>
             <div class="relative w-12 h-12 flex items-center justify-center">
               <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                 <path class="text-semantic-text dark:text-semantic-text opacity-90" stroke-width="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
         <path class="text-semantic-cta dark:text-semantic-text transition-all duration-1000 ease-out" stroke-dasharray="${progress}, 100" stroke-width="3" stroke-linecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
               </svg>
               <span class="absolute text-[10px] font-bold text-semantic-text opacity-90 dark:text-semantic-text dark:opacity-90">${progress}%</span>
             </div>
           </div>
           
           <div class="grid grid-cols-2 gap-4 mb-5 flex-grow">
             <div class="bg-semantic-surface dark:bg-semantic-surface rounded-xl p-3 flex items-center gap-3">
        <div class="bg-semantic-bg dark:bg-semantic-surface p-1.5 rounded-lg shadow-sm text-semantic-cta dark:text-semantic-accent"><ion-icon name="medical-outline" class="text-lg"></ion-icon></div>
               <div class="min-w-0">
                 <p class="text-[10px] text-semantic-text font-bold uppercase tracking-wider truncate">Dosage</p>
                 <p class="text-sm font-bold text-semantic-text dark:text-semantic-text truncate" title="${p.dosage}">${p.dosage}</p>
               </div>
             </div>
             <div class="bg-semantic-surface dark:bg-semantic-surface rounded-xl p-3 flex items-center gap-3">
               <div class="bg-semantic-bg dark:bg-semantic-surface p-1.5 rounded-lg shadow-sm text-amber-500"><ion-icon name="${timeIcon}-outline" class="text-lg"></ion-icon></div>
               <div class="min-w-0">
                 <p class="text-[10px] text-semantic-text font-bold uppercase tracking-wider truncate">Frequency</p>
                 <p class="text-sm font-bold text-semantic-text dark:text-semantic-text truncate" title="${p.frequency}">${p.frequency}</p>
               </div>
             </div>
           </div>
           
           <div class="flex items-center justify-between pt-4 border-t border-semantic-border dark:border-semantic-border/50">
             <p class="text-xs text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 truncate max-w-[120px]" title="${p.doctor}">Dr. ${p.doctor}</p>
             <button class="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${btnColor}">
               ${btnText}
             </button>
           </div>
         </div>`;
       })
       .join("")
     : '<div class="col-span-full py-12 text-center text-semantic-text opacity-70">No prescriptions found.</div>';
   }

};
