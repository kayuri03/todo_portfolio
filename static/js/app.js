document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');

    // Fetch initial tasks
    fetchTasks();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = input.value.trim();
        if (!title) return;

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            const newTask = await res.json();
            
            // Add to UI
            addTaskToDOM(newTask, true);
            input.value = '';
        } catch (err) {
            console.error('Error adding task:', err);
        }
    });

    async function fetchTasks() {
        try {
            const res = await fetch('/api/tasks');
            const tasks = await res.json();
            taskList.innerHTML = '';
            tasks.forEach(task => addTaskToDOM(task, false));
        } catch (err) {
            console.error('Error fetching tasks:', err);
        }
    }

    function addTaskToDOM(task, prepend = false) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <div class="task-content" onclick="toggleTask(${task.id}, this.parentElement)">
                <div class="custom-checkbox ${task.completed ? 'checked' : ''}"></div>
                <span class="task-text">${escapeHTML(task.title)}</span>
            </div>
            <button class="delete-btn" onclick="deleteTask(${task.id}, this.parentElement)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
            </button>
        `;

        if (prepend) {
            taskList.prepend(li);
        } else {
            taskList.appendChild(li);
        }
    }

    window.toggleTask = async (id, liElement) => {
        const isCompleted = liElement.classList.contains('completed');
        const newStatus = !isCompleted;

        // Optimistic UI update
        liElement.classList.toggle('completed');
        const checkbox = liElement.querySelector('.custom-checkbox');
        checkbox.classList.toggle('checked');

        try {
            await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: newStatus })
            });
        } catch (err) {
            console.error('Error updating task:', err);
            // Revert on error
            liElement.classList.toggle('completed');
            checkbox.classList.toggle('checked');
        }
    };

    window.deleteTask = async (id, liElement) => {
        // Apply fade-out animation and wait
        liElement.classList.add('fade-out');
        liElement.style.transition = 'all 0.4s ease';

        setTimeout(() => {
            liElement.remove();
        }, 400); // 400ms match css transition

        try {
            await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    // Prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }
});
