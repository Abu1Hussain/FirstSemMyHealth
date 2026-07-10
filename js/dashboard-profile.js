window.switchProfileTab = function(tabName) {
  // Hide all tabs
  document.querySelectorAll('.profile-tab-content').forEach(el => el.classList.add('hidden'));
  // Reset all buttons
  document.querySelectorAll('.profile-tab-btn').forEach(btn => {
    btn.className = "profile-tab-btn flex-1 lg:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all text-semantic-text opacity-80 hover:bg-semantic-surface dark:text-semantic-text dark:opacity-90 dark:hover:bg-semantic-surface";
  });

  // Show selected tab
  const selectedTab = document.getElementById('tab-' + tabName);
  if (selectedTab) selectedTab.classList.remove('hidden');

  // Highlight active button
  const selectedBtn = document.getElementById('tab-btn-' + tabName);
  if (selectedBtn) {
  selectedBtn.className = "profile-tab-btn flex-1 lg:w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-semantic-surface text-semantic-cta dark:text-semantic-accent dark:bg-semantic-brand/30 ";
  }
};

window.getProfileFormData = function() {
  const form = document.getElementById('profile-form');
  if (!form) return "";
  const formData = new FormData(form);
  const data = {};
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  // Handle unchecked checkboxes
  ['pref_sms', 'pref_email', 'pref_push'].forEach(key => {
    if (!data[key]) data[key] = false;
  });
  return JSON.stringify(data);
};

window.checkProfileDirtyState = function() {
  const currentState = getProfileFormData();
  const actionButtons = document.getElementById('profile-action-buttons');
  if (actionButtons) {
    if (currentState !== window.initialProfileState) {
      actionButtons.classList.remove('opacity-50', 'pointer-events-none');
    } else {
      actionButtons.classList.add('opacity-50', 'pointer-events-none');
    }
  }
  // Update global avatars instantly to reflect any date or gender changes
  if (typeof window.updateGlobalAvatars === 'function') {
    window.updateGlobalAvatars();
  }
};

// Add listeners to profile form inputs
document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('input', checkProfileDirtyState);
    profileForm.addEventListener('change', checkProfileDirtyState);
    
    // Real-time CPR validation
    const cprInput = document.getElementById('prof-cpr');
    const cprError = document.getElementById('cpr-error');
    if (cprInput && cprError) {
      cprInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '').slice(0, 9);
        if (this.value.length> 0 && this.value.length < 9) {
          cprError.classList.remove('hidden');
          this.classList.add('border-red-500', 'focus:ring-red-500');
        } else {
          cprError.classList.add('hidden');
          this.classList.remove('border-red-500', 'focus:ring-red-500');
        }
      });
    }

    // Date of Birth DD/MM/YYYY mask & validation
    const dobDisplay = document.getElementById('prof-dob-display');
    const dobHidden = document.getElementById('prof-dob');
    const dobError = document.getElementById('dob-error');
    
    if (dobDisplay && dobHidden && dobError) {
      dobDisplay.addEventListener('input', function() {
        let v = this.value.replace(/\D/g, '');
        if (v.length>= 2 && v.length < 4) {
          v = v.substring(0, 2) + '/' + v.substring(2);
        } else if (v.length>= 4) {
          v = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4, 8);
        }
        this.value = v;
        
        if (v.length === 10) {
          const [dd, mm, yyyy] = v.split('/');
          const d = parseInt(dd, 10);
          const m = parseInt(mm, 10);
          const y = parseInt(yyyy, 10);
          
          const isValid = d>= 1 && d <= 31 && m>= 1 && m <= 12 && y>= 1900 && y <= new Date().getFullYear() + 1;
          
          if (isValid) {
            dobError.classList.add('hidden');
            this.classList.remove('border-red-500', 'focus:ring-red-500');
            dobHidden.value = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
            checkProfileDirtyState();
          } else {
            dobError.classList.remove('hidden');
            this.classList.add('border-red-500', 'focus:ring-red-500');
            dobHidden.value = '';
            checkProfileDirtyState();
          }
        } else {
          dobHidden.value = '';
          if (v.length> 0) {
            dobError.classList.remove('hidden');
            this.classList.add('border-red-500', 'focus:ring-red-500');
          } else {
            dobError.classList.add('hidden');
            this.classList.remove('border-red-500', 'focus:ring-red-500');
          }
          checkProfileDirtyState();
        }
      });
    }
  }
});

