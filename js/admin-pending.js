Aero.onReady(function () {
  'use strict';

  var admin = Aero.require(['admin']);
  if (!admin) return;

  var esc = Aero.esc;

  function roleBadge(role) {
    return '<span class="badge badge-' + esc(role) + '">' + esc(role) + '</span>';
  }

  function statusBadge(status) {
    return '<span class="badge badge-' + esc(status) + '">' + esc(status) + '</span>';
  }

  function approveBtn(id) {
    return (
      '<button type="button" class="btn btn-sm btn-ok" data-action="approve" data-id="' +
      esc(id) +
      '">Accept</button>'
    );
  }

  function declineBtn(id) {
    return (
      '<button type="button" class="btn btn-sm btn-danger" data-action="decline" data-id="' +
      esc(id) +
      '">Decline</button>'
    );
  }

  function pendingRow(user) {
    return (
      '<tr>' +
      '<td class="cell-name">' + esc(user.fullName) + '</td>' +
      '<td>' + esc(user.schoolId) + '</td>' +
      '<td>' + esc(user.email) + '</td>' +
      '<td>' + esc(user.phone) + '</td>' +
      '<td>' + Aero.fmtDate(user.createdAt) + '</td>' +
      '<td class="cell-actions">' + approveBtn(user.id) + ' ' + declineBtn(user.id) + '</td>' +
      '</tr>'
    );
  }

  function renderPending(users) {
    var pending = users
      .filter(function (user) {
        return user.role === 'personnel' && user.status === 'pending';
      })
      .sort(function (a, b) {
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      });

    var count = pending.length + ' waiting';
    Aero.el('pending-count-top').textContent = count;

    Aero.el('pending-body').innerHTML = pending.map(pendingRow).join('');
    Aero.el('pending-wrap').hidden = pending.length === 0;
    Aero.el('pending-empty').hidden = pending.length !== 0;
  }

  function render() {
    var users = Aero.allUsers();
    renderPending(users);
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var button = target.closest('[data-action]');
    if (!button) return;

    var result = Aero.reviewAccount(
      button.getAttribute('data-id'),
      button.getAttribute('data-action')
    );

    if (!result.ok) {
      Aero.toast(result.message, 'error');
      return;
    }

    if (result.user.status === 'active') {
      Aero.toast(result.user.fullName + ' approved and can now sign in.', 'success');
    } else {
      Aero.toast(result.user.fullName + ' was declined.', 'info');
    }
    render();
  });

  render();
});