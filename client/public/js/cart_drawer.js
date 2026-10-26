document.addEventListener('DOMContentLoaded', function () {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    const closeButton = document.getElementById('closeCartDrawer');

    const cartTriggers = document.querySelectorAll(
        '.header-cart, .floating-cart'
    );

    // This page does not contain the drawer.
    // Skip drawer setup without breaking other page scripts.
    if (!drawer || !overlay || !closeButton) {
        return;
    }

    let lastFocusedElement = null;

    function openCartDrawer(event) {
        if (event) {
            event.preventDefault();
        }

        lastFocusedElement = document.activeElement;

        drawer.inert = false;
        drawer.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');

        drawer.classList.add('is-open');
        overlay.classList.add('is-open');
        document.body.classList.add('cart-drawer-open');

        closeButton.focus();
    }

    function closeCartDrawer() {
        drawer.classList.remove('is-open');
        overlay.classList.remove('is-open');
        document.body.classList.remove('cart-drawer-open');

        drawer.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');
        drawer.inert = true;

        if (lastFocusedElement) {
            lastFocusedElement.focus();
        }
    }

    cartTriggers.forEach(function (trigger) {
        trigger.addEventListener('click', openCartDrawer);
    });

    closeButton.addEventListener('click', closeCartDrawer);
    overlay.addEventListener('click', closeCartDrawer);

    document.addEventListener('keydown', function (event) {
        if (
            event.key === 'Escape' &&
            drawer.classList.contains('is-open')
        ) {
            closeCartDrawer();
        }
    });
});
