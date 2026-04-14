import { api } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    
    const filterNavItems = document.querySelectorAll('#filter-nav li');
    const viewTitle = document.getElementById('view-title');
    
    let currentFilter = 'today';
    let currentListId = null;
    let customListsData = [];

    if(taskList && form) {
        // v0.6.0 Load custom lists before loading tasks
        loadLists().then(() => loadTasks());

        // Standard Filters Listener
        filterNavItems.forEach(item => {
            item.addEventListener('click', () => {
                filterNavItems.forEach(nav => nav.classList.remove('active'));
                const listsNav = document.getElementById('custom-lists-nav');
                if (listsNav) listsNav.querySelectorAll('li').forEach(nav => nav.classList.remove('active'));
                
                item.classList.add('active');
                currentFilter = item.dataset.filter;
                currentListId = null;
                viewTitle.innerText = item.innerText.split(' ')[1] ? item.innerText.split(/ (.+)/)[1] : item.innerText;
                
                if (currentFilter === 'archived') {
                    form.style.display = 'none';
                } else {
                    form.style.display = 'flex';
                }
                loadTasks();
            });
        });

        // Add task mapping to correct bucket
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = input.value.trim();
            const priorityInput = document.getElementById('task-priority');
            const dateInput = document.getElementById('task-due-date');
            
            const priority = priorityInput ? priorityInput.value : 'None';
            const due_date = (dateInput && dateInput.value) ? dateInput.value + "T00:00:00Z" : null;
            if (!title) return;

            const targetListId = currentFilter === 'list' ? currentListId : null;

            try {
                await api.addTask(title, priority, due_date, null, targetListId);
                loadTasks();
                input.value = '';
                if(priorityInput) priorityInput.value = 'None';
                if(dateInput) dateInput.value = '';
            } catch (err) {
                console.error('Error adding task:', err);
            }
        });

        // Custom Lists Add Form
        const addListForm = document.getElementById('add-list-form');
        if (addListForm) {
            addListForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const listInput = document.getElementById('new-list-input');
                const val = listInput.value.trim();
                if(!val) return;
                try {
                    await api.addList(val);
                    listInput.value = '';
                    await loadLists();
                } catch(e) { console.error(e); }
            });
        }

        // Custom Lists Accordion
        const listsHeaderToggle = document.getElementById('lists-header-toggle');
        const customListsContainer = document.getElementById('custom-lists-container');
        if (listsHeaderToggle && customListsContainer) {
            listsHeaderToggle.addEventListener('click', () => {
                const isHidden = customListsContainer.style.display === 'none';
                customListsContainer.style.display = isHidden ? 'block' : 'none';
                listsHeaderToggle.querySelector('.lists-toggle-icon').style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
            });
        }
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

    async function loadLists() {
        const listsNav = document.getElementById('custom-lists-nav');
        if (!listsNav) return;
        try {
            customListsData = await api.fetchLists();
            listsNav.innerHTML = '';
            customListsData.forEach(list => {
                const li = document.createElement('li');
                li.dataset.filter = 'list';
                li.dataset.listId = list.id;
                li.innerText = escapeHTML(list.name);
                
                // Maintain active UX if we re-render while currently sitting inside a list filter
                if (currentFilter === 'list' && currentListId === list.id) {
                    li.classList.add('active');
                }
                
                li.addEventListener('click', () => {
                    filterNavItems.forEach(nav => nav.classList.remove('active'));
                    listsNav.querySelectorAll('li').forEach(nav => nav.classList.remove('active'));
                    li.classList.add('active');
                    
                    currentFilter = 'list';
                    currentListId = list.id;
                    viewTitle.innerText = li.innerText;
                    form.style.display = 'flex';
                    loadTasks();
                });
                
                listsNav.appendChild(li);
            });
        } catch (err) {
            console.error('Error loading custom lists', err);
        }
    }

    async function loadTasks() {
        try {
            const isArchived = currentFilter === 'archived';
            const listIdArg = currentFilter === 'list' ? currentListId : null;
            const tasks = await api.fetchTasks(isArchived, listIdArg);
            taskList.innerHTML = '';
            
            let filteredTasks = tasks;
            if (!isArchived && currentFilter !== 'list' && currentFilter !== 'all') {
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
        
        // Inline List Assignment Dropdown
        let listOptions = `<option value="">No List</option>`;
        customListsData.forEach(list => {
            const isSelected = task.list_id === list.id ? 'selected' : '';
            listOptions += `<option value="${list.id}" ${isSelected}>${escapeHTML(list.name)}</option>`;
        });
        const listDropdownHTML = `<select class="list-assign-dropdown" title="Assign to Custom List" style="margin-left: 4px;">${listOptions}</select>`;

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
                        <div class="badges-container" style="display:flex; align-items:center; flex-wrap:wrap; gap:8px;">
                            ${priorityBadge}
                            ${dateBadge}
                            ${listDropdownHTML}
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
        const listSelect = li.querySelector('.list-assign-dropdown');
        
        // Inline assignment event
        listSelect.addEventListener('change', async (e) => {
            e.stopPropagation();
            const selectTarget = e.target;
            const originalValue = task.list_id;
            const newListId = selectTarget.value ? parseInt(selectTarget.value) : null;
            
            task.list_id = newListId;
            try {
                // Submit list_id update explicitly
                await api.updateTaskStatus(task.id, task.completed, null, newListId !== null ? newListId : '');
                
                // If user is inside a mapped view, moving the task to another list should optionally remove it from DOM
                if (currentFilter === 'list' && currentListId !== newListId) {
                    li.classList.add('fade-out');
                    li.style.transition = 'all 0.4s ease';
                    setTimeout(() => li.remove(), 400);
                }
            } catch(err) {
                console.error(err);
                task.list_id = originalValue;
                selectTarget.value = originalValue || '';
            }
        });
        
        // Prevent dropdown click from triggering accordion expand
        listSelect.addEventListener('click', e => e.stopPropagation());

        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(sub => addTaskToDOM(sub, false, subtaskListContainer));
            expandIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        } else {
            expandIcon.style.opacity = '0.3';
        }

        taskContentBody.addEventListener('click', (e) => {
            if (e.target === checkbox) return; 
            e.stopPropagation();
            const isExpanded = subtaskContainerNode.style.display === 'block';
            subtaskContainerNode.style.display = isExpanded ? 'none' : 'block';
            expandIcon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        const subForm = li.querySelector('.subtask-form');
        subForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = subForm.querySelector('input').value.trim();
            if (!title) return;
            try {
                // subtasks implicitly inherit parent's list_id natively in our payload logic (or stay null via API flexibility)
                const newSub = await api.addTask(title, 'None', null, task.id, task.list_id);
                addTaskToDOM(newSub, false, subtaskListContainer);
                subForm.querySelector('input').value = '';
                expandIcon.style.opacity = '1';
                expandIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
            } catch (err) { console.error(err); }
        });

        checkbox.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isCompleted = li.classList.contains('completed');
            
            if (!isCompleted) {
                const subItemDOMs = Array.from(subtaskListContainer.querySelectorAll('.task-item:not(.fade-out)'));
                const uncompletedSubs = subItemDOMs.filter(domLi => !domLi.classList.contains('completed'));
                
                if (uncompletedSubs.length > 0) {
                    li.classList.remove('shake');
                    void li.offsetWidth; 
                    li.classList.add('shake');
                    
                    subtaskContainerNode.style.display = 'block'; 
                    expandIcon.style.transform = 'rotate(180deg)';
                    uncompletedSubs.forEach(child => {
                        child.classList.remove('highlight-red');
                        void child.offsetWidth;
                        child.classList.add('highlight-red');
                        setTimeout(() => child.classList.remove('highlight-red'), 1500);
                    });
                    return; 
                }
            }

            li.classList.toggle('completed');
            checkbox.classList.toggle('checked');
            try {
                await api.updateTaskStatus(task.id, !isCompleted, null, task.list_id);
            } catch (err) {
                li.classList.toggle('completed');
                checkbox.classList.toggle('checked');
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
            } catch (err) { console.error(err); }
        });

        if (prepend) { container.prepend(li); } 
        else { container.appendChild(li); }
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }
});
