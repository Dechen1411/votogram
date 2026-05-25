document.addEventListener('DOMContentLoaded', async function () {
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
            if (type === 'error') {
                window.location.href = '/home';
            }
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                if (type === 'error') {
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

    // Get poll ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const pollID = urlParams.get('id');

    if (!pollID) {
        showModal('Invalid poll link', 'error');
        return;
    }

    try {
        // Fetch poll details
        const response = await fetch(`/api/polls/${pollID}`);
        if (!response.ok) {
            throw new Error('Failed to load poll');
        }

        const pollData = await response.json();

        // Check if poll has expired
        const expiryDate = new Date(pollData.expires_at);
        const now = new Date();
        if (now > expiryDate) {
            showModal('This poll has expired.', 'error');
            document.getElementById('voting-form').style.display = 'none';
            return;
        }

        // Display poll info
        document.getElementById('poll-title').textContent = pollData.title;

        // Format expiry date in local timezone (UTC+06:00)
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Dhaka' // UTC+06:00
        };
        const formattedExpiry = expiryDate.toLocaleString('en-US', options);
        document.getElementById('poll-expiry').textContent = `Closes on ${formattedExpiry}`;

        // Create options
        const optionsContainer = document.getElementById('options-container');
        pollData.options.forEach(option => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'voting-option';
            optionDiv.innerHTML = `
                <input type="radio" name="pollOption" id="option-${option.id}" value="${option.id}" required>
                <label for="option-${option.id}">${option.text}</label>
            `;
            optionsContainer.appendChild(optionDiv);
        });
    } catch (error) {
        showModal('Error loading poll: ' + error.message, 'error');
        return;
    }

    // Handle vote submission
    document.getElementById('voting-form').addEventListener('submit', async function (e) {
        e.preventDefault();

        const selectedOption = document.querySelector('input[name="pollOption"]:checked');
        if (!selectedOption) {
            showModal('Please select an option', 'error');
            return;
        }

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    poll_id: parseInt(pollID),
                    option_id: parseInt(selectedOption.value)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to submit vote');
            }

            showModal('Your vote has been recorded successfully!', 'success');
        } catch (error) {
            showModal('Error submitting vote: ' + error.message, 'error');
        }
    });
});