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

    // Avatar upload
    changeAvatarBtn.addEventListener('click', () => avatarUpload.click());
    avatarUpload.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;

        // Upload to server
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const res = await fetch('/api/upload-avatar', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            console.log('Avatar upload response:', data); // Log response for debugging
            if (res.ok) {
                // Update image only on success
                profileAvatar.src = data.avatarPath;
                alert(data.message);
            } else {
                console.error('Avatar upload error:', data);
                alert(data.error || data.message || 'Avatar upload failed');
            }
        } catch (err) {
            console.error('Avatar upload failed:', err);
            alert('An unexpected error occurred during avatar upload.');
        }
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
        const colors = ['#b42318', '#c4821f', '#197c7a', '#176b4d'];
        const texts  = ['Very Weak', 'Weak', 'Good', 'Strong'];
        strengthBars.forEach((bar, i) => {
            bar.style.backgroundColor = i < score ? colors[score-1] : '#ddd';
        });
        strengthText.textContent = score ? texts[score-1] : 'Password Strength';
    });

    // Cancel -> reload to reset fields
    cancelBtn.addEventListener('click', () => window.location.reload());

    // Submit profile form
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newPwd = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmPassword').value;
        if (newPwd && newPwd !== confirm) {
            alert("New passwords don't match!");
            return;
        }

        const payload = {
            fullName: document.getElementById('fullName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            currentPassword: document.getElementById('currentPassword').value,
            newPassword: newPwd,
            confirmPassword: confirm
        };

        try {
            const res = await fetch('/update-profile', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            console.log('Profile update response:', data); // Log response for debugging
            if (res.ok) {
                alert(data.message);
                window.location.reload();
            } else {
                console.error('Profile update error:', data);
                alert(data.error || data.message || 'Update failed');
            }
        } catch (err) {
            console.error('Profile update failed:', err);
            alert('An unexpected error occurred.');
        }
    });
});
