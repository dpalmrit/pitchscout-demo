/* ============================================================
   Scout AI — App Logic  v4.0
   Intake modal + personalised dashboard + waitlist form
   All player data stays in session memory — zero PII stored
   ============================================================ */
'use strict';

// ── Session state — lives in memory only ──────────────────
const SESSION = {
  jersey:   '',
  position: '',
  age:      '',
  foot:     '',
  match:    '',
  playerUuid:  '',
  sessionUuid: '',
};

// ── Utilities ─────────────────────────────────────────────
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function announce(msg) {
  const el = document.getElementById('sr-announce');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

function fmt(bytes) {
  if (!bytes || bytes < 1024 * 1024) return ((bytes || 0) / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Navigation ────────────────────────────────────────────
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(panel => {
    const active = panel.id === 'view-' + viewId;
    panel.classList.toggle('active', active);
    panel.setAttribute('aria-hidden', String(!active));
  });
  document.querySelectorAll('.nav-tab').forEach(btn => {
    const active = btn.dataset.view === viewId;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
  const panel = document.getElementById('view-' + viewId);
  if (panel) panel.focus();
  if (viewId === 'dashboard') initDashboard();
}

function handleTabKeydown(e) {
  const tabs  = Array.from(document.querySelectorAll('.nav-tab'));
  const index = tabs.indexOf(e.currentTarget);
  const map   = {
    ArrowRight: (index + 1) % tabs.length,
    ArrowDown:  (index + 1) % tabs.length,
    ArrowLeft:  (index - 1 + tabs.length) % tabs.length,
    ArrowUp:    (index - 1 + tabs.length) % tabs.length,
    Home: 0, End: tabs.length - 1,
  };
  if (e.key in map) {
    e.preventDefault();
    const next = tabs[map[e.key]];
    next.focus();
    switchView(next.dataset.view);
  }
}

// ── Intake modal ──────────────────────────────────────────
let pendingFile = null; // file chosen before modal confirms

function openIntake(file) {
  pendingFile = file || null;
  const overlay = document.getElementById('intakeOverlay');
  overlay.style.display = 'flex';
  overlay.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
  showIntakeStep(1);
  document.getElementById('jerseyNumber').focus();
  announce('Player details form opened. Step 1 of 2.');
}

function closeIntake() {
  const overlay = document.getElementById('intakeOverlay');
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  pendingFile = null;
}

function showIntakeStep(n) {
  document.getElementById('intakeStep1').style.display = n === 1 ? 'block' : 'none';
  document.getElementById('intakeStep2').style.display = n === 2 ? 'block' : 'none';
  document.getElementById('intakeStepLabel').textContent = `Step ${n} of 2 — ${n === 1 ? 'Player details' : 'Choose footage'}`;
  if (n === 2) buildIntakeSummary();
}

function buildIntakeSummary() {
  const jersey   = document.getElementById('jerseyNumber').value || '?';
  const position = document.getElementById('playerPosition').value || 'Position TBD';
  const age      = document.getElementById('ageBracket').value || '';
  const foot     = document.getElementById('dominantFoot').value || '';
  const match    = document.getElementById('matchContext').value || '';

  const tags = [position, age, foot ? foot + ' foot' : '', match]
    .filter(Boolean)
    .map(t => `<span class="intake-summary-tag">${t}</span>`)
    .join('');

  document.getElementById('intakeSummary').innerHTML =
    `<div class="intake-summary-inner">
       <span class="intake-summary-jersey">#${jersey}</span>
       <div class="intake-summary-tags">${tags}</div>
     </div>
     <p class="intake-summary-note">Ready to analyse — choose footage or run the demo below.</p>`;
}

function validateAndAdvance() {
  const jersey = document.getElementById('jerseyNumber').value;
  const err    = document.getElementById('intakeError1');
  if (!jersey || jersey < 1 || jersey > 99) {
    err.style.display = 'block';
    document.getElementById('jerseyNumber').focus();
    return;
  }
  err.style.display = 'none';
  showIntakeStep(2);
  announce('Step 2 of 2. Choose your footage or run the demo analysis.');
}

function collectIntakeData() {
  SESSION.jersey   = document.getElementById('jerseyNumber').value  || '7';
  SESSION.position = document.getElementById('playerPosition').value || 'CM';
  SESSION.age      = document.getElementById('ageBracket').value    || 'U16';
  SESSION.foot     = document.getElementById('dominantFoot').value  || 'Right';
  SESSION.match    = document.getElementById('matchContext').value   || 'League';
  SESSION.playerUuid  = uuid();
  SESSION.sessionUuid = uuid();
}

function bindIntakeModal() {
  // Position buttons
  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('playerPosition').value = btn.dataset.pos;
      btn.setAttribute('aria-pressed', 'true');
    });
    btn.setAttribute('aria-pressed', 'false');
  });

  document.getElementById('intakeNextBtn').addEventListener('click', validateAndAdvance);
  document.getElementById('intakeBackBtn').addEventListener('click', () => showIntakeStep(1));
  document.getElementById('intakeCancelBtn').addEventListener('click', closeIntake);

  // Close on overlay backdrop click
  document.getElementById('intakeOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('intakeOverlay')) closeIntake();
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('intakeOverlay').style.display !== 'none') {
      closeIntake();
    }
  });

  // Step 2: browse files inside modal
  const intakeSelect = document.getElementById('intakeSelectBtn');
  const intakeInput  = document.getElementById('intakeFileInput');
  intakeSelect.addEventListener('click', () => intakeInput.click());
  intakeInput.addEventListener('change', () => {
    if (intakeInput.files?.[0]) {
      collectIntakeData();
      closeIntake();
      handleFile(intakeInput.files[0]);
    }
  });

  // Step 2: drag/drop inside modal
  const intakeDrop = document.getElementById('intakeDrop');
  intakeDrop.addEventListener('click', e => { if (e.target !== intakeSelect) intakeInput.click(); });
  intakeDrop.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === intakeDrop) { e.preventDefault(); intakeInput.click(); }
  });
  intakeDrop.addEventListener('dragover', e => { e.preventDefault(); intakeDrop.classList.add('dragover'); });
  intakeDrop.addEventListener('dragleave', () => intakeDrop.classList.remove('dragover'));
  intakeDrop.addEventListener('drop', e => {
    e.preventDefault();
    intakeDrop.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) { collectIntakeData(); closeIntake(); handleFile(file); }
  });

  // Step 2: demo button inside modal
  document.getElementById('intakeDemoBtn').addEventListener('click', () => {
    collectIntakeData();
    closeIntake();
    handleFile({ name: 'match_footage_demo.mp4', size: 85 * 1024 * 1024, type: 'video/mp4' });
  });
}

