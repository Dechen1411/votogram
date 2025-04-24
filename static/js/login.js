document.addEventListener('DOMContentLoaded', function() {
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
            // Here you would typically send the data to your server
            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                alert('Login successful! Redirecting to dashboard...');
                form.reset();
                submitBtn.innerHTML = '<span>Login</span><i class="fas fa-arrow-right"></i>';
                submitBtn.disabled = false;
                // In a real app, you would redirect here
                // window.location.href = 'dashboard.html';
            }, 1500);
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

    fetch("/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        if (response.ok) {
            // login successful, redirect or show message
            window.location.href = "/home";
        } else {
            return response.json().then(data => {
                alert(data.error || "Login failed");
            });
        }
    })
    .catch(error => {
        console.error("Login error:", error);
        alert("An error occurred while logging in.");
    });
}
