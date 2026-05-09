// 获取DOM元素
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const filterBtns = document.querySelectorAll('.filter-btn');

// 从本地存储加载任务
let todos = JSON.parse(localStorage.getItem('todos')) || [];

// 初始化应用
function init() {
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
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTodos();
        });
    });
}

// 添加新任务
function addTodo() {
    const text = todoInput.value.trim();
    
    if (!text) {
        alert('请输入任务内容！');
        return;
    }

    const todo = {
        id: Date.now(),
        text: text,
        completed: false
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

    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;

        li.innerHTML = `
            <input type="checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text">${todo.text}</span>
            <button class="delete-btn">删除</button>
        `;

        // 切换任务完成状态
        li.querySelector('input[type="checkbox"]').addEventListener('change', () => {
            toggleTodo(todo.id);
        });

        // 删除任务
        li.querySelector('.delete-btn').addEventListener('click', () => {
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

// 保存任务到本地存储
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 启动应用
init();