/*
 * AeroClean - telemetry
 *
 * Simulated readings from the connected ESP32 nodes (each node carries an
 * MQ137 NH3 sensor and an MQ3 alcohol sensor).
 *
 * This is the single place to change thresholds, rooms and the update rate.
 * To use a real ESP32 later, replace `simulate()` with a fetch to the device
 * endpoint and keep returning the same device shape.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'aeroclean.telemetry';
  var TICK_MS = 2000;
  var HISTORY = 30;
  var STALE_MS = 30000;

  var THRESHOLDS = {
    mq137: 50, /* ppm - NH3 */
    mq3: 25    /* ppm - alcohol */
  };

  var ROOMS = [
    { room: 'Room 101', nodeId: 'ESP32-A01', type: 'Classroom' },
    { room: 'Room 102', nodeId: 'ESP32-A02', type: 'Classroom' },
    { room: 'Room 103', nodeId: 'ESP32-A03', type: 'Classroom' },
    { room: 'Room 201', nodeId: 'ESP32-A04', type: 'Computer lab' },
    { room: 'Science Lab', nodeId: 'ESP32-A05', type: 'Laboratory' },
    { room: 'Library', nodeId: 'ESP32-A06', type: 'Library' }
  ];

  /* typical resting levels per room - spikes push a room over a threshold */
  var BASELINE = [
    { mq137: 21, mq3: 10 },
    { mq137: 26, mq3: 13 },
    { mq137: 33, mq3: 16 },
    { mq137: 24, mq3: 12 },
    { mq137: 38, mq3: 19 },
    { mq137: 18, mq3: 8 }
  ];

  var state = null;
  var timer = null;
  var listeners = [];

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function readStore() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeStore() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* storage unavailable - keep running in memory */
    }
  }

  function classify(mq137, mq3) {
    return mq137 > THRESHOLDS.mq137 || mq3 > THRESHOLDS.mq3 ? 'alert' : 'normal';
  }

  function odorIndex(mq137, mq3) {
    var ratio = Math.max(mq137 / THRESHOLDS.mq137, mq3 / THRESHOLDS.mq3);
    return Math.round(ratio * 100);
  }

  function buildDevice(index) {
    var room = ROOMS[index];
    var base = BASELINE[index] || BASELINE[0];
    return {
      room: room.room,
      nodeId: room.nodeId,
      type: room.type,
      mq137: base.mq137,
      mq3: base.mq3,
      status: 'normal',
      odorIndex: 100,
      updatedAt: new Date().toISOString()
    };
  }

  function freshState() {
    var devices = [];
    for (var i = 0; i < ROOMS.length; i++) devices.push(buildDevice(i));
    return {
      devices: devices,
      history: { normal: [], alert: [] },
      lastUpdate: new Date().toISOString(),
      tick: 0
    };
  }

  function loadState() {
    var stored = readStore();
    if (
      !stored ||
      !Array.isArray(stored.devices) ||
      stored.devices.length !== ROOMS.length ||
      !stored.history ||
      !Array.isArray(stored.history.normal)
    ) {
      return freshState();
    }
    return stored;
  }

  function nextValue(current, base) {
    var drift = (base - current) * 0.18;
    var noise = (Math.random() - 0.5) * 7;
    var value = current + drift + noise;
    if (Math.random() < 0.05) value += Math.random() * 20; /* odor spike */
    return clamp(round1(value), 1, 90);
  }

  function pushHistory(list, value) {
    list.push(value);
    while (list.length > HISTORY) list.shift();
  }

  function simulate() {
    var devices = state.devices;
    for (var i = 0; i < devices.length; i++) {
      var device = devices[i];
      var base = BASELINE[i] || BASELINE[0];
      device.mq137 = nextValue(device.mq137, base.mq137);
      device.mq3 = nextValue(device.mq3, base.mq3);
      device.status = classify(device.mq137, device.mq3);
      device.odorIndex = odorIndex(device.mq137, device.mq3);
      device.updatedAt = new Date().toISOString();
    }

    var normal = 0;
    var alert = 0;
    for (var j = 0; j < devices.length; j++) {
      if (devices[j].status === 'alert') alert++;
      else normal++;
    }

    pushHistory(state.history.normal, normal);
    pushHistory(state.history.alert, alert);
    state.lastUpdate = new Date().toISOString();
    state.tick++;
    writeStore();
    return normal + alert;
  }

  function notify() {
    var snapshot = getSnapshot();
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](snapshot);
      } catch (err) {
        console.error(err);
      }
    }
  }

  function getSnapshot() {
    if (!state) state = loadState();
    var normal = 0;
    var alert = 0;
    var alertRooms = [];
    for (var i = 0; i < state.devices.length; i++) {
      if (state.devices[i].status === 'alert') {
        alert++;
        alertRooms.push(state.devices[i].room);
      } else {
        normal++;
      }
    }
    var age = Math.max(0, Date.now() - new Date(state.lastUpdate).getTime());
    return {
      devices: state.devices,
      history: state.history,
      lastUpdate: state.lastUpdate,
      ageMs: age,
      stale: age > STALE_MS,
      total: state.devices.length,
      normal: normal,
      alert: alert,
      alertRooms: alertRooms,
      thresholds: THRESHOLDS
    };
  }

  function step() {
    if (!state) state = loadState();
    simulate();
    notify();
    return getSnapshot();
  }

  function start() {
    if (!state) state = loadState();
    if (state.tick === 0) {
      for (var i = 0; i < 8; i++) simulate(); /* build a little history */
      notify();
    }
    if (timer) return;
    timer = global.setInterval(step, TICK_MS);
  }

  function stop() {
    if (timer) {
      global.clearInterval(timer);
      timer = null;
    }
  }

  function subscribe(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return function unsubscribe() {
      var index = listeners.indexOf(fn);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  function reset() {
    stop();
    state = freshState();
    writeStore();
    notify();
    return getSnapshot();
  }

  global.Telemetry = {
    TICK_MS: TICK_MS,
    HISTORY: HISTORY,
    THRESHOLDS: THRESHOLDS,
    ROOMS: ROOMS,
    start: start,
    stop: stop,
    step: step,
    subscribe: subscribe,
    snapshot: getSnapshot,
    alertCount: function () {
      return getSnapshot().alert;
    },
    reset: reset,
    classify: classify,
    odorIndex: odorIndex
  };
})(typeof window !== 'undefined' ? window : this);
