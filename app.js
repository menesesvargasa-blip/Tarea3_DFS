// Base de datos local inicial en memoria
let appData = {
  users: [],
  tasks: []
};

let currentUser = null;
let currentFilter = 'all';

// Elementos del DOM
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
const taskPriority = document.getElementById('taskPriority');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const taskCount = document.getElementById('taskCount');

// Inicialización de la App
document.addEventListener('DOMContentLoaded', () => {
  loadDataFromStorage();
  checkSession();
  setupEventListeners();
});

// Event Listeners Centralizados
function setupEventListeners() {
  // Tabs Login/Register
  tabLogin.addEventListener('click', () => switchTab('login'));
  tabRegister.addEventListener('click', () => switchTab('register'));

  // Form submit handlers
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  taskForm.addEventListener('submit', handleAddTask);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Import / Export JSON
  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('importInput').addEventListener('change', importJSON);

  // Filtros de tareas
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('bg-indigo-50', 'text-indigo-600');
        b.classList.add('text-gray-500');
      });
      e.target.classList.add('bg-indigo-50', 'text-indigo-600');
      e.target.classList.remove('text-gray-500');
      currentFilter = e.target.getAttribute('data-filter');
      renderTasks();
    });
  });
}

// Carga Inicial desde LocalStorage
function loadDataFromStorage() {
  const saved = localStorage.getItem('taskmaster_db');
  if (saved) {
    try {
      appData = JSON.parse(saved);
    } catch (e) {
      console.error("Error al parsear base de datos:", e);
    }
  }
}

// Guarda estado actual en LocalStorage
function saveData() {
  localStorage.setItem('taskmaster_db', JSON.stringify(appData));
}

// Cambio de Tabs (Login/Register)
function switchTab(type) {
  hideAuthMessage();
  if (type === 'login') {
    tabLogin.className = "w-1/2 py-3.5 text-center font-semibold text-indigo-600 border-b-2 border-indigo-600 transition";
    tabRegister.className = "w-1/2 py-3.5 text-center font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 transition";
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    tabRegister.className = "w-1/2 py-3.5 text-center font-semibold text-indigo-600 border-b-2 border-indigo-600 transition";
    tabLogin.className = "w-1/2 py-3.5 text-center font-semibold text-gray-400 border-b-2 border-transparent hover:text-gray-600 transition";
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

// Autenticación: Registro
function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const passwordConfirm = document.getElementById('regPasswordConfirm').value;

  if (password !== passwordConfirm) {
    showAuthMessage("Las contraseñas no coinciden", "error");
    return;
  }

  const userExists = appData.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  if (userExists) {
    showAuthMessage("El nombre de usuario ya está registrado", "error");
    return;
  }

  const newUser = {
    id: Date.now().toString(),
    username: username,
    password: password
  };

  appData.users.push(newUser);
  saveData();

  showAuthMessage("¡Cuenta creada con éxito! Iniciando sesión...", "success");
  setTimeout(() => {
    loginUser(newUser);
    registerForm.reset();
  }, 1000);
}

// Autenticación: Login
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  const user = appData.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

  if (user) {
    loginUser(user);
    loginForm.reset();
  } else {
    showAuthMessage("Usuario o contraseña incorrectos", "error");
  }
}

function loginUser(user) {
  currentUser = user;
  localStorage.setItem('taskmaster_session', user.id);
  headerUsername.textContent = user.username;
  authSection.classList.add('hidden');
  userHeaderInfo.classList.remove('hidden');
  todoSection.classList.remove('hidden');
  renderTasks();
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem('taskmaster_session');
  userHeaderInfo.classList.add('hidden');
  todoSection.classList.add('hidden');
  authSection.classList.remove('hidden');
  hideAuthMessage();
}

function checkSession() {
  const sessionUserId = localStorage.getItem('taskmaster_session');
  if (sessionUserId) {
    const user = appData.users.find(u => u.id === sessionUserId);
    if (user) {
      loginUser(user);
    }
  }
}

// Gestión de Mensajes de Autenticación
function showAuthMessage(msg, type) {
  authMessage.textContent = msg;
  authMessage.className = `mb-4 p-3 rounded-lg text-sm font-medium ${
    type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
  }`;
  authMessage.classList.remove('hidden');
}

function hideAuthMessage() {
  authMessage.classList.add('hidden');
}

// Gestión de Tareas (CRUD)
function handleAddTask(e) {
  e.preventDefault();
  const title = taskTitle.value.trim();
  const priority = taskPriority.value;

  if (!title) return;

  const newTask = {
    id: Date.now().toString(),
    userId: currentUser.id,
    title: title,
    priority: priority,
    completed: false,
    createdAt: new Date().toISOString()
  };

  appData.tasks.push(newTask);
  saveData();
  taskForm.reset();
  renderTasks();
}

function toggleTask(id) {
  const task = appData.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveData();
    renderTasks();
  }
}

function deleteTask(id) {
  appData.tasks = appData.tasks.filter(t => t.id !== id);
  saveData();
  renderTasks();
}

// Renderizado dinámico de tareas
function renderTasks() {
  if (!currentUser) return;

  // Filtrar tareas por el usuario actual
  let userTasks = appData.tasks.filter(t => t.userId === currentUser.id);

  // Aplicar filtro activo
  if (currentFilter === 'pending') {
    userTasks = userTasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    userTasks = userTasks.filter(t => t.completed);
  }

  taskCount.textContent = userTasks.length;
  taskList.innerHTML = '';

  if (userTasks.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
  }

  userTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  userTasks.forEach(task => {
    const el = document.createElement('div');
    el.className = `task-item bg-white p-4 rounded-xl border ${task.completed ? 'border-gray-200 bg-gray-50/50' : 'border-gray-100'} shadow-sm flex items-center justify-between gap-3`;

    const priorityBadge = {
      baja: 'bg-green-100 text-green-700',
      media: 'bg-yellow-100 text-yellow-700',
      alta: 'bg-red-100 text-red-700'
    }[task.priority] || 'bg-gray-100 text-gray-700';

    el.innerHTML = `
      <div class="flex items-center space-x-3 flex-grow min-w-0">
        <button onclick="toggleTask('${task.id}')" class="text-xl flex-shrink-0 transition transform active:scale-90">
          ${task.completed 
            ? '<i class="fa-solid fa-circle-check text-emerald-500"></i>' 
            : '<i class="fa-regular fa-circle text-gray-300 hover:text-indigo-500"></i>'}
        </button>
        <span class="text-sm font-medium ${task.completed ? 'completed-text' : 'text-gray-700'} truncate">
          ${escapeHTML(task.title)}
        </span>
      </div>
      
      <div class="flex items-center space-x-3 flex-shrink-0">
        <span class="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${priorityBadge}">
          ${task.priority}
        </span>
        <button onclick="deleteTask('${task.id}')" class="text-gray-400 hover:text-red-500 transition p-1">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>
    `;
    taskList.appendChild(el);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Importación y Exportación JSON
function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "database.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (importedData.users && importedData.tasks) {
        appData = importedData;
        saveData();
        alert('¡Base de datos JSON cargada con éxito!');
        if (currentUser) {
          renderTasks();
        }
      } else {
        alert('El archivo JSON no tiene la estructura correcta (requiere "users" y "tasks").');
      }
    } catch (err) {
      alert('Error al leer el archivo JSON.');
    }
  };
  reader.readAsText(file);
}