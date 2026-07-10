window.renderBilling = function (invoices) {
  const cardsContainer = document.getElementById("billingPatientCards");
  const alertBanner = document.getElementById("billing-alert-banner");
  if (!cardsContainer) return;

  // Empty state
  if (!invoices || invoices.length === 0) {
    if (alertBanner) alertBanner.classList.add('hidden');
    cardsContainer.innerHTML = `
      <div class="md:col-span-2 bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-sm border border-semantic-border dark:border-semantic-border py-16 text-center">
        <ion-icon name="receipt-outline" style="font-size: 4rem;" class="text-semantic-text dark:text-semantic-text opacity-90 block mx-auto mb-3"></ion-icon>
        <p class="text-semantic-text dark:text-semantic-text opacity-70 text-lg font-medium">No invoices yet</p>
        <p class="text-semantic-text dark:text-semantic-text opacity-80 text-sm mt-1">When your clinic issues a bill, it will appear here.</p>
      </div>`;
    return;
  }

  // Calculate unpaid totals for the alert banner
  let unpaidTotal = 0, unpaidCount = 0;
  invoices.forEach(inv => {
    if (inv.status === 'pending' || inv.status === 'unpaid' || inv.status === 'overdue') {
      const numVal = parseFloat(inv.total.toString().replace(/,/g, ''));
      unpaidTotal += isNaN(numVal) ? 0 : numVal;
      unpaidCount++;
    }
  });

  // Show/hide urgent banner
  if (alertBanner) {
    if (unpaidCount> 0) {
      alertBanner.classList.remove('hidden');
      const alertTotal = document.getElementById('billing-alert-total');
      const alertText = document.getElementById('billing-alert-text');
      if (alertTotal) alertTotal.textContent = '$' + unpaidTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      if (alertText) alertText.textContent = `You have ${unpaidCount} unpaid invoice${unpaidCount> 1 ? 's' : ''}. Please settle them before the due date.`;
    } else {
      alertBanner.classList.add('hidden');
    }
  }

  // Sort: pending first, then others
  const sorted = [...invoices].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return 0;
  });

  // Build receipt cards
  cardsContainer.innerHTML = sorted.map(inv => {
    const isPending = inv.status === 'pending';
    const isPaid = inv.status === 'paid';
    const isCancelled = inv.status === 'cancelled' || inv.status === 'terminated';

    // Card border color
    const borderClass = isPending
      ? 'border-red-200 dark:border-red-900/50 shadow-red-100/50 dark:shadow-none'
      : isPaid
        ? 'border-emerald-200 dark:border-emerald-900/50'
        : 'border-semantic-border dark:border-semantic-border opacity-60';

    // Status stamp
    let stampHtml = '';
    if (isPending) {
      stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-red-500 text-red-500 font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-80">Unpaid</div>`;
    } else if (isPaid) {
      stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-emerald-500 text-emerald-500 font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-80">Paid</div>`;
    } else {
      stampHtml = `<div class="absolute top-4 right-4 rotate-[-12deg] border-[3px] border-semantic-border text-semantic-text font-black text-sm px-3 py-1 rounded-md uppercase tracking-wider opacity-60">${inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}</div>`;
    }

    // Action button
    let actionHtml = '';
    if (isPending) {
      actionHtml = `
        <button onclick="openPaymentModal(${inv.id}, '${inv.total}')"
          class="w-full mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none text-sm">
          <ion-icon name="card-outline" class="text-lg"></ion-icon>
          Pay Now &mdash; $${inv.total}
        </button>`;
    } else if (isPaid) {
      actionHtml = `
        <div class="mt-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <ion-icon name="checkmark-circle" class="text-lg"></ion-icon>
          Payment Completed
        </div>`;
    }

    return `
    <div class="relative bg-semantic-bg dark:bg-semantic-surface rounded-2xl shadow-sm border-2 ${borderClass} overflow-hidden transition-all hover:shadow-md">
      ${stampHtml}

      <!-- Receipt Header -->
      <div class="px-6 pt-5 pb-3">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-10 h-10 rounded-xl ${isPending ? 'bg-red-100 dark:bg-red-900/30' : isPaid ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-semantic-surface dark:bg-semantic-surface'} flex items-center justify-center">
            <ion-icon name="${isPending ? 'time-outline' : isPaid ? 'checkmark-done-outline' : 'close-outline'}" class="text-xl ${isPending ? 'text-red-500' : isPaid ? 'text-emerald-500' : 'text-semantic-text'}"></ion-icon>
          </div>
          <div>
            <p class="text-sm font-bold text-semantic-text dark:text-semantic-text">Invoice #INV-${String(inv.id).padStart(4, '0')}</p>
            <p class="text-xs text-semantic-text dark:text-semantic-text opacity-70">Issued: ${inv.date}</p>
          </div>
        </div>
      </div>

      <!-- Dashed Separator -->
      <div class="px-6"><div class="border-t-2 border-dashed border-semantic-border dark:border-semantic-border"></div></div>

      <!-- Itemized Breakdown -->
      <div class="px-6 py-4 space-y-2.5">
        <div class="flex justify-between text-sm">
          <span class="text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">Subtotal</span>
          <span class="text-semantic-text opacity-90 dark:text-semantic-text dark:opacity-90 font-medium">$${inv.subtotal}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80">Tax (10%)</span>
          <span class="text-amber-600 dark:text-amber-400 font-medium">+$${inv.tax}</span>
        </div>
      </div>

      <!-- Dashed Separator -->
      <div class="px-6"><div class="border-t-2 border-dashed border-semantic-border dark:border-semantic-border"></div></div>

      <!-- Total -->
      <div class="px-6 py-3 flex justify-between items-center">
        <span class="text-base font-bold text-semantic-text dark:text-semantic-text">TOTAL</span>
        <span class="text-2xl font-black ${isPending ? 'text-red-600 dark:text-red-400' : 'text-semantic-text dark:text-semantic-text'}">$${inv.total}</span>
      </div>

      <!-- Due Date -->
      <div class="px-6 pb-2">
        <div class="flex justify-between text-xs">
          <span class="text-semantic-text dark:text-semantic-text opacity-70">Due Date</span>
          <span class="${isPending ? 'text-red-500 font-semibold' : 'text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80'}">${inv.due_date || 'N/A'}</span>
        </div>
      </div>

      <!-- Action -->
      <div class="px-6 pb-5">
        ${actionHtml}
      </div>
    </div>`;
  }).join('');
};