// ── Drop zone (main page) — opens intake modal ─────────────
function bindDropZone() {
  const zone    = document.getElementById('dropZone');
  const input   = document.getElementById('fileInput');
  const selectB = document.getElementById('selectBtn');
  const demoB   = document.getElementById('tryDemoBtn');
  if (!zone) return;

  zone.addEventListener('click', e => {
    if (e.target !== selectB && e.target !== demoB) openIntake(null);
  });
  zone.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === zone) { e.preventDefault(); openIntake(null); }
  });

  selectB.addEventListener('click', e => { e.stopPropagation(); openIntake(null); });
  demoB.addEventListener('click',   e => { e.stopPropagation(); openIntake('demo'); });

  // Legacy file input (used by intake modal internally)
  input.addEventListener('change', () => {
    if (input.files?.[0]) { collectIntakeData(); closeIntake(); handleFile(input.files[0]); }
  });

  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) openIntake(file);
  });
}

// ── File handling ─────────────────────────────────────────
function showFilePreview(file) {
  const preview = document.getElementById('filePreview');
  if (!preview) return;
  document.getElementById('previewName').textContent = file.name;
  document.getElementById('previewSize').textContent = fmt(file.size);
  document.getElementById('previewType').textContent = file.type || 'video/mp4';

  if (file.type && file.type.startsWith('video/') && file.size) {
    const url   = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url; video.muted = true; video.playsInline = true;
    video.addEventListener('loadeddata', () => { video.currentTime = 1; });
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160; canvas.height = 90;
      canvas.getContext('2d').drawImage(video, 0, 0, 160, 90);
      const thumb = document.getElementById('previewThumb');
      if (thumb) { thumb.style.backgroundImage = `url(${canvas.toDataURL()})`; thumb.classList.add('has-thumb'); }
      URL.revokeObjectURL(url);
    });
  }
  preview.classList.add('show');
  preview.removeAttribute('aria-hidden');
}

