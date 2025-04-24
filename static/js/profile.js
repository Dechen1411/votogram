document.addEventListener('DOMContentLoaded', function() {
    const profileForm     = document.getElementById('profileForm');
    const cancelBtn       = document.getElementById('cancelBtn');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUpload    = document.getElementById('avatarUpload');
    const profileAvatar   = document.getElementById('profileAvatar');
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    const newPasswordInput   = document.getElementById('newPassword');
    const strengthBars       = document.querySelectorAll('.strength-bar');
    const strengthText       = document.querySelector('.strength-text');

    // Avatar preview (no server upload yet)
    changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => profileAvatar.src = ev.target.result;
        reader.readAsDataURL(file);
    });

    // Toggle visibility for all password fields
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            btn.classList.toggle('fa-eye-slash');
        });
    });

    // Password strength meter
    newPasswordInput.addEventListener('input', function() {
        const pwd = this.value;
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/\d/.test(pwd)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        const colors = ['#ff4d4d','#ff9800','#4CAF50','#28a745'];
        const texts  = ['Very Weak','Weak','Good','Strong'];
        strengthBars.forEach((bar,i) => {
            bar.style.backgroundColor = i < score ? colors[score-1] : '#ddd';
        });
        strengthText.textContent = score ? texts[score-1] : 'Password Strength';
    });

    // Cancel → reload to reset fields to template-injected values
    cancelBtn.addEventListener('click', () => window.location.reload());

    // Submit → POST to /update-profile
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Basic password match check
        const newPwd = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        if (newPwd && newPwd !== confirm) {
            return alert("New passwords don't match!");
        }

        const payload = {
            fullName:       document.getElementById('fullName').value.trim(),
            phone:          document.getElementById('phone').value.trim(),
            currentPassword: document.getElementById('currentPassword').value,
            newPassword:     newPwd,
            confirmPassword: confirm
        };

        try {
            const res = await fetch('/update-profile', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                window.location.reload();
            } else {
                alert(data.error || data.message || 'Update failed');
            }
        } catch (err) {
            console.error(err);
            alert('An unexpected error occurred.');
        }
    });
});
