(function () {
    'use strict';

    var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    var frame = document.getElementById('frame');
    var card = document.getElementById('card');
    var envelope = document.getElementById('envelope');
    var hint = document.getElementById('hint');
    var hintText = document.getElementById('hintText');
    var hintChev = document.getElementById('hintChev');
    var pullHandle = document.getElementById('pullHandle');
    var mapLink = document.getElementById('mapLink');
    var loader = document.getElementById('loader');

    var progress = 0;
    var velocity = 0;
    var frameHeight = 0;
    var settledOpen = false;
    var targetOpen = false;
    var animation = null;
    var introDelay;
    var introPlayed = false;
    var interacted = false;
    var activePointer = null;
    var startX = 0, startY = 0, startProgress = 0;
    var moved = false, startedOpen = false;
    var dragRange = 220;
    var samples = [];
    var suppressHandleClick = false;

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function smooth(value) {
        value = clamp(value, 0, 1);
        return value * value * (3 - 2 * value);
    }

    function render(tilt) {
        var amount = clamp(progress, 0, 1);
        var lift = motionPreference.matches ? 0 : -Math.min(42, frameHeight * .07) * Math.sin(Math.PI * amount);
        // The sleeve stays in front throughout the pull, sliding off the bottom.
        // The card lifts first, then settles at its original full size.
        card.style.setProperty('--cty', lift.toFixed(2) + 'px');
        card.style.setProperty('--crot', (motionPreference.matches ? 0 : (tilt || 0)).toFixed(2) + 'deg');
        card.style.setProperty('--card-scale', (.94 + .06 * smooth((amount - .35) / .65)).toFixed(4));
        envelope.style.setProperty('--envelope-y', ((.06 + amount * 1.02) * frameHeight).toFixed(2) + 'px');
        envelope.style.setProperty('--envelope-opacity', (1 - smooth((amount - .86) / .14)).toFixed(3));
    }

    function sizes() {
        var style = getComputedStyle(document.body);
        var horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        var verticalPadding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        var availableWidth = document.documentElement.clientWidth - horizontalPadding;
        var availableHeight = Math.max(80, window.innerHeight - verticalPadding - hint.offsetHeight - 8);
        var mobile = window.matchMedia('(max-width: 600px)').matches;
        var width = Math.max(1, mobile ? availableWidth : Math.min(availableWidth, availableHeight / 1.5));
        frame.style.setProperty('--fw', width.toFixed(1) + 'px');
        frameHeight = width * 1.5;
        render(0);
    }

    function stopAnimation() {
        if (animation !== null) cancelAnimationFrame(animation);
        animation = null;
        clearTimeout(introDelay);
    }

    function setInteractive(open) {
        document.body.classList.toggle('opened', open);
        frame.style.touchAction = open ? 'pan-y pinch-zoom' : 'none';
        mapLink.tabIndex = open ? 0 : -1;
        pullHandle.tabIndex = open ? -1 : 0;
        hint.setAttribute('aria-expanded', String(open));
    }

    function finish(open) {
        var changed = open !== settledOpen;
        progress = open ? 1 : 0;
        velocity = 0;
        targetOpen = settledOpen = open;
        render(0);
        setInteractive(open);
        frame.classList.remove('is-moving');
        hint.classList.remove('hidden');
        hintText.textContent = open ? 'Tap to close the invitation' : 'Pull up from the top · or tap to open';
        hintChev.textContent = open ? '↓' : '↑';
        hintChev.classList.toggle('down', open);
        if (open && document.activeElement === pullHandle) hint.focus({ preventScroll: true });
        if (changed) document.dispatchEvent(new Event(open ? 'invitation:open' : 'invitation:close'));
    }

    function settle(open) {
        stopAnimation();
        targetOpen = open;
        setInteractive(false);
        frame.classList.add('is-moving');
        hint.classList.add('hidden');
        if (open && window.invitationMusic) window.invitationMusic.startFromInvitation();
        if (motionPreference.matches) { finish(open); return; }

        var target = open ? 1 : 0;
        var last = performance.now();
        var began = last;
        function step(now) {
            var dt = Math.min(.032, (now - last) / 1000);
            last = now;
            // A damped spring carries the release velocity, without a long settling tail.
            velocity += ((target - progress) * 100 - velocity * 20) * dt;
            progress += velocity * dt;
            render(0);
            if ((Math.abs(target - progress) < .002 && Math.abs(velocity) < .025) || now - began > 1100) {
                animation = null;
                finish(open);
            } else {
                animation = requestAnimationFrame(step);
            }
        }
        animation = requestAnimationFrame(step);
    }

    function pointerDown(event) {
        if (activePointer !== null || event.isPrimary === false || event.target.closest('a')) return;
        if (event.button !== undefined && event.button !== 0) return;
        interacted = true;
        stopAnimation();
        activePointer = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startProgress = progress;
        startedOpen = settledOpen && progress > .98;
        moved = false;
        suppressHandleClick = false;
        dragRange = clamp(frameHeight * .4, 160, 260);
        samples = [{ time: performance.now(), y: event.clientY }];
        velocity = 0;
        if (!startedOpen) {
            setInteractive(false);
            frame.classList.add('is-moving');
            hint.classList.add('hidden');
            try { frame.setPointerCapture(event.pointerId); } catch (error) { }
        }
    }

    function pointerMove(event) {
        if (event.pointerId !== activePointer) return;
        var dy = startY - event.clientY;
        var dx = event.clientX - startX;
        if (Math.abs(dy) > 5 || Math.abs(dx) > 5) moved = true;
        // Once open, normal touch scrolling must never pull the card closed.
        if (startedOpen) return;
        progress = clamp(startProgress + dy / dragRange, 0, 1);
        var now = performance.now();
        samples.push({ time: now, y: event.clientY });
        samples = samples.filter(function (sample) { return now - sample.time < 100; });
        render(clamp(dx / 100, -.8, .8) * Math.sin(Math.PI * progress));
        event.preventDefault();
    }

    function releasePointer() {
        var pointer = activePointer;
        activePointer = null;
        try { frame.releasePointerCapture(pointer); } catch (error) { }
    }

    function pointerUp(event) {
        if (event.pointerId !== activePointer) return;
        releasePointer();
        // Pointer gestures are handled here; keyboard clicks still use the button below.
        suppressHandleClick = true;
        if (startedOpen) {
            if (!moved) settle(false);
            return;
        }
        var now = performance.now();
        var recent = samples.filter(function (sample) { return now - sample.time < 100; });
        var speed = recent.length ? (recent[0].y - event.clientY) / Math.max(16, now - recent[0].time) : 0;
        velocity = clamp(speed * 1000 / dragRange, -2.5, 2.5);
        var open = !moved || (speed > .35 && progress > .04) || (speed >= -.35 && progress > .24);
        settle(open);
    }

    function cancelGesture(event) {
        if (event.pointerId !== activePointer) return;
        releasePointer();
        suppressHandleClick = true;
        if (!startedOpen) settle(settledOpen);
    }

    frame.addEventListener('pointerdown', pointerDown);
    frame.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', cancelGesture);
    frame.addEventListener('lostpointercapture', cancelGesture);
    pullHandle.addEventListener('click', function (event) {
        if (event.detail !== 0 && suppressHandleClick) { suppressHandleClick = false; return; }
        interacted = true;
        velocity = 0;
        settle(true);
    });
    hint.addEventListener('click', function () {
        interacted = true;
        velocity = 0;
        settle(!targetOpen);
    });

    function playIntro() {
        if (introPlayed || interacted || motionPreference.matches || document.hidden) return;
        introPlayed = true;
        var began = performance.now();
        function peek(now) {
            var phase = clamp((now - began) / 1800, 0, 1);
            progress = .045 * Math.pow(Math.sin(Math.PI * phase), 2);
            render(0);
            if (phase < 1) animation = requestAnimationFrame(peek);
            else { animation = null; progress = 0; render(0); }
        }
        animation = requestAnimationFrame(peek);
    }

    var ready = 0, revealed = false;
    function reveal() {
        if (revealed) return;
        revealed = true;
        loader.classList.add('hide');
        introDelay = setTimeout(playIntro, 700);
    }
    [document.getElementById('cardImage'), envelope].forEach(function (image) {
        function readyImage() { if (++ready === 2) reveal(); }
        if (image.complete) readyImage();
        else {
            image.addEventListener('load', readyImage, { once: true });
            image.addEventListener('error', readyImage, { once: true });
        }
    });
    setTimeout(reveal, 2500);

    window.addEventListener('resize', sizes);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', function () {
        if (window.visualViewport.scale === 1) sizes();
    });
    motionPreference.addEventListener('change', function () {
        if (!motionPreference.matches) return;
        stopAnimation();
        if (activePointer !== null) releasePointer();
        finish(targetOpen);
    });
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) return;
        stopAnimation();
        if (activePointer !== null) releasePointer();
        finish(targetOpen);
    });

    sizes();
    finish(false);
})();