async function handleFile(file) {
  // Reset state
  dashInit   = false;
  dashLocked = true;

  const cta = document.getElementById('dashCta');
  if (cta) { cta.style.display = 'none'; cta.setAttribute('aria-hidden', 'true'); }

  const wlForm    = document.getElementById('waitlistForm');
  const wlSuccess = document.getElementById('wlSuccess');
  const wlError   = document.getElementById('wlError');
  const wlSubmit  = document.getElementById('wlSubmit');
  if (wlForm)    { wlForm.style.display = ''; wlForm.reset(); }
  if (wlSuccess) { wlSuccess.style.display = 'none'; wlSuccess.setAttribute('hidden', ''); }
  if (wlError)   { wlError.style.display   = 'none'; wlError.setAttribute('hidden', ''); }
  if (wlSubmit)  { wlSubmit.disabled = false; wlSubmit.textContent = 'Get early access'; }

  const zone = document.getElementById('dropZone');
  if (zone) zone.style.display = 'none';
  showFilePreview(file);

  const progress = document.getElementById('uploadProgress');
  if (progress) { progress.classList.add('show'); progress.removeAttribute('aria-hidden'); }

  PIPELINE.forEach(s => setStepState(s.id, 'pending'));
  setProgress(0, 'Starting pipeline…');

  announce(`Upload started for jersey #${SESSION.jersey}. Processing pipeline initiated.`);
  await runPipeline(file);
}

// ── Upload pipeline ───────────────────────────────────────
const PIPELINE = [
  { id: 'step1', label: 'Generating pre-signed URL',       pct: 8,   ms: 600  },
  { id: 'step2', label: 'Uploading via S3 Transfer Accel', pct: 72,  ms: 4000 },
  { id: 'step3', label: 'Assigning session UUID',          pct: 78,  ms: 500  },
  { id: 'step4', label: 'Triggering Lambda',               pct: 82,  ms: 600  },
  { id: 'step5', label: `AI Vision scanning player…`,      pct: 97,  ms: 3500 },
  { id: 'step6', label: 'SNS notification sent',           pct: 100, ms: 500  },
];

function setStepState(id, state) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('active', state === 'active');
  el.classList.toggle('done',   state === 'done');
  el.setAttribute('aria-label', `${el.textContent.split(':')[0].trim()}: ${state}`);
}

function setProgress(pct, label) {
  const fill  = document.getElementById('progressFill');
  const bar   = document.getElementById('progressBar');
  const pctEl = document.getElementById('progressPct');
  const lblEl = document.getElementById('progressLabel');
  if (fill)  fill.style.width = pct + '%';
  if (bar)   bar.setAttribute('aria-valuenow', String(Math.round(pct)));
  if (pctEl) pctEl.textContent = Math.round(pct) + '%';
  if (label && lblEl) lblEl.textContent = label;
}

