const fs = require('node:fs');
const path = require('node:path');
const { esc, tag, arrow, icon, config } = require('./components.cjs');

// Order matches the group illustration, from left to right.
const members = [
  { slug: 'mohammed', name: 'Mohammed', fullName: 'Mohammed A. Redha Meftah', initials: 'MM', roles: ['Software Engineer'], focus: ['Software development', 'Problem solving', 'Application design'], bio: 'My field is software engineering. I work on turning ideas into clear, useful software. I am part of the team behind myhealth.', position: 'left' },
  { slug: 'ali', name: 'Ali', fullName: 'Ali Mohamed Jaafar Mohamed', initials: 'AM', roles: ['Backend Developer', 'Designer'], focus: ['Backend development', 'Interface design', 'User experience'], bio: 'My fields are backend development and design. I work on the logic behind an application and how it looks and feels to use. I am part of the team behind myhealth.', position: 'middle' },
  { slug: 'sayed', name: 'Sayed', fullName: 'Sayed Hussain Ali Shubbar Hasan', initials: 'SH', roles: ['Software Engineer'], focus: ['Software development', 'Problem solving', 'Application design'], bio: 'My field is software engineering. I work on turning ideas into clear, useful software. I am part of the team behind myhealth.', position: 'right' }
];
const imagePath = 'assets/team.png';
const hasImage = () => fs.existsSync(path.join(__dirname, '../dist', imagePath));
function portrait(member, large = false) {
  return `<span class="member-portrait portrait-${member.position}${large ? ' portrait-large' : ''}" aria-hidden="true">${hasImage() ? `<img src="${imagePath}" alt="" loading="${large ? 'eager' : 'lazy'}">` : `<span>${member.initials}</span>`}</span>`;
}
function cards() {
  return `<div class="profile-cards">${members.map(m => `<a class="profile-card" href="${m.slug}.html">${portrait(m)}<div><h3>${m.name}</h3><p>${m.roles.join(' &amp; ')}</p><span class="profile-link">View profile ${arrow}</span></div></a>`).join('')}</div>`;
}
function section({ supervision = false } = {}) {
  return `<section class="section team-section" id="team"><div class="wrap"><div class="team-intro"><div>${tag('The people behind myhealth')}<h2>Three people.<br>One connected vision.</h2><p class="lead">Meet the team bringing myhealth to life.</p><p>A University of Bahrain project, shaped by software engineering, backend development, and design.</p><p class="team-hint">${icon('people')} Choose a name to get to know us.</p></div><div class="team-stage${hasImage() ? '' : ' team-stage-pending'}">${hasImage() ? `<img class="team-group" src="${imagePath}" alt="Illustrated myhealth team in white coats: Mohammed on the left, Ali in the middle, and Sayed on the right." width="1448" height="1086" loading="lazy">` : `<div class="team-initials" aria-hidden="true">${members.map(m => `<span>${m.initials}</span>`).join('')}</div>`}<div class="team-hotspots">${members.map(m => `<a class="team-person team-person-${m.position}" href="${m.slug}.html" aria-label="View ${m.name}'s profile"><span class="team-name">${m.name} ${arrow}</span></a>`).join('')}</div></div></div>${cards()}${supervision ? `<div class="supervisor"><span>${icon('people')} Academic supervision</span><strong>Dr. Amal Saleh Rashid Ghanim</strong><span>University of Bahrain · 2026–2027</span></div>` : ''}</div></section>`;
}
function profile(slug) {
  const m = members.find(member => member.slug === slug);
  if (!m) throw new Error('Unknown team member');
  return `<section class="section member-profile"><div class="wrap"><a class="text-link profile-back" href="about.html#team">← Meet the team</a><div class="profile-hero"><div>${tag('The myhealth team')}<p class="profile-greeting">Hello, I'm</p><h1>${m.name}<span class="profile-full-name">${m.fullName}</span></h1><p class="profile-role"><span class="sr-only">${m.roles.join(' and ')}</span><span aria-hidden="true">I'm a <span class="typewriter" data-typewriter="${esc(JSON.stringify(m.roles))}">${m.roles[0]}</span></span></p><p class="profile-bio">${m.bio}</p><ul class="profile-skills" aria-label="Fields of interest">${m.focus.map(f => `<li>${f}</li>`).join('')}</ul><div class="button-row"><a class="button" href="mailto:${config.email}">Contact our team ${icon('mail')}</a><a class="button secondary" href="demo.html">Explore myhealth ${arrow}</a></div></div><div class="profile-art">${portrait(m, true)}<span class="profile-signature">${m.name}<small>Part of the myhealth team</small></span></div></div></div></section><section class="section soft"><div class="wrap"><div class="section-heading"><div>${tag('Together, we build')}<h2>Get to know the whole team.</h2></div><p>Three perspectives, working toward a clearer care experience.</p></div>${cards()}</div></section>`;
}
module.exports = { members, section, profile, hasImage };
