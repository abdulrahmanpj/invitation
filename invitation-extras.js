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
