Aero.onReady(function () {
  'use strict';

  var user = Aero.require(['student', 'personnel', 'admin']);
  if (!user) return;

  var CIRC = 2 * Math.PI * 52;
  var MODAL_CIRC = 2 * Math.PI * 70;
  var grid = Aero.el('device-grid');
  var thresholds = Telemetry.THRESHOLDS;
  var rooms = Telemetry.ROOMS;

  var modalBackdrop = Aero.el('modal-backdrop');
  var modal = Aero.el('device-modal');
  var modalClose = Aero.el('modal-close');
  var currentDeviceIndex = -1;
  var modalUnsubscribe = null;

  function esc(value) {
    return Aero.esc(value);
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

  function getGaugeColor(index) {
    var idx = Math.min(100, index);
    if (idx <= 80) return '#22c55e';
    if (idx <= 90) return '#f97316';
    return '#dc2626';
  }

  function updateModalContent(device) {
    var hot = device.status === 'alert';
    var idx = Math.max(0, Math.round(device.odorIndex));

    var statusEl = Aero.el('modal-status');
    statusEl.className = 'badge ' + (hot ? 'badge-alert' : 'badge-normal');
    statusEl.textContent = hot ? 'Odor Alert' : 'Normal';

    var gaugeEl = Aero.el('modal-gauge');
    gaugeEl.classList.toggle('is-hot', hot);

    Aero.el('modal-gauge-num').textContent = idx;
    var ratio = Math.min(100, idx) / 100;
    Aero.el('modal-gauge-arc').setAttribute('stroke-dasharray', (MODAL_CIRC * ratio).toFixed(1) + ' ' + MODAL_CIRC.toFixed(1));
    Aero.el('modal-gauge-arc').style.stroke = getGaugeColor(idx);

    var m137Hot = device.mq137 > thresholds.mq137;
    var m3Hot = device.mq3 > thresholds.mq3;

    Aero.el('modal-mq137').textContent = device.mq137 + ' / ' + thresholds.mq137 + ' ppm';
    Aero.el('modal-dot137').className = 'dot' + (m137Hot ? ' is-hot' : '');

    Aero.el('modal-mq3').textContent = device.mq3 + ' / ' + thresholds.mq3 + ' ppm';
    Aero.el('modal-dot3').className = 'dot' + (m3Hot ? ' is-hot' : '');

    Aero.el('modal-seen').textContent = 'Updated ' + timeLabel(device.updatedAt);
  }

  function openModal(index) {
    var snapshot = Telemetry.snapshot();
    var device = snapshot.devices[index];
    if (!device) return;

    currentDeviceIndex = index;
    var room = rooms[index];

    Aero.el('modal-room').textContent = esc(device.room);
    Aero.el('modal-meta').textContent = esc(device.nodeId) + ' \u00B7 ' + esc(device.type);

    var statusEl = Aero.el('modal-status');
    var hot = device.status === 'alert';
    statusEl.className = 'badge ' + (hot ? 'badge-alert' : 'badge-normal');
    statusEl.textContent = hot ? 'Odor Alert' : 'Normal';

    var gaugeEl = Aero.el('modal-gauge');
    gaugeEl.classList.toggle('is-hot', hot);

    var idx = Math.max(0, Math.round(device.odorIndex));
    Aero.el('modal-gauge-num').textContent = idx;
    var ratio = Math.min(100, idx) / 100;
    Aero.el('modal-gauge-arc').setAttribute('stroke-dasharray', (MODAL_CIRC * ratio).toFixed(1) + ' ' + MODAL_CIRC.toFixed(1));
    Aero.el('modal-gauge-arc').style.stroke = getGaugeColor(idx);

    var m137Hot = device.mq137 > thresholds.mq137;
    var m3Hot = device.mq3 > thresholds.mq3;

    Aero.el('modal-mq137').textContent = device.mq137 + ' / ' + thresholds.mq137 + ' ppm';
    Aero.el('modal-dot137').className = 'dot' + (m137Hot ? ' is-hot' : '');

    Aero.el('modal-mq3').textContent = device.mq3 + ' / ' + thresholds.mq3 + ' ppm';
    Aero.el('modal-dot3').className = 'dot' + (m3Hot ? ' is-hot' : '');

    var desc = 'Readings from ' + esc(device.room) + ' (' + esc(device.nodeId) + ', ' + esc(device.type) + '). ' +
      'MQ137 detects ammonia (NH\u2083); MQ3 detects alcohol vapors. ' +
      'Values shown in ppm against alert thresholds (MQ137: ' + thresholds.mq137 + ' ppm, MQ3: ' + thresholds.mq3 + ' ppm).';
    Aero.el('modal-readings-desc').textContent = desc;

    Aero.el('modal-type').textContent = esc(device.type);
    Aero.el('modal-seen').textContent = 'Updated ' + timeLabel(device.updatedAt);

    modalBackdrop.hidden = false;
    modal.hidden = false;
    requestAnimationFrame(function () {
      modalBackdrop.classList.add('is-open');
      modal.classList.add('is-open');
    });
    modalClose.focus();
    document.body.style.overflow = 'hidden';

    modalUnsubscribe = Telemetry.subscribe(function (snapshot) {
      if (currentDeviceIndex !== index) return;
      var updatedDevice = snapshot.devices[index];
      if (updatedDevice) updateModalContent(updatedDevice);
    });
  }

  function closeModal() {
    if (modalUnsubscribe) {
      modalUnsubscribe();
      modalUnsubscribe = null;
    }
    modalBackdrop.classList.remove('is-open');
    modal.classList.remove('is-open');
    setTimeout(function () {
      modalBackdrop.hidden = true;
      modal.hidden = true;
      currentDeviceIndex = -1;
    }, 250);
    document.body.style.overflow = '';
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  }

  function handleBackdropClick(e) {
    if (e.target === modalBackdrop) closeModal();
  }

  modalClose.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', handleKeydown);

  function deviceCard(room, index) {
    return (
      '<article class="device-card" id="dev-' + index + '">' +
        '<div class="device-head">' +
          '<div>' +
            '<div class="device-room">' + esc(room.room) + '</div>' +
            '<div class="device-meta">' + esc(room.nodeId) + ' &middot; ' + esc(room.type) + '</div>' +
          '</div>' +
          '<span class="badge badge-normal" data-field="status">Normal</span>' +
        '</div>' +

        '<div class="gauge" data-field="gauge">' +
          '<svg viewBox="0 0 120 120" aria-hidden="true">' +
            '<circle class="gauge-track" cx="60" cy="60" r="52"></circle>' +
            '<circle class="gauge-value" cx="60" cy="60" r="52" ' +
              'stroke-dasharray="0 ' + CIRC.toFixed(1) + '" data-field="arc"></circle>' +
          '</svg>' +
          '<div class="gauge-center">' +
            '<div class="gauge-num" data-field="index">0</div>' +
            '<div class="gauge-unit">Odor Index %</div>' +
          '</div>' +
        '</div>' +

        '<div class="reading">' +
          '<span class="dot" data-field="dot137"></span>' +
          '<span class="reading-name">MQ137</span>' +
          '<span class="reading-vals" data-field="mq137">&mdash;</span>' +
        '</div>' +

        '<div class="reading">' +
          '<span class="dot" data-field="dot3"></span>' +
          '<span class="reading-name">MQ3</span>' +
          '<span class="reading-vals" data-field="mq3">&mdash;</span>' +
        '</div>' +

        '<div class="device-foot">' +
          '<span data-field="type">' + esc(room.type) + '</span>' +
          '<span data-field="seen">Updated &mdash;</span>' +
        '</div>' +
      '</article>'
    );
  }

  function spark(svg, values, total) {
    if (!svg) return;
    var n = values.length;
    if (n < 2) {
      svg.innerHTML = '';
      return;
    }
    var max = Math.max(1, total);
    var pts = [];
    for (var i = 0; i < n; i++) {
      var x = (i / (n - 1)) * 100;
      var y = 38 - (Math.min(values[i], max) / max) * 34;
      pts.push(x.toFixed(2) + ',' + y.toFixed(2));
    }
    var line = pts.join(' ');
    var area = 'M' + pts[0] + ' L' + pts.join(' L') + ' L100,40 L0,40 Z';
    svg.innerHTML =
      '<path class="spark-area" d="' + area + '"></path>' +
      '<polyline class="spark-line" points="' + line + '"></polyline>';
  }

  function setText(id, value) {
    var node = Aero.el(id);
    if (node) node.textContent = value;
  }

  function updateCard(card, device) {
    var hot = device.status === 'alert';
    var idx = Math.max(0, Math.round(device.odorIndex));

    card.classList.toggle('is-alert', hot);

    var status = card.querySelector('[data-field="status"]');
    status.className = 'badge ' + (hot ? 'badge-alert' : 'badge-normal');
    status.textContent = hot ? 'Odor Alert' : 'Normal';

    var gauge = card.querySelector('[data-field="gauge"]');
    gauge.classList.toggle('is-hot', hot);

    card.querySelector('[data-field="index"]').textContent = idx;

    var ratio = Math.min(100, idx) / 100;
    card
      .querySelector('[data-field="arc"]')
      .setAttribute('stroke-dasharray', (CIRC * ratio).toFixed(1) + ' ' + CIRC.toFixed(1));
    card.querySelector('[data-field="arc"]').style.stroke = getGaugeColor(idx);

    var m137Hot = device.mq137 > thresholds.mq137;
    var m3Hot = device.mq3 > thresholds.mq3;

    card.querySelector('[data-field="mq137"]').textContent =
      device.mq137 + ' / ' + thresholds.mq137 + ' ppm';
    card.querySelector('[data-field="dot137"]').className = 'dot' + (m137Hot ? ' is-hot' : '');

    card.querySelector('[data-field="mq3"]').textContent =
      device.mq3 + ' / ' + thresholds.mq3 + ' ppm';
    card.querySelector('[data-field="dot3"]').className = 'dot' + (m3Hot ? ' is-hot' : '');

    card.querySelector('[data-field="seen"]').textContent = 'Updated ' + timeLabel(device.updatedAt);
  }

  function render(snapshot) {
    setText('normal-count', snapshot.normal);
    setText('normal-sub', 'of ' + snapshot.total + ' rooms');
    setText('normal-time', 'Updated ' + timeLabel(snapshot.lastUpdate));

    setText('alert-count', snapshot.alert);
    setText('alert-sub', 'of ' + snapshot.total + ' rooms');
    setText('alert-time', 'Updated ' + timeLabel(snapshot.lastUpdate));
    setText('device-count', snapshot.total + ' online');
    setText(
      'legend-thresholds',
      'MQ137 ' + thresholds.mq137 + ' ppm · MQ3 ' + thresholds.mq3 + ' ppm'
    );

    var chips = Aero.el('alert-chips');
    if (chips) {
      chips.innerHTML = snapshot.alertRooms.length
        ? snapshot.alertRooms
            .map(function (room) {
              return '<span class="chip is-hot">' + esc(room) + '</span>';
            })
            .join('')
        : '<span class="chip">All rooms clear</span>';
    }

    spark(Aero.el('spark-normal'), snapshot.history.normal, snapshot.total);
    spark(Aero.el('spark-alert'), snapshot.history.alert, snapshot.total);

    var cards = grid.children;
    for (var i = 0; i < cards.length; i++) {
      if (snapshot.devices[i]) updateCard(cards[i], snapshot.devices[i]);
    }
  }

  function renderLive() {
    var snapshot = Telemetry.snapshot();
    var indicator = Aero.el('live-indicator');
    if (!indicator) return;
    indicator.classList.toggle('is-stale', snapshot.stale);
    setText(
      'live-text',
      snapshot.stale
        ? 'No data for ' + Math.round(snapshot.ageMs / 1000) + 's'
        : 'Live · updated ' + Math.max(0, Math.round(snapshot.ageMs / 1000)) + 's ago'
    );
  }

  grid.innerHTML = Telemetry.ROOMS.map(deviceCard).join('');

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.device-card');
    if (card) {
      var index = parseInt(card.id.replace('dev-', ''), 10);
      if (!isNaN(index)) openModal(index);
    }
  });

  Telemetry.start();
  render(Telemetry.snapshot());
  Telemetry.subscribe(render);
  renderLive();
  setInterval(renderLive, 1000);
});
