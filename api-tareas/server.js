const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'secreto_super_seguro_taskmaster';
const DATA_FILE = path.join(__dirname, 'tareas.json');

// Middlewares globales
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta raíz (Tarea3_DFS)
app.use(express.static(path.join(__dirname, '../')));

// ==========================================
// b. MANEJO DE DATOS CON fs.promises
// ==========================================
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const initialData = { users: [], tareas: [] };
      await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    throw error;
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ==========================================
// c.2 MIDDLEWARE DE AUTENTICACIÓN JWT
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// c.1 RUTAS DE REGISTRO Y LOGIN
// ==========================================
app.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const db = await readData();
    const userExists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (userExists) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), username, password: hashedPassword };

    db.users.push(newUser);
    await writeData(db);

    console.log(`[AUTH] Usuario registrado: ${username}`);
    res.status(201).json({ message: 'Usuario registrado exitosamente', userId: newUser.id });
  } catch (error) {
    next(error);
  }
});

app.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const db = await readData();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
    console.log(`[AUTH] Inicio de sesión exitoso: ${username}`);
    res.json({ message: 'Inicio de sesión exitoso', token, username: user.username });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// a.1 RUTAS DE LA API RESTful /tareas
// ==========================================

// GET /tareas: Devuelve todas las tareas del usuario autenticado
app.get('/tareas', authenticateToken, async (req, res, next) => {
  try {
    const db = await readData();
    const tareasUsuario = db.tareas.filter(t => t.userId === req.user.id);
    res.json(tareasUsuario);
  } catch (error) {
    next(error);
  }
});

// POST /tareas: Agrega una nueva tarea (incluye título y descripción)
app.post('/tareas', authenticateToken, async (req, res, next) => {
  try {
    const { titulo, descripcion, prioridad } = req.body;
    if (!titulo || !descripcion) {
      return res.status(400).json({ error: 'El título y la descripción son obligatorios' });
    }

    const db = await readData();
    const nuevaTarea = {
      id: Date.now().toString(),
      userId: req.user.id,
      titulo,
      descripcion,
      prioridad: prioridad || 'media',
      completada: false,
      createdAt: new Date().toISOString()
    };

    db.tareas.push(nuevaTarea);
    await writeData(db);
    console.log(`[TAREAS] Creada ID: ${nuevaTarea.id}`);
    res.status(201).json(nuevaTarea);
  } catch (error) {
    next(error);
  }
});

// PUT /tareas/:id: Actualiza una tarea existente según el ID
app.put('/tareas/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, completada, prioridad } = req.body;

    const db = await readData();
    const index = db.tareas.findIndex(t => t.id === id && t.userId === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const current = db.tareas[index];
    db.tareas[index] = {
      ...current,
      titulo: titulo !== undefined ? titulo : current.titulo,
      descripcion: descripcion !== undefined ? descripcion : current.descripcion,
      completada: completada !== undefined ? completada : current.completada,
      prioridad: prioridad !== undefined ? prioridad : current.prioridad
    };

    await writeData(db);
    console.log(`[TAREAS] Actualizada ID: ${id}`);
    res.json(db.tareas[index]);
  } catch (error) {
    next(error);
  }
});

// DELETE /tareas/:id: Elimina una tarea según el ID
app.delete('/tareas/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = await readData();
    
    const exists = db.tareas.some(t => t.id === id && t.userId === req.user.id);
    if (!exists) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    db.tareas = db.tareas.filter(t => !(t.id === id && t.userId === req.user.id));
    await writeData(db);
    console.log(`[TAREAS] Eliminada ID: ${id}`);
    res.json({ message: 'Tarea eliminada exitosamente', id });
  } catch (error) {
    next(error);
  }
});

// Ruta 404 personalizada
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ==========================================
// d.1 MANEJO DE ERRORES GLOBAL
// ==========================================
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});