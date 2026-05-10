// ========================================
// DOM 元素获取（集中管理，只查询一次）
// ========================================
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');
const prioritySelect = document.getElementById('priority-select');
const dueDateInput = document.getElementById('due-date-input');
const nextDayBtn = document.getElementById('next-day-btn');

// ========================================
// 全局变量
// ========================================
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentEditingId = null; // 跟踪当前正在编辑的任务ID

// ========================================
// 应用初始化
// ========================================
function init() {
    loadTheme();
    renderTodos();
    addEventListeners();
    initDateInputPlaceholder();
}

// ========================================
// 事件监听器（集中管理所有事件）
// ========================================
function addEventListeners() {
    // 添加任务
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    // 下一天按钮点击事件（点击一次日期加一天）
    nextDayBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let currentDate = dueDateInput.value ? new Date(dueDateInput.value) : new Date();
        currentDate.setDate(currentDate.getDate() + 1);
        dueDateInput.value = formatDateToISO(currentDate);
        updateDateInputPlaceholder();
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
    themeToggle.addEventListener('click', toggleTheme);

    // 点击页面空白处自动保存当前编辑的任务
    document.addEventListener('click', (e) => {
        if (currentEditingId === null) return;
        
        const editingElement = document.querySelector(`.todo-item[data-id="${currentEditingId}"]`);
        if (editingElement && !editingElement.contains(e.target)) {
            saveCurrentEdit();
            currentEditingId = null;
            renderTodos();
        }
    });

closeAllEditMode();

    // 日期输入框变化事件
    dueDateInput.addEventListener('change', updateDateInputPlaceholder);
    dueDateInput.addEventListener('input', updateDateInputPlaceholder);
}

// ========================================
// 核心功能函数
// ========================================

// 关闭所有任务的修改模式（手机端）
function closeAllEditMode() {
    document.querySelectorAll('.todo-item').forEach(item => {
        item.classList.remove('active');
    });
}

/**
 * 添加新任务
 */
function addTodo() {
    const text = todoInput.value.trim();
    const priority = prioritySelect.value;
    const dueDate = dueDateInput.value;
    
    if (!text) {
        alert('请输入任务内容！');
        return;
    }

    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: priority,
        dueDate: dueDate || null
    };

    todos.push(todo);
    saveTodos();
    renderTodos();
    todoInput.value = '';
}

/**
 * 渲染任务列表
 */
function renderTodos() {
    const filter = document.querySelector('.filter-btn.active').dataset.filter;
    todoList.innerHTML = '';

    // 筛选任务
    const filteredTodos = todos.filter(todo => {
        if (filter === 'all') return true;
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
    });

    // 排序逻辑：优先级 > 截止日期
    filteredTodos.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        
        // 先按优先级排序
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        
        // 同优先级下，有截止日期的排在前面
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        
        // 都有截止日期的，按日期从近到远排序
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        
        return 0;
    });

    // 渲染每个任务
    filteredTodos.forEach(todo => {
        const todoElement = createTodoElement(todo);
        todoList.appendChild(todoElement);
    });
}

/**
 * 创建单个任务元素
 * @param {Object} todo 任务对象
 * @returns {HTMLElement} 任务DOM元素
 */
function createTodoElement(todo) {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.id = todo.id;

    // 计算截止日期状态
    let dueDateClass = '';
    if (isOverdue(todo.dueDate)) {
        dueDateClass = 'overdue';
    } else if (isDueSoon(todo.dueDate)) {
        dueDateClass = 'due-soon';
    }

    li.innerHTML = `
        <input type="checkbox" ${todo.completed ? 'checked' : ''}>
        <span class="priority-badge priority-${todo.priority}" data-id="${todo.id}">
            ${todo.priority === 'high' ? '高' : todo.priority === 'medium' ? '中' : '低'}
        </span>
        ${todo.dueDate ? `<span class="due-date-badge ${dueDateClass}">${formatDate(todo.dueDate)}</span>` : ''}
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <button class="edit-btn">编辑</button>
        <button class="delete-btn">删除</button>
    `;

    // 绑定任务事件
    bindTodoEvents(li, todo);

    return li;
}

/**
 * 绑定单个任务的事件
 * @param {HTMLElement} element 任务元素
 * @param {Object} todo 任务对象
 */
function bindTodoEvents(element, todo) {
    // 切换任务完成状态
    element.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
        e.stopPropagation();
        toggleTodo(todo.id);
    });



    // 点击优先级标签切换优先级
    element.querySelector('.priority-badge').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePriority(todo.id);
    });

    // 编辑任务
    element.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentEditingId === todo.id) return;
        editTodo(todo.id);
    });

    // 删除任务
    element.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTodo(todo.id);
    });

// 手机端：点击任务切换修改模式
element.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.classList.contains('priority-badge') || e.target.tagName === 'BUTTON') {
        return;
    }
    e.stopPropagation();
    const isActive = element.classList.contains('active');
    closeAllEditMode();
    if (!isActive) {
        element.classList.add('active');
    }
});

}

/**
 * 切换任务完成状态
 * @param {number} id 任务ID
 */
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

/**
 * 删除任务
 * @param {number} id 任务ID
 */
