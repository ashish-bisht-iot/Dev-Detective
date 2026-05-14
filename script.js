// Theme toggle — light (white+blue) / dark (GitHub dark)
let dark = false;
function toggleTheme() {
  dark = !dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
  document.getElementById('theme-icon').className = dark ? 'ti ti-sun' : 'ti ti-moon';
  localStorage.setItem('dd_theme', dark ? 'dark' : 'light');
}

let mode = 'single';

function setMode(m) {
  mode = m;
  document.getElementById('btn-single').classList.toggle('active', m === 'single');
  document.getElementById('btn-battle').classList.toggle('active', m === 'battle');
  document.getElementById('input2').style.display = m === 'battle' ? 'flex' : 'none';
  document.getElementById('vs-label').style.display = m === 'battle' ? 'flex' : 'none';
  document.getElementById('output').innerHTML = '';
  localStorage.setItem('dd_mode', m);
  closeAllDropdowns();
}

function onKey(e) {
  if (e.key === 'Enter') runSearch();
  if (e.key === 'Escape') closeAllDropdowns();
}

// ── Search History ────────────────────────────────────────────
const MAX_HISTORY = 8;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('dd_history') || '[]');
  } catch { return []; }
}

function addToHistory(username) {
  if (!username) return;
  let history = getHistory();
  history = history.filter(u => u.toLowerCase() !== username.toLowerCase());
  history.unshift(username);
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem('dd_history', JSON.stringify(history));
}

// FIX: permanently removes from localStorage so it won't come back on refresh
function removeFromHistory(username) {
  let history = getHistory().filter(u => u.toLowerCase() !== username.toLowerCase());
  localStorage.setItem('dd_history', JSON.stringify(history));
}

// ── Dropdown UI ───────────────────────────────────────────────
function showDropdown(inputEl) {
  const history = getHistory();
  const query = inputEl.value.trim().toLowerCase();
  const filtered = query
    ? history.filter(u => u.toLowerCase().includes(query))
    : history;

  if (!filtered.length) {
    closeDropdown(inputEl);
    return;
  }

  closeDropdown(inputEl);

  const dropdown = document.createElement('div');
  dropdown.className = 'suggestions-dropdown';
  dropdown.id = 'dd_' + inputEl.id;

  filtered.forEach(username => {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.innerHTML = `
      <span class="suggestion-icon"><i class="ti ti-history"></i></span>
      <span class="suggestion-name">${username}</span>
      <button class="suggestion-remove" title="Remove">
        <i class="ti ti-x"></i>
      </button>`;

    // Click on suggestion name — fill input
    item.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.suggestion-remove')) {
        inputEl.value = username;
        closeAllDropdowns();
        inputEl.focus();
      }
    });

    // Click X — remove from history permanently and refresh dropdown
    item.querySelector('.suggestion-remove').addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      removeFromHistory(username);         // save to localStorage immediately
      showDropdown(inputEl);               // re-render dropdown without that item
    });

    dropdown.appendChild(item);
  });

  inputEl.parentNode.style.position = 'relative';
  inputEl.insertAdjacentElement('afterend', dropdown);
}

function closeDropdown(inputEl) {
  const existing = document.getElementById('dd_' + inputEl.id);
  if (existing) existing.remove();
}

function closeAllDropdowns() {
  document.querySelectorAll('.suggestions-dropdown').forEach(d => d.remove());
}

function attachSuggestionEvents() {
  ['input1', 'input2'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('focus', () => showDropdown(el));
    el.addEventListener('input', () => showDropdown(el));
    el.addEventListener('blur', () => {
      setTimeout(() => closeDropdown(el), 150);
    });
  });
}

// ── Close card function ───────────────────────────────────────
function closeCard() {
  // Clear output and reset inputs
  document.getElementById('output').innerHTML = `
    <div class="state-box">
      <div style="font-size:32px;margin-bottom:12px"><i class="ti ti-fingerprint"></i></div>
      <p class="empty-txt">Enter a GitHub username to begin</p>
      <p class="empty-sub">Fetching profile, repos &amp; stats in real-time</p>
    </div>`;
  document.getElementById('input1').value = '';
  document.getElementById('input2').value = '';
  // Clear saved result so it doesn't restore on refresh
  localStorage.removeItem('dd_last');
}

// ── Utility ───────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtNum(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

// ── API ───────────────────────────────────────────────────────
async function fetchUser(username) {
  const response = await fetch(`https://api.github.com/users/${username}`);
  if (!response.ok) throw { status: response.status, user: username };
  return response.json();
}

async function fetchRepos(reposUrl) {
  const response = await fetch(reposUrl + '?sort=updated&per_page=10');
  if (!response.ok) return [];
  return response.json();
}

