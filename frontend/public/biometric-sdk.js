/**
 * FinShield AI — Behavioral Biometric SDK v1.0
 * Collects keystroke, mouse, scroll, and gyroscope telemetry.
 * Batches events and sends to FastAPI inference endpoint every 2 seconds.
 */
(function () {
  'use strict';

  const FLUSH_INTERVAL = 2000; // 2 seconds
  const MIN_EVENTS = 20;
  const API_URL = window.__FINSHIELD_API_URL || 'http://localhost:8000';

  let sessionId = sessionStorage.getItem('finshield_session_id');
  let eventBuffer = [];
  let lastKeyDownTime = {};

  function createEvent(type, data) {
    return {
      session_id: sessionId,
      ts: new Date().toISOString(),
      event_type: type,
      ...data,
    };
  }

  // Keystroke handlers
  document.addEventListener('keydown', function (e) {
    lastKeyDownTime[e.code] = performance.now();
    eventBuffer.push(createEvent('keydown', {
      key_code: e.code,
      dwell_ms: null,
      flight_ms: null,
    }));
  });

  document.addEventListener('keyup', function (e) {
    const downTime = lastKeyDownTime[e.code];
    const dwellMs = downTime ? performance.now() - downTime : null;
    delete lastKeyDownTime[e.code];
    eventBuffer.push(createEvent('keyup', {
      key_code: e.code,
      dwell_ms: dwellMs ? Math.round(dwellMs * 100) / 100 : null,
    }));
  });

  // Mouse handlers
  let lastMouseTime = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;

  document.addEventListener('mousemove', function (e) {
    const now = performance.now();
    const dt = now - lastMouseTime;
    if (dt < 100) return; // Throttle to 100ms

    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? dist / dt : 0;

    eventBuffer.push(createEvent('mousemove', {
      mouse_x: e.clientX,
      mouse_y: e.clientY,
      mouse_speed: Math.round(speed * 1000) / 1000,
    }));

    lastMouseTime = now;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  document.addEventListener('click', function (e) {
    eventBuffer.push(createEvent('click', {
      mouse_x: e.clientX,
      mouse_y: e.clientY,
    }));
  });

  // Scroll handler
  document.addEventListener('scroll', function () {
    eventBuffer.push(createEvent('scroll', {
      scroll_delta: window.scrollY,
    }));
  }, { passive: true });

  // Gyroscope (mobile)
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function (e) {
      eventBuffer.push(createEvent('gyro', {
        gyro_alpha: e.alpha,
        gyro_beta: e.beta,
        gyro_gamma: e.gamma,
      }));
    });
  }

  // Flush buffer to API
  async function flushBuffer() {
    if (!sessionId || eventBuffer.length < MIN_EVENTS) return;

    const batch = eventBuffer.splice(0, 50);
    try {
      const res = await fetch(`${API_URL}/api/biometric/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        const data = await res.json();
        // Dispatch custom event for dashboard to pick up
        window.dispatchEvent(new CustomEvent('finshield:biometric', { detail: data }));
      }
    } catch (err) {
      // Silent fail — don't disrupt user experience
    }
  }

  // Start session
  async function initSession() {
    if (sessionId) return;
    try {
      const res = await fetch(`${API_URL}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: '0.0.0.0',
          user_agent: navigator.userAgent,
          fingerprint_id: 'fp_' + Math.random().toString(36).substr(2, 9),
          bank_id: 'bank-a',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionId = data.session_id;
        sessionStorage.setItem('finshield_session_id', sessionId);
      }
    } catch (err) {
      // Silent fail
    }
  }

  // Initialize
  initSession();
  setInterval(flushBuffer, FLUSH_INTERVAL);
})();
