(function() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^(17|77)\d{6}$/;
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

    document.addEventListener('DOMContentLoaded', function() {
        const authLinks = document.querySelectorAll('a[href="/login"], a[href="/register"]');
        if (!authLinks.length) return;

        const modal = buildAuthModal();
        document.body.appendChild(modal);

        authLinks.forEach(link => {
            link.addEventListener('click', event => {
                if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                openAuthModal(link.getAttribute('href') === '/register' ? 'register' : 'login');
            });
        });

        modal.querySelectorAll('[data-auth-view]').forEach(button => {
            button.addEventListener('click', () => switchView(button.dataset.authView));
        });

        modal.querySelectorAll('[data-auth-close]').forEach(button => {
            button.addEventListener('click', closeAuthModal);
        });

        modal.querySelectorAll('[data-password-toggle]').forEach(button => {
            button.addEventListener('click', () => {
                const input = modal.querySelector(`#${button.dataset.passwordToggle}`);
                if (!input) return;
                input.type = input.type === 'password' ? 'text' : 'password';
                button.querySelector('i').classList.toggle('fa-eye-slash');
            });
        });

        modal.querySelector('[data-auth-form="login"]').addEventListener('submit', handleLogin);
        modal.querySelector('[data-auth-form="register"]').addEventListener('submit', handleRegister);

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.hidden) closeAuthModal();
        });

        function openAuthModal(view) {
            switchView(view);
            clearAllForms();
            modal.hidden = false;
            document.body.classList.add('auth-modal-open');
            requestAnimationFrame(() => {
                const firstInput = modal.querySelector(`[data-auth-form="${view}"] input`);
                if (firstInput) firstInput.focus();
            });
        }

        function closeAuthModal() {
            modal.hidden = true;
            document.body.classList.remove('auth-modal-open');
        }

        function switchView(view) {
            const isRegister = view === 'register';
            modal.querySelectorAll('.auth-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.authView === view);
            });
            modal.querySelector('[data-auth-form="login"]').hidden = isRegister;
            modal.querySelector('[data-auth-form="register"]').hidden = !isRegister;
            modal.querySelector('[data-auth-title]').textContent = isRegister ? 'Create your voter account' : 'Login to Votogram';
            modal.querySelector('[data-auth-copy]').textContent = isRegister
                ? 'Set up your profile, then create polls or vote with a shared poll key.'
                : 'Enter your account details to open your voting dashboard.';
            showMessage('', '');
            clearFieldStates(modal);
        }

        async function handleLogin(event) {
            event.preventDefault();
            const form = event.currentTarget;
            if (!validateLogin(form)) return;

            const submitButton = form.querySelector('button[type="submit"]');
            setLoading(submitButton, true, 'Logging in...');

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        email: form.querySelector('#authLoginEmail').value.trim(),
                        password: form.querySelector('#authLoginPassword').value
                    })
                });

                if (response.ok) {
                    showMessage('Login successful. Opening your dashboard...', 'success');
                    window.location.href = '/home';
                    return;
                }

                showMessage(await readError(response, 'Login failed'), 'error');
            } catch (error) {
                showMessage(`Login failed: ${error.message}`, 'error');
            } finally {
                setLoading(submitButton, false, 'Login');
            }
        }

        async function handleRegister(event) {
            event.preventDefault();
            const form = event.currentTarget;
            if (!validateRegister(form)) return;

            const submitButton = form.querySelector('button[type="submit"]');
            setLoading(submitButton, true, 'Creating account...');
            const email = form.querySelector('#authRegisterEmail').value.trim();

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        full_name: form.querySelector('#authRegisterName').value.trim(),
                        email: email,
                        phone_number: form.querySelector('#authRegisterPhone').value.trim(),
                        password: form.querySelector('#authRegisterPassword').value
                    })
                });

                if (response.status === 201) {
                    form.reset();
                    switchView('login');
                    modal.querySelector('#authLoginEmail').value = email;
                    showMessage('Account created. Login to continue.', 'success');
                    return;
                }

                showMessage(await readError(response, 'Registration failed'), 'error');
            } catch (error) {
                showMessage(`Registration failed: ${error.message}`, 'error');
            } finally {
                setLoading(submitButton, false, 'Register');
            }
        }

        function validateLogin(form) {
            let isValid = true;
            clearFieldStates(form);

            const email = form.querySelector('#authLoginEmail');
            const password = form.querySelector('#authLoginPassword');

            if (!email.value.trim()) {
                setError(email, 'Email is required');
                isValid = false;
            } else if (!emailPattern.test(email.value.trim())) {
                setError(email, 'Please enter a valid email');
                isValid = false;
            } else {
                setValid(email);
            }

            if (!password.value) {
                setError(password, 'Password is required');
                isValid = false;
            } else if (password.value.length < 8) {
                setError(password, 'Password must be at least 8 characters');
                isValid = false;
            } else {
                setValid(password);
            }

            return isValid;
        }

        function validateRegister(form) {
            let isValid = true;
            clearFieldStates(form);

            const name = form.querySelector('#authRegisterName');
            const email = form.querySelector('#authRegisterEmail');
            const phone = form.querySelector('#authRegisterPhone');
            const password = form.querySelector('#authRegisterPassword');
            const confirmPassword = form.querySelector('#authRegisterConfirmPassword');

            if (!name.value.trim()) {
                setError(name, 'Full name is required');
                isValid = false;
            } else {
                setValid(name);
            }

            if (!email.value.trim()) {
                setError(email, 'Email is required');
                isValid = false;
            } else if (!emailPattern.test(email.value.trim())) {
                setError(email, 'Please enter a valid email');
                isValid = false;
            } else {
                setValid(email);
            }

            if (!phone.value.trim()) {
                setError(phone, 'Phone number is required');
                isValid = false;
            } else if (!phonePattern.test(phone.value.trim())) {
                setError(phone, 'Phone must be 8 digits starting with 17 or 77');
                isValid = false;
            } else {
                setValid(phone);
            }

            if (!password.value) {
                setError(password, 'Password is required');
                isValid = false;
            } else if (!passwordPattern.test(password.value)) {
                setError(password, 'Use 8+ characters with at least 1 letter and 1 number');
                isValid = false;
            } else {
                setValid(password);
            }

            if (!confirmPassword.value) {
                setError(confirmPassword, 'Please confirm your password');
                isValid = false;
            } else if (password.value !== confirmPassword.value) {
                setError(confirmPassword, 'Passwords do not match');
                isValid = false;
            } else {
                setValid(confirmPassword);
            }

            return isValid;
        }

        function setError(input, message) {
            input.classList.remove('valid');
            input.classList.add('invalid');
            const error = input.closest('.auth-modal-field').querySelector('.auth-modal-error');
            error.textContent = message;
        }

        function setValid(input) {
            input.classList.remove('invalid');
            input.classList.add('valid');
        }

        function clearFieldStates(scope) {
            scope.querySelectorAll('input').forEach(input => input.classList.remove('invalid', 'valid'));
            scope.querySelectorAll('.auth-modal-error').forEach(error => {
                error.textContent = '';
            });
        }

        function clearAllForms() {
            showMessage('', '');
            clearFieldStates(modal);
        }

        function showMessage(message, type) {
            const alert = modal.querySelector('[data-auth-alert]');
            alert.textContent = message;
            alert.className = 'auth-modal-alert';
            if (message) alert.classList.add('show', type);
        }

        async function readError(response, fallback) {
            try {
                const data = await response.json();
                return data.error || data.message || fallback;
            } catch {
                return fallback;
            }
        }

        function setLoading(button, isLoading, label) {
            button.disabled = isLoading;
            button.innerHTML = isLoading
                ? `<i class="fas fa-spinner fa-spin"></i><span>${label}</span>`
                : `<span>${label}</span><i class="fas fa-arrow-right"></i>`;
        }
    });

    function buildAuthModal() {
        const modal = document.createElement('div');
        modal.className = 'auth-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="auth-modal-backdrop" data-auth-close></div>
            <section class="auth-modal-panel" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
                <button type="button" class="auth-modal-close" data-auth-close aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>
                <aside class="auth-modal-side">
                    <a href="/" class="logo">
                        <i class="fas fa-check-to-slot"></i>
                        Votogram
                    </a>
                    <div class="auth-modal-side-copy">
                        <span class="eyebrow">Ballot access</span>
                        <h2 id="authModalTitle" data-auth-title>Login to Votogram</h2>
                        <p data-auth-copy>Enter your account details to open your voting dashboard.</p>
                    </div>
                    <div class="auth-modal-mini">
                        <div><i class="fas fa-key"></i><span>Poll-key access</span></div>
                        <div><i class="fas fa-user-check"></i><span>One vote per poll</span></div>
                        <div><i class="fas fa-chart-bar"></i><span>Closed-poll results</span></div>
                    </div>
                </aside>
                <div class="auth-modal-main">
                    <div class="auth-modal-tabs" role="tablist" aria-label="Authentication">
                        <button type="button" class="auth-tab active" data-auth-view="login">Login</button>
                        <button type="button" class="auth-tab" data-auth-view="register">Register</button>
                    </div>
                    <div class="auth-modal-alert" data-auth-alert role="status"></div>

                    <form class="auth-modal-form" data-auth-form="login">
                        <div class="auth-modal-heading">
                            <span class="eyebrow">Voter desk</span>
                            <h3>Welcome back</h3>
                            <p>Open your dashboard to create polls, enter keys, and view results.</p>
                        </div>
                        <div class="auth-modal-field">
                            <label for="authLoginEmail">Email address</label>
                            <div class="auth-modal-input">
                                <i class="fas fa-envelope"></i>
                                <input type="email" id="authLoginEmail" autocomplete="email" placeholder="name@example.com" required>
                            </div>
                            <span class="auth-modal-error"></span>
                        </div>
                        <div class="auth-modal-field">
                            <label for="authLoginPassword">Password</label>
                            <div class="auth-modal-input">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="authLoginPassword" autocomplete="current-password" placeholder="Enter your password" required>
                                <button type="button" class="auth-modal-eye" data-password-toggle="authLoginPassword" aria-label="Toggle password visibility">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="auth-modal-error"></span>
                        </div>
                        <button type="submit" class="btn auth-modal-submit">
                            <span>Login</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                        <p class="auth-modal-switch">New here? <button type="button" data-auth-view="register">Create account</button></p>
                    </form>

                    <form class="auth-modal-form" data-auth-form="register" hidden>
                        <div class="auth-modal-heading">
                            <span class="eyebrow">Voter profile</span>
                            <h3>Create your account</h3>
                            <p>Register once, then create polls or vote with a shared key.</p>
                        </div>
                        <div class="auth-modal-field">
                            <label for="authRegisterName">Full name</label>
                            <div class="auth-modal-input">
                                <i class="fas fa-user"></i>
                                <input type="text" id="authRegisterName" autocomplete="name" placeholder="Your full name" required>
                            </div>
                            <span class="auth-modal-error"></span>
                        </div>
                        <div class="auth-modal-field">
                            <label for="authRegisterEmail">Email address</label>
                            <div class="auth-modal-input">
                                <i class="fas fa-envelope"></i>
                                <input type="email" id="authRegisterEmail" autocomplete="email" placeholder="name@example.com" required>
                            </div>
                            <span class="auth-modal-error"></span>
                        </div>
                        <div class="auth-modal-field">
                            <label for="authRegisterPhone">Phone number</label>
                            <div class="auth-modal-input">
                                <i class="fas fa-phone"></i>
                                <input type="tel" id="authRegisterPhone" autocomplete="tel" placeholder="17xxxxxx or 77xxxxxx" required>
                            </div>
                            <span class="auth-modal-error"></span>
                        </div>
                        <div class="auth-modal-field">
                            <label for="authRegisterPassword">Password</label>
                            <div class="auth-modal-input">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="authRegisterPassword" autocomplete="new-password" placeholder="Create a password" required>
                                <button type="button" class="auth-modal-eye" data-password-toggle="authRegisterPassword" aria-label="Toggle password visibility">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="auth-modal-error"></span>
                        </div>
                        <div class="auth-modal-field">
                            <label for="authRegisterConfirmPassword">Confirm password</label>
                            <div class="auth-modal-input">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="authRegisterConfirmPassword" autocomplete="new-password" placeholder="Repeat your password" required>
                                <button type="button" class="auth-modal-eye" data-password-toggle="authRegisterConfirmPassword" aria-label="Toggle password visibility">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <span class="auth-modal-error"></span>
                        </div>
                        <button type="submit" class="btn auth-modal-submit">
                            <span>Register</span>
                            <i class="fas fa-arrow-right"></i>
                        </button>
                        <p class="auth-modal-switch">Already registered? <button type="button" data-auth-view="login">Login instead</button></p>
                    </form>
                </div>
            </section>
        `;
        return modal;
    }
})();