async function simulateUpload(totalBytes) {
  const speedEl = document.getElementById('uploadSpeed');
  const etaEl   = document.getElementById('uploadEta');
  const dur = 3800, intv = 80, steps = dur / intv;
  let elapsed = 0;
  for (let s = 0; s <= steps; s++) {
    await sleep(intv);
    elapsed += intv;
    const eased    = 1 - Math.pow(1 - elapsed / dur, 2);
    const done     = Math.round(totalBytes * eased);
    const pct      = 8 + 64 * eased;
    const speedBps = done / (elapsed / 1000);
    const rem      = (totalBytes - done) / speedBps;
    setProgress(pct, `Uploading… ${fmt(done)} of ${fmt(totalBytes)}`);
    if (speedEl) speedEl.textContent = fmt(speedBps) + '/s';
    if (etaEl && rem > 0) etaEl.textContent = rem < 60 ? Math.ceil(rem) + 's remaining' : Math.ceil(rem / 60) + 'm remaining';
  }
  if (speedEl) speedEl.textContent = '';
  if (etaEl)   etaEl.textContent   = '✓ uploaded';
}

async function simulateAiAnalysis() {
  const framesEl = document.getElementById('aiFrames');
  const aiLabel  = document.getElementById('aiAnalysisLabel');
  if (!framesEl) return;
  framesEl.style.display = 'flex';

  const jersey = SESSION.jersey || '7';
  const stages = [
    { label: `Extracting key frames…`,                    pct: 82 },
    { label: `Locating player #${jersey} on pitch…`,      pct: 86 },
    { label: `Mapping scanning behaviour for #${jersey}…`,pct: 90 },
    { label: `Analysing first touch quality…`,            pct: 93 },
    { label: `Computing decision speed…`,                 pct: 96 },
    { label: `Generating scout report for #${jersey}…`,   pct: 97 },
  ];

  for (const stage of stages) {
    setProgress(stage.pct, stage.label);
    if (aiLabel) aiLabel.textContent = stage.label;
    announce(stage.label);
    for (let f = 0; f < 4; f++) {
      framesEl.querySelectorAll('.ai-frame').forEach((d, i) => d.classList.toggle('scanning', i === f));
      await sleep(140);
    }
    await sleep(300);
  }
  framesEl.style.display = 'none';
}

async function runPipeline(file) {
  const sessionEl = document.getElementById('sessionInfo');

  for (let i = 0; i < PIPELINE.length; i++) {
    const step = PIPELINE[i];
    if (i > 0) setStepState(PIPELINE[i - 1].id, 'done');
    setStepState(step.id, 'active');

    // Personalise the AI step label with jersey number
    const label = step.id === 'step5'
      ? `AI Vision scanning player #${SESSION.jersey}…`
      : step.label + '…';
    setProgress(step.pct, label);
    announce(step.label);

    if (step.id === 'step2') {
      document.getElementById('sessionUuid').textContent = SESSION.sessionUuid;
      document.getElementById('playerUuid').textContent  = SESSION.playerUuid;
      document.getElementById('s3Key').textContent       = `footage/${SESSION.sessionUuid}.mp4`;
      const jerseyEl = document.getElementById('sessionJersey');
      if (jerseyEl) jerseyEl.textContent = `#${SESSION.jersey}`;
      if (sessionEl) { sessionEl.classList.add('show'); sessionEl.removeAttribute('aria-hidden'); }
      await simulateUpload(file.size || 85 * 1024 * 1024);
    } else if (step.id === 'step5') {
      await simulateAiAnalysis();
    } else {
      await sleep(step.ms);
    }
  }

  setStepState(PIPELINE[PIPELINE.length - 1].id, 'done');
  setProgress(100, 'Analysis complete');

  const statusEl = document.getElementById('statusVal');
  if (statusEl) { statusEl.textContent = '✓ complete'; statusEl.style.color = 'var(--accent)'; }
  announce(`Analysis complete for #${SESSION.jersey}. Scout report is ready.`);

  const cta = document.getElementById('dashCta');
  if (cta) { cta.style.display = 'flex'; cta.removeAttribute('aria-hidden'); }

  dashLocked = false;
}

// ── Dashboard — personalised ───────────────────────────────
let dashInit   = false;
let dashLocked = true;

