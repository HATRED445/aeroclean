Aero.onReady(function () {
  'use strict';

  var admin = Aero.require(['admin']);
  if (!admin) return;

  var esc = Aero.esc;
  var fmtDate = Aero.fmtDate;
  var PAGE_SIZE = 25;
  var currentPage = 1;
  var filteredReports = [];
  var currentDetailReport = null;

  var searchInput = Aero.el('filter-search');
  var searchBtn = Aero.el('filter-search-btn');
  var typeFilter = Aero.el('filter-type');
  var datePreset = Aero.el('filter-date-preset');
  var customDateRange = Aero.el('custom-date-range');
  var dateFrom = Aero.el('filter-date-from');
  var dateTo = Aero.el('filter-date-to');
  var reportsBody = Aero.el('reports-body');
  var reportsEmpty = Aero.el('reports-empty');
  var reportsWrap = Aero.el('reports-wrap');
  var pagination = Aero.el('pagination');
  var modalBackdrop = Aero.el('report-modal-backdrop');
  var detailModal = Aero.el('report-detail-modal');
  var detailClose = Aero.el('report-detail-close');
  var detailArchiveBtn = Aero.el('detail-archive');

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

  function matchesFilters(report) {
    var search = searchInput.value.trim().toLowerCase();
    if (search) {
      var haystack = (report.userName + ' ' + report.userSchoolId + ' ' + report.deviceRoom + ' ' + report.deviceId + ' ' + report.note).toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    var type = typeFilter.value;
    if (type !== 'all' && report.type !== type) return false;

    var preset = datePreset.value;
    var reportDate = new Date(report.createdAt);
    if (isNaN(reportDate.getTime())) return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'today') {
      if (reportDate < today) return false;
    } else if (preset === 'week') {
      var weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (reportDate < weekAgo) return false;
    } else if (preset === 'month') {
      var monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      if (reportDate < monthAgo) return false;
    } else if (preset === 'custom') {
      var from = dateFrom.value ? new Date(dateFrom.value) : null;
      var to = dateTo.value ? new Date(dateTo.value) : null;
      if (to) to.setHours(23, 59, 59, 999);
      if (from && reportDate < from) return false;
      if (to && reportDate > to) return false;
    }

    return true;
  }

  function applyFilters() {
    var all = Aero.getActiveReports();
    filteredReports = all.filter(matchesFilters);
    currentPage = 1;
    renderTable();
    renderPagination();
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
        '<td class="cell-name">' + esc(report.userName) + '<br><span class="muted">' + esc(report.userSchoolId) + '</span></td>' +
        '<td>' + esc(report.deviceRoom) + '<br><span class="muted">' + esc(report.deviceId) + '</span></td>' +
        '<td>' + typeBadge(report.type) + '</td>' +
        '<td>' + statusBadge(report.deviceStatusAtReport) + '</td>' +
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
    currentDetailReport = report;
    Aero.el('detail-reporter').textContent = report.userName + ' (' + report.userSchoolId + ')';
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
      currentDetailReport = null;
    }, 250);
    document.body.style.overflow = '';
  }

  function handleArchive() {
    if (!currentDetailReport) return;
    var result = Aero.archiveReport(currentDetailReport.id);
    if (result.ok) {
      Aero.toast('Report archived', 'success');
      closeDetailModal();
      applyFilters();
    } else {
      Aero.toast(result.message, 'error');
    }
  }

  function handleRestore(reportId) {
    var result = Aero.restoreReport(reportId);
    if (result.ok) {
      Aero.toast('Report restored', 'success');
      applyFilters();
    } else {
      Aero.toast(result.message, 'error');
    }
  }

  datePreset.addEventListener('change', function () {
    customDateRange.style.display = this.value === 'custom' ? 'flex' : 'none';
  });

  var searchDebounce;
  searchInput.addEventListener('input', function () {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(applyFilters, 300);
  });
  searchBtn.addEventListener('click', applyFilters);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      clearTimeout(searchDebounce);
      applyFilters();
    }
  });

  typeFilter.addEventListener('change', applyFilters);
  dateFrom.addEventListener('change', applyFilters);
  dateTo.addEventListener('change', applyFilters);

  pagination.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-page]');
    if (btn) {
      currentPage = parseInt(btn.getAttribute('data-page'), 10);
      renderTable();
      renderPagination();
    }
  });

  reportsBody.addEventListener('click', function (e) {
    var row = e.target.closest('tr[data-id]');
    if (row) {
      var id = row.getAttribute('data-id');
      var report = filteredReports.find(function (r) { return r.id === id; });
      if (report) openDetailModal(report);
    }
  });

  detailClose.addEventListener('click', closeDetailModal);
  modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop) closeDetailModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !detailModal.hidden) closeDetailModal();
  });

  detailArchiveBtn.addEventListener('click', handleArchive);

  applyFilters();
});