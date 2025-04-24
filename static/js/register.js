document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    // Toggle password visibility
    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Phone number validation
    function validatePhone(phone) {
        const regex = /^(17|77)\d{6}$/;
        return regex.test(phone);
    }

    // Password validation (minimum 8 chars, at least 1 letter and 1 number)
    function validatePassword(password) {
        const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        return regex.test(password);
    }

    // Form validation
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        let isValid = true;

        // Reset error messages and styles
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');
        document.querySelectorAll('input').forEach(el => el.classList.remove('invalid', 'valid'));

        // Validate Full Name
        const fullName = document.getElementById('fullName').value.trim();
        if (!fullName) {
            document.getElementById('fullNameError').textContent = 'Full name is required';
            document.getElementById('fullName').classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('fullName').classList.add('valid');
        }

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

        // Validate Phone
        const phone = document.getElementById('phone').value.trim();
        if (!phone) {
            document.getElementById('phoneError').textContent = 'Phone number is required';
            document.getElementById('phone').classList.add('invalid');
            isValid = false;
        } else if (!validatePhone(phone)) {
            document.getElementById('phoneError').textContent = 'Phone must be 8 digits starting with 17 or 77';
            document.getElementById('phone').classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('phone').classList.add('valid');
        }

        // Validate Password
        const password = passwordInput.value;
        if (!password) {
            document.getElementById('passwordError').textContent = 'Password is required';
            passwordInput.classList.add('invalid');
            isValid = false;
        } else if (!validatePassword(password)) {
            document.getElementById('passwordError').textContent = 'Password must be at least 8 characters with at least 1 letter and 1 number';
            passwordInput.classList.add('invalid');
            isValid = false;
        } else {
            passwordInput.classList.add('valid');
        }

        // Validate Confirm Password
        const confirmPassword = confirmPasswordInput.value;
        if (!confirmPassword) {
            document.getElementById('confirmPasswordError').textContent = 'Please confirm your password';
            confirmPasswordInput.classList.add('invalid');
            isValid = false;
        } else if (password !== confirmPassword) {
            document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
            confirmPasswordInput.classList.add('invalid');
            isValid = false;
        } else {
            confirmPasswordInput.classList.add('valid');
        }

        // If form is valid, submit it
        if (isValid) {
            // Here you would typically send the data to your server
            alert('Registration successful!');
            form.reset();
            document.querySelectorAll('input').forEach(el => el.classList.remove('valid'));
        }
    });

    // Real-time validation for phone number
    document.getElementById('phone').addEventListener('input', function() {
        const phone = this.value.trim();
        if (phone && !validatePhone(phone)) {
            document.getElementById('phoneError').textContent = 'Phone must be 8 digits starting with 17 or 77';
            this.classList.add('invalid');
        } else {
            document.getElementById('phoneError').textContent = '';
            this.classList.remove('invalid');
            if (phone) this.classList.add('valid');
        }
    });

    // Real-time validation for password
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        if (password && !validatePassword(password)) {
            document.getElementById('passwordError').textContent = 'Password must be at least 8 characters with at least 1 letter and 1 number';
            this.classList.add('invalid');
        } else {
            document.getElementById('passwordError').textContent = '';
            this.classList.remove('invalid');
            if (password) this.classList.add('valid');
        }
    });

    // Real-time validation for confirm password
    confirmPasswordInput.addEventListener('input', function() {
        const confirmPassword = this.value;
        const password = passwordInput.value;
        if (confirmPassword && password !== confirmPassword) {
            document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
            this.classList.add('invalid');
        } else {
            document.getElementById('confirmPasswordError').textContent = '';
            this.classList.remove('invalid');
            if (confirmPassword) this.classList.add('valid');
        }
    });
});

function signUp() {
    console.log("Ok")
    var _data = {
        full_name: document.getElementById("fullName").value,
        email: document.getElementById("email").value,
        phone_number: document.getElementById("phone").value,
        password: document.getElementById("password").value,
    };

    fetch("/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(_data)
    })
    .then(response => {
        if (response.status == 201) {
            window.open("/login", "_self");
        } else {
            return response.json().then(err => {
                alert("Registration failed: " + (err.error || "Unknown error"));
            });
        }
    })
    .catch(error => {
        alert("Something went wrong: " + error.message);
    });
}
