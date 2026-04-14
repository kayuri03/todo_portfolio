import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    
    const filterNavItems = document.querySelectorAll('#filter-nav li');
    const viewTitle = document.getElementById('view-title');
    let currentFilter = 'today';

    if(taskList && form) {
        loadTasks();

        filterNavItems.forEach(item => {
            item.addEventListener('click', () => {
                filterNavItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                currentFilter = item.dataset.filter;
                viewTitle.innerText = item.innerText.split(' ')[1] ? item.innerText.split(/ (.+)/)[1] : item.innerText;
                
                if (currentFilter === 'archived') {
                    form.style.display = 'none';
                } else {
                    form.style.display = 'flex';
                }
                loadTasks();
            });
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = input.value.trim();
            const priorityInput = document.getElementById('task-priority');
            const dateInput = document.getElementById('task-due-date');
            
            const priority = priorityInput ? priorityInput.value : 'None';
            const due_date = (dateInput && dateInput.value) ? dateInput.value + "T00:00:00Z" : null;
            if (!title) return;

            try {
                const newTask = await api.addTask(title, priority, due_date);
                // only add if it matches the current view filter (simplest: just reload)
                loadTasks();
                input.value = '';
                if(priorityInput) priorityInput.value = 'None';
                if(dateInput) dateInput.value = '';
            } catch (err) {
                console.error('Error adding task:', err);
            }
        });
    }

    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                try {
                    const data = await api.uploadAvatar(file);
                    if (data.success) {
                        window.location.reload();
                    }
                } catch(err) {
                    console.error('Upload failed', err);
                }
            }
        });
    }

    async function loadTasks() {
        try {
            const isArchived = currentFilter === 'archived';
            const tasks = await api.fetchTasks(isArchived);
            taskList.innerHTML = '';
            
            let filteredTasks = tasks;
            if (!isArchived) {
                const now = new Date();
                now.setHours(0,0,0,0);
                
                if (currentFilter === 'today') {
                    filteredTasks = tasks.filter(t => {
                        if(!t.due_date) return false;
                        const d = new Date(t.due_date);
                        d.setHours(0,0,0,0);
                        return d.getTime() === now.getTime();
                    });
                } else if (currentFilter === 'week') {
                    const weekFromNow = new Date(now);
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    filteredTasks = tasks.filter(t => {
                        if(!t.due_date) return false;
                        const d = new Date(t.due_date);
                        d.setHours(0,0,0,0);
                        return d.getTime() >= now.getTime() && d.getTime() <= weekFromNow.getTime();
                    });
                }
            }
            
            if (filteredTasks.length === 0) {
                taskList.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No tasks found.</p>`;
            } else {
                filteredTasks.forEach(task => addTaskToDOM(task, false));
            }
        } catch (err) {
            console.error('Error loading tasks:', err);
        }
    }

    function addTaskToDOM(task, prepend = false) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        const priorityColorMap = {
            'High': 'rgba(239, 68, 68, 0.6)',
            'Medium': 'rgba(245, 158, 11, 0.6)',
            'Low': 'rgba(16, 185, 129, 0.6)',
            'None': 'transparent'
        };
        const priorityBadge = task.priority && task.priority !== 'None' 
            ? `<span class="badge priority-badge" style="background-color: ${priorityColorMap[task.priority]}">${task.priority}</span>` 
            : '';
        
        let dateBadge = '';
        if (task.due_date) {
            const dateObj = new Date(task.due_date);
            const dateStr = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
            const isOverdue = dateObj < new Date() && !task.completed && currentFilter !== 'archived';
            dateBadge = `<span class="badge date-badge ${isOverdue ? 'overdue' : ''}">Due ${dateStr}</span>`;
        }

        const archiveSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
        const deleteSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>`;

        li.innerHTML = `
            <div class="task-content" style="align-items: flex-start; padding-top: 2px;">
                <div class="custom-checkbox ${task.completed ? 'checked' : ''}" style="margin-top: 2px;"></div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    <span class="task-text">${escapeHTML(task.title)}</span>
                    <div class="badges-container" style="display:flex; gap:8px;">
                        ${priorityBadge}
                        ${dateBadge}
                    </div>
                </div>
            </div>
            <button class="delete-btn" title="${task.archived ? 'Delete Permanently' : 'Archive Task'}">
                ${task.archived ? deleteSvg : archiveSvg}
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
                if (task.archived) {
                    await api.deleteTask(task.id);
                } else {
                    await api.updateTaskStatus(task.id, task.completed, true);
                }
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
