(function () {
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function validateEmail(value) {
    return /.+@.+\..+/.test(value);
  }

  function getToken() {
    try { return localStorage.getItem('auth_token'); } catch (_) { return null; }
  }

  function setError(inputId, message) {
    var err = document.querySelector('[data-error-for="' + inputId + '"]');
    if (err) err.textContent = message || '';
  }

  function wirePasswordToggles() {
    qsa('[data-toggle-password]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-toggle-password');
        var el = document.getElementById(targetId);
        if (!el) return;
        el.type = el.type === 'password' ? 'text' : 'password';
      });
    });
  }

  function initLogin() {
    wirePasswordToggles();
    var form = qs('#login-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = qs('#login-email');
      var password = qs('#login-password');
      var valid = true;

      setError('login-email');
      setError('login-password');

      if (!email.value || !validateEmail(email.value)) {
        setError('login-email', 'Enter a valid email address');
        valid = false;
      }
      if (!password.value || password.value.length < 8) {
        setError('login-password', 'Password must be at least 8 characters');
        valid = false;
      }

      if (!valid) return;

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value, password: password.value })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) {
            setError('login-email');
            setError('login-password', result.data && result.data.error ? result.data.error : 'Login failed');
            if (submitBtn) submitBtn.disabled = false;
            return;
          }
          try { localStorage.setItem('auth_token', result.data.token); } catch (_) {}
          window.location.href = '/home';
        })
        .catch(function () {
          setError('login-password', 'Network error. Please try again');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  function initSignup() {
    wirePasswordToggles();
    var form = qs('#signup-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = qs('#signup-name');
      var email = qs('#signup-email');
      var password = qs('#signup-password');
      var confirm = qs('#signup-confirm');
      var valid = true;

      setError('signup-name');
      setError('signup-email');
      setError('signup-password');
      setError('signup-confirm');

      if (!name.value || name.value.trim().length < 2) {
        setError('signup-name', 'Please enter your full name');
        valid = false;
      }
      if (!email.value || !validateEmail(email.value)) {
        setError('signup-email', 'Enter a valid email address');
        valid = false;
      }
      if (!password.value || password.value.length < 8) {
        setError('signup-password', 'Password must be at least 8 characters');
        valid = false;
      }
      if (confirm.value !== password.value) {
        setError('signup-confirm', 'Passwords do not match');
        valid = false;
      }

      if (!valid) return;

      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.value, email: email.value, password: password.value })
      })
        .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (result) {
          if (!result.ok) {
            var msg = (result.data && result.data.error) ? result.data.error : 'Signup failed';
            if (/already/i.test(msg)) { setError('signup-email', msg); }
            else { setError('signup-confirm', msg); }
            if (submitBtn) submitBtn.disabled = false;
            return;
          }
          // After signup, go to login
          window.location.href = './login.html';
        })
        .catch(function () {
          setError('signup-confirm', 'Network error. Please try again');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  window.AuthPages = {
    initLogin: initLogin,
    initSignup: initSignup
  };
})();

// Auto-init without inline scripts (CSP-friendly)
window.addEventListener('DOMContentLoaded', function () {
  try {
    // Redirect authenticated users away from login to home
    if (document.querySelector('#login-form') && getToken()) {
      window.location.replace('/home');
      return;
    }

    // Enforce auth on home page
    if ((location.pathname.endsWith('/home') || location.pathname.endsWith('/home.html')) && !getToken()) {
      window.location.replace('/');
      return;
    }

    if (document.querySelector('#login-form')) {
      window.AuthPages && window.AuthPages.initLogin();
    }
    if (document.querySelector('#signup-form')) {
      window.AuthPages && window.AuthPages.initSignup();
    }

    // Logout button
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        try { localStorage.removeItem('auth_token'); } catch (_) {}
        window.location.replace('/');
      });
    }
  } catch (_) {}
});