async function fetchBattleSide(username) {
  try {
    const user = await fetchUser(username);
    const repos = await fetchRepos(user.repos_url);
    return { ok: true, user, repos };
  } catch (e) {
    return { ok: false, status: e.status || 500, username };
  }
}

// ── Loading / Error ───────────────────────────────────────────
function showLoading(users) {
  const out = document.getElementById('output');
  if (mode === 'battle') {
    out.innerHTML = `<div class="battle-grid">
      ${users.map(u => `<div class="state-box"><div class="spinner"></div><p class="loading-txt">fetching ${u}...</p></div>`).join('')}
    </div>`;
  } else {
    out.innerHTML = `<div class="state-box"><div class="spinner"></div><p class="loading-txt">investigating ${users[0]}...</p></div>`;
  }
}

function showError(status, user) {
  return `<div class="state-box">
    <div style="font-size:32px;margin-bottom:12px"><i class="ti ti-ghost"></i></div>
    <p class="error-code">${status}</p>
    <p class="error-msg">${status === 404 ? `"${user}" not found on GitHub` : 'API error — check rate limit or try again'}</p>
  </div>`;
}

// ── Card Builders ─────────────────────────────────────────────
function calcStars(repos) {
  return repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);
}

function repoListHTML(repos) {
  const top5 = repos.slice(0, 5);
  if (!top5.length) return '<p style="font-size:12px;color:var(--text3);font-family:var(--mono)">No public repositories yet.</p>';
  return top5.map(r => `
    <div class="repo-item">
      <div class="repo-name">
        <a href="${r.html_url}" target="_blank" rel="noopener">${r.name}</a>
        <span class="repo-desc">${r.description || ''}</span>
      </div>
      ${r.language ? `<span class="repo-lang">${r.language}</span>` : ''}
      <span class="repo-stars"><i class="ti ti-star" style="font-size:13px"></i>${fmtNum(r.stargazers_count)}</span>
      <span class="repo-date">${fmtDate(r.updated_at)}</span>
    </div>`).join('');
}

function buildCard(user, repos, verdict) {
  const stars = calcStars(repos);
  const verdictHTML = verdict === 'winner'
    ? `<div class="verdict win"><i class="ti ti-trophy"></i> Winner — ${fmtNum(stars)} ⭐ total stars</div>`
    : verdict === 'loser'
    ? `<div class="verdict lose"><i class="ti ti-x"></i> Loser — ${fmtNum(stars)} ⭐ total stars</div>`
    : verdict === 'tie'
    ? `<div class="verdict tie"><i class="ti ti-equal"></i> Tie — ${fmtNum(stars)} ⭐ total stars</div>`
    : '';

  // Close button only shown in single mode (not battle)
  const closeBtn = verdict === ''
    ? `<button class="card-close-btn" onclick="closeCard()" title="Close"><i class="ti ti-x"></i></button>`
    : '';

  return `<div class="profile-card ${verdict || ''}">
    ${closeBtn}
    <div class="card-header">
      <img class="avatar" src="${user.avatar_url}" alt="${user.login} avatar"/>
      <div class="user-info">
        <div class="user-name">${user.name || user.login}</div>
        <div class="user-login">@${user.login}</div>
        ${user.bio ? `<div class="user-bio">${user.bio}</div>` : ''}
      </div>
    </div>
    <div class="card-stats">
      <div class="stat"><div class="stat-val">${fmtNum(user.public_repos)}</div><div class="stat-lbl">Repos</div></div>
      <div class="stat"><div class="stat-val">${fmtNum(user.followers)}</div><div class="stat-lbl">Followers</div></div>
      <div class="stat"><div class="stat-val">${fmtNum(stars)}</div><div class="stat-lbl">Total ⭐</div></div>
    </div>
    <div class="card-meta">
      <span class="meta-item"><i class="ti ti-calendar" style="font-size:13px"></i>Joined ${fmtDate(user.created_at)}</span>
      ${user.location ? `<span class="meta-item"><i class="ti ti-map-pin" style="font-size:13px"></i>${user.location}</span>` : ''}
      ${user.blog ? `<span class="meta-item"><i class="ti ti-link" style="font-size:13px"></i><a href="${user.blog.startsWith('http') ? user.blog : 'https://' + user.blog}" target="_blank" rel="noopener">portfolio</a></span>` : ''}
      ${user.twitter_username ? `<span class="meta-item"><i class="ti ti-brand-twitter" style="font-size:13px"></i>@${user.twitter_username}</span>` : ''}
    </div>
    ${verdictHTML}
    <div class="repos-section">
      <div class="repos-title"><i class="ti ti-git-branch" style="font-size:14px"></i>Top 5 repos <span style="font-weight:400;color:var(--text3);font-size:10px;font-family:var(--mono)">by last updated</span></div>
      ${repoListHTML(repos)}
    </div>
  </div>`;
}

