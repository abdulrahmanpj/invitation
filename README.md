# Nikkah invitation

An interactive wedding invitation for P. J. Abdul Rahman and Reema.

Open `index.html` in a browser. Tap, swipe up, or press Enter to open the envelope. The location button opens the venue in Google Maps.

The page includes its artwork and has no build dependencies. It respects reduced-motion preferences.

The slim countdown sits in the cream area inside the golden border and targets **13 December 2026, 11:30 AM IST (UTC+05:30)**. It updates each second, stops at zero, and does not reduce the original card size. An aligned, feathered image layer reuses the card’s own paper texture behind the timer. Tap the venue pin and address inside the card to open Google Maps; there is no separate location bar.

Music attempts to start automatically on load. If the browser blocks autoplay, it retries on the guest’s first tap or keypress. There is no visible music player. Playback pauses when the page is hidden.

Keep these files together when publishing:
- `index.html`
- `invitation-extras.js`
- `Wedding Nasheed Muhammad Al Muqit (English Lyrics).mp3`

The user handles all commits, pushes, and publishing.

To host with GitHub Pages, select **Settings → Pages → Deploy from a branch → main / (root)**.