// Position-specific insight overrides
const POSITION_INSIGHTS = {
  GK:  { pos: 'Distribution accuracy: 78% long passes on target', touch: 'Clean catches: 11/12 attempts' },
  CB:  { pos: 'Defensive line held: 14/17 duels won', touch: 'Clean clearances: 19/22 attempts' },
  LB:  { pos: 'Overlap runs completed: 8/10 attempts', touch: 'Clean control: 29/33 attempts' },
  RB:  { pos: 'Overlap runs completed: 9/11 attempts', touch: 'Clean control: 31/35 attempts' },
  CDM: { pos: 'Interceptions per 90: 4.8 (top 15%)', touch: 'Clean control: 36/40 attempts' },
  CM:  { pos: 'Optimal zone occupancy: 68% of possession', touch: 'Clean control: 34/37 attempts' },
  CAM: { pos: 'Key passes into final third: 6 (match high)', touch: 'Clean control: 33/36 attempts' },
  LW:  { pos: '1v1 duels won: 7/10 attempts', touch: 'Clean control: 28/31 attempts' },
  RW:  { pos: '1v1 duels won: 8/11 attempts', touch: 'Clean control: 30/34 attempts' },
  ST:  { pos: 'Runs in behind: 9 created (5 on target)', touch: 'Clean control: 22/25 attempts' },
};

const FOOT_INSIGHTS = {
  Left:  'Right-foot distribution below left-foot baseline by 22% — recommend targeted training focus',
  Right: 'Left-foot distribution below right-foot baseline by 22% — recommend targeted training focus',
  Both:  'Excellent two-footedness — 94% balance ratio between dominant and weaker foot',
  '':    'Left-foot distribution below right-foot baseline by 22% — recommend targeted training focus',
};

function populateDashboard() {
  const jersey   = SESSION.jersey   || '7';
  const position = SESSION.position || 'CM';
  const age      = SESSION.age      || 'U16';
  const foot     = SESSION.foot     || 'Right';
  const match    = SESSION.match    || 'League';

  // Player context card
  const pcJersey = document.getElementById('pcJersey');
  if (pcJersey) pcJersey.textContent = '#' + jersey;

  const pcPosition = document.getElementById('pcPosition');
  if (pcPosition) pcPosition.textContent = position || 'Position TBD';

  const pcAge = document.getElementById('pcAge');
  if (pcAge) pcAge.style.display = age ? '' : 'none';
  if (pcAge && age) pcAge.textContent = age;

  const pcFoot = document.getElementById('pcFoot');
  if (pcFoot) pcFoot.style.display = foot ? '' : 'none';
  if (pcFoot && foot) pcFoot.textContent = foot + ' foot';

  const pcMatch = document.getElementById('pcMatch');
  if (pcMatch) pcMatch.style.display = match ? '' : 'none';
  if (pcMatch && match) pcMatch.textContent = match;

  const pcUuid = document.getElementById('pcUuid');
  if (pcUuid) pcUuid.textContent = `player_uuid: ${SESSION.playerUuid || 'a7f3e2b1-9c84-4d12-8e56-2f0a1b3c4d5e'}`;

  // Report meta
  const meta = document.getElementById('dashReportMeta');
  if (meta) meta.textContent = `AI Scout Report — #${jersey} · ${match || 'Match'} analysis`;

  // Grade hero
  const gradeHero = document.getElementById('gradeHero');
  if (gradeHero) gradeHero.setAttribute('aria-label', `Overall scout grade for #${jersey}: B+`);

  // Position-specific captions
  const ins = POSITION_INSIGHTS[position] || POSITION_INSIGHTS['CM'];
  const posCaption = document.getElementById('posCaption');
  if (posCaption) posCaption.textContent = ins.pos;
  const touchCaption = document.getElementById('touchCaption');
  if (touchCaption) touchCaption.textContent = ins.touch;

  // Foot-specific observation
  const feed3 = document.getElementById('feed3');
  if (feed3) feed3.textContent = FOOT_INSIGHTS[foot] || FOOT_INSIGHTS[''];

  // Feed item 4 — age-bracket context
  const feed4 = document.getElementById('feed4');
  if (feed4 && age) {
    feed4.textContent = `High-pressure scenario response: 7/9 correct decisions — notable composure for ${age} age bracket`;
  }
}

