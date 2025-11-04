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
    if (err) {
      err.textContent = message || '';
      // Add visual feedback to the input field
      var input = document.getElementById(inputId);
      if (input) {
        if (message) {
          input.style.borderColor = '#ef4444';
          input.style.borderWidth = '2px';
          input.classList.add('error-state');
        } else {
          input.style.borderColor = '';
          input.style.borderWidth = '';
          input.classList.remove('error-state');
        }
      }
    }
  }

  function showSuccessMessage(message) {
    // Remove any existing success message
    var existing = document.getElementById('success-toast');
    if (existing) {
      existing.remove();
    }

    // Create success toast element
    var toast = document.createElement('div');
    toast.id = 'success-toast';
    toast.className = 'success-toast';
    toast.innerHTML = '<span class="success-icon">✅</span><span class="success-text">' + message + '</span>';
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(function() {
      toast.classList.add('show');
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
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

  function clearErrorsOnInput() {
    // Clear errors when user starts typing
    var inputs = qsa('#login-form input, #signup-form input');
    inputs.forEach(function(input) {
      input.addEventListener('input', function() {
        var inputId = input.id;
        if (inputId) {
          setError(inputId, '');
        }
      });
    });
  }

  function initLogin() {
    wirePasswordToggles();
    clearErrorsOnInput();
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
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          }).catch(function (parseErr) {
            console.error('JSON parse error:', parseErr);
            return { ok: false, status: res.status, data: { error: 'Invalid server response' } };
          });
        })
        .then(function (result) {
          if (!result || !result.ok) {
            var errorMsg = (result && result.data && result.data.error) ? result.data.error : 'Login failed. Please check your credentials.';
            // Clear errors first
            setError('login-email');
            setError('login-password');
            // Show error message
            setError('login-password', errorMsg);
            if (submitBtn) submitBtn.disabled = false;
            return;
          }
          
          // Save token and redirect to home page on successful login
          var token = result.data && result.data.token;
          if (token) {
            try {
              // Step 1: Save token to localStorage first
              localStorage.setItem('auth_token', token);
              
              // Step 2: Verify token was saved (wait a bit for localStorage to sync)
              setTimeout(function() {
                var savedToken = localStorage.getItem('auth_token');
                if (!savedToken || savedToken !== token) {
                  console.error('Token verification failed');
                  setError('login-password', 'Failed to save session. Please try again.');
                  if (submitBtn) submitBtn.disabled = false;
                  return;
                }
                
                // Step 3: Show success message (non-blocking)
                try {
                  var userName = result.data.user && result.data.user.name ? result.data.user.name : 'User';
                  showSuccessMessage('Login successful! Welcome back, ' + userName + '!');
                } catch (msgErr) {
                  console.warn('Could not show success message:', msgErr);
                  // Continue with redirect even if message fails
                }
                
                // Step 4: Redirect to home.html after delay (1-1.5s as requested)
                setTimeout(function() {
                  console.log('Token saved:', !!localStorage.getItem('auth_token'));
                  console.log('Redirecting to /home.html...');
                  // Use window.location.href to redirect to home.html
                  window.location.href = '/home.html';
                }, 1000); // 1 second delay as requested
              }, 100); // Small delay to ensure localStorage is synced
            } catch (err) {
              console.error('Failed to save token:', err);
              setError('login-password', 'Failed to save session. Please try again.');
              if (submitBtn) submitBtn.disabled = false;
            }
          } else {
            console.error('Login response missing token. Response:', result);
            setError('login-password', 'Server response missing authentication token. Please try again.');
            if (submitBtn) submitBtn.disabled = false;
          }
        })
        .catch(function (err) {
          console.error('Login request failed:', err);
          setError('login-password', 'Network error. Please check your connection and try again.');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  function initSignup() {
    wirePasswordToggles();
    clearErrorsOnInput();
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
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          }).catch(function (parseErr) {
            console.error('JSON parse error:', parseErr);
            return { ok: false, status: res.status, data: { error: 'Invalid server response' } };
          });
        })
        .then(function (result) {
          if (!result || !result.ok) {
            var errorMsg = (result && result.data && result.data.error) ? result.data.error : 'Signup failed. Please try again.';
            
            // Clear all errors first
            setError('signup-name');
            setError('signup-email');
            setError('signup-password');
            setError('signup-confirm');
            
            // Show error in appropriate field
            if (/email|already|exist/i.test(errorMsg)) {
              setError('signup-email', errorMsg);
            } else if (/name/i.test(errorMsg)) {
              setError('signup-name', errorMsg);
            } else if (/password/i.test(errorMsg)) {
              setError('signup-password', errorMsg);
            } else {
              // Show general error in confirm password field
              setError('signup-confirm', errorMsg);
            }
            
            if (submitBtn) submitBtn.disabled = false;
            return;
          }
          
          // After successful signup, redirect to login
          window.location.href = './login.html';
        })
        .catch(function (err) {
          console.error('Signup request failed:', err);
          setError('signup-confirm', 'Network error. Please check your connection and try again.');
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
    // Initialize forms first (don't wait for token check)
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

    // Get token with a small delay to ensure localStorage is accessible
    setTimeout(function() {
      var token = getToken();
      
      // Redirect authenticated users away from login to home.html
      if (document.querySelector('#login-form') && token) {
        console.log('User already authenticated, redirecting to /home.html');
        window.location.replace('/home.html');
        return;
      }

      // Enforce auth on home page - only redirect if NO token exists
      var isHomePage = location.pathname.endsWith('/home') || location.pathname.endsWith('/home.html');
      if (isHomePage && !token) {
        console.log('No token found, redirecting to login');
        window.location.replace('/');
        return;
      }
      
      // If we're on home page and token exists, allow access
      if (isHomePage && token) {
        console.log('Token found, allowing access to home page');
      }
    }, 50); // Small delay to ensure localStorage is accessible
  } catch (_) {}
});


