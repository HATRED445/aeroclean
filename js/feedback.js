Aero.onReady(function () {
  'use strict';

  var user = Aero.require(['admin', 'personnel', 'student']);
  if (!user) return;

  var textarea = Aero.el('feedback-message');
  var charCount = Aero.el('char-count');
  var submitBtn = Aero.el('submit-feedback');

  if (!textarea || !charCount || !submitBtn) return;

  function updateCount() {
    var len = textarea.value.length;
    charCount.textContent = len;
  }

  textarea.addEventListener('input', updateCount);

  submitBtn.addEventListener('click', function () {
    var message = textarea.value.trim();
    if (!message) {
      Aero.setAlert(textarea.closest('.field').querySelector('.field-error'), 'Message cannot be empty', 'error');
      return;
    }
    if (message.length > 500) {
      Aero.setAlert(textarea.closest('.field').querySelector('.field-error'), 'Message exceeds 500 characters', 'error');
      return;
    }

    var feedback = {
      userId: user.id,
      role: user.role,
      fullName: user.fullName,
      message: message,
      timestamp: new Date().toISOString()
    };

    var stored = Aero.readJson('aeroclean.feedback', []);
    stored.push(feedback);
    Aero.writeJson('aeroclean.feedback', stored);

    Aero.toast('Feedback submitted successfully', 'success');
    textarea.value = '';
    updateCount();
    Aero.setAlert(textarea.closest('.field').querySelector('.field-error'), '', 'error');
  });
});