/* -- 9b. Payment Modal Helpers -- */
window.openPaymentModal = function (invoiceId, totalStr) {
  document.getElementById('pay-invoice-id').value = invoiceId;
  document.getElementById('pay-invoice-label').textContent = '#INV-' + String(invoiceId).padStart(4, '0');
  document.getElementById('pay-invoice-amount').textContent = '$' + totalStr;
  document.getElementById('paymentForm').reset();
  document.getElementById('pay-invoice-id').value = invoiceId;
  
  // Auto-fill dummy card info for fast simulation
  document.getElementById('pay-card-number').value = '4111 1111 1111 1111';
  document.getElementById('pay-card-holder').value = 'Test Patient';
  document.getElementById('pay-card-expiry').value = '12/26';
  document.getElementById('pay-card-cvv').value = '123';
  
  document.getElementById('paymentModal').classList.remove('hidden');
};

window.closePaymentModal = function () {
  document.getElementById('paymentModal').classList.add('hidden');
};

window.formatCardNumber = function (input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
};

window.formatExpiry = function (input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length>= 3) v = v.substring(0, 2) + '/' + v.substring(2);
  input.value = v;
};

window.processPayment = async function () {
  const invoiceId = document.getElementById('pay-invoice-id').value;
  const cardNumber = document.getElementById('pay-card-number').value;
  const cardHolder = document.getElementById('pay-card-holder').value;
  const expiry = document.getElementById('pay-card-expiry').value;
  const cvv = document.getElementById('pay-card-cvv').value;

  if (!cardNumber || cardNumber.replace(/\s/g, '').length < 13) {
    Swal.fire('Error', 'Please enter a valid card number', 'error'); return;
  }
  if (!cardHolder.trim()) {
    Swal.fire('Error', 'Please enter the cardholder name', 'error'); return;
  }
  if (!expiry || expiry.length < 5) {
    Swal.fire('Error', 'Please enter a valid expiry date', 'error'); return;
  }
  if (!cvv || cvv.length < 3) {
    Swal.fire('Error', 'Please enter a valid CVV', 'error'); return;
  }

  const payBtn = document.getElementById('payBtn');
  const origHtml = payBtn.innerHTML;
  payBtn.innerHTML = '<ion-icon name="hourglass-outline" class="text-lg animate-spin"></ion-icon> Processing...';
  payBtn.disabled = true;

  const formData = new FormData();
  formData.append('action', 'pay_invoice');
  formData.append('invoice_id', invoiceId);
  formData.append('card_number', cardNumber);
  formData.append('card_holder', cardHolder);

  try {
    const res = await fetch('../php/dashboard_api.php', {
      method: 'POST', body: formData, credentials: 'include'
    });
    const data = await res.json();
    if (data.status === 'success') {
      closePaymentModal();
      Swal.fire({
        icon: 'success', title: 'Payment Successful!',
        html: `<p class="text-semantic-text opacity-80">${data.message}</p>`,
        confirmButtonColor: '#6366f1'
      });
      if (typeof fetchDashboardData === 'function') fetchDashboardData();
      else location.reload();
    } else {
      Swal.fire('Payment Failed', data.message, 'error');
    }
  } catch (e) {
    Swal.fire('Error', 'Network error. Please try again.', 'error');
  } finally {
    payBtn.innerHTML = origHtml;
    payBtn.disabled = false;
  }
};

/* -- 10. Render Notifications & Dropdown -- */
