document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const createPollTab = document.getElementById('createPollTab');
    const joinPollTab = document.getElementById('joinPollTab');
    const createPollSection = document.getElementById('createPollSection');
    const joinPollSection = document.getElementById('joinPollSection');

    createPollTab.addEventListener('click', function() {
        createPollTab.classList.add('active');
        joinPollTab.classList.remove('active');
        createPollSection.classList.add('active');
        joinPollSection.classList.remove('active');
    });

    joinPollTab.addEventListener('click', function() {
        joinPollTab.classList.add('active');
        createPollTab.classList.remove('active');
        joinPollSection.classList.add('active');
        createPollSection.classList.remove('active');
    });

    // Dynamic poll options
    const pollOptions = document.getElementById('pollOptions');
    const addOptionBtn = document.getElementById('addOption');
    let optionCount = 2;

    addOptionBtn.addEventListener('click', function() {
        optionCount++;
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-input';
        optionDiv.innerHTML = `
            <input type="text" placeholder="Option ${optionCount}" required>
            <button type="button" class="remove-option">&times;</button>
        `;
        pollOptions.appendChild(optionDiv);

        // Enable remove buttons when we have more than 2 options
        if (optionCount > 2) {
            const removeButtons = document.querySelectorAll('.remove-option');
            removeButtons.forEach(btn => btn.disabled = false);
        }
    });

    // Remove option
    pollOptions.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-option')) {
            if (pollOptions.children.length > 2) {
                e.target.parentElement.remove();
                optionCount--;
                
                // Disable remove buttons if we're back to 2 options
                if (optionCount === 2) {
                    document.querySelectorAll('.remove-option').forEach(btn => {
                        btn.disabled = true;
                    });
                }
            }
        }
    });

    // Form submission (prevent default for demo)
    document.querySelectorAll('.poll-form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Form submission would be handled by your backend');
        });
    });
});