window.resetProfileForm = function() {
  if (typeof fetchDashboardData === 'function') {
    fetchDashboardData();
  }
  const actionButtons = document.getElementById('profile-action-buttons');
  if (actionButtons) actionButtons.classList.add('opacity-50', 'pointer-events-none');
};

window.submitProfileForm = function() {
  const form = document.getElementById('profile-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const cpr = document.getElementById('prof-cpr').value;
  if (cpr.length !== 9) {
    Swal.fire('Validation Error', 'CPR must be exactly 9 digits.', 'error');
    return;
  }

  const formData = new FormData(form);
  
  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';

  fetch('../php/profile_handler.php', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      Swal.fire({
        title: 'Saved!',
        text: 'Your profile has been successfully updated.',
        icon: 'success',
        background: popupBg,
        color: textColor,
        timer: 2000,
        showConfirmButton: false
      });
      window.initialProfileState = getProfileFormData();
      checkProfileDirtyState();
      
      // Sync theme if changed
      const themePref = document.getElementById('pref-theme').value;
      if (themePref === 'dark') {
        if (typeof applyDarkMode === 'function') applyDarkMode(true);
      } else if (themePref === 'light') {
        if (typeof applyDarkMode === 'function') applyDarkMode(false);
      } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          if (typeof applyDarkMode === 'function') applyDarkMode(true);
        } else {
          if (typeof applyDarkMode === 'function') applyDarkMode(false);
        }
        localStorage.removeItem('darkMode');
        if (document.getElementById('pref-theme')) document.getElementById('pref-theme').value = "system";
      }
      
      fetchDashboardData();
    } else {
      Swal.fire({ title: 'Error', text: data.message || 'Failed to save profile.', icon: 'error', background: popupBg, color: textColor });
    }
  })
  .catch(err => {
    console.error("Profile Save Error:", err);
    Swal.fire({ title: 'Error', text: 'Network error. Please try again.', icon: 'error', background: popupBg, color: textColor });
  });
};

