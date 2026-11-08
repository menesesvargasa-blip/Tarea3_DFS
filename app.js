let currentUser = null;
let currentFilter = 'all';
let tasksCache = [];

const authSection = document.getElementById('authSection');
const todoSection = document.getElementById('todoSection');
const userHeaderInfo = document.getElementById('userHeaderInfo');
const headerUsername = document.getElementById('headerUsername');
const authMessage = document.getElementById('authMessage');

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const taskForm = document.getElementById('taskForm');
const taskTitle = document.getElementById('taskTitle');
const taskDesc = document.getElementById('taskDesc');
const taskPriority = document.getElementById('taskPriority');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const taskCount = document.getElementById('taskCount');

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setupEventListeners();
});

function setupEventListeners() {
  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  taskForm.addEventListener('submit', handleAddTask);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('bg-indigo-50', 'text-indigo-600');
        b.classList.add('text-gray-500');
      });
      e.target.classList.add('bg-indigo-50', 'text-indigo-600');
      currentFilter = e.target.getAttribute('data-filter');
      renderTasks();
    });
  });
}

function switchTab(type) {
  authMessage.classList.add('hidden');
  if (type === 'login') {
    tabLogin.className = "w-1/2 py-3.5 text-center font-semibold text-indigo-600 border-b-2 border-indigo-600 transition";
    tabRegister.className = "w-1/2 py-3.5 text-center font-semibold text-gray-400 border-b-2 border-transparent transition";
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    tabRegister.className = "w-1/2 py-3.5 text-center font-semibold text-indigo-600 border-b-2 border-indigo-600 transition";
    tabLogin.className = "w-1/2 py-3.5 text-center font-semibold text-gray-400 border-b-2 border-transparent transition";
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;

  if (password !== passwordConfirm) {
    showAuthMessage("Las contraseñas no coinciden", "error");
    return;
  }

  try {
    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showAuthMessage("¡Cuenta creada! Inicia sesión.", "success");
    switchTab('login');
    registerForm.reset();
  } catch (err) {
    showAuthMessage(err.message, "error");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    loginUser(data.username);
    loginForm.reset();
  } catch (err) {
    showAuthMessage(err.message, "error");
  }
}

function loginUser(username) {
  currentUser = username;
  headerUsername.textContent = username;
  authSection.classList.add('hidden');
  userHeaderInfo.classList.remove('hidden');
  todoSection.classList.remove('hidden');
  fetchTasks();
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  currentUser = null;
  userHeaderInfo.classList.add('hidden');
  todoSection.classList.add('hidden');
  authSection.classList.remove('hidden');
}

function checkSession() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  if (token && username) loginUser(username);
}

function showAuthMessage(msg, type) {
  authMessage.textContent = msg;
  authMessage.className = `mb-4 p-3 rounded-lg text-sm font-medium ${
    type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
  }`;
  authMessage.classList.remove('hidden');
}

async function fetchTasks() {
  try {
    const res = await fetch('/tareas', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('Error al obtener tareas');
    tasksCache = await res.json();
    renderTasks();
  } catch (err) {
    console.error(err);
  }
}

async function handleAddTask(e) {
  e.preventDefault();
  const titulo = taskTitle.value.trim();
  const descripcion = taskDesc.value.trim();
  const prioridad = taskPriority.value;

  if (!titulo || !descripcion) return;

  try {
    const res = await fetch('/tareas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ titulo, descripcion, prioridad })
    });
    if (!res.ok) throw new Error('Error al crear tarea');
    
    taskForm.reset();
    fetchTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function toggleTask(id, completadaActual) {
  try {
    const res = await fetch(`/tareas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ completada: !completadaActual })
    });
    if (!res.ok) throw new Error('Error al actualizar');
    fetchTasks();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteTask(id) {
  try {
    const res = await fetch(`/tareas/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (!res.ok) throw new Error('Error al eliminar');
    fetchTasks();
  } catch (err) {
    alert(err.message);
  }
}

function renderTasks() {
  let filtered = tasksCache;
  if (currentFilter === 'pending') {
    filtered = tasksCache.filter(t => !t.completada);
  } else if (currentFilter === 'completed') {
    filtered = tasksCache.filter(t => t.completada);
  }

  taskCount.textContent = filtered.length;
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
  }

  filtered.forEach(task => {
    const el = document.createElement('div');
    el.className = `task-item bg-white p-4 rounded-xl border ${task.completada ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100'} shadow-sm flex items-center justify-between gap-3`;

    const priorityBadge = {
      baja: 'bg-green-100 text-green-700',
      media: 'bg-yellow-100 text-yellow-700',
      alta: 'bg-red-100 text-red-700'
    }[task.prioridad] || 'bg-gray-100 text-gray-700';

    el.innerHTML = `
      <div class="flex items-center space-x-3 flex-grow min-w-0">
        <button onclick="toggleTask('${task.id}', ${task.completada})" class="text-xl flex-shrink-0">
          ${task.completada 
            ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>' 
            : '<i class="fa-regular fa-circle text-gray-300 hover:text-indigo-500"></i>'}
        </button>
        <div class="truncate">
          <p class="text-sm font-medium ${task.completada ? 'completed-text' : 'text-gray-700'}">${escapeHTML(task.titulo)}</p>
          <p class="text-xs text-gray-400 truncate">${escapeHTML(task.descripcion)}</p>
        </div>
      </div>
      
      <div class="flex items-center space-x-3 flex-shrink-0">
        <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${priorityBadge}">${task.prioridad}</span>
        <button onclick="deleteTask('${task.id}')" class="text-gray-400 hover:text-red-500 transition p-1">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>
    `;
    taskList.appendChild(el);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}