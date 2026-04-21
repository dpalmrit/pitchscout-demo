/* ============================================================
   PitchScout AI — App Logic  v4.1
   FIX: intake modal no longer opens on page load
   Only opens when user clicks Select File or Try Demo
   ============================================================ */
'use strict';

// ── Session state — memory only, never sent to server ─────
const SESSION = {
  jersey:      '',
  position:    '',
  age:         '',
  foot:        '',
  match:       '',
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
// KEY FIX: openIntake() is ONLY called from user gestures.
// It is never called on DOMContentLoaded or page load.

function openIntake() {
  const overlay = document.getElementById('intakeOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
  showIntakeStep(1);
  // Small delay so the modal is visible before focus moves
  setTimeout(() => {
    const jerseyInput = document.getElementById('jerseyNumber');
    if (jerseyInput) jerseyInput.focus();
  }, 50);
  announce('Player details form opened. Step 1 of 2.');
}

function closeIntake() {
  const overlay = document.getElementById('intakeOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Return focus to the element that triggered the modal
  const demoBtn = document.getElementById('tryDemoBtn');
  if (demoBtn) demoBtn.focus();
}

function showIntakeStep(n) {
  const step1 = document.getElementById('intakeStep1');
  const step2 = document.getElementById('intakeStep2');
  const label = document.getElementById('intakeStepLabel');
  if (step1) step1.style.display = n === 1 ? 'block' : 'none';
  if (step2) step2.style.display = n === 2 ? 'block' : 'none';
  if (label) label.textContent = `Step ${n} of 2 — ${n === 1 ? 'Player details' : 'Choose footage'}`;
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

  const el = document.getElementById('intakeSummary');
  if (el) el.innerHTML =
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
    if (err) err.style.display = 'block';
    document.getElementById('jerseyNumber').focus();
    return;
  }
  if (err) err.style.display = 'none';
  showIntakeStep(2);
  announce('Step 2 of 2. Choose your footage or run the demo analysis.');
}

function collectIntakeData() {
  SESSION.jersey      = document.getElementById('jerseyNumber').value  || '7';
  SESSION.position    = document.getElementById('playerPosition').value || 'CM';
  SESSION.age         = document.getElementById('ageBracket').value    || 'U16';
  SESSION.foot        = document.getElementById('dominantFoot').value  || 'Right';
  SESSION.match       = document.getElementById('matchContext').value   || 'League';
  SESSION.playerUuid  = uuid();
  SESSION.sessionUuid = uuid();
}

function bindIntakeModal() {
  // Position selector buttons
  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      document.getElementById('playerPosition').value = btn.dataset.pos;
    });
  });

  // Step navigation
  const nextBtn   = document.getElementById('intakeNextBtn');
  const backBtn   = document.getElementById('intakeBackBtn');
  const cancelBtn = document.getElementById('intakeCancelBtn');
  if (nextBtn)   nextBtn.addEventListener('click', validateAndAdvance);
  if (backBtn)   backBtn.addEventListener('click', () => showIntakeStep(1));
  if (cancelBtn) cancelBtn.addEventListener('click', closeIntake);

  // Close on backdrop click
  const overlay = document.getElementById('intakeOverlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeIntake();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const ol = document.getElementById('intakeOverlay');
      if (ol && ol.style.display !== 'none') closeIntake();
    }
  });

  // Step 2: file browse inside modal
  const intakeSelectBtn = document.getElementById('intakeSelectBtn');
  const intakeFileInput = document.getElementById('intakeFileInput');
  if (intakeSelectBtn && intakeFileInput) {
    intakeSelectBtn.addEventListener('click', () => intakeFileInput.click());
    intakeFileInput.addEventListener('change', () => {
      if (intakeFileInput.files?.[0]) {
        collectIntakeData();
        closeIntake();
        handleFile(intakeFileInput.files[0]);
      }
    });
  }

  // Step 2: drag/drop inside modal
  const intakeDrop = document.getElementById('intakeDrop');
  if (intakeDrop) {
    intakeDrop.addEventListener('click', e => {
      if (e.target !== intakeSelectBtn && intakeFileInput) intakeFileInput.click();
    });
    intakeDrop.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === intakeDrop) {
        e.preventDefault();
        if (intakeFileInput) intakeFileInput.click();
      }
    });
    intakeDrop.addEventListener('dragover', e => { e.preventDefault(); intakeDrop.classList.add('dragover'); });
    intakeDrop.addEventListener('dragleave', () => intakeDrop.classList.remove('dragover'));
    intakeDrop.addEventListener('drop', e => {
      e.preventDefault();
      intakeDrop.classList.remove('dragover');
      const file = e.dataTransfer?.files[0];
      if (file) { collectIntakeData(); closeIntake(); handleFile(file); }
    });
  }

  // Step 2: demo button inside modal
  const intakeDemoBtn = document.getElementById('intakeDemoBtn');
  if (intakeDemoBtn) {
    intakeDemoBtn.addEventListener('click', () => {
      collectIntakeData();
      closeIntake();
      handleFile({ name: 'match_footage_demo.mp4', size: 85 * 1024 * 1024, type: 'video/mp4' });
    });
  }
}

