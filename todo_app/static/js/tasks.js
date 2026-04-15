import { api } from './api.js?v=3.0';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('todo-form');
    const input = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    
    const filterNavItems = document.querySelectorAll('#filter-nav li');
    const viewTitle = document.getElementById('view-title');
    
    let currentFilter = 'today';
    let currentListId = null;
    let customListsData = [];
    let currentViewMode = 'list';

    const toggleListView = document.getElementById('toggle-list-view');
    const toggleBoardView = document.getElementById('toggle-board-view');
    const kanbanBoard = document.getElementById('kanban-board');
    const kanbanColumns = document.querySelectorAll('.kanban-column');

    if(taskList && form) {
        if (toggleListView && toggleBoardView) {
            const applyView = (mode) => {
                currentViewMode = mode;
                if(mode === 'list') {
                    toggleListView.classList.add('active');
                    toggleListView.style.background = 'rgba(59, 130, 246, 0.5)';
                    toggleListView.style.color = 'white';
                    toggleBoardView.classList.remove('active');
                    toggleBoardView.style.background = 'transparent';
                    toggleBoardView.style.color = 'var(--text-muted)';
                    taskList.style.display = 'block';
                    kanbanBoard.style.display = 'none';
                } else {
                    toggleBoardView.classList.add('active');
                    toggleBoardView.style.background = 'rgba(59, 130, 246, 0.5)';
                    toggleBoardView.style.color = 'white';
                    toggleListView.classList.remove('active');
                    toggleListView.style.background = 'transparent';
                    toggleListView.style.color = 'var(--text-muted)';
                    taskList.style.display = 'none';
                    kanbanBoard.style.display = 'flex';
                }
                loadTasks();
            };
            toggleListView.addEventListener('click', () => applyView('list'));
            toggleBoardView.addEventListener('click', () => applyView('board'));

            kanbanColumns.forEach(column => {
                column.addEventListener('dragover', e => { e.preventDefault(); column.classList.add('drag-zone-active'); });
                column.addEventListener('dragleave', e => { e.preventDefault(); column.classList.remove('drag-zone-active'); });
                column.addEventListener('drop', async e => {
                    e.preventDefault();
                    column.classList.remove('drag-zone-active');
                    const taskId = e.dataTransfer.getData('text/plain');
                    if (!taskId) return;
                    const newStatus = column.dataset.status;
                    const activeLi = document.querySelector(`.task-item[data-id="${taskId}"]`);
                    if (activeLi) {
                        column.querySelector('.kanban-task-list').appendChild(activeLi);
                        try {
                            const isCompleted = activeLi.classList.contains('completed');
                            await api.updateTaskStatus(taskId, isCompleted, null, undefined, newStatus);
                        } catch(err) { console.error('Kanban Sync failed', err); }
                    }
                });
            });
        }

        loadLists().then(() => loadTasks());

        const triggerAddTaskBtn = document.getElementById('trigger-add-task');
        const cancelAddTaskBtn = document.getElementById('cancel-add-btn');

        const resetTaskFormUI = () => {
            form.style.display = 'none';
            if (triggerAddTaskBtn) triggerAddTaskBtn.style.display = 'flex';
            input.value = '';
            const priorityInput = document.getElementById('task-priority');
            const dateInput = document.getElementById('task-due-date');
            if(priorityInput) priorityInput.value = 'None';
            if(dateInput) dateInput.value = '';
        };

        if (triggerAddTaskBtn && cancelAddTaskBtn) {
            triggerAddTaskBtn.addEventListener('click', () => {
                triggerAddTaskBtn.style.display = 'none';
                form.style.display = 'flex';
                input.focus();
            });
            cancelAddTaskBtn.addEventListener('click', resetTaskFormUI);
            input.addEventListener('keydown', (e) => {
                if(e.key === 'Escape') resetTaskFormUI();
            });
        }

        filterNavItems.forEach(item => {
            item.addEventListener('click', () => {
                filterNavItems.forEach(nav => nav.classList.remove('active'));
                const listsNav = document.getElementById('custom-lists-nav');
                if (listsNav) listsNav.querySelectorAll('li').forEach(nav => nav.classList.remove('active'));
                
                item.classList.add('active');
                currentFilter = item.dataset.filter;
                currentListId = null;
                viewTitle.innerText = item.innerText.split(' ')[1] ? item.innerText.split(/ (.+)/)[1] : item.innerText;
                
                const isArchived = currentFilter === 'archived';
                if(triggerAddTaskBtn) triggerAddTaskBtn.style.display = isArchived ? 'none' : 'flex';
                form.style.display = 'none';
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

            const targetListId = currentFilter === 'list' ? currentListId : null;

            try {
                await api.addTask(title, priority, due_date, null, targetListId);
                loadTasks();
                resetTaskFormUI();
            } catch (err) { console.error('Error adding task:', err); }
        });

        // v0.7.2 UI ERADICATION AND REWRITE UX flow
        const triggerAddList = document.getElementById('trigger-add-list');
        const addListContainer = document.getElementById('add-list-container');
        const listInput = document.getElementById('new-list-input');
        const submitListBtn = document.getElementById('submit-list-btn');

        if (triggerAddList && addListContainer) {
            triggerAddList.addEventListener('click', (e) => {
                e.stopPropagation(); // VERY CRITICAL logic shielding parent click execution!
                const isHidden = addListContainer.style.display === 'none';
                addListContainer.style.display = isHidden ? 'flex' : 'none';
                
                // Immediately highlight input box for spam adding
                if(isHidden) listInput.focus();
            });
            
            listInput.addEventListener('input', (e) => {
                submitListBtn.style.display = e.target.value.trim().length > 0 ? 'block' : 'none';
            });
            
            const processListAdd = async () => {
                const val = listInput.value.trim();
                if(!val) return;
                
                // Disable button momentarily to prevent duplicate submit fetches!
                submitListBtn.disabled = true;
                listInput.disabled = true;
                
                try {
                    const res = await api.addList(val);
                    if (res.error) {
                        alert(res.error);
                        submitListBtn.disabled = false;
                        listInput.disabled = false;
                        return;
                    }
                    // Flash inputs naturally
                    listInput.value = '';
                    submitListBtn.style.display = 'none';
                    submitListBtn.disabled = false;
                    listInput.disabled = false;
                    
                    // Maintain logic state looping
                    listInput.focus();
                    await loadLists();
                    loadTasks(); // Indestructible Dropdown UI sync
                } catch(err) { 
                    console.error('List creation error', err); 
                    alert("Error adding list. Ensure you are under the 10-list boundary.");
                    submitListBtn.disabled = false;
                    listInput.disabled = false;
                }
            };

            // Bulletproof Mouse Bindings
            submitListBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                await processListAdd();
            });

            // Bulletproof Keyboard Bindings
            listInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    await processListAdd();
                }
            });
        }

        // Accordion specific structural isolated handlers
        const listsHeaderContainer = document.getElementById('lists-header-container');
        const customListsContainer = document.getElementById('custom-lists-container');
        const listsToggleIcon = document.getElementById('lists-toggle-icon');
        
        if (listsHeaderContainer && customListsContainer) {
            listsHeaderContainer.addEventListener('click', () => {
                const isHidden = customListsContainer.style.display === 'none';
                customListsContainer.style.display = isHidden ? 'block' : 'none';
                
                // Safely rotate child icon without rotating parents
                if (listsToggleIcon) listsToggleIcon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
                
                // If closing, hide the form to prevent GUI layout hanging logic issues
                if (!isHidden && addListContainer) { addListContainer.style.display = 'none'; }
            });
        }
    }

    const avatarUpload = document.getElementById('avatar-upload');
    if (avatarUpload) {
        avatarUpload.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                try {
                    const data = await api.uploadAvatar(e.target.files[0]);
                    if (data.success) { window.location.reload(); }
                } catch(err) { console.error('Upload', err); }
            }
        });
    }

    async function loadLists() {
        const listsNav = document.getElementById('custom-lists-nav');
        if (!listsNav) return;
        try {
            customListsData = await api.fetchLists();
            listsNav.innerHTML = '';
            
            // Limit Validation Logic hook!
            const triggerAddListBtn = document.getElementById('trigger-add-list');
            const addListContNode = document.getElementById('add-list-container');
            if (triggerAddListBtn) {
                if (customListsData.length >= 10) {
                    triggerAddListBtn.style.display = 'none';
                    if (addListContNode) addListContNode.style.display = 'none';
                } else {
                    triggerAddListBtn.style.display = 'inline-block';
                }
            }
            
            customListsData.forEach(list => {
                const li = document.createElement('li');
                li.className = 'list-item-container';
                li.dataset.filter = 'list';
                li.dataset.listId = list.id;
                
                li.innerHTML = `
                    <span class="list-title" style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHTML(list.name)}</span>
                    <div class="list-actions">
                        <button class="list-action-btn list-edit-btn" title="Rename List">✏️</button>
                        <button class="list-action-btn list-delete-btn" title="Delete List">🗑️</button>
                    </div>
                `;
                
                if (currentFilter === 'list' && currentListId === list.id) {
                    li.classList.add('active');
                }
                
                const titleSpan = li.querySelector('.list-title');
                const editBtn = li.querySelector('.list-edit-btn');

                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const currentTitle = titleSpan.innerText;
                    li.innerHTML = `<input type="text" class="list-edit-input" value="${escapeHTML(currentTitle)}" />`;
                    const input = li.querySelector('.list-edit-input');
                    input.focus();
                    
                    const finishEdit = async () => {
                        const newName = input.value.trim();
                        if(newName && newName !== currentTitle) {
                            await api.renameList(list.id, newName);
                        }
                        await loadLists();
                        if (currentFilter === 'list' && currentListId === list.id) { viewTitle.innerText = newName; }
                        loadTasks(); 
                    };
                    
                    input.addEventListener('blur', finishEdit);
                    input.addEventListener('keydown', (evt) => {
                        if(evt.key === 'Enter') input.blur();
                        else if(evt.key === 'Escape') { input.value = currentTitle; input.blur(); }
                    });
                });

                const deleteBtn = li.querySelector('.list-delete-btn');
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    
                    // STAGE 1: Confirm List Deletion
                    li.innerHTML = `
                        <div style="display:flex; flex-direction:column; gap:6px; width:100%;">
                            <span style="font-size:0.85rem; color:var(--text-main);">Delete "${escapeHTML(list.name)}"?</span>
                            <div style="display:flex; gap:8px;">
                                <button class="btn-yes-list" style="flex:1; padding:4px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Yes</button>
                                <button class="btn-no-list" style="flex:1; padding:4px; background:var(--glass-bg); color:var(--text-main); border:none; border-radius:4px; cursor:pointer;">No</button>
                            </div>
                        </div>
                    `;
                    
                    li.querySelector('.btn-no-list').addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        loadLists(); // Reset back to normal
                    });
                    
                    li.querySelector('.btn-yes-list').addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        // STAGE 2: Confirm Tasks Cascading
                        li.innerHTML = `
                            <div style="display:flex; flex-direction:column; gap:6px; width:100%;">
                                <span style="font-size:0.8rem; color:var(--text-main);">Delete its tasks too?</span>
                                <div style="display:flex; gap:8px;">
                                    <button class="btn-yes-tasks" style="flex:1; padding:4px; background:#ef4444; color:white; border:none; border-radius:4px; cursor:pointer;">Yes</button>
                                    <button class="btn-no-tasks" style="flex:1; padding:4px; background:var(--glass-bg); color:var(--text-main); border:none; border-radius:4px; cursor:pointer;">No</button>
                                </div>
                            </div>
                        `;
                        
                        const executeDelete = async (deleteTasks) => {
                            await api.deleteList(list.id, deleteTasks);
                            if(currentFilter === 'list' && currentListId === list.id) {
                                currentFilter = 'today';
                                currentListId = null;
                                viewTitle.innerText = "Today";
                            }
                            await loadLists();
                            loadTasks();
                        };
                        
                        li.querySelector('.btn-yes-tasks').addEventListener('click', (ev2) => { ev2.stopPropagation(); executeDelete(true); });
                        li.querySelector('.btn-no-tasks').addEventListener('click', (ev2) => { ev2.stopPropagation(); executeDelete(false); });
                    });
                });
                
                li.addEventListener('click', (e) => {
                    if(e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
                    filterNavItems.forEach(nav => nav.classList.remove('active'));
                    listsNav.querySelectorAll('.list-item-container').forEach(nav => nav.classList.remove('active'));
                    li.classList.add('active');
                    
                    currentFilter = 'list';
                    currentListId = list.id;
                    viewTitle.innerText = list.name;
                    form.style.display = 'flex';
                    loadTasks();
                });

                // HTML5 Drag API targets
                li.addEventListener('dragover', (e) => {
                    e.preventDefault(); 
                    li.classList.add('drag-hover');
                });
                li.addEventListener('dragleave', () => {
                    li.classList.remove('drag-hover');
                });
                li.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    li.classList.remove('drag-hover');
                    const taskIdStr = e.dataTransfer.getData('text/plain');
                    if(!taskIdStr) return;
                    
                    const taskId = parseInt(taskIdStr);
                    const taskDOM = document.querySelector(`.task-item[data-id="${taskId}"]`);
                    const isCompleted = taskDOM ? taskDOM.classList.contains('completed') : false;
                    
                    try {
                        await api.updateTaskStatus(taskId, isCompleted, null, list.id);
                        
                        if (taskDOM && currentFilter === 'list' && currentListId !== list.id) {
                            taskDOM.classList.add('fade-out');
                            taskDOM.style.transition = 'all 0.4s ease';
                            setTimeout(() => taskDOM.remove(), 400); 
                        } else if (taskDOM) {
                            const inlineSelect = taskDOM.querySelector('.list-assign-dropdown');
                            if(inlineSelect) inlineSelect.value = list.id;
                        }
                        
                        li.style.transform = 'scale(1.05)';
                        setTimeout(() => li.style.transform = '', 200);
                    } catch(err) { console.error('Drag error', err); }
                });
                
                listsNav.appendChild(li);
            });
        } catch (err) { console.error('Lists API query fail', err); }
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
                if(kanbanColumns) kanbanColumns.forEach(col => col.querySelector('.kanban-task-list').innerHTML = '');
            } else {
                if(currentViewMode === 'list') {
                    filteredTasks.forEach(task => addTaskToDOM(task, false, taskList));
                } else {
                    if(kanbanColumns) kanbanColumns.forEach(col => col.querySelector('.kanban-task-list').innerHTML = '');
                    filteredTasks.forEach(task => {
                        const s = task.status || 'todo';
                        let targetCol = document.querySelector(`.kanban-column[data-status="${s}"] .kanban-task-list`);
                        if(!targetCol) targetCol = document.querySelector(`.kanban-column[data-status="todo"] .kanban-task-list`);
                        addTaskToDOM(task, false, targetCol);
                    });
                }
            }
        } catch (err) { console.error('Tasks API execution fall', err); }
    }

    function addTaskToDOM(task, prepend = false, container) {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;
        li.style.flexWrap = 'wrap';

        li.setAttribute('draggable', 'true');
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => { li.classList.remove('dragging'); });

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
        
        listSelect.addEventListener('change', async (e) => {
            e.stopPropagation();
            const selectTarget = e.target;
            const originalValue = task.list_id;
            const newListId = selectTarget.value ? parseInt(selectTarget.value) : null;
            
            task.list_id = newListId;
            try {
                await api.updateTaskStatus(task.id, task.completed, null, newListId !== null ? newListId : '');
                if (currentFilter === 'list' && currentListId !== newListId) {
                    li.classList.add('fade-out');
                    li.style.transition = 'all 0.4s ease';
                    setTimeout(() => li.remove(), 400);
                }
            } catch(err) {
                task.list_id = originalValue;
                selectTarget.value = originalValue || '';
            }
        });
        
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