/* ---------------------------------------------
   Family Network Form Logic
   --------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const famRel = document.getElementById('fam-rel');
  if (famRel) {
    famRel.addEventListener('change', function() {
      const rel = this.value;
      const lnameEl = document.getElementById('fam-lname');
      const phoneEl = document.getElementById('fam-phone');
      const emailEl = document.getElementById('fam-email');
      
      // Reset fields
      if (lnameEl) {
        lnameEl.value = '';
        lnameEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
      }
      if (phoneEl) {
        phoneEl.value = '';
        phoneEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
      }
      if (emailEl) {
        emailEl.value = '';
        emailEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
      }

      if (rel && window.initialProfileState) {
        const parentProfile = JSON.parse(window.initialProfileState);
        
        // 1. Global Defaults (Phone & Email for everyone)
        if (phoneEl) {
          phoneEl.value = parentProfile['phone'] || '';
          phoneEl.classList.add('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
        }
        if (emailEl) {
          emailEl.value = parentProfile['email'] || '';
          emailEl.classList.add('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
        }
        
        // 2. Last Name Inheritance (Child or Brother/Sister only)
        if (rel === 'Child' || rel === 'Brother/Sister') {
          if (lnameEl) {
            lnameEl.value = parentProfile['last_name'] || '';
            lnameEl.classList.add('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
          }
        }
      }
    });
  }
});

/* ---------------------------------------------
   Family DOB Input Mask & Strict Validation
   DD/MM/YYYY auto-slash, month 1-12 check,
   future date prevention.
   --------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  const famDobDisplay = document.getElementById('fam-dob-display');
  const famDobHidden = document.getElementById('fam-dob');
  const famDobError  = document.getElementById('fam-dob-error');

  if (famDobDisplay && famDobHidden && famDobError) {
    famDobDisplay.addEventListener('input', function () {
      // Strip non-digits
      let digits = this.value.replace(/\D/g, '');

      // --- Inline segment validation while typing ---
      // Day segment (first 2 digits): clamp to 01-31
      if (digits.length>= 2) {
        let dd = parseInt(digits.substring(0, 2), 10);
        if (dd < 1 || dd> 31) {
          digits = digits.substring(0, 1);
        }
      }

      // Month segment (digits 3-4): clamp to 01-12
      if (digits.length>= 4) {
        let mm = parseInt(digits.substring(2, 4), 10);
        if (mm < 1 || mm> 12) {
          digits = digits.substring(0, 3);
        }
      } else if (digits.length === 3) {
        let partialMonth = parseInt(digits.substring(2, 3), 10);
        if (partialMonth> 1) {
          digits = digits.substring(0, 2);
        }
      }

      // Year segment (digits 5-8): prevent future year as user types
      if (digits.length>= 8) {
        let yyyy = parseInt(digits.substring(4, 8), 10);
        let currentYear = new Date().getFullYear();
        if (yyyy> currentYear) {
          digits = digits.substring(0, 7);
        }
      }

      // Rebuild formatted value with auto-slashes
      let formatted = '';
      if (digits.length>= 4) {
        formatted = digits.substring(0, 2) + '/' + digits.substring(2, 4) + '/' + digits.substring(4, 8);
      } else if (digits.length>= 2) {
        formatted = digits.substring(0, 2) + '/' + digits.substring(2);
      } else {
        formatted = digits;
      }
      this.value = formatted;

      // --- Full date validation when complete (DD/MM/YYYY = 10 chars) ---
      if (formatted.length === 10) {
        const parts = formatted.split('/');
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);

        const now = new Date();
        let valid = d>= 1 && d <= 31 && m>= 1 && m <= 12 && y>= 1900 && y <= now.getFullYear();

        if (valid) {
          const daysInMonth = new Date(y, m, 0).getDate();
          if (d> daysInMonth) valid = false;
        }

        if (valid) {
          const enteredDate = new Date(y, m - 1, d);
          if (enteredDate> now) valid = false;
        }

        if (valid) {
          famDobError.classList.add('hidden');
          this.classList.remove('border-red-500', 'focus:ring-red-500');
          famDobHidden.value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else {
          famDobError.textContent = 'Invalid or future date.';
          famDobError.classList.remove('hidden');
          this.classList.add('border-red-500', 'focus:ring-red-500');
          famDobHidden.value = '';
        }
      } else {
        famDobHidden.value = '';
        if (formatted.length> 0) {
          famDobError.textContent = 'Invalid date format.';
          famDobError.classList.remove('hidden');
          this.classList.add('border-red-500', 'focus:ring-red-500');
        } else {
          famDobError.classList.add('hidden');
          this.classList.remove('border-red-500', 'focus:ring-red-500');
        }
      }
    });
  }
});

window.submitFamilyForm = function() {
  const rel = document.getElementById('fam-rel').value;
  const fname = document.getElementById('fam-fname').value;
  const lname = document.getElementById('fam-lname').value;
  
  if (!rel || !fname || !lname) {
    Swal.fire('Missing Fields', 'Please fill out all required fields (Relationship, First Name, Last Name).', 'warning');
    return;
  }
  
  const cpr = document.getElementById('fam-cpr').value;
  if (cpr && cpr.length !== 9) {
    Swal.fire('Validation Error', 'CPR must be exactly 9 digits if provided.', 'error');
    return;
  }

  const memberIdVal = document.getElementById('fam-member-id').value;
  const isEdit = memberIdVal && parseInt(memberIdVal)> 0;

  const formData = new FormData();
  formData.append('action', isEdit ? 'edit' : 'add');
  if (isEdit) {
    formData.append('member_id', memberIdVal);
  }
  formData.append('relationship', rel);
  formData.append('first_name', fname);
  formData.append('last_name', lname);
  formData.append('cpr', cpr);
  formData.append('date_of_birth', document.getElementById('fam-dob').value);
  formData.append('gender', document.getElementById('fam-gender').value);
  formData.append('blood_type', document.getElementById('fam-blood').value);
  formData.append('phone', document.getElementById('fam-phone').value);
  formData.append('email', document.getElementById('fam-email').value);

  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';

  fetch('../php/family_handler.php', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      Swal.fire({
        title: isEdit ? 'Updated!' : 'Linked!',
        text: isEdit ? 'Family member account has been securely updated.' : 'Family member account has been securely added.',
        icon: 'success',
        background: popupBg,
        color: textColor
      });
      
      // Reset/Clean up form
      if (isEdit) {
        window.cancelEditFamilyMember();
      } else {
        document.getElementById('fam-rel').value = '';
        document.getElementById('fam-fname').value = '';
        document.getElementById('fam-lname').value = '';
        document.getElementById('fam-cpr').value = '';
        document.getElementById('fam-dob').value = '';
        const famDobDisplay = document.getElementById('fam-dob-display');
        if(famDobDisplay) famDobDisplay.value = '';
        document.getElementById('fam-gender').value = 'Not Selected';
        document.getElementById('fam-blood').value = '';
        document.getElementById('fam-phone').value = '';
        document.getElementById('fam-email').value = '';
        
        ['fam-lname', 'fam-phone', 'fam-email'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
        });
      }
      
      if (typeof fetchDashboardData === 'function') {
        fetchDashboardData();
      }
    } else {
      Swal.fire({ title: 'Error', text: data.message || (isEdit ? 'Failed to update family member.' : 'Failed to add family member.'), icon: 'error', background: popupBg, color: textColor });
    }
  })
  .catch(err => {
    console.error("Family Save Error:", err);
    Swal.fire({ title: 'Error', text: 'Network error. Please try again.', icon: 'error', background: popupBg, color: textColor });
  });
};

/* ---------------------------------------------
   Family Network Action Functions
   --------------------------------------------- */
window.editFamilyMember = function(id) {
  const member = (window._familyMembersData || []).find(m => m.member_id == id);
  if (!member) return;
  
  // Set form to edit mode
  document.getElementById('fam-member-id').value = member.member_id;
  
  // Change form title and button text
  document.getElementById('fam-form-title').innerText = 'Edit Family Member';
  document.getElementById('fam-submit-text').innerText = 'Update Account';
  const submitIcon = document.getElementById('fam-submit-icon');
  if (submitIcon) submitIcon.setAttribute('name', 'checkmark-outline');
  
  // Show cancel button
  const cancelBtn = document.getElementById('fam-cancel-btn');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
  
  // Set field values
  const famRel = document.getElementById('fam-rel');
  if (famRel) {
    famRel.value = member.relationship || '';
  }
  
  document.getElementById('fam-fname').value = member.first_name || '';
  
  const lnameEl = document.getElementById('fam-lname');
  if (lnameEl) {
    lnameEl.value = member.last_name || '';
    lnameEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  }
  
  const phoneEl = document.getElementById('fam-phone');
  if (phoneEl) {
    phoneEl.value = member.phone || '';
    phoneEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  }
  
  const emailEl = document.getElementById('fam-email');
  if (emailEl) {
    emailEl.value = member.email || '';
    emailEl.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  }
  
  document.getElementById('fam-cpr').value = member.cpr || '';
  
  // DOB Handling
  const dobInput = document.getElementById('fam-dob');
  const dobDisplayInput = document.getElementById('fam-dob-display');
  if (dobInput) dobInput.value = member.date_of_birth || '';
  if (dobDisplayInput) {
    if (member.date_of_birth) {
      const [y, mm, d] = member.date_of_birth.split('-');
      if (y && mm && d) {
        dobDisplayInput.value = `${d}/${mm}/${y}`;
      } else {
        dobDisplayInput.value = '';
      }
    } else {
      dobDisplayInput.value = '';
    }
  }
  
  document.getElementById('fam-gender').value = member.gender || 'Not Selected';
  document.getElementById('fam-blood').value = member.blood_type || '';
  
  // Scroll to the form section smoothly
  const formTitle = document.getElementById('fam-form-title');
  if (formTitle) {
    formTitle.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

window.removeFamilyMember = function(id) {
  const isDark = document.documentElement.classList.contains('dark');
  const popupBg = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  
  Swal.fire({
    title: 'Are you sure?',
    text: "Do you want to unlink this family member? They will no longer be visible in your Family Network.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, remove them!',
    background: popupBg,
    color: textColor
  }).then((result) => {
    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append('action', 'remove');
      formData.append('member_id', id);
      
      fetch('../php/family_handler.php', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          Swal.fire({
            title: 'Removed!',
            text: 'Family member account has been securely unlinked.',
            icon: 'success',
            background: popupBg,
            color: textColor
          });
          
          // If currently editing this member, cancel the edit mode
          const editingId = document.getElementById('fam-member-id').value;
          if (editingId == id) {
            window.cancelEditFamilyMember();
          }
          
          if (typeof fetchDashboardData === 'function') {
            fetchDashboardData();
          }
        } else {
          Swal.fire({ title: 'Error', text: data.message || 'Failed to remove family member.', icon: 'error', background: popupBg, color: textColor });
        }
      })
      .catch(err => {
        console.error("Family Remove Error:", err);
        Swal.fire({ title: 'Error', text: 'Network error. Please try again.', icon: 'error', background: popupBg, color: textColor });
      });
    }
  });
};

