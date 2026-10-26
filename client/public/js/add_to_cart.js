document.addEventListener('DOMContentLoaded', function () {
    const CART_FORM_SELECTOR = '.home-featured-cart-form';
    const CART_ACTION_SELECTOR = '[data-cart-action]';

    const formatPrice = (amount) =>
        '৳' + Number(amount || 0).toFixed(2);

    function updateCartCounts(count) {
        document.querySelectorAll(
            '.header-cart-count, .floating-cart-count'
        ).forEach(function (element) {
            element.textContent = count;
        });

        const drawerCount = document.getElementById('drawerCartCount');

        if (drawerCount) {
            drawerCount.textContent = count;
        }
    }

    function renderEmptyCart(container) {
        const empty = document.createElement('div');
        empty.className = 'cart-drawer-empty';

        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '🛒';

        const heading = document.createElement('h3');
        heading.textContent = 'Your cart is empty';

        const message = document.createElement('p');
        message.textContent = 'Add products to see them here.';

        empty.append(icon, heading, message);
        container.replaceChildren(empty);
    }

    function makeActionButton(label, action, productId, ariaLabel) {
        const button = document.createElement('button');

        button.type = 'button';
        button.className =
            action === 'delete' ? 'cart-delete-btn' : 'cart-quantity-btn';

        button.textContent = label;
        button.dataset.cartAction = action;
        button.dataset.productId = productId;
        button.setAttribute('aria-label', ariaLabel);

        return button;
    }

    function renderCartItems(items) {
        const container = document.getElementById('cartDrawerItems');

        if (!container || !Array.isArray(items)) return;

        if (items.length === 0) {
            renderEmptyCart(container);
            return;
        }

        const fragment = document.createDocumentFragment();

        items.forEach(function (item) {
            const row = document.createElement('div');
            row.className = 'cart-drawer-item';

            const info = document.createElement('div');
            info.className = 'cart-drawer-item-info';

            const name = document.createElement('h3');
            name.textContent = item.name || 'Product';

            const price = document.createElement('p');
            price.textContent = formatPrice(item.price) + ' each';

            info.append(name, price);

            const details = document.createElement('div');
            details.className = 'cart-drawer-item-quantity';

            const controls = document.createElement('div');
            controls.className = 'cart-quantity-controls';

            const productId = String(item.product_id ?? '');

            const minus = makeActionButton(
                '−', 'decrease', productId, 'Decrease quantity'
            );

            const quantity = document.createElement('span');
            quantity.className = 'cart-quantity-value';
            quantity.textContent = 'Qty: ' + Number(item.quantity || 0);

            const plus = makeActionButton(
                '+', 'increase', productId, 'Increase quantity'
            );

            controls.append(minus, quantity, plus);

            const lineTotal = document.createElement('strong');
            lineTotal.textContent = formatPrice(item.lineTotal);

            const remove = makeActionButton(
                'Delete', 'delete', productId, 'Remove product'
            );

            details.append(controls, lineTotal, remove);
            row.append(info, details);
            fragment.appendChild(row);
        });

        container.replaceChildren(fragment);
    }

    function updateSubtotal(amount) {
        const subtotal = document.getElementById('cartDrawerSubtotal');

        if (subtotal) {
            subtotal.textContent = formatPrice(amount);
        }
    }

    function applyCartResponse(data) {
        updateCartCounts(data.cartCount);
        renderCartItems(data.items);
        updateSubtotal(data.cartSubtotal);
    }

    async function postForm(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: body
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Cart request failed.');
        }

        return data;
    }

    // Add products without refreshing the page.
    document.querySelectorAll(CART_FORM_SELECTOR).forEach(function (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();

            const button = form.querySelector('button[type="submit"]');

            if (!button || button.disabled) return;

            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = 'Adding...';

            try {
                const data = await postForm(
                    form.action,
                    new FormData(form)
                );

                applyCartResponse(data);
                button.textContent = 'Added ✓';

            } catch (error) {
                console.error('Add to Cart error:', error);
                button.textContent = 'Try Again';

            } finally {
                setTimeout(function () {
                    button.textContent = originalText;
                    button.disabled = false;
                }, 1200);
            }
        });
    });

    // Update quantity or remove products without refreshing.
    document.addEventListener('click', async function (event) {
        const button = event.target.closest(CART_ACTION_SELECTOR);

        if (!button || button.disabled) return;

        const action = button.dataset.cartAction;
        const productId = button.dataset.productId;

        if (!action || !productId) return;

        button.disabled = true;

        try {
            const body = new URLSearchParams({
                action: action,
                product_id: productId
            });

            const data = await postForm('cart/update.php', body);

            applyCartResponse(data);

        } catch (error) {
            console.error('Cart update error:', error);
            alert('Could not update cart. Please try again.');

        } finally {
            // The button may have been removed during rendering.
            if (button.isConnected) {
                button.disabled = false;
            }
        }
    });
});
