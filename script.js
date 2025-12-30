// ===== SRL Academy - JAVASCRIPT =====

// Initialize Swiper
const initSwiper = () => {
    // Check if Swiper is defined and if the element exists
    if (typeof Swiper === 'undefined') return;
    if (!document.querySelector('.hero-slider')) return;

    const heroSwiper = new Swiper('.hero-slider', {
        // Optional parameters
        loop: true,
        effect: 'fade',
        speed: 1000,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },

        // If we need pagination
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },

        // Navigation arrows
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

        // Enable keyboard control
        keyboard: {
            enabled: true,
            onlyInViewport: true,
        },

        // Enable mousewheel control
        mousewheel: {
            forceToAxis: true,
        },

        // Enable touch events
        touchEventsTarget: 'container',

        // Enable lazy loading of images
        lazy: {
            loadPrevNext: true,
        },
    });

    // Pause autoplay when hovering over the slider
    const sliderContainer = document.querySelector('.hero-slider');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', () => {
            heroSwiper.autoplay.stop();
        });

        sliderContainer.addEventListener('mouseleave', () => {
            heroSwiper.autoplay.start();
        });
    }

    // Highlight current page in nav
    function setActiveNav() {
        if (!navLinkItems || navLinkItems.length === 0) return;
        const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        navLinkItems.forEach(link => {
            const href = (link.getAttribute('href') || '').split('/').pop().toLowerCase();
            const isHome = href === 'index.html' && (current === '' || current === 'index.html');
            if (href === current || isHome) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Run immediately
    setActiveNav();
};

// Preloader
// Initialize everything when the window loads
window.addEventListener('load', function () {
    // Hide Preloader First!
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        // Immediate fade out
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }

    // Initialize Swiper safely
    try {
        initSwiper();
    } catch (e) {
        console.error("Swiper init failed:", e);
    }
});

// Mobile Menu Toggle and Header Behavior
const header = document.querySelector('.header');
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const navLinkItems = document.querySelectorAll('.nav-links a');
const yearSpan = document.getElementById('current-year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// Toggle mobile menu
function toggleMobileMenu() {
    const isActive = navLinks.classList.toggle('active');
    const icon = mobileMenuBtn.querySelector('i');

    if (isActive) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
        document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
    } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        document.body.style.overflow = ''; // Re-enable scrolling
    }

    // Add/remove active class to header when menu is open
    header.classList.toggle('menu-open', isActive);

    // Sync ARIA
    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', String(isActive));
}

// Close mobile menu when clicking outside
function closeMobileMenu(event) {
    if (!navLinks.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        navLinks.classList.remove('active');
        const icon = mobileMenuBtn.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        document.body.style.overflow = '';
        header.classList.remove('menu-open');
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }
}

// Initialize mobile menu
if (mobileMenuBtn && navLinks) {
    // Toggle menu on button click
    mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to document
        toggleMobileMenu();
    });

    // Keyboard accessibility (Enter/Space)
    mobileMenuBtn.addEventListener('keydown', (e) => {
        const key = e.key;
        if (key === 'Enter' || key === ' ') {
            e.preventDefault();
            toggleMobileMenu();
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', closeMobileMenu);

    // Prevent clicks inside the menu from closing it
    navLinks.addEventListener('click', (e) => e.stopPropagation());

    // Close menu when clicking on a link
    navLinkItems.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 992) { // Only for mobile
                toggleMobileMenu();
            }
        });
    });
}

// Update header style on scroll
let lastScroll = 0;
const headerHeight = header ? header.offsetHeight : 0;

function handleScroll() {
    const currentScroll = window.pageYOffset;

    if (currentScroll <= 0) {
        // At top of page
        header.style.transform = 'translateY(0)';
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        return;
    }

    if (currentScroll > lastScroll && currentScroll > headerHeight) {
        // Scrolling down
        header.style.transform = `translateY(-${headerHeight}px)`;
        header.style.boxShadow = 'none';
    } else {
        // Scrolling up
        header.style.transform = 'translateY(0)';
        header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }

    lastScroll = currentScroll;
}

// Only add scroll event if header exists
if (header) {
    window.addEventListener('scroll', handleScroll, { passive: true });
}

// Back to Top Button
const backToTop = document.querySelector('.back-to-top');

window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        backToTop.classList.add('show');
    } else {
        backToTop.classList.remove('show');
    }
});

if (backToTop) {
    backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}


// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form handling (for contact and other forms)
const forms = document.querySelectorAll('form');
forms.forEach(form => {
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Basic form validation
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = '#ef4444';
            } else {
                input.style.borderColor = '#d1d5db';
            }
        });

        if (isValid) {
            // Show success message
            alert('Thank you for your enquiry. We will get back to you soon!');
            form.reset();
        } else {
            alert('Please fill in all required fields.');
        }
    });
});

// Add loading animation to buttons
document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
        if (this.getAttribute('href') === '#' || this.type === 'submit') {
            e.preventDefault();
        }

        // Add loading effect
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        this.disabled = true;

        setTimeout(() => {
            this.innerHTML = originalText;
            this.disabled = false;
        }, 2000);
    });
});

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.backdropFilter = 'blur(10px)';
    } else {
        header.style.background = '#ffffff';
        header.style.backdropFilter = 'none';
    }
});

// Animate numbers in hero stats
function animateNumbers() {
    const statNumbers = document.querySelectorAll('.stat-number');

    statNumbers.forEach(stat => {
        const target = parseInt(stat.textContent.replace(/\D/g, ''));
        const suffix = stat.textContent.replace(/\d/g, '');
        let current = 0;
        const increment = target / 50;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            stat.textContent = Math.floor(current) + suffix;
        }, 50);
    });
}

// Trigger number animation when hero section is visible
const heroSection = document.querySelector('.hero');
if (heroSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateNumbers();
                observer.unobserve(entry.target);
            }
        });
    });
    observer.observe(heroSection);
}
