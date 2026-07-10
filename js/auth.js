/* ===========================================================
  auth.js - Shared script for all authentication pages
  Handles: Dark Mode (init + toggle), Password visibility
  =========================================================== */

/* -- Dark Mode -- */
(function () {
 const isDark = localStorage.getItem("darkMode") === "enabled";
 if (isDark) document.documentElement.classList.add("dark");
})();

function applyDarkMode(isDark) {
 const html = document.documentElement;
 const icon = document.getElementById("darkModeIcon");
 if (isDark) {
  html.classList.add("dark");
  localStorage.setItem("darkMode", "enabled");
  if (icon) icon.setAttribute("name", "sunny-outline");
 } else {
  html.classList.remove("dark");
  localStorage.setItem("darkMode", "disabled");
  if (icon) icon.setAttribute("name", "moon-outline");
 }
}

document.addEventListener("DOMContentLoaded", function () {
 const toggle = document.getElementById("darkModeToggle");
 const icon  = document.getElementById("darkModeIcon");

 // Set initial icon state
 const isDark = document.documentElement.classList.contains("dark");
 if (icon) icon.setAttribute("name", isDark ? "sunny-outline" : "moon-outline");

 if (toggle) {
  toggle.addEventListener("click", function () {
   applyDarkMode(!document.documentElement.classList.contains("dark"));
  });
 }

 /* -- Password Visibility Toggles -- */
 document.querySelectorAll(".toggle-password").forEach(function (btn) {
  btn.addEventListener("click", function () {
   const targetId = this.dataset.target;
   const field  = document.getElementById(targetId);
   if (!field) return;
   const isHidden = field.type === "password";
   field.type     = isHidden ? "text" : "password";
   const eyeIcon = this.querySelector("ion-icon");
   if (eyeIcon) eyeIcon.setAttribute("name", isHidden ? "eye-off-outline" : "eye-outline");
  });
 });
});
