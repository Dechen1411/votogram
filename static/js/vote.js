document.addEventListener('DOMContentLoaded', async function () {
    function showModal(message, type = 'success') {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close" type="button" aria-label="Close">&times;</button>
                <h2>${type === 'success' ? 'Vote Recorded' : 'Needs Attention'}</h2>
                <p class="${type === 'success' ? 'success-message' : 'error-message'}">${message}</p>
            </div>
        `;
        document.body.appendChild(modal);

        function close() {
            modal.remove();
            if (type === 'error') {
                window.location.href = '/home';
            }
        }

        modal.querySelector('.close').addEventListener('click', close);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                close();
            }
        });

        if (type === 'success') {
            setTimeout(() => {
                modal.remove();
                window.location.href = '/home';
            }, 1800);
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pollID = urlParams.get('id');

    if (!pollID) {
        showModal('Invalid ballot link.', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/polls/${pollID}`);
        if (!response.ok) {
            throw new Error('Failed to load ballot.');
        }

        const pollData = await response.json();
        const expiryDate = new Date(pollData.expires_at);
        if (new Date() > expiryDate) {
            showModal('This ballot is closed.', 'error');
            document.getElementById('voting-form').style.display = 'none';
            return;
        }

        const dateOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Dhaka'
        };

        document.getElementById('poll-title').textContent = pollData.title;
        document.getElementById('poll-expiry').textContent = `Closes ${expiryDate.toLocaleString('en-US', dateOptions)}`;

        const optionsContainer = document.getElementById('options-container');
        pollData.options.forEach(option => {
            const optionDiv = document.createElement('div');
            const input = document.createElement('input');
            const label = document.createElement('label');

            optionDiv.className = 'voting-option';
            input.type = 'radio';
            input.name = 'pollOption';
            input.id = `option-${option.id}`;
            input.value = option.id;
            input.required = true;
            label.htmlFor = input.id;
            label.textContent = option.text;

            optionDiv.appendChild(input);
            optionDiv.appendChild(label);
            optionsContainer.appendChild(optionDiv);
        });
    } catch (error) {
        showModal(`Error loading ballot: ${error.message}`, 'error');
        return;
    }

    document.getElementById('voting-form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const selectedOption = document.querySelector('input[name="pollOption"]:checked');
        if (!selectedOption) {
            showModal('Select one option before casting your vote.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    poll_id: parseInt(pollID, 10),
                    option_id: parseInt(selectedOption.value, 10)
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to submit vote.');
            }

            showModal('Your ballot has been recorded.', 'success');
        } catch (error) {
            showModal(`Error submitting vote: ${error.message}`, 'error');
        }
    });
});
