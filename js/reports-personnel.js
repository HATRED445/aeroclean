Aero.onReady(function () {
  'use strict';

  var user = Aero.require(['personnel']);
  if (!user) return;

  var esc = Aero.esc;
  var fmtDate = Aero.fmtDate;
  var PAGE_SIZE = 25;
  var currentPage = 1;
  var filteredReports = [];
  var rooms = Telemetry.ROOMS;

  var createReportBtn = Aero.el('create-report-btn');
  var reportsBody = Aero.el('reports-body');
  var reportsEmpty = Aero.el('reports-empty');
  var reportsWrap = Aero.el('reports-wrap');
  var pagination = Aero.el('pagination');
  var modalBackdrop = Aero.el('report-modal-backdrop');
  var detailModal = Aero.el('report-detail-modal');
  var detailClose = Aero.el('report-detail-close');
  var createModal = Aero.el('create-report-modal');
  var createClose = Aero.el('create-report-close');
  var createCancel = Aero.el('create-report-cancel');
  var createForm = Aero.el('create-report-form');
  var deviceSelect = Aero.el('report-device');
  var noteTextarea = Aero.el('report-note');
  var charCount = Aero.el('note-char-count');

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

  function populateDeviceSelect() {
    deviceSelect.innerHTML = '<option value="">Select a device</option>' +
      rooms.map(function (room) {
        return '<option value="' + esc(room.nodeId) + '">' + esc(room.room) + ' (' + esc(room.nodeId) + ')</option>';
      }).join('');
  }

  function updateCharCount() {
    var len = noteTextarea.value.length;
    charCount.textContent = len + '/500 characters';
    charCount.classList.remove('near-limit', 'over-limit');
    if (len >= 500) charCount.classList.add('over-limit');
    else if (len >= 450) charCount.classList.add('near-limit');
  }

  function loadReports() {
    var all = Aero.getReportsByUser(user.id);
    filteredReports = all;
    currentPage = 1;
    renderStats();
    renderTable();
    renderPagination();
  }

  function renderStats() {
    var total = filteredReports.length;
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var thisMonth = filteredReports.filter(function (r) {
      return new Date(r.createdAt) >= monthStart;
    }).length;
    Aero.el('stat-total').textContent = total;
    Aero.el('stat-month').textContent = thisMonth;
  }

  function renderTable() {
    var start = (currentPage - 1) * PAGE_SIZE;
    var pageReports = filteredReports.slice(start, start + PAGE_SIZE);

    if (pageReports.length === 0) {
      reportsBody.innerHTML = '';
      reportsWrap.hidden = true;
      reportsEmpty.hidden = false;
      pagination.innerHTML = '';
      return;
    }

    reportsWrap.hidden = false;
    reportsEmpty.hidden = true;

    reportsBody.innerHTML = pageReports.map(function (report) {
      return (
        '<tr data-id="' + esc(report.id) + '" style="cursor:pointer">' +
        '<td>' + esc(report.deviceRoom) + '<br><span class="muted">' + esc(report.deviceId) + '</span></td>' +
        '<td>' + typeBadge(report.type) + '</td>' +
        '<td>' + dateLabel(report.createdAt) + '</td>' +
        '<td>' + timeLabel(report.createdAt) + '</td>' +
        '<td>' + truncate(report.note, 80) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderPagination() {
    var totalPages = Math.ceil(filteredReports.length / PAGE_SIZE);
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    var html = '';
    var maxPages = 5;
    var startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    var endPage = Math.min(totalPages, startPage + maxPages - 1);
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    if (currentPage > 1) {
      html += '<button class="btn btn-ghost btn-sm" data-page="1" aria-label="First page">&laquo;</button>';
      html += '<button class="btn btn-ghost btn-sm" data-page="' + (currentPage - 1) + '" aria-label="Previous page">&lsaquo;</button>';
    }

    for (var p = startPage; p <= endPage; p++) {
      html += '<button class="btn btn-sm ' + (p === currentPage ? 'btn-primary' : 'btn-ghost') + '" data-page="' + p + '">' + p + '</button>';
    }

    if (currentPage < totalPages) {
      html += '<button class="btn btn-ghost btn-sm" data-page="' + (currentPage + 1) + '" aria-label="Next page">&rsaquo;</button>';
      html += '<button class="btn btn-ghost btn-sm" data-page="' + totalPages + '" aria-label="Last page">&raquo;</button>';
    }

    pagination.innerHTML = html;
  }

  function openDetailModal(report) {
    Aero.el('detail-device').textContent = report.deviceRoom + ' (' + report.deviceId + ')';
    Aero.el('detail-type').innerHTML = typeBadge(report.type);
    Aero.el('detail-status').innerHTML = statusBadge(report.deviceStatusAtReport);
    Aero.el('detail-date').textContent = dateLabel(report.createdAt);
    Aero.el('detail-time').textContent = timeLabel(report.createdAt);
    Aero.el('detail-note').textContent = report.note || '\u2014';

    modalBackdrop.hidden = false;
    detailModal.hidden = false;
    requestAnimationFrame(function () {
      modalBackdrop.classList.add('is-open');
      detailModal.classList.add('is-open');
    });
    detailClose.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeDetailModal() {
    modalBackdrop.classList.remove('is-open');
    detailModal.classList.remove('is-open');
    setTimeout(function () {
      modalBackdrop.hidden = true;
      detailModal.hidden = true;
    }, 250);
    document.body.style.overflow = '';
  }

  function openCreateModal() {
    createForm.reset();
    populateDeviceSelect();
    updateCharCount();
    modalBackdrop.hidden = false;
    createModal.hidden = false;
    requestAnimationFrame(function () {
      modalBackdrop.classList.add('is-open');
      createModal.classList.add('is-open');
    });
    deviceSelect.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeCreateModal() {
    modalBackdrop.classList.remove('is-open');
    createModal.classList.remove('is-open');
    setTimeout(function () {
      modalBackdrop.hidden = true;
      createModal.hidden = true;
    }, 250);
    document.body.style.overflow = '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    var deviceId = deviceSelect.value;
    var type = createForm.querySelector('input[name="report-type"]:checked').value;
    var note = noteTextarea.value.trim();

    if (!deviceId) {
      deviceSelect.focus();
      deviceSelect.classList.add('has-error');
      return;
    }

    var result = Aero.createReport(type, deviceId, note);
    if (result.ok) {
      Aero.toast('Report submitted', 'success');
      closeCreateModal();
      loadReports();
    } else {
      Aero.toast(result.message, 'error');
    }
  }

  createReportBtn.addEventListener('click', openCreateModal);
  createClose.addEventListener('click', closeCreateModal);
  createCancel.addEventListener('click', closeCreateModal);
  createForm.addEventListener('submit', handleSubmit);
  noteTextarea.addEventListener('input', updateCharCount);
  deviceSelect.addEventListener('change', function () {
    this.classList.remove('has-error');
  });

  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) {
      if (!createModal.hidden) closeCreateModal();
      else if (!detailModal.hidden) closeDetailModal();
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!createModal.hidden) closeCreateModal();
      else if (!detailModal.hidden) closeDetailModal();
    }
  });

  detailClose.addEventListener('click', closeDetailModal);

  reportsBody.addEventListener('click', function (e) {
    var row = e.target.closest('tr[data-id]');
    if (row) {
      var id = row.getAttribute('data-id');
      var report = filteredReports.find(function (r) { return r.id === id; });
      if (report) openDetailModal(report);
    }
  });

  pagination.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-page]');
    if (btn) {
      currentPage = parseInt(btn.getAttribute('data-page'), 10);
      renderTable();
      renderPagination();
    }
  });

  loadReports();
});