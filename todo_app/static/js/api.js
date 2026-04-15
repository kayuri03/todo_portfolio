export const api = {
    async fetchLists() {
        const res = await fetch('/api/lists');
        return await res.json();
    },
    async addList(name) {
        const res = await fetch('/api/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return await res.json();
    },
    async fetchTasks(archived = false, list_id = null) {
        let url = `/api/tasks?archived=${archived}`;
        if (list_id) url += `&list_id=${list_id}`;
        const res = await fetch(url);
        return await res.json();
    },
    async addTask(title, priority, due_date, parent_id = null, list_id = null) {
        const payload = { title, priority, due_date };
        if (parent_id) payload.parent_id = parent_id;
        if (list_id) payload.list_id = list_id;
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    },
    async updateTaskStatus(id, completed, archived = null, list_id = undefined, status = undefined) {
        const payload = { completed };
        if (archived !== null) payload.archived = archived;
        if (list_id !== undefined) payload.list_id = list_id;
        if (status !== undefined) payload.status = status;
        await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    async deleteTask(id) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    },
    async uploadAvatar(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await fetch('/api/profile/upload', {
            method: 'POST',
            body: formData
        });
        return await res.json();
    },

    async renameList(id, name) {
        const res = await fetch(`/api/lists/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return await res.json();
    },

    async deleteList(id, deleteTasks) {
        const res = await fetch(`/api/lists/${id}?delete_tasks=${deleteTasks}`, {
            method: 'DELETE'
        });
        return await res.json();
    }
};
