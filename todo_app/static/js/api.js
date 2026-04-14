export const api = {
    async fetchTasks(archived = false) {
        const res = await fetch(`/api/tasks?archived=${archived}`);
        return await res.json();
    },
    async addTask(title, priority, due_date) {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, priority, due_date })
        });
        return await res.json();
    },
    async updateTaskStatus(id, completed, archived = null) {
        const payload = { completed };
        if (archived !== null) payload.archived = archived;
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
    }
};
