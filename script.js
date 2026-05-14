// Theme toggle — light (white+blue) / dark (GitHub dark)
let dark = false;
function toggleTheme() {
  dark = !dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
  document.getElementById('theme-icon').className = dark ? 'ti ti-sun' : 'ti ti-moon';
}

let mode = 'single';

function setMode(m) {
  mode = m;
  document.getElementById('btn-single').classList.toggle('active', m === 'single');
  document.getElementById('btn-battle').classList.toggle('active', m === 'battle');
  document.getElementById('input2').style.display = m === 'battle' ? 'flex' : 'none';
  document.getElementById('vs-label').style.display = m === 'battle' ? 'flex' : 'none';
  document.getElementById('output').innerHTML = '';
}

function onKey(e) {
  if (e.key === 'Enter') runSearch();
}

// Utility: format ISO date to "25 Jan 2023"
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Utility: format large numbers to "1.2k"
function fmtNum(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

// Fetch user profile from GitHub API
async function fetchUser(username) {
  const response = await fetch(`https://api.github.com/users/${username}`);
  if (!response.ok) throw { status: response.status, user: username };
  return response.json();
}

// Fetch user's repositories
async function fetchRepos(reposUrl) {
  const response = await fetch(reposUrl + '?sort=updated&per_page=10');
  if (!response.ok) return [];
  return response.json();
}

// Show loading state
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

// Show error state (404 or other)
function showError(status, user) {
  return `<div class="state-box">
    <div style="font-size:32px;margin-bottom:12px"><i class="ti ti-ghost"></i></div>
    <p class="error-code">${status}</p>
    <p class="error-msg">${status === 404 ? `"${user}" not found on GitHub` : 'API error — check rate limit or try again'}</p>
  </div>`;
}

// Calculate total stars across all repos
function calcStars(repos) {
  return repos.reduce((acc, repo) => acc + (repo.stargazers_count || 0), 0);
}

// Build repos list HTML
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

// Build full profile card HTML
function buildCard(user, repos, verdict) {
  const stars = calcStars(repos);
  const verdictHTML = verdict === 'winner'
    ? `<div class="verdict win"><i class="ti ti-trophy"></i> Winner — ${fmtNum(stars)} ⭐ total stars</div>`
    : verdict === 'loser'
    ? `<div class="verdict lose"><i class="ti ti-x"></i> Loser — ${fmtNum(stars)} ⭐ total stars</div>`
    : verdict === 'tie'
    ? `<div class="verdict tie"><i class="ti ti-equal"></i> Tie — ${fmtNum(stars)} ⭐ total stars</div>`
    : '';

  return `<div class="profile-card ${verdict || ''}">
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

// Fetch one battle side — returns { ok, user, repos, error }
async function fetchBattleSide(username) {
  try {
    const user = await fetchUser(username);
    const repos = await fetchRepos(user.repos_url);
    return { ok: true, user, repos };
  } catch (e) {
    return { ok: false, status: e.status || 500, username };
  }
}

// Main search function
async function runSearch() {
  const u1 = document.getElementById('input1').value.trim();
  const u2 = document.getElementById('input2').value.trim();

  if (!u1) return document.getElementById('input1').focus();
  if (mode === 'battle' && !u2) return document.getElementById('input2').focus();

  const btn = document.getElementById('search-btn');
  btn.disabled = true;
  btn.textContent = '...';

  const out = document.getElementById('output');
  showLoading(mode === 'battle' ? [u1, u2] : [u1]);

  try {
    if (mode === 'battle') {

      // Fetch both sides independently — neither cancels the other
      const [side1, side2] = await Promise.all([
        fetchBattleSide(u1),
        fetchBattleSide(u2)
      ]);

      // Determine verdicts only if both sides loaded successfully
      let verdict1 = '';
      let verdict2 = '';

      if (side1.ok && side2.ok) {
        const stars1 = calcStars(side1.repos);
        const stars2 = calcStars(side2.repos);
        verdict1 = stars1 === stars2 ? 'tie' : stars1 > stars2 ? 'winner' : 'loser';
        verdict2 = stars1 === stars2 ? 'tie' : stars2 > stars1 ? 'winner' : 'loser';
      }

      // Render each side — profile card or 404 error independently
      const html1 = side1.ok
        ? buildCard(side1.user, side1.repos, verdict1)
        : showError(side1.status, side1.username);

      const html2 = side2.ok
        ? buildCard(side2.user, side2.repos, verdict2)
        : showError(side2.status, side2.username);

      out.innerHTML = `<div class="battle-grid">${html1}${html2}</div>`;

    } else {
      // Phase 1 & 2: Single search with endpoint chaining
      let userData, reposData;
      try {
        userData = await fetchUser(u1);                    // Phase 1: fetch profile
        reposData = await fetchRepos(userData.repos_url);  // Phase 2: chain to repos
      } catch (e) {
        out.innerHTML = showError(e.status || 500, e.user || u1);
        return;
      }
      out.innerHTML = buildCard(userData, reposData, '');
    }

  } finally {
    btn.disabled = false;
    btn.textContent = 'Investigate';
  }
}