window.cancelEditFamilyMember = function() {
  document.getElementById('fam-member-id').value = '';
  
  document.getElementById('fam-form-title').innerText = 'Add a Family Member';
  document.getElementById('fam-submit-text').innerText = 'Link Account';
  const submitIcon = document.getElementById('fam-submit-icon');
  if (submitIcon) submitIcon.setAttribute('name', 'add-outline');
  
  const cancelBtn = document.getElementById('fam-cancel-btn');
  if (cancelBtn) cancelBtn.classList.add('hidden');
  
  // Reset all form fields
  document.getElementById('fam-rel').value = '';
  document.getElementById('fam-fname').value = '';
  document.getElementById('fam-lname').value = '';
  document.getElementById('fam-cpr').value = '';
  document.getElementById('fam-dob').value = '';
  const famDobDisplay = document.getElementById('fam-dob-display');
  if (famDobDisplay) famDobDisplay.value = '';
  document.getElementById('fam-gender').value = 'Not Selected';
  document.getElementById('fam-blood').value = '';
  document.getElementById('fam-phone').value = '';
  document.getElementById('fam-email').value = '';
  
  ['fam-lname', 'fam-phone', 'fam-email'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('bg-semantic-surface/30', 'dark:bg-semantic-brand/10');
  });
};

/* ---------------------------------------------
   Theme Radio Group Logic
   --------------------------------------------- */
window.setThemeSelection = function(val) {
  const hiddenInput = document.getElementById('pref-theme');
  if (hiddenInput) {
    hiddenInput.value = val;
    window.updateThemeRadioCards(val);
    if (typeof window.checkProfileDirtyState === 'function') {
      window.checkProfileDirtyState();
    }
  }
};

