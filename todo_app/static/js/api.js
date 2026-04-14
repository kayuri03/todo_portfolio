export const api = {
    async fetchTasks() {
        const res = await fetch('/api/tasks');
        return await res.json();
    },
    async addTask(title) {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title })
        });
        return await res.json();
    },
    async updateTaskStatus(id, completed) {
        await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed })
        });
    },
    async deleteTask(id) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    }
};
