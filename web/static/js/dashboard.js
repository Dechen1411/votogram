document.addEventListener('DOMContentLoaded', function () {
    function showModal(message, type = 'success') {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="close" type="button" aria-label="Close">&times;</button>
                <h2>${type === 'success' ? 'Success' : 'Needs Attention'}</h2>
                <p class="${type === 'success' ? 'success-message' : 'error-message'}">${message}</p>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.remove();
            }
        });
    }

    function optionLetter(index) {
        return String.fromCharCode(65 + index);
    }

    function renumberOptions() {
        pollOptions.querySelectorAll('.option-input').forEach((option, index) => {
            option.querySelector('span').textContent = optionLetter(index);
            option.querySelector('input').placeholder = `Choice ${optionLetter(index)}`;
        });

        const canRemove = pollOptions.children.length > 2;
        pollOptions.querySelectorAll('.remove-option').forEach(button => {
            button.disabled = !canRemove;
        });
    }

    const createPollTab = document.getElementById('createPollTab');
    const joinPollTab = document.getElementById('joinPollTab');
    const createPollSection = document.getElementById('createPollSection');
    const joinPollSection = document.getElementById('joinPollSection');
    const pollOptions = document.getElementById('pollOptions');
    const addOptionBtn = document.getElementById('addOption');

    createPollTab.addEventListener('click', function () {
        createPollTab.classList.add('active');
        joinPollTab.classList.remove('active');
        createPollSection.classList.add('active');
        joinPollSection.classList.remove('active');
    });

    joinPollTab.addEventListener('click', function () {
        joinPollTab.classList.add('active');
        createPollTab.classList.remove('active');
        joinPollSection.classList.add('active');
        createPollSection.classList.remove('active');
    });

    addOptionBtn.addEventListener('click', function () {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-input';
        optionDiv.innerHTML = `
            <span></span>
            <input type="text" required>
            <button type="button" class="remove-option" aria-label="Remove option">x</button>
        `;
        pollOptions.appendChild(optionDiv);
        renumberOptions();
    });

    pollOptions.addEventListener('click', function (event) {
        if (!event.target.classList.contains('remove-option')) {
            return;
        }

        if (pollOptions.children.length > 2) {
            event.target.parentElement.remove();
            renumberOptions();
        }
    });

    document.querySelector('#createPollSection form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const titleInput = document.getElementById('pollTitle');
        const expiryInput = document.getElementById('pollExpiry');
        const optionsInputs = pollOptions.querySelectorAll('input');
        const title = titleInput.value.trim();
        const options = Array.from(optionsInputs).map(input => input.value.trim()).filter(Boolean);

        if (title === '' || options.length < 2 || !expiryInput.value) {
            showModal('Add a question, close time, and at least two choices.', 'error');
            return;
        }

        const localExpiry = new Date(expiryInput.value);
        if (localExpiry <= new Date()) {
            showModal('Choose a close time in the future.', 'error');
            return;
        }

        const utcExpiry = localExpiry.toISOString().slice(0, 16);

        try {
            const response = await fetch('/api/polls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, options, expiry: utcExpiry })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to create ballot');
            }

            const data = await response.json();
            const resultDiv = document.getElementById('pollResult');
            resultDiv.innerHTML = `
                <div class="poll-result-card">
                    <p>Ballot created. Share this poll key with voters:</p>
                    <div class="poll-key">
                        <span>${data.poll_key}</span>
                        <button type="button" class="copy-key" data-key="${data.poll_key}">Copy</button>
                    </div>
                </div>
            `;
            resultDiv.style.display = 'block';

            titleInput.value = '';
            expiryInput.value = '';
            while (pollOptions.children.length > 2) {
                pollOptions.lastElementChild.remove();
            }
            pollOptions.querySelectorAll('input').forEach(input => {
                input.value = '';
            });
            renumberOptions();
            showModal(`Ballot created. Poll key: ${data.poll_key}`, 'success');
        } catch (error) {
            showModal(error.message, 'error');
        }
    });

    document.addEventListener('click', async function (event) {
        if (!event.target.classList.contains('copy-key')) {
            return;
        }

        const key = event.target.dataset.key;
        try {
            await navigator.clipboard.writeText(key);
            event.target.textContent = 'Copied';
        } catch {
            event.target.textContent = 'Select Key';
        }
    });

    document.querySelector('#joinPollSection form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const pollKeyInput = document.getElementById('pollKey');
        const pollKey = pollKeyInput.value.trim().toUpperCase();
        if (!pollKey) {
            showModal('Enter the poll key from the ballot creator.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/polls/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poll_key: pollKey })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Invalid or expired poll key.');
            }

            const data = await response.json();
            window.location.href = `/vote?id=${data.poll_id}`;
        } catch (error) {
            showModal(error.message, 'error');
        }
    });

    const viewPollsBtn = document.getElementById('viewPollsBtn');
    const pollsModal = document.getElementById('pollsModal');
    const closeModal = document.getElementById('closeModal');
    const pollsList = document.getElementById('pollsList');

    viewPollsBtn.addEventListener('click', async function () {
        pollsList.innerHTML = '<div class="loading-input"></div>';
        pollsModal.style.display = 'flex';

        try {
            const response = await fetch('/api/polls/user', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const polls = await response.json();
            const pollItems = Array.isArray(polls) ? polls : [];
            pollsList.innerHTML = '';

            if (pollItems.length === 0) {
                pollsList.innerHTML = '<p class="info-message">No created polls yet.</p>';
                return;
            }

            pollItems.forEach(poll => {
                const pollItem = document.createElement('div');
                pollItem.className = 'poll-item';
                pollItem.innerHTML = `
                    <h3>${poll.title}</h3>
                    <p>Poll key: <strong>${poll.poll_key}</strong></p>
                    <p>Closes: ${poll.expiry}</p>
                `;
                pollsList.appendChild(pollItem);
            });
        } catch (error) {
            pollsList.innerHTML = `<p class="error-message">Failed to fetch polls: ${error.message}</p>`;
        }
    });

    closeModal.addEventListener('click', function () {
        pollsModal.style.display = 'none';
    });

    window.addEventListener('click', function (event) {
        if (event.target === pollsModal) {
            pollsModal.style.display = 'none';
        }
    });

    renumberOptions();
});
