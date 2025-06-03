document.addEventListener('DOMContentLoaded', function() {
    // Function to create and show modal
    function showModal(message, type = 'success') {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">×</span>
                <h2>${type === 'success' ? 'Success' : 'Error'}</h2>
                <p class="${type === 'success' ? 'success-message' : 'error-message'}">${message}</p>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal on click
        modal.querySelector('.close').addEventListener('click', () => {
            modal.remove();
            if (type === 'success') {
                window.location.href = '/home';
            }
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (type === 'success') {
                    window.location.href = '/home';
                }
            }
        });

        // Auto-redirect on success after 2 seconds
        if (type === 'success') {
            setTimeout(() => {
                modal.remove();
                window.location.href = '/home';
            }, 2000);
        }
    }

    const form = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const togglePasswordIcon = document.querySelector('.toggle-password');

    // Toggle password visibility
    togglePasswordIcon.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye-slash');
    });

    // Form validation
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        let isValid = true;

        // Reset error messages and styles
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('input').forEach(el => el.classList.remove('invalid', 'valid'));

        // Validate Email
        const email = document.getElementById('email').value.trim();
        if (!email) {
            document.getElementById('emailError').textContent = 'Email is required';
            document.getElementById('email').classList.add('invalid');
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('emailError').textContent = 'Please enter a valid email';
            document.getElementById('email').classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('email').classList.add('valid');
        }

        // Validate Password
        const password = passwordInput.value;
        if (!password) {
            document.getElementById('passwordError').textContent = 'Password is required';
            passwordInput.classList.add('invalid');
            isValid = false;
        } else if (password.length < 6) {
            document.getElementById('passwordError').textContent = 'Password must be at least 6 characters';
            passwordInput.classList.add('invalid');
            isValid = false;
        } else {
            passwordInput.classList.add('valid');
        }

        // If form is valid, submit it
        if (isValid) {
            loginUser();
        }
    });

    // Real-time validation for email
    document.getElementById('email').addEventListener('input', function() {
        const email = this.value.trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('emailError').textContent = 'Please enter a valid email';
            this.classList.add('invalid');
        } else {
            document.getElementById('emailError').textContent = '';
            this.classList.remove('invalid');
            if (email) this.classList.add('valid');
        }
    });

    // Real-time validation for password
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        if (password && password.length < 6) {
            document.getElementById('passwordError').textContent = 'Password must be at least 6 characters';
            this.classList.add('invalid');
        } else {
            document.getElementById('passwordError').textContent = '';
            this.classList.remove('invalid');
            if (password) this.classList.add('valid');
        }
    });
});

function loginUser() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const loginData = {
        email: email,
        password: password
    };

    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        submitBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
        submitBtn.disabled = false;
        if (response.ok) {
            showModal('Login successful! Redirecting to dashboard...', 'success');
        } else {
            return response.json().then(data => {
                showModal(data.error || "Login failed", 'error');
            });
        }
    })
    .catch(error => {
        submitBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
        submitBtn.disabled = false;
        showModal("An error occurred while logging in: " + error.message, 'error');
    });
}