window.updateThemeRadioCards = function(activeVal) {
  const cards = document.querySelectorAll('.theme-radio-card');
  cards.forEach(card => {
    if (card.getAttribute('data-theme-val') === activeVal) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
};

// Initialize cards on load if input has value
document.addEventListener('DOMContentLoaded', () => {
  const hiddenInput = document.getElementById('pref-theme');
  if (hiddenInput && hiddenInput.value) {
    window.updateThemeRadioCards(hiddenInput.value);
  }
});

/* ---------------------------------------------
   Family Network Render Logic
   --------------------------------------------- */
window.renderFamilyMembers = function(members) {
  window._familyMembersData = members || [];
  const container = document.getElementById('linked-accounts-container');
  if (!container) return;
  
  if (!members || members.length === 0) {
    container.innerHTML = '<p class="text-sm text-semantic-text opacity-70 col-span-full italic">No family members linked yet.</p>';
    return;
  }
  
  let html = '';
  members.forEach(m => {
    let displayDob = 'N/A';
    if (m.date_of_birth) {
      const [y, mm, d] = m.date_of_birth.split('-');
      if (y && mm && d) {
        displayDob = `${d}/${mm}/${y}`;
      }
    }
    
    const genderText = m.gender || 'Not Selected';
    const initial = m.first_name ? m.first_name.charAt(0).toUpperCase() : '?';
    
    html += `
    <div class="bg-semantic-bg dark:bg-semantic-surface rounded-xl p-4 border border-semantic-border dark:border-semantic-border shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow relative">
      <div class="absolute top-3 right-3 flex items-center gap-1">
    <button type="button" onclick="editFamilyMember(${m.member_id})" class="p-1.5 text-semantic-text hover:text-semantic-cta dark:text-semantic-accent dark:text-semantic-text opacity-70 dark:hover:text-semantic-cta dark:text-semantic-accent rounded-lg hover:bg-semantic-surface dark:hover:bg-semantic-surface transition-colors" title="Edit Profile">
          <ion-icon name="create-outline" class="text-base"></ion-icon>
        </button>
        <button type="button" onclick="removeFamilyMember(${m.member_id})" class="p-1.5 text-semantic-text hover:text-red-500 dark:text-semantic-text opacity-70 dark:hover:text-red-400 rounded-lg hover:bg-semantic-surface dark:hover:bg-semantic-surface transition-colors" title="Remove Connection">
          <ion-icon name="trash-outline" class="text-base"></ion-icon>
        </button>
      </div>
   <div class="w-12 h-12 rounded-full bg-semantic-cta dark:bg-semantic-brand/50 flex items-center justify-center text-semantic-cta dark:text-semantic-text font-bold text-lg flex-shrink-0">
        ${initial}
      </div>
      <div class="flex-1 overflow-hidden">
        <h4 class="font-bold text-semantic-text dark:text-semantic-text truncate pr-16">${m.first_name} ${m.last_name || ''}</h4>
        <div class="flex items-center gap-2 text-[11px] text-semantic-text opacity-70 dark:text-semantic-text dark:opacity-80 mt-1 uppercase tracking-wider font-semibold">
          <span class="bg-semantic-surface dark:bg-semantic-surface px-2 py-0.5 rounded">${m.relationship}</span>
          <span>${genderText}</span>
        </div>
        <div class="text-xs text-semantic-text opacity-70 mt-2 flex items-center gap-3">
          <span title="Date of Birth"><ion-icon name="calendar-outline" class="align-text-bottom mr-1"></ion-icon>${displayDob}</span>
          ${m.cpr ? `<span title="CPR"><ion-icon name="card-outline" class="align-text-bottom mr-1"></ion-icon>${m.cpr}</span>` : ''}
        </div>
      </div>
    </div>`;
  });
  
  container.innerHTML = html;
};
