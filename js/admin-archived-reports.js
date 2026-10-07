Aero.onReady(function () {
  'use strict';

  var admin = Aero.require(['admin']);
  if (!admin) return;

  var esc = Aero.esc;

  function typeBadge(type) {
    var label = Aero.REPORT_TYPE_LABELS[type] || type;
    var cls = 'badge-report-' + type.replace('_', '-');
    return '<span class="badge ' + cls + '">' + esc(label) + '</span>';
  }

  function statusBadge(status) {
    var cls = status === 'alert' ? 'badge-status-alert' : 'badge-status-normal';
    var label = status === 'alert' ? 'Alert' : 'Normal';
    return '<span class="badge ' + cls + '">' + esc(label) + '</span>';
  }

  function truncate(str, len) {
    if (!str) return '\u2014';
    return str.length > len ? esc(str.slice(0, len)) + '\u2026' : esc(str);
  }

  function timeLabel(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '\u2014';
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function dateLabel(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '\u2014';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function restoreBtn(id) {
    return (
      '<button type="button" class="btn btn-sm btn-ok" data-action="restore" data-id="' +
      esc(id) +
      '">Restore</button>'
    );
  }

  function archivedRow(report) {
    return (
      '<tr>' +
      '<td class="cell-name">' + esc(report.userName) + '<br><span class="muted">' + esc(report.userSchoolId) + '</span></td>' +
      '<td>' + esc(report.deviceRoom) + '<br><span class="muted">' + esc(report.deviceId) + '</span></td>' +
      '<td>' + typeBadge(report.type) + '</td>' +
      '<td>' + statusBadge(report.deviceStatusAtReport) + '</td>' +
      '<td>' + dateLabel(report.createdAt) + '</td>' +
      '<td>' + timeLabel(report.createdAt) + '</td>' +
      '<td>' + truncate(report.note, 80) + '</td>' +
      '<td class="cell-actions">' + restoreBtn(report.id) + '</td>' +
      '</tr>'
    );
  }

  function render() {
    var reports = Aero.getArchivedReports();
    var count = reports.length;

    Aero.el('archived-count').textContent = count + ' archived';

    if (count === 0) {
      Aero.el('archived-body').innerHTML = '';
      Aero.el('archived-wrap').hidden = true;
      Aero.el('archived-empty').hidden = false;
      return;
    }

    Aero.el('archived-wrap').hidden = false;
    Aero.el('archived-empty').hidden = true;
    Aero.el('archived-body').innerHTML = reports.map(archivedRow).join('');
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var button = target.closest('[data-action="restore"]');
    if (!button) return;

    var reportId = button.getAttribute('data-id');
    var result = Aero.restoreReport(reportId);

    if (!result.ok) {
      Aero.toast(result.message, 'error');
      return;
    }

    Aero.toast('Report restored to active list.', 'success');
    render();
  });

  render();
});