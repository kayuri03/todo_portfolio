import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const mainForm = document.getElementById('todo-form');
    const mainInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    
    const filterNavItems = document.querySelectorAll('#filter-nav li');
    const viewTitle = document.getElementById('view-title');
    
    const listsToggle = document.getElementById('lists-toggle');
    const listsContainer = document.getElementById('lists-container');
    const customListsUl = document.getElementById('custom-lists');
    const newListForm = document.getElementById('new-list-form');

    let currentFilter = 'today';
    let currentListId = null;
    let cachedLists = [];

    if(taskList && mainForm) {
        init();

        async function init() {
            await loadLists();
            loadTasks();
        }

        // Sidebar Filter Navigation
        filterNavItems.forEach(item => {
            item.addEventListener('click', () => {
                filterNavItems.forEach(nav => nav.classList.remove('active'));
                document.querySelectorAll('#custom-lists li').forEach(li => li.classList.remove('active'));
                
                item.classList.add('active');
                currentFilter = item.dataset.filter;
                currentListId = null;
                
                viewTitle.innerText = item.innerText.split(' ')[1] ? item.innerText.split(/ (.+)/)[1] : item.innerText;
                
                toggleFormVisibility();
                loadTasks();
            });
        });

        // Collapsible Lists Section
        listsToggle.addEventListener('click', () => {
            listsToggle.classList.toggle('expanded');
            listsContainer.classList.toggle('expanded');
        });

        // Create New List
        newListForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = newListForm.querySelector('input');
            const name = nameInput.value.trim();
            if(!name) return;

            try {
                const newList = await api.createList(name);
                nameInput.value = '';
                await loadLists();
            } catch (err) {
                console.error('Error creating list:', err);
            }
        });

        // Main Task Submission
        mainForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = mainInput.value.trim();
            const priorityInput = document.getElementById('task-priority');
            const dateInput = document.getElementById('task-due-date');
            
            const priority = priorityInput ? priorityInput.value : 'None';
            const due_date = (dateInput && dateInput.value) ? dateInput.value + "T00:00:00Z" : null;
            if (!title) return;

            try {
                const newTask = await api.addTask(title, priority, due_date, null);
                // If we are in a specific list view, assign it immediately
                if (currentListId) {
                    await api.updateTask(newTask.id, { list_id: currentListId });
                }
                loadTasks();
                mainInput.value = '';
                if(priorityInput) priorityInput.value = 'None';
                if(dateInput) dateInput.value = '';
            } catch (err) {
                console.error('Error adding task:', err);
            }
        });
    }

    // Load Lists into Sidebar
    async function loadLists() {
        try {
            cachedLists = await api.fetchLists();
            customListsUl.innerHTML = '';
            cachedLists.forEach(list => {
                const li = document.createElement('li');
                li.innerText = `# ${list.name}`;
                li.dataset.id = list.id;
                if(currentListId == list.id) li.classList.add('active');
                
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    filterNavItems.forEach(nav => nav.classList.remove('active'));
                    document.querySelectorAll('#custom-lists li').forEach(el => el.classList.remove('active'));
                    
                    li.classList.add('active');
                    currentListId = list.id;
                    currentFilter = 'list';
                    viewTitle.innerText = list.name;
                    
                    toggleFormVisibility();
                    loadTasks();
                });
                customListsUl.appendChild(li);
            });
        } catch (err) {
            console.error('Error loading lists:', err);
        }
    }

    function toggleFormVisibility() {
        if (currentFilter === 'archived') {
            mainForm.style.display = 'none';
        } else {
            mainForm.style.display = 'flex';
        }
    }

    async function loadTasks() {
        try {
            const isArchived = currentFilter === 'archived';
            const tasks = await api.fetchTasks(isArchived, currentListId);
            taskList.innerHTML = '';
            
            let filteredTasks = tasks;
            if (!isArchived && !currentListId) {
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
                filteredTasks.forEach(task => addTaskToDOM(task, false, taskList));
            }
        } catch (err) {
            console.error('Error loading tasks:', err);
        }
    }

    function addTaskToDOM(task, prepend = false, container) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;
        li.style.flexWrap = 'wrap';

        const priorityColorMap = {
            'High': 'rgba(239, 68, 68, 0.6)',
            'Medium': 'rgba(245, 158, 11, 0.6)',
            'Low': 'rgba(16, 185, 129, 0.6)',
            'None': 'transparent'
        };
        const priorityBadge = task.priority && task.priority !== 'None' 
            ? `<span class="badge priority-badge" style="background-color: ${priorityColorMap[task.priority]}">${task.priority}</span>` : '';
        
        let dateBadge = '';
        if (task.due_date) {
            const dateObj = new Date(task.due_date);
            const dateStr = dateObj.toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
            const isOverdue = dateObj < new Date() && !task.completed && currentFilter !== 'archived';
            dateBadge = `<span class="badge date-badge ${isOverdue ? 'overdue' : ''}">Due ${dateStr}</span>`;
        }

        // List Options for Dropdown
        let listOptions = `<option value="">No List</option>`;
        cachedLists.forEach(l => {
            listOptions += `<option value="${l.id}" ${task.list_id == l.id ? 'selected' : ''}>${l.name}</option>`;
        });

        const archiveSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
        const deleteSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>`;
        const expandSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

        li.innerHTML = `
            <div style="display:flex; width: 100%; align-items:flex-start;">
                <div class="task-content" style="align-items: flex-start; padding-top: 2px; flex: 1; cursor: pointer;">
                    <div class="custom-checkbox ${task.completed ? 'checked' : ''}" style="margin-top: 2px;"></div>
                    <div style="display:flex; flex-direction:column; gap:6px; flex: 1;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class="task-text">${escapeHTML(task.title)}</span>
                            <div class="expand-icon" style="transition: transform 0.2s;">${expandSvg}</div>
                        </div>
                        <div class="badges-container" style="display:flex; gap:8px; align-items:center;">
                            ${priorityBadge}
                            ${dateBadge}
                            <select class="task-list-selector" title="Move to list">
                                ${listOptions}
                            </select>
                        </div>
                    </div>
                </div>
                <button class="delete-btn" title="${task.archived ? 'Delete Permanently' : 'Archive Task'}">
                    ${task.archived ? deleteSvg : archiveSvg}
                </button>
            </div>
            <div class="subtask-container" style="display: none; width: 100%;">
                <ul class="subtask-list"></ul>
                <form class="subtask-form">
                    <input type="text" placeholder="Add a subtask..." required autocomplete="off">
                    <button type="submit">Add</button>
                </form>
            </div>
        `;

        const subtaskListContainer = li.querySelector('.subtask-list');
        const subtaskContainerNode = li.querySelector('.subtask-container');
        const expandIcon = li.querySelector('.expand-icon');
        const checkbox = li.querySelector('.custom-checkbox');
        const taskContentBody = li.querySelector('.task-text').parentElement.parentElement;
        const listSelector = li.querySelector('.task-list-selector');
        
        // Mount Subtasks
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(sub => addTaskToDOM(sub, false, subtaskListContainer));
            expandIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        } else {
            expandIcon.style.opacity = '0.3';
        }

        // Change List Event
        listSelector.addEventListener('click', (e) => e.stopPropagation());
        listSelector.addEventListener('change', async (e) => {
            const newListId = e.target.value || null;
            try {
                await api.updateTask(task.id, { list_id: newListId });
                // If we are currently filtering by a specific list and we move it out, remove from DOM
                if (currentListId && currentListId != newListId) {
                    li.classList.add('fade-out');
                    setTimeout(() => li.remove(), 400);
                }
            } catch (err) {
                console.error(err);
            }
        });

        // Expand/Collapse
        taskContentBody.addEventListener('click', (e) => {
            if (e.target === checkbox || e.target === listSelector) return;
            e.stopPropagation();
            const isExpanded = subtaskContainerNode.style.display === 'block';
            subtaskContainerNode.style.display = isExpanded ? 'none' : 'block';
            expandIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        // Subtask Form
        const subForm = li.querySelector('.subtask-form');
        subForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const titleInput = subForm.querySelector('input');
            const title = titleInput.value.trim();
            if (!title) return;
            try {
                const newSub = await api.addTask(title, 'None', null, task.id);
                addTaskToDOM(newSub, false, subtaskListContainer);
                titleInput.value = '';
                expandIcon.style.opacity = '1';
                expandIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
            } catch (err) {
                console.error(err);
            }
        });

        // Checkbox Logic (including shake validation)
        checkbox.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isCompleted = li.classList.contains('completed');
            
            if (!isCompleted) {
                const uncompletedSubs = Array.from(subtaskListContainer.querySelectorAll('.task-item:not(.fade-out):not(.completed)'));
                if (uncompletedSubs.length > 0) {
                    li.classList.remove('shake');
                    void li.offsetWidth;
                    li.classList.add('shake');
                    
                    subtaskContainerNode.style.display = 'block';
                    expandIcon.style.transform = 'rotate(180deg)';
                    uncompletedSubs.forEach(child => {
                        child.classList.add('highlight-red');
                        setTimeout(() => child.classList.remove('highlight-red'), 1500);
                    });
                    return;
                }
            }

            li.classList.toggle('completed');
            checkbox.classList.toggle('checked');
            try {
                await api.updateTaskStatus(task.id, !isCompleted);
            } catch (err) {
                li.classList.toggle('completed');
                checkbox.classList.toggle('checked');
            }
        });

        li.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            li.classList.add('fade-out');
            setTimeout(() => li.remove(), 400);
            try {
                if (task.archived) {
                    await api.deleteTask(task.id);
                } else {
                    await api.updateTaskStatus(task.id, task.completed, true);
                }
            } catch (err) { console.error(err); }
        });

        if (prepend) container.prepend(li);
        else container.appendChild(li);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                try {
                    const data = await api.uploadAvatar(e.target.files[0]);
                    if (data.success) window.location.reload();
                } catch(err) { console.error(err); }
            }
        });
    }
});
