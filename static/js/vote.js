document.addEventListener('DOMContentLoaded', async function () {
    // Get poll ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const pollID = urlParams.get('id');
    
    if (!pollID) {
        alert('Invalid poll link');
        window.location.href = '/';
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
            alert('This poll has expired.');
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
        alert('Error loading poll: ' + error.message);
        window.location.href = '/home';
    }

    // Handle vote submission
    document.getElementById('voting-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        
        const selectedOption = document.querySelector('input[name="pollOption"]:checked');
        if (!selectedOption) {
            alert('Please select an option');
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

            alert('Your vote has been recorded successfully!');
            window.location.href = '/home'; // Redirect to home page after voting
        } catch (error) {
            alert('Error submitting vote: ' + error.message);
        }
    });
});