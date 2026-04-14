import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');

    if(taskList && form) {
        loadTasks();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = input.value.trim();
            if (!title) return;

            try {
                const newTask = await api.addTask(title);
                addTaskToDOM(newTask, true);
                input.value = '';
            } catch (err) {
                console.error('Error adding task:', err);
            }
        });
    }

    async function loadTasks() {
        try {
            const tasks = await api.fetchTasks();
            taskList.innerHTML = '';
            tasks.forEach(task => addTaskToDOM(task, false));
        } catch (err) {
            console.error('Error loading tasks:', err);
        }
    }

    function addTaskToDOM(task, prepend = false) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <div class="task-content">
                <div class="custom-checkbox ${task.completed ? 'checked' : ''}"></div>
                <span class="task-text">${escapeHTML(task.title)}</span>
            </div>
            <button class="delete-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
            </button>
        `;

        li.querySelector('.task-content').addEventListener('click', async () => {
            const isCompleted = li.classList.contains('completed');
            li.classList.toggle('completed');
            li.querySelector('.custom-checkbox').classList.toggle('checked');
            try {
                await api.updateTaskStatus(task.id, !isCompleted);
            } catch (err) {
                li.classList.toggle('completed');
                li.querySelector('.custom-checkbox').classList.toggle('checked');
            }
        });

        li.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            li.classList.add('fade-out');
            li.style.transition = 'all 0.4s ease';
            setTimeout(() => li.remove(), 400);
            try {
                await api.deleteTask(task.id);
            } catch (err) {
                console.error(err);
            }
        });

        if (prepend) {
            taskList.prepend(li);
        } else {
            taskList.appendChild(li);
        }
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }
});
