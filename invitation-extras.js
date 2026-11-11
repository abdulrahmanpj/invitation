(function () {
    'use strict';

    // The ceremony is in Chennai (UTC+05:30), regardless of the guest's time zone.
    var ceremonyTime = Date.parse('2026-12-13T11:30:00+05:30');
    var timer = document.getElementById('countdownTimer');
    var cardImage = document.getElementById('cardImage');
    // Reuse the actual card artwork so its paper grain continues under the live digits.
    function syncTimerPaper() {
        timer.style.setProperty('--timer-paper', 'url("' + (cardImage.currentSrc || cardImage.src) + '")');
    }
    syncTimerPaper();
    cardImage.addEventListener('load', syncTimerPaper);
    var fields = ['days', 'hours', 'minutes', 'seconds'].map(function (unit) {
        return document.getElementById('countdown-' + unit);
    });
    var interval;

    function updateCountdown() {
        var remaining = Math.max(0, Math.ceil((ceremonyTime - Date.now()) / 1000));
        var values = [
            Math.floor(remaining / 86400),
            Math.floor(remaining % 86400 / 3600),
            Math.floor(remaining % 3600 / 60),
            remaining % 60
        ];
        fields.forEach(function (field, index) {
            field.textContent = String(values[index]).padStart(2, '0');
        });
        timer.setAttribute('aria-label', values[0] + ' days, ' + values[1] + ' hours, ' +
            values[2] + ' minutes, ' + values[3] + ' seconds until the Nikkah');
        if (remaining === 0) {
            timer.setAttribute('aria-label', 'The Nikkah ceremony time has arrived');
            if (interval) clearInterval(interval);
        }
        return remaining;
    }

    if (updateCountdown() > 0) interval = setInterval(updateCountdown, 1000);

    // A short, lightweight celebration on each reveal; never intercept taps or scrolling.
    var petalLayer = document.createElement('div');
    petalLayer.className = 'petal-shower';
    petalLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(petalLayer);
    var petalCleanup;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function clearPetals() {
        clearTimeout(petalCleanup);
        petalLayer.replaceChildren();
    }

    function showerPetals() {
        clearPetals();
        if (document.hidden || reducedMotion.matches) return;
        var colors = ['#a85d67', '#d6a092', '#e8c9ac', '#8b3b4d'];
        var count = window.matchMedia('(max-width: 600px)').matches ? 24 : 36;
        var petals = document.createDocumentFragment();
        for (var index = 0; index < count; index++) {
            var petal = document.createElement('span');
            petal.className = 'falling-petal';
            petal.style.setProperty('--petal-left', (Math.random() * 100).toFixed(2) + '%');
            petal.style.setProperty('--petal-size', (6 + Math.random() * 5).toFixed(1) + 'px');
            petal.style.setProperty('--petal-duration', (4.5 + Math.random() * 2).toFixed(2) + 's');
            petal.style.setProperty('--petal-delay', (Math.random() * 1.5).toFixed(2) + 's');
            petal.style.setProperty('--petal-drift', (-65 + Math.random() * 130).toFixed(1) + 'px');
            petal.style.setProperty('--petal-turn', (-180 + Math.random() * 360).toFixed(1) + 'deg');
            petal.style.setProperty('--petal-flutter', (1 + Math.random() * 1.3).toFixed(2) + 's');
            petal.style.setProperty('--petal-color', colors[index % colors.length]);
            petal.appendChild(document.createElement('i'));
            petals.appendChild(petal);
        }
        petalLayer.appendChild(petals);
        petalCleanup = setTimeout(clearPetals, 8500);
    }

    document.addEventListener('invitation:open', showerPetals);
    document.addEventListener('invitation:close', clearPetals);
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) clearPetals();
    });
    reducedMotion.addEventListener('change', function () {
        if (reducedMotion.matches) clearPetals();
    });
    window.addEventListener('pagehide', clearPetals);

    var audio = document.getElementById('invitationMusic');
    var pending = false;
    var request = 0;
    audio.volume = 0.3;

    function pauseMusic() {
        request++;
        pending = false;
        audio.pause();
    }

    function playMusic() {
        if (document.hidden || pending || !audio.paused) return;
        var currentRequest = ++request;
        pending = true;
        // Try on load, then retry in a real gesture if the browser blocks autoplay.
        var playback;
        try { playback = audio.play(); }
        catch (error) { playback = Promise.reject(error); }
        Promise.resolve(playback).then(function () {
            if (currentRequest !== request) return;
            pending = false;
        }).catch(function () {
            if (currentRequest !== request) return;
            pending = false;
        });
    }

    audio.addEventListener('error', function () {
        request++;
        pending = false;
    });

    window.invitationMusic = {
        startFromInvitation: playMusic
    };

    document.addEventListener('pointerdown', playMusic);
    document.addEventListener('keydown', playMusic);
    playMusic();

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) pauseMusic();
        else { updateCountdown(); playMusic(); }
    });
    window.addEventListener('pagehide', pauseMusic);
    window.addEventListener('pageshow', updateCountdown);
})();
