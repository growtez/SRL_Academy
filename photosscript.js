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
       2. DROPDOWN LOGIC (NO MOBILE MENU)
       ========================================= */
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
       4. VIDEO GALLERY LOGIC
       ========================================= */
    const allVideos = document.querySelectorAll('.video-player');
    const allOverlays = document.querySelectorAll('.video-play-overlay');

    function pauseOtherVideos(currentVideo) {
        allVideos.forEach(v => {
            if (v !== currentVideo) v.pause();
        });
    }

    allOverlays.forEach(overlay => {
        const wrapper = overlay.closest('.video-wrapper');
        const video = wrapper ? wrapper.querySelector('.video-player') : null;
        if (!video) return;

        overlay.addEventListener('click', function (e) {
            e.stopPropagation();
            pauseOtherVideos(video);
            video.controls = true;
            video.play();
        });

        video.addEventListener('play', function () {
            overlay.style.display = 'none';
            pauseOtherVideos(video);
        });

        video.addEventListener('pause', function () {
            if (!video.seeking) {
                overlay.style.display = 'flex';
            }
        });

        video.addEventListener('ended', function () {
            video.load();
            video.controls = false;
            overlay.style.display = 'flex';
        });
    });

});
