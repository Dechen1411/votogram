document.addEventListener('DOMContentLoaded', function () {
    // Tab switching
    const createPollTab = document.getElementById('createPollTab');
    const joinPollTab = document.getElementById('joinPollTab');
    const createPollSection = document.getElementById('createPollSection');
    const joinPollSection = document.getElementById('joinPollSection');

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

    // Dynamic poll options
    const pollOptions = document.getElementById('pollOptions');
    const addOptionBtn = document.getElementById('addOption');
    let optionCount = 2;

    addOptionBtn.addEventListener('click', function () {
        optionCount++;
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-input';
        optionDiv.innerHTML = `
            <input type="text" placeholder="Option ${optionCount}" required>
            <button type="button" class="remove-option">&times;</button>
        `;
        pollOptions.appendChild(optionDiv);

        if (optionCount > 2) {
            document.querySelectorAll('.remove-option').forEach(btn => btn.disabled = false);
        }
    });

    // Remove option
    pollOptions.addEventListener('click', function (e) {
        if (e.target.classList.contains('remove-option')) {
            if (pollOptions.children.length > 2) {
                e.target.parentElement.remove();
                optionCount--;

                if (optionCount === 2) {
                    document.querySelectorAll('.remove-option').forEach(btn => {
                        btn.disabled = true;
                    });
                }
            }
        }
    });

    // CREATE POLL submission
document.querySelector('#createPollSection form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const titleInput = document.getElementById('pollTitle');
    const expiryInput = document.getElementById('pollExpiry');
    const optionsInputs = pollOptions.querySelectorAll('input');

    const title = titleInput.value.trim();
    const options = Array.from(optionsInputs).map(input => input.value.trim()).filter(opt => opt);

    // Convert expiry to UTC
    const localExpiry = new Date(expiryInput.value);
    const now = new Date();
    if (localExpiry <= now) {
        alert('Expiry time must be in the future.');
        return;
    }
    const utcExpiry = localExpiry.toISOString().slice(0, 16); // Format: 2006-01-02T15:04

    if (title === '' || options.length < 2 || !expiryInput.value) {
        alert('Please fill all fields with at least 2 options.');
        return;
    }

    try {
        const res = await fetch('/api/polls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, options, expiry: utcExpiry })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Failed to create poll');
        }

        const data = await res.json();

        // Display the poll key on the page
        const resultDiv = document.getElementById('pollResult');
        resultDiv.textContent = `Poll created successfully! Your poll key is: ${data.poll_key}`;
        resultDiv.style.display = 'block';

        // Reset form fields
        titleInput.value = '';
        expiryInput.value = '';

        // Keep only 2 option inputs
        while (pollOptions.children.length > 2) {
            pollOptions.lastChild.remove();
        }

        // Reset the first two option inputs
        pollOptions.querySelectorAll('input').forEach((input, idx) => {
            input.value = '';
            input.placeholder = `Option ${idx + 1}`;
        });

        // Disable remove buttons if only 2 options
        document.querySelectorAll('.remove-option').forEach(btn => btn.disabled = true);

    } catch (err) {
        alert('Error: ' + err.message);
    }
});
    

   // JOIN POLL submission
document.querySelector('#joinPollSection form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const pollKey = document.getElementById('pollKey').value.trim();
    if (!pollKey) {
        alert('Please enter a valid poll key.');
        return;
    }

    try {
        const res = await fetch('/api/polls/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poll_key: pollKey })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Invalid poll key or expired poll.');
        }

        const data = await res.json();
        const pollID = data.poll_id;
        
        // Redirect to voting page with poll ID
        window.location.href = `/vote?id=${pollID}`;

    } catch (err) {
        alert('Error: ' + err.message);
    }
});
    
});
