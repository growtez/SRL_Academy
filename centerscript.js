// Mobile Menu Toggle Functionality
document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const header = document.querySelector('.header');
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // Check if elements exist before adding event listeners
    if (mobileMenuBtn && navLinks && header) {
        // Mobile Menu Toggle
        mobileMenuBtn.addEventListener('click', function () {
            navLinks.classList.toggle('active');
            header.classList.toggle('menu-open');

            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close menu when clicking on navigation links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', function () {
                // FIX: Don't close the menu if the user clicked "More"
                if (this.classList.contains('dropdown-toggle')) return;

                navLinks.classList.remove('active');
                header.classList.remove('menu-open');

                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                header.classList.remove('menu-open');

                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        });

        // Close menu on window resize (when switching from mobile to desktop)
        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) {
                navLinks.classList.remove('active');
                header.classList.remove('menu-open');

                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        });
    }

    // SwiperJS Initialization
    const centerSliders = document.querySelectorAll('.center-slider');
    centerSliders.forEach(slider => {
        new Swiper(slider, {
            loop: true,
            pagination: {
                el: slider.querySelector('.swiper-pagination'),
                clickable: true,
            },
            navigation: {
                nextEl: slider.querySelector('.swiper-button-next'),
                prevEl: slider.querySelector('.swiper-button-prev'),
            },
            // autoplay: {
            //   delay: 3000,
            //   disableOnInteraction: false,
            //   pauseOnMouseEnter: false
            // }
        });
    });
});

// Back to top functionality
window.addEventListener('scroll', function () {
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }
});

// Back to top button click event
document.addEventListener('DOMContentLoaded', function () {
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Hide preloader when page loads
window.addEventListener('load', function () {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
});

document.addEventListener('DOMContentLoaded', function () {
    
    /* =========================================
       FIXED DROPDOWN LOGIC (Universal)
       ========================================= */
    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector(".dropdown-toggle");
        if (!toggle) return;

        // Accessibility Attributes
        toggle.setAttribute("aria-haspopup", "true");
        toggle.setAttribute("aria-expanded", "false");

        // Function to toggle dropdown
        const toggleMenu = (e) => {
            e.preventDefault();
            e.stopPropagation(); // Stop click from bubbling to document

            const isOpen = dropdown.classList.contains("open");

            // Close all other open dropdowns first (accordion style)
            document.querySelectorAll(".dropdown.open").forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove("open");
                    const t = d.querySelector(".dropdown-toggle");
                    if (t) t.setAttribute("aria-expanded", "false");
                }
            });

            // Toggle current
            dropdown.classList.toggle("open");
            toggle.setAttribute("aria-expanded", !isOpen);
        };

        // 1. Click Event (Works on Mobile AND Desktop clicks)
        toggle.addEventListener("click", toggleMenu);

        // 2. Keyboard Support (Enter / Space)
        toggle.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") {
                toggleMenu(e);
            }
        });
    });

    // Close dropdown when clicking outside (Universal)
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".dropdown")) {
            document.querySelectorAll(".dropdown.open").forEach(dropdown => {
                dropdown.classList.remove("open");
                const toggle = dropdown.querySelector(".dropdown-toggle");
                if (toggle) toggle.setAttribute("aria-expanded", "false");
            });
        }
    });
});