// ── Drop zone (main page) — opens intake modal on click ───
function bindDropZone() {
  const zone    = document.getElementById('dropZone');
  const selectB = document.getElementById('selectBtn');
  const demoB   = document.getElementById('tryDemoBtn');
  if (!zone) return;

  // Zone click (not on child buttons) → open intake
  zone.addEventListener('click', e => {
    if (e.target !== selectB && e.target !== demoB) openIntake();
  });
  zone.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target === zone) {
      e.preventDefault();
      openIntake();
    }
  });

  // Select File and Try Demo buttons → open intake
  if (selectB) selectB.addEventListener('click', e => { e.stopPropagation(); openIntake(); });
  if (demoB)   demoB.addEventListener('click',   e => { e.stopPropagation(); openIntake(); });

  // Drag onto main drop zone → open intake with file queued
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file) {
      // Queue the file then open intake — file will be used after step 2
      openIntake();
      // Pre-fill intakeFileInput reference for drop flow
      const intakeDemoBtn = document.getElementById('intakeDemoBtn');
      if (intakeDemoBtn) {
        intakeDemoBtn.dataset.droppedFile = 'true';
      }
    }
  });
}

// ── File handling ─────────────────────────────────────────
function showFilePreview(file) {
  const preview = document.getElementById('filePreview');
  if (!preview) return;
  const nameEl  = document.getElementById('previewName');
  const sizeEl  = document.getElementById('previewSize');
  const typeEl  = document.getElementById('previewType');
  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = fmt(file.size);
  if (typeEl) typeEl.textContent = file.type || 'video/mp4';

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
      if (thumb) {
        thumb.style.backgroundImage = `url(${canvas.toDataURL()})`;
        thumb.classList.add('has-thumb');
      }
      URL.revokeObjectURL(url);
    });
  }
  preview.classList.add('show');
  preview.removeAttribute('aria-hidden');
}

async function handleFile(file) {
  dashInit   = false;
  dashLocked = true;

  // Hide the CTA and reset waitlist form
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

  // Hide drop zone, show preview and progress
  const zone = document.getElementById('dropZone');
  if (zone) zone.style.display = 'none';
  showFilePreview(file);

  const progress = document.getElementById('uploadProgress');
  if (progress) { progress.classList.add('show'); progress.removeAttribute('aria-hidden'); }

  PIPELINE.forEach(s => setStepState(s.id, 'pending'));
  setProgress(0, 'Starting pipeline…');

  announce(`Upload started for jersey #${SESSION.jersey}. Pipeline initiated.`);
  await runPipeline(file);
}

