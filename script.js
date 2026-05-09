// 获取DOM元素
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');

// 从本地存储加载任务
let todos = JSON.parse(localStorage.getItem('todos')) || [];

// 跟踪当前正在编辑的任务ID
let currentEditingId = null;

// 初始化应用
function init() {
    loadTheme();
    renderTodos();
    addEventListeners();
}

// 添加事件监听器
function addEventListeners() {
    // 添加任务
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // 筛选任务
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTodos();
        });
    });

    // 主题切换
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', toggleTheme);

    // 点击页面空白处自动保存当前编辑的任务
    document.addEventListener('click', (e) => {
        if (currentEditingId === null) return;
        
        const editingElement = document.querySelector(`.todo-item[data-id="${currentEditingId}"]`);
        if (editingElement && !editingElement.contains(e.target)) {
            const editInput = editingElement.querySelector('.edit-input');
            const editPrioritySelect = editingElement.querySelector('.edit-priority-select');
            const todo = todos.find(t => t.id === currentEditingId);
            
            if (editInput && editPrioritySelect && todo) {
                const newText = editInput.value.trim();
                const newPriority = editPrioritySelect.value;
                
                if (newText) {
                    todo.text = newText;
                    todo.priority = newPriority;
                    saveTodos();
                }
            }
            
            currentEditingId = null;
            renderTodos();
        }
    });
}

// 添加新任务
function addTodo() {
    const text = todoInput.value.trim();
    const priority = document.getElementById('priority-select').value;
    
    if (!text) {
        alert('请输入任务内容！');
        return;
    }

    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: priority
    };

    todos.push(todo);
    saveTodos();
    renderTodos();
    todoInput.value = '';
}

// 渲染任务列表
function renderTodos() {
    const filter = document.querySelector('.filter-btn.active').dataset.filter;
    
    todoList.innerHTML = '';

    const filteredTodos = todos.filter(todo => {
        if (filter === 'all') return true;
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
    });

    // 按优先级排序：高 > 中 > 低
    filteredTodos.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;

        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="priority-badge priority-${todo.priority}" data-id="${todo.id}">
                ${todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
            </span>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <button class="edit-btn">编辑</button>
            <button class="delete-btn">删除</button>
        `;

        // 切换任务完成状态
        li.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            e.stopPropagation();
            toggleTodo(todo.id);
        });

        // 点击优先级标签切换优先级
        li.querySelector('.priority-badge').addEventListener('click', (e) => {
            e.stopPropagation();
            togglePriority(todo.id);
        });

        // 编辑任务
        li.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentEditingId === todo.id) return;
            editTodo(todo.id);
        });

        // 删除任务
        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTodo(todo.id);
        });

        todoList.appendChild(li);
    });
}

// 切换任务完成状态
function toggleTodo(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            return { ...todo, completed: !todo.completed };
        }
        return todo;
    });
    
    saveTodos();
    renderTodos();
}

// 删除任务
function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

// 循环切换任务优先级
function togglePriority(id) {
    todos = todos.map(todo => {
        if (todo.id === id) {
            const priorityCycle = { high: 'medium', medium: 'low', low: 'high' };
            return { ...todo, priority: priorityCycle[todo.priority] };
        }
        return todo;
    });
    
    saveTodos();
    renderTodos();
}

// 编辑任务
function editTodo(id) {
    // 如果已经有任务在编辑，先保存它
    if (currentEditingId !== null && currentEditingId !== id) {
        const editingElement = document.querySelector(`.todo-item[data-id="${currentEditingId}"]`);
        if (editingElement) {
            const editInput = editingElement.querySelector('.edit-input');
            const editPrioritySelect = editingElement.querySelector('.edit-priority-select');
            const todo = todos.find(t => t.id === currentEditingId);
            
            if (editInput && editPrioritySelect && todo) {
                const newText = editInput.value.trim();
                const newPriority = editPrioritySelect.value;
                
                if (newText) {
                    todo.text = newText;
                    todo.priority = newPriority;
                    saveTodos();
                }
            }
        }
    }

    // 重新渲染整个任务列表（关闭所有编辑模式）
    renderTodos();

    // 设置当前正在编辑的任务ID
    currentEditingId = id;

    // 找到要编辑的任务元素
    const todoElement = document.querySelector(`.todo-item[data-id="${id}"]`);
    if (!todoElement) return;

    const todo = todos.find(t => t.id === id);
    const originalText = todo.text;
    const originalPriority = todo.priority;

    // 创建编辑模式的内容
    todoElement.innerHTML = `
        <input type="checkbox" ${todo.completed ? 'checked' : ''} disabled>
        <select class="edit-priority-select">
            <option value="low" ${originalPriority === 'low' ? 'selected' : ''}>低优先级</option>
            <option value="medium" ${originalPriority === 'medium' ? 'selected' : ''}>中优先级</option>
            <option value="high" ${originalPriority === 'high' ? 'selected' : ''}>高优先级</option>
        </select>
        <input type="text" class="edit-input" value="${escapeHtml(originalText)}">
        <button class="save-btn">保存</button>
        <button class="cancel-btn">取消</button>
    `;

    // 获取编辑模式下的元素
    const editInput = todoElement.querySelector('.edit-input');
    const saveBtn = todoElement.querySelector('.save-btn');
    const cancelBtn = todoElement.querySelector('.cancel-btn');

    // 自动聚焦到输入框
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);

    // 保存修改
    const saveEdit = () => {
        const newText = editInput.value.trim();
        const newPriority = todoElement.querySelector('.edit-priority-select').value;
        
        if (newText) {
            todo.text = newText;
            todo.priority = newPriority;
            saveTodos();
        }
        currentEditingId = null;
        renderTodos();
    };

    // 取消编辑
    const cancelEdit = () => {
        currentEditingId = null;
        renderTodos();
    };

    // 绑定事件
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveEdit();
    });
    
    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelEdit();
    });

    // 快捷键支持
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });

    // 禁止点击复选框
    todoElement.querySelector('input[type="checkbox"]').addEventListener('click', (e) => {
        e.preventDefault();
    });
}

// 切换主题
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    const themeToggle = document.getElementById('theme-toggle');
    
    themeToggle.textContent = isDarkMode ? '☀️ 浅色' : '🌙 深色';
    localStorage.setItem('darkMode', isDarkMode);
}

// 加载保存的主题
function loadTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const themeToggle = document.getElementById('theme-toggle');
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️ 浅色';
    }
}

// 保存任务到本地存储
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 防止XSS攻击的HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 启动应用
init();