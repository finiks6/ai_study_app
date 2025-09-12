async function checkAuth() {
  try {
    const res = await fetch('/me');
    const loggedIn = res.ok;
    const authForm = document.getElementById('auth-form');
    const logoutBtn = document.getElementById('logout-btn');
    if (loggedIn) {
      authForm.style.display = 'none';
      logoutBtn.style.display = 'inline-block';
      if (typeof loadHistory === 'function') loadHistory();
    } else {
      authForm.style.display = 'inline-block';
      logoutBtn.style.display = 'none';
    }
  } catch {
    // ignore auth check errors
  }
}

document.getElementById('login-btn')?.addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (res.ok) {
    await checkAuth();
  } else {
    alert('Login failed');
  }
});

document.getElementById('signup-btn')?.addEventListener('click', async () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const res = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (res.ok) {
    await checkAuth();
  } else {
    alert('Signup failed');
  }
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await fetch('/logout', { method: 'POST' });
  checkAuth();
});

window.addEventListener('load', checkAuth);