// ── Storage ───────────────────────────────────────────────────
function saveToStorage(data) {
  localStorage.setItem('dd_last', JSON.stringify(data));
}

function restoreFromStorage() {
  const savedTheme = localStorage.getItem('dd_theme');
  if (savedTheme === 'dark') {
    dark = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('theme-icon').className = 'ti ti-sun';
  }

  const savedMode = localStorage.getItem('dd_mode');
  if (savedMode === 'battle') {
    mode = 'battle';
    document.getElementById('btn-single').classList.remove('active');
    document.getElementById('btn-battle').classList.add('active');
    document.getElementById('input2').style.display = 'flex';
    document.getElementById('vs-label').style.display = 'flex';
  }

  const saved = localStorage.getItem('dd_last');
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    document.getElementById('input1').value = data.u1 || '';
    if (data.u2) document.getElementById('input2').value = data.u2;

    if (data.mode === 'battle' && data.sides) {
      let verdict1 = '', verdict2 = '';
      if (data.sides[0].ok && data.sides[1].ok) {
        const stars1 = calcStars(data.sides[0].repos);
        const stars2 = calcStars(data.sides[1].repos);
        verdict1 = stars1 === stars2 ? 'tie' : stars1 > stars2 ? 'winner' : 'loser';
        verdict2 = stars1 === stars2 ? 'tie' : stars2 > stars1 ? 'winner' : 'loser';
      }
      const html1 = data.sides[0].ok
        ? buildCard(data.sides[0].user, data.sides[0].repos, verdict1)
        : showError(data.sides[0].status, data.sides[0].username);
      const html2 = data.sides[1].ok
        ? buildCard(data.sides[1].user, data.sides[1].repos, verdict2)
        : showError(data.sides[1].status, data.sides[1].username);
      document.getElementById('output').innerHTML = `<div class="battle-grid">${html1}${html2}</div>`;

    } else if (data.mode === 'single' && data.userData) {
      document.getElementById('output').innerHTML = buildCard(data.userData, data.reposData, '');
    }
  } catch (e) {
    localStorage.removeItem('dd_last');
  }
}

// ── Main Search ───────────────────────────────────────────────
async function runSearch() {
  const u1 = document.getElementById('input1').value.trim();
  const u2 = document.getElementById('input2').value.trim();

  if (!u1) return document.getElementById('input1').focus();
  if (mode === 'battle' && !u2) return document.getElementById('input2').focus();

  closeAllDropdowns();

  const btn = document.getElementById('search-btn');
  btn.disabled = true;
  btn.textContent = '...';

  const out = document.getElementById('output');
  showLoading(mode === 'battle' ? [u1, u2] : [u1]);

  try {
    if (mode === 'battle') {
      const [side1, side2] = await Promise.all([
        fetchBattleSide(u1),
        fetchBattleSide(u2)
      ]);

      if (side1.ok) addToHistory(u1);
      if (side2.ok) addToHistory(u2);

      let verdict1 = '', verdict2 = '';
      if (side1.ok && side2.ok) {
        const stars1 = calcStars(side1.repos);
        const stars2 = calcStars(side2.repos);
        verdict1 = stars1 === stars2 ? 'tie' : stars1 > stars2 ? 'winner' : 'loser';
        verdict2 = stars1 === stars2 ? 'tie' : stars2 > stars1 ? 'winner' : 'loser';
      }

      const html1 = side1.ok
        ? buildCard(side1.user, side1.repos, verdict1)
        : showError(side1.status, side1.username);
      const html2 = side2.ok
        ? buildCard(side2.user, side2.repos, verdict2)
        : showError(side2.status, side2.username);

      out.innerHTML = `<div class="battle-grid">${html1}${html2}</div>`;
      saveToStorage({ mode: 'battle', u1, u2, sides: [side1, side2] });

    } else {
      let userData, reposData;
      try {
        userData = await fetchUser(u1);
        reposData = await fetchRepos(userData.repos_url);
      } catch (e) {
        out.innerHTML = showError(e.status || 500, e.user || u1);
        return;
      }
      addToHistory(u1);
      out.innerHTML = buildCard(userData, reposData, '');
      saveToStorage({ mode: 'single', u1, userData, reposData });
    }

  } finally {
    btn.disabled = false;
    btn.textContent = 'Investigate';
  }
}

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  restoreFromStorage();
  attachSuggestionEvents();
});
