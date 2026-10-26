document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('shopCategoryToggle');
    const panel = document.getElementById('shopCategoryPanel');

    if (!toggle || !panel) return;

    toggle.addEventListener('click', function () {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';

        if (isOpen) {
            panel.style.maxHeight = panel.scrollHeight + 'px';
            panel.style.opacity = '1';

            requestAnimationFrame(function () {
                panel.style.maxHeight = '0px';
                panel.style.opacity = '0';
            });

            toggle.setAttribute('aria-expanded', 'false');
            toggle.classList.remove('is-open');

            setTimeout(function () {
                if (toggle.getAttribute('aria-expanded') === 'false') {
                    panel.hidden = true;
                    panel.style.maxHeight = '';
                    panel.style.opacity = '';
                }
            }, 300);
        } else {
            panel.hidden = false;
            panel.style.maxHeight = '0px';
            panel.style.opacity = '0';

            requestAnimationFrame(function () {
                panel.style.maxHeight = panel.scrollHeight + 'px';
                panel.style.opacity = '1';
            });

            toggle.setAttribute('aria-expanded', 'true');
            toggle.classList.add('is-open');

            setTimeout(function () {
                if (toggle.getAttribute('aria-expanded') === 'true') {
                    panel.style.maxHeight = 'none';
                }
            }, 300);
        }
    });
});
