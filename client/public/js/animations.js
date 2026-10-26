
(() => {
    'use strict';

    function initAnimations() {
        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        // Enable hero entrance animations.
        document.documentElement.classList.add('nexora-motion-ready');

        const heroContent = document.querySelector('[data-hero-content]');
        const heroVisual = document.querySelector('[data-hero-visual]');

        if (reduceMotion) {
            document.querySelectorAll('.category-card').forEach(card => {
                card.classList.add('is-revealed');
            });
            return;
        }

        // Reveal category cards as they enter the viewport.
        const categoryCards = document.querySelectorAll('.category-card');

        if ('IntersectionObserver' in window && categoryCards.length) {
            document.documentElement.classList.add(
                'nexora-category-motion-ready'
            );

            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const index = Number(card.dataset.revealIndex || 0);

                        card.style.setProperty(
                            '--reveal-delay',
                            `${Math.min(index * 65, 390)}ms`
                        );

                        card.classList.add('is-revealed');
                        obs.unobserve(card);
                    }
                });
            }, {
                threshold: 0.12
            });

            categoryCards.forEach((card, index) => {
                card.dataset.revealIndex = String(index % 8);
                observer.observe(card);
            });
        } else {
            categoryCards.forEach(card => {
                card.classList.add('is-revealed');
            });
        }

        // Cart feedback is only triggered by an explicit success event.
        document.addEventListener('nexora:cart-updated', () => {
            document.querySelectorAll(
                '.floating-cart-count, .header-cart-count'
            ).forEach(badge => {
                badge.classList.remove('is-bumping');
                void badge.offsetWidth;
                badge.classList.add('is-bumping');
            });

            const toast = document.getElementById('nexoraToast');

            if (toast) {
                toast.textContent = 'Cart updated successfully.';
                toast.dataset.kind = 'success';
                toast.classList.add('is-visible');

                window.setTimeout(() => {
                    toast.classList.remove('is-visible');
                }, 2200);
            }
        });

        // Button press feedback; this does not pretend an item was added.
        document.addEventListener('pointerdown', event => {
            const button = event.target.closest('.cart-btn');

            if (button) {
                button.classList.add('is-pressed');
            }
        });

        ['pointerup', 'pointercancel'].forEach(type => {
            document.addEventListener(type, event => {
                const button = event.target.closest('.cart-btn');

                if (button) {
                    button.classList.remove('is-pressed');
                }
            });
        });

        // Prevent unused-variable warnings in editors that flag references.
        void heroContent;
        void heroVisual;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAnimations, {
            once: true
        });
    } else {
        initAnimations();
    }
})();


/* Nexora Food Hero Slideshow */
document.addEventListener("DOMContentLoaded", function () {
    const slideshow = document.querySelector(".hero-slideshow");

    if (!slideshow) return;

    const slides = slideshow.querySelectorAll(".hero-slide");
    const prevButton = slideshow.querySelector(".hero-slide-arrow.prev");
    const nextButton = slideshow.querySelector(".hero-slide-arrow.next");
    const dots = slideshow.querySelectorAll(".hero-slide-dots button");

    if (slides.length === 0) return;

    let currentIndex = 0;
    let slideInterval;

    function showSlide(index) {
        currentIndex = (index + slides.length) % slides.length;

        slides.forEach((slide, i) => {
            slide.classList.toggle("active", i === currentIndex);
        });

        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === currentIndex);
            dot.setAttribute(
                "aria-current",
                i === currentIndex ? "true" : "false"
            );
        });
    }

    function startSlideshow() {
        clearInterval(slideInterval);

        slideInterval = setInterval(function () {
            showSlide(currentIndex + 1);
        }, 4000);
    }

    function resetSlideshow() {
        startSlideshow();
    }

    if (prevButton) {
        prevButton.addEventListener("click", function () {
            showSlide(currentIndex - 1);
            resetSlideshow();
        });
    }

    if (nextButton) {
        nextButton.addEventListener("click", function () {
            showSlide(currentIndex + 1);
            resetSlideshow();
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener("click", function () {
            showSlide(index);
            resetSlideshow();
        });
    });

    slideshow.addEventListener("mouseenter", function () {
        clearInterval(slideInterval);
    });

    slideshow.addEventListener("mouseleave", startSlideshow);

    showSlide(0);
    startSlideshow();
});

/* Keep hero slideshow running when images are clicked */
document.addEventListener("DOMContentLoaded", function () {
    const slideshow = document.querySelector(".hero-slideshow");

    if (!slideshow) return;

    slideshow.querySelectorAll(".hero-slide").forEach(function (slide) {
        slide.addEventListener("click", function () {
            // Clicking an image should not stop the slideshow.
        });
    });
});