function deleteTodo(id) {
    if (!confirm('确定要删除该任务吗？')) return
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

/**
 * 循环切换任务优先级
 * @param {number} id 任务ID
 */
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

/**
 * 编辑任务
 * @param {number} id 任务ID
 */
function editTodo(id) {
    // 如果已经有任务在编辑，先保存它
    if (currentEditingId !== null && currentEditingId !== id) {
        saveCurrentEdit();
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
    const originalDueDate = todo.dueDate || '';

// 创建编辑模式的内容
todoElement.innerHTML = `
    <input type="checkbox" ${todo.completed ? 'checked' : ''} disabled>
    <select class="edit-priority-select">
        <option value="low" ${originalPriority === 'low' ? 'selected' : ''}>低优先级</option>
        <option value="medium" ${originalPriority === 'medium' ? 'selected' : ''}>中优先级</option>
        <option value="high" ${originalPriority === 'high' ? 'selected' : ''}>高优先级</option>
    </select>
    <input type="date" class="edit-due-date-input" value="${originalDueDate}" data-placeholder="无截止日期">
    <input type="text" class="edit-input" value="${escapeHtml(originalText)}">
    <button class="save-btn">保存</button>
    <button class="cancel-btn">取消</button>
`;

    // 获取编辑模式下的元素
    const editInput = todoElement.querySelector('.edit-input');
    const saveBtn = todoElement.querySelector('.save-btn');
    const cancelBtn = todoElement.querySelector('.cancel-btn');

// 初始化编辑模式下的日期输入框占位符
const editDueDateInput = todoElement.querySelector('.edit-due-date-input');
if (!editDueDateInput.value) {
    editDueDateInput.classList.add('empty');
}

// 监听编辑模式下日期输入框的变化
editDueDateInput.addEventListener('change', () => {
    if (editDueDateInput.value) {
        editDueDateInput.classList.remove('empty');
    } else {
        editDueDateInput.classList.add('empty');
    }
});

editDueDateInput.addEventListener('input', () => {
    if (!editDueDateInput.value) {
        editDueDateInput.classList.add('empty');
    }
});

    // 自动聚焦到输入框
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);

    // 保存修改
    const saveEdit = () => {
        const newText = editInput.value.trim();
        const newPriority = todoElement.querySelector('.edit-priority-select').value;
        const newDueDate = todoElement.querySelector('.edit-due-date-input').value;
        
        if (newText) {
            todo.text = newText;
            todo.priority = newPriority;
            todo.dueDate = newDueDate || null;
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

/**
 * 保存当前正在编辑的任务
 */
function saveCurrentEdit() {
    const editingElement = document.querySelector(`.todo-item[data-id="${currentEditingId}"]`);
    if (!editingElement) return;

    const editInput = editingElement.querySelector('.edit-input');
    const editPrioritySelect = editingElement.querySelector('.edit-priority-select');
    const editDueDateInput = editingElement.querySelector('.edit-due-date-input');
    const todo = todos.find(t => t.id === currentEditingId);
    
    if (editInput && editPrioritySelect && todo) {
        const newText = editInput.value.trim();
        const newPriority = editPrioritySelect.value;
        const newDueDate = editDueDateInput ? editDueDateInput.value : null;
        
        if (newText) {
            todo.text = newText;
            todo.priority = newPriority;
            todo.dueDate = newDueDate;
            saveTodos();
        }
    }
}

/**
 * 切换主题
 */
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    themeToggle.textContent = isDarkMode ? '☀️ 浅色' : '🌙 深色';
    localStorage.setItem('darkMode', isDarkMode);
}

/**
 * 加载保存的主题
 */
function loadTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️ 浅色';
    }
}

/**
 * 保存任务到本地存储
 */
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// ========================================
// 工具函数
// ========================================

/**
 * 防止XSS攻击的HTML转义函数
 * @param {string} text 原始文本
 * @returns {string} 转义后的HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 判断日期是否已过期（第二天才算过期）
 * @param {string} dueDate 截止日期字符串
 * @returns {boolean} 是否过期
 */
function isOverdue(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
}

/**
 * 判断日期是否即将到期（包括当天）
 * @param {string} dueDate 截止日期字符串
 * @returns {boolean} 是否即将到期
 */
function isDueSoon(dueDate) {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const due = new Date(dueDate);
    
    return due >= today && due < tomorrow;
}

/**
 * 格式化日期显示（月日格式）
 * @param {string} dateString 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
}

/**
 * 格式化日期为YYYY-MM-DD格式
 * @param {Date} date 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * 获取今天的日期字符串（YYYY-MM-DD格式）
 * @returns {string} 今天的日期
 */
function getTodayDateString() {
    return formatDateToISO(new Date());
}

/**
 * 获取明天的日期字符串（YYYY-MM-DD格式）
 * @returns {string} 明天的日期
 */
function getTomorrowDateString() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateToISO(tomorrow);
}

/**
 * 初始化日期输入框占位符
 */
function initDateInputPlaceholder() {
    updateDateInputPlaceholder();
}

/**
 * 更新日期输入框占位符状态
 */
function updateDateInputPlaceholder() {
    if (dueDateInput.value) {
        dueDateInput.classList.remove('empty');
    } else {
        dueDateInput.classList.add('empty');
    }
}

// ========================================
// 启动应用
// ========================================
init();