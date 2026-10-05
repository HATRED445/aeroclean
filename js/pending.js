Aero.onReady(function () {
  'use strict';

  var sessionUser = Aero.currentUser();
  if (sessionUser && sessionUser.status === 'active') {
    window.location.href = Aero.homeFor(sessionUser.role);
    return;
  }

  var user = sessionUser || Aero.pendingUser();
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  var checkBtn = Aero.el('check-btn');
  var backBtn = Aero.el('back-btn');
  var mode = 'pending';

  function show(account, announce) {
    var title = Aero.el('state-title');
    var message = Aero.el('state-message');
    var icon = Aero.el('state-icon');
    var hint = Aero.el('state-hint');

    Aero.el('state-account').textContent = account.fullName + ' · ' + account.schoolId;

    if (account.status === 'active') {
      mode = 'approved';
      icon.innerHTML = '&#10003;';
      title.textContent = 'Account approved';
      message.textContent =
        'Your personnel account has been accepted by the administrator. You can sign in now.';
      checkBtn.hidden = false;
      checkBtn.textContent = 'Sign in now';
      hint.hidden = true;
    } else if (account.status === 'declined') {
      mode = 'declined';
      icon.innerHTML = '&#10007;';
      title.textContent = 'Account not approved';
      message.textContent =
        'The administrator declined this personnel account. Please contact the administrator for details.';
      checkBtn.hidden = true;
      hint.hidden = false;
      hint.textContent =
        'Declined accounts cannot sign in. Ask the administrator if you believe this is a mistake.';
    } else {
      mode = 'pending';
      icon.innerHTML = '&#9201;';
      title.textContent = 'Account pending approval';
      message.textContent =
        'Your personnel account was created and is waiting for an administrator to accept it.';
      checkBtn.hidden = false;
      checkBtn.textContent = 'Check status';
      hint.hidden = false;
      hint.textContent =
        'Sign-in stays locked until an administrator accepts your personnel account.';
    }

    if (announce) Aero.toast('Status refreshed: ' + account.status, 'info');
  }

  show(user, false);

  checkBtn.addEventListener('click', function () {
    if (mode === 'approved') {
      Aero.clearPendingUser();
      window.location.href = 'index.html';
      return;
    }
    var fresh = Aero.findUser(user.id);
    if (!fresh) {
      Aero.toast('This account no longer exists.', 'error');
      Aero.clearPendingUser();
      window.location.href = 'index.html';
      return;
    }
    show(fresh, true);
  });

  backBtn.addEventListener('click', function () {
    Aero.clearPendingUser();
    Aero.logout();
    window.location.href = 'index.html';
  });
});