// ── Upload pipeline ───────────────────────────────────────
const PIPELINE = [
  { id: 'step1', label: 'Generating pre-signed URL',       pct: 8,   ms: 600  },
  { id: 'step2', label: 'Uploading via S3 Transfer Accel', pct: 72,  ms: 4000 },
  { id: 'step3', label: 'Assigning session UUID',          pct: 78,  ms: 500  },
  { id: 'step4', label: 'Triggering Lambda',               pct: 82,  ms: 600  },
  { id: 'step5', label: 'AI Vision model processing',      pct: 97,  ms: 3500 },
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
    if (etaEl && rem > 0) {
      etaEl.textContent = rem < 60
        ? Math.ceil(rem) + 's remaining'
        : Math.ceil(rem / 60) + 'm remaining';
    }
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
    { label: 'Extracting key frames…',                       pct: 82 },
    { label: `Locating player #${jersey} on pitch…`,         pct: 86 },
    { label: `Mapping scanning behaviour for #${jersey}…`,   pct: 90 },
    { label: 'Analysing first touch quality…',               pct: 93 },
    { label: 'Computing decision speed…',                    pct: 96 },
    { label: `Generating scout report for #${jersey}…`,      pct: 97 },
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

    const label = step.id === 'step5'
      ? `AI Vision scanning player #${SESSION.jersey}…`
      : step.label + '…';
    setProgress(step.pct, label);
    announce(step.label);

    if (step.id === 'step2') {
      const suEl = document.getElementById('sessionUuid');
      const puEl = document.getElementById('playerUuid');
      const skEl = document.getElementById('s3Key');
      const jrEl = document.getElementById('sessionJersey');
      if (suEl) suEl.textContent = SESSION.sessionUuid;
      if (puEl) puEl.textContent = SESSION.playerUuid;
      if (skEl) skEl.textContent = `footage/${SESSION.sessionUuid}.mp4`;
      if (jrEl) jrEl.textContent = `#${SESSION.jersey}`;
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
  announce(`Analysis complete for #${SESSION.jersey}. Your scout report is ready.`);

  const cta = document.getElementById('dashCta');
  if (cta) { cta.style.display = 'flex'; cta.removeAttribute('aria-hidden'); }

  dashLocked = false;
}

// ── Dashboard — personalised from SESSION ─────────────────
let dashInit   = false;
let dashLocked = true;

const POSITION_INSIGHTS = {
  GK:  { pos: 'Distribution accuracy: 78% long passes on target',     touch: 'Clean catches: 11/12 attempts' },
  CB:  { pos: 'Defensive line held: 14/17 duels won',                 touch: 'Clean clearances: 19/22 attempts' },
  LB:  { pos: 'Overlap runs completed: 8/10 attempts',                touch: 'Clean control: 29/33 attempts' },
  RB:  { pos: 'Overlap runs completed: 9/11 attempts',                touch: 'Clean control: 31/35 attempts' },
  CDM: { pos: 'Interceptions per 90: 4.8 (top 15%)',                  touch: 'Clean control: 36/40 attempts' },
  CM:  { pos: 'Optimal zone occupancy: 68% of possession',            touch: 'Clean control: 34/37 attempts' },
  CAM: { pos: 'Key passes into final third: 6 (match high)',           touch: 'Clean control: 33/36 attempts' },
  LW:  { pos: '1v1 duels won: 7/10 attempts',                         touch: 'Clean control: 28/31 attempts' },
  RW:  { pos: '1v1 duels won: 8/11 attempts',                         touch: 'Clean control: 30/34 attempts' },
  ST:  { pos: 'Runs in behind: 9 created (5 on target)',               touch: 'Clean control: 22/25 attempts' },
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
  const pUuid    = SESSION.playerUuid || 'a7f3e2b1-9c84-4d12-8e56-2f0a1b3c4d5e';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const vis = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = val ? '' : 'none';
    el.textContent = val;
  };

  set('pcJersey', '#' + jersey);
  vis('pcPosition', position || 'Position TBD');
  vis('pcAge',      age);
  vis('pcFoot',     foot ? foot + ' foot' : '');
  vis('pcMatch',    match);
  set('pcUuid', `player_uuid: ${pUuid}`);

  const meta = document.getElementById('dashReportMeta');
  if (meta) meta.textContent = `PitchScout Report — #${jersey} · ${match || 'Match'} analysis`;

  const gradeHero = document.getElementById('gradeHero');
  if (gradeHero) gradeHero.setAttribute('aria-label', `Overall scout grade for #${jersey}: B+`);

  const ins = POSITION_INSIGHTS[position] || POSITION_INSIGHTS['CM'];
  set('posCaption',   ins.pos);
  set('touchCaption', ins.touch);

  set('feed3', FOOT_INSIGHTS[foot] || FOOT_INSIGHTS['']);

  const feed4 = document.getElementById('feed4');
  if (feed4 && age) {
    feed4.textContent = `High-pressure scenario response: 7/9 correct decisions — notable composure for ${age} age bracket`;
  }
}

function initDashboard() {
  if (dashLocked) {
    announce('Please complete an analysis first to view the dashboard.');
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

  // Ensure both state messages are hidden on init
  if (success) { success.style.display = 'none'; success.setAttribute('hidden', ''); }
  if (error)   { error.style.display   = 'none'; error.setAttribute('hidden', ''); }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('wl-email');
    if (!email || !email.value || !email.validity.valid) { if (email) email.focus(); return; }

    if (form.action.includes('YOUR_FORM_ID')) {
      if (error) {
        error.textContent   = 'Form not configured — replace YOUR_FORM_ID with your Formspree ID.';
        error.style.display = 'flex';
        error.removeAttribute('hidden');
      }
      return;
    }

    if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }
    if (error)  { error.style.display = 'none'; error.setAttribute('hidden', ''); }

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
      if (submit) { submit.disabled = false; submit.textContent = 'Get early access'; }
      if (error) {
        error.textContent   = 'Submission failed: ' + (err.message || 'please try again.');
        error.style.display = 'flex';
        error.removeAttribute('hidden');
      }
      announce('Form submission failed. Please try again.');
    }
  });
}

// ── Boot — single DOMContentLoaded ────────────────────────
// NOTE: openIntake() is NOT called here. The modal stays hidden
// until the user explicitly clicks Select File or Try Demo.
document.addEventListener('DOMContentLoaded', () => {
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click',   () => switchView(btn.dataset.view));
    btn.addEventListener('keydown', handleTabKeydown);
  });

  // View report button
  const goToDash = document.getElementById('goToDashBtn');
  if (goToDash) goToDash.addEventListener('click', () => switchView('dashboard'));

  // Wire everything — modal starts hidden (display:none in HTML)
  bindIntakeModal();
  bindDropZone();
  bindWaitlistForm();
});
