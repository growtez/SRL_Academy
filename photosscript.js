document.addEventListener('DOMContentLoaded', function () {

    /* =========================================
       1. PRELOADER LOGIC
       ========================================= */
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }

    /* =========================================
       2. NAVIGATION & DROPDOWN LOGIC
       ========================================= */
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }

    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    e.preventDefault();
                    dropdowns.forEach(other => {
                        if (other !== dropdown) other.classList.remove('active');
                    });
                    dropdown.classList.toggle('active');
                }
            });
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        }
    });

    /* =========================================
       3. FOOTER YEAR LOGIC
       ========================================= */
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    /* =========================================
       4. VIDEO GALLERY LOGIC (UPDATED)
       ========================================= */
    const allVideos = document.querySelectorAll('.video-player');
    const allOverlays = document.querySelectorAll('.video-play-overlay');

    // Helper: Pause all other videos
    function pauseOtherVideos(currentVideo) {
        allVideos.forEach(v => {
            if (v !== currentVideo) {
                v.pause();
            }
        });
    }

    allOverlays.forEach(overlay => {
        const wrapper = overlay.closest('.video-wrapper');
        const video = wrapper ? wrapper.querySelector('.video-player') : null;

        if (!video) return;

        // --- 1. Play Button Logic ---
        overlay.addEventListener('click', function (e) {
            e.stopPropagation();
            pauseOtherVideos(video);
            video.controls = true; // Enable native controls
            video.play();
        });

        // --- 2. State Syncing (The Fix) ---
        
        // When video plays (via button, click, or controls), HIDE overlay
        video.addEventListener('play', function() {
            overlay.style.display = 'none';
            pauseOtherVideos(video);
        });

        // When video pauses (via click or controls), SHOW overlay
        video.addEventListener('pause', function() {
            // Only show overlay if we aren't scrubbing/seeking through the video
            if (!video.seeking) {
                overlay.style.display = 'flex';
            }
        });

        // When video ends, reset everything
        video.addEventListener('ended', function() {
            video.load(); // Reset to poster
            video.controls = false; // Hide native controls
            overlay.style.display = 'flex'; // Show big button
        });
    });

});