function initDashboard() {
  if (dashLocked) {
    announce('Please complete an upload first to view the analysis dashboard.');
    return;
  }
  if (dashInit) return;
  dashInit = true;

  populateDashboard();

  setTimeout(() => {
    [{ id: 'bar1', pct: 87 }, { id: 'bar2', pct: 79 },
     { id: 'bar3', pct: 91 }, { id: 'bar4', pct: 67 }].forEach(b => {
      const el = document.getElementById(b.id);
      if (el) el.style.width = b.pct + '%';
    });
  }, 120);

  const tl = document.getElementById('scanTimeline');
  if (tl && !tl.children.length) {
    const data = [3,5,4,8,6,9,7,5,8,10,9,7,6,8,9,10,8,7,9,8,6,5,7,8,9,10,9,8,7,6,8,9,7,8,9,10,8,7,6,8,9,10];
    const max  = Math.max(...data);
    data.forEach((v, idx) => {
      const bar = document.createElement('div');
      bar.className        = 'scan-bar';
      bar.style.height     = Math.round(v / max * 100) + '%';
      bar.style.background = v > 7 ? 'var(--accent)' : v > 5 ? '#61dafb' : 'var(--muted)';
      bar.setAttribute('title', `Interval ${idx + 1}: ${v} scans`);
      tl.appendChild(bar);
    });
  }

  document.querySelectorAll('.feed-item').forEach((item, i) => {
    item.style.opacity   = '0';
    item.style.transform = 'translateY(8px)';
    setTimeout(() => {
      item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      item.style.opacity    = '1';
      item.style.transform  = 'translateY(0)';
    }, 200 + i * 180);
  });
}

// ── Waitlist form ─────────────────────────────────────────
function bindWaitlistForm() {
  const form    = document.getElementById('waitlistForm');
  const submit  = document.getElementById('wlSubmit');
  const success = document.getElementById('wlSuccess');
  const error   = document.getElementById('wlError');
  if (!form) return;

  if (success) { success.style.display = 'none'; success.setAttribute('hidden', ''); }
  if (error)   { error.style.display   = 'none'; error.setAttribute('hidden', ''); }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('wl-email');
    if (!email || !email.value || !email.validity.valid) { if (email) email.focus(); return; }

    if (form.action.includes('YOUR_FORM_ID')) {
      if (error) {
        error.textContent   = 'Form not configured — replace YOUR_FORM_ID in index.html with your Formspree ID.';
        error.style.display = 'flex';
        error.removeAttribute('hidden');
      }
      return;
    }

    submit.disabled    = true;
    submit.textContent = 'Sending…';
    if (error) { error.style.display = 'none'; error.setAttribute('hidden', ''); }

    try {
      const res = await fetch(form.action, {
        method:  'POST',
        headers: { 'Accept': 'application/json' },
        body:    new FormData(form),
      });
      if (res.ok) {
        form.style.display = 'none';
        if (success) { success.style.display = 'flex'; success.removeAttribute('hidden'); }
        announce('You\'re on the waitlist. We\'ll be in touch before the fall season.');
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server error ' + res.status);
      }
    } catch (err) {
      submit.disabled    = false;
      submit.textContent = 'Get early access';
      if (error) {
        error.textContent   = 'Submission failed: ' + (err.message || 'please try again.');
        error.style.display = 'flex';
        error.removeAttribute('hidden');
      }
      announce('Form submission failed. Please try again.');
    }
  });
}

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click',   () => switchView(btn.dataset.view));
    btn.addEventListener('keydown', handleTabKeydown);
  });

  const goToDash = document.getElementById('goToDashBtn');
  if (goToDash) goToDash.addEventListener('click', () => switchView('dashboard'));

  bindIntakeModal();
  bindDropZone();
  bindWaitlistForm();
});
