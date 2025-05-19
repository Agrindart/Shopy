const http = require('http');
const fs = require('fs');
const url = require('url');
const jwt = require('jsonwebtoken');

const PORT = 3000;
const DATA_FILE = 'inventario.json';
const USERS_FILE = 'usuarios.json';
const SECRET_KEY = 'tyh8498j4te984t9u8je49yh8sryjrh9s8d4h9dh4s6d5fh4s9r84had6h4s9y8j4s65dh4s9yhj4sd8g4s9ths4dg4sd9ghs49gh84s9yh98tg4h89s';

// Errores
function manejarError(res, codigo = 500, mensaje = 'Error interno del servidor') {
  res.writeHead(codigo, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: mensaje }));
}

// Lectura y escribir de archivos
function leerInventario() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function escribirInventario(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function leerUsuarios() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '{"usuarios": []}');
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

function escribirUsuarios(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// Token JWT 
function verificarToken(req, res) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    manejarError(res, 401, 'Token no proporcionado');
    return false;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    return decoded;
  } catch {
    manejarError(res, 401, 'Token inválido o expirado');
    return false;
  }
}

// Validacion de email
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validacion de teléfono
function validarTelefono(telefono) {
  return /^\d{10,15}$/.test(telefono);
}

// Validacion de código posta
function validarCodigoPostal(codigoPostal) {
  return /^\d+$/.test(codigoPostal);
}

// Crear servidor
const server = http.createServer((req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathname = parsedUrl.pathname;

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Direccion de productos
    if (method === 'GET' && pathname === '/productos') {
      const inventario = leerInventario();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(inventario));
    }
    else if (method === 'POST' && pathname === '/productos') {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;
    
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const nuevo = JSON.parse(body);
          const inventario = leerInventario();
    
          // Obtener al usuario
          const dataUsuarios = leerUsuarios();
          const usuario = dataUsuarios.usuarios.find(u => u.id === usuarioDecoded.id);
    
          if (!usuario) {
            return manejarError(res, 404, 'Usuario no encontrado');
          }
    
          nuevo.id = inventario.length > 0 ? inventario[inventario.length - 1].id + 1 : 1;
          nuevo.usuario = usuario.usuario;  
          nuevo.usuarioId = usuario.id;     
    
          inventario.push(nuevo);
          escribirInventario(inventario);
    
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(nuevo));
        } catch {
          manejarError(res, 400, 'Error al procesar el producto');
        }
      });
    }
    
    else if (method === 'PUT' && pathname.startsWith('/productos/')) {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;
      
      const id = parseInt(pathname.split('/')[2]);
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const actualizacion = JSON.parse(body);
          const inventario = leerInventario();
          const index = inventario.findIndex(p => p.id === id);
          
          if (index === -1) {
            return manejarError(res, 404, 'Producto no encontrado');
          }

          // Superusuario 
          const dataUsuarios = leerUsuarios();
          const usuario = dataUsuarios.usuarios.find(u => u.id === usuarioDecoded.id);
          const producto = inventario[index];
          
          if (!usuario.superusuario && producto.usuarioId !== usuarioDecoded.id) {
            return manejarError(res, 403, 'No tienes permisos para editar este producto');
          }

          inventario[index] = { ...inventario[index], ...actualizacion };
          escribirInventario(inventario);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(inventario[index]));
        } catch {
          manejarError(res, 400, 'Error al actualizar el producto');
        }
      });
    }
    else if (method === 'DELETE' && pathname.startsWith('/productos/')) {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;
      
      const id = parseInt(pathname.split('/')[2]);
      const inventario = leerInventario();
      const productoIndex = inventario.findIndex(p => p.id === id);
      
      if (productoIndex === -1) {
        return manejarError(res, 404, 'Producto no encontrado');
      }

      // Producto de superusuario
      const dataUsuarios = leerUsuarios();
      const usuario = dataUsuarios.usuarios.find(u => u.id === usuarioDecoded.id);
      const producto = inventario[productoIndex];
      
      if (!usuario.superusuario && producto.usuarioId !== usuarioDecoded.id) {
        return manejarError(res, 403, 'No tienes permisos para eliminar este producto');
      }

      const nuevoInventario = inventario.filter(p => p.id !== id);
      escribirInventario(nuevoInventario);
      res.writeHead(204);
      res.end();
    }

    // Usuarios
    else if (method === 'GET' && pathname === '/usuario') {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;
    
      const data = leerUsuarios();
      const usuarioCompleto = data.usuarios.find(u => u.id === usuarioDecoded.id);
    
      if (usuarioCompleto) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(usuarioCompleto));
      } else {
        manejarError(res, 404, 'Usuario no encontrado');
      }
    }
    else if (method === 'PUT' && pathname === '/usuario') {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const datosActualizados = JSON.parse(body);
          const data = leerUsuarios();
          const usuarioIndex = data.usuarios.findIndex(u => u.id === usuarioDecoded.id);

          if (usuarioIndex === -1) {
            return manejarError(res, 404, 'Usuario no encontrado');
          }

          // Actualizacion de datos
          const usuario = data.usuarios[usuarioIndex];
          data.usuarios[usuarioIndex] = {
            ...usuario,
            nombre: datosActualizados.nombre || usuario.nombre,
            pais: datosActualizados.pais || usuario.pais,
            estado: datosActualizados.estado || usuario.estado,
            ciudad: datosActualizados.ciudad || usuario.ciudad,
            direccion: datosActualizados.direccion || usuario.direccion,
            codigoPostal: datosActualizados.codigoPostal || usuario.codigoPostal,
            telefono: datosActualizados.telefono || usuario.telefono
          };

          escribirUsuarios(data);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data.usuarios[usuarioIndex]));
        } catch {
          manejarError(res, 400, 'Error al actualizar el usuario');
        }
      });
    }
    else if (method === 'PUT' && pathname === '/usuario/imagen') {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;
    
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { imagen } = JSON.parse(body);
          
          if (!imagen) {
            return manejarError(res, 400, 'La imagen es requerida');
          }
    
          const data = leerUsuarios();
          const usuarioIndex = data.usuarios.findIndex(u => u.id === usuarioDecoded.id);
    
          if (usuarioIndex === -1) {
            return manejarError(res, 404, 'Usuario no encontrado');
          }
    
          // Actualizacion de imagen
          data.usuarios[usuarioIndex].imagen = imagen;
          escribirUsuarios(data);
    
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            mensaje: 'Imagen actualizada correctamente',
            imagen: imagen 
          }));
        } catch {
          manejarError(res, 400, 'Error al procesar la imagen');
        }
      });
    }
    else if (method === 'GET' && pathname === '/usuarios') {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;

      const dataUsuarios = leerUsuarios();
      const usuario = dataUsuarios.usuarios.find(u => u.id === usuarioDecoded.id);
      
      // Administracion usuarios
      if (!usuario || !usuario.superusuario) {
        return manejarError(res, 403, 'No tienes permisos para ver todos los usuarios');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dataUsuarios.usuarios));
    }
    else if (method === 'POST' && pathname === '/usuarios') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const nuevoUsuario = JSON.parse(body);
    
          //Validaciones de formulario
          if (!nuevoUsuario.email || !nuevoUsuario.usuario || !nuevoUsuario.password || 
              !nuevoUsuario.nombre || !nuevoUsuario.fecha || !nuevoUsuario.pais || 
              !nuevoUsuario.estado || !nuevoUsuario.ciudad || !nuevoUsuario.codigoPostal || 
              !nuevoUsuario.direccion || !nuevoUsuario.telefono) {
            return manejarError(res, 400, 'Todos los campos son obligatorios');
          }
    
          
          if (!validarEmail(nuevoUsuario.email)) {
            return manejarError(res, 400, 'Formato de email inválido');
          }
    
          
          if (!validarTelefono(nuevoUsuario.telefono)) {
            return manejarError(res, 400, 'Teléfono debe contener solo números (10-15 dígitos)');
          }
    
          
          if (!validarCodigoPostal(nuevoUsuario.codigoPostal)) {
            return manejarError(res, 400, 'Código postal debe contener solo números');
          }
    
          
          if (nuevoUsuario.password.length < 8) {
            return manejarError(res, 400, 'La contraseña debe tener al menos 8 caracteres');
          }
    
          const data = leerUsuarios();
          const usuarios = data.usuarios;
    
          
          const emailExiste = usuarios.some(u => u.email === nuevoUsuario.email);
          if (emailExiste) {
            return manejarError(res, 400, 'Correo electrónico ya registrado');
          }
    
          
          const usuarioExiste = usuarios.some(u => u.usuario === nuevoUsuario.usuario);
          if (usuarioExiste) {
            return manejarError(res, 400, 'Nombre de usuario ya registrado');
          }
    
          // ID autoincremental
          nuevoUsuario.id = usuarios.length > 0 ? Math.max(...usuarios.map(u => u.id)) + 1 : 1;
          
          nuevoUsuario.superusuario = false;
    
          nuevoUsuario.fechaCreacion = new Date().toISOString();
    
          nuevoUsuario.imagen = nuevoUsuario.imagen || '';
    
          usuarios.push(nuevoUsuario);
          escribirUsuarios({ usuarios });
    
          const token = jwt.sign({ id: nuevoUsuario.id, email: nuevoUsuario.email }, SECRET_KEY, { expiresIn: '2h' });
    
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ usuario: nuevoUsuario, token }));
    
        } catch (err) {
          console.error('Error al registrar usuario:', err);
          manejarError(res, 400, 'Error en los datos del usuario');
        }
      });
    }
    else if (method === 'DELETE' && pathname.startsWith('/usuarios/')) {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;

      // Verificar superusuario
      const dataUsuarios = leerUsuarios();
      const usuarioAdmin = dataUsuarios.usuarios.find(u => u.id === usuarioDecoded.id);
      
      if (!usuarioAdmin || !usuarioAdmin.superusuario) {
        return manejarError(res, 403, 'No tienes permisos para esta acción');
      }

      const id = parseInt(pathname.split('/')[2]);
      const usuariosActualizados = dataUsuarios.usuarios.filter(u => u.id !== id);
      
      if (usuariosActualizados.length === dataUsuarios.usuarios.length) {
        manejarError(res, 404, 'Usuario no encontrado');
      } else {
        
        const inventario = leerInventario();
        const inventarioActualizado = inventario.filter(p => p.usuarioId !== id);
        escribirInventario(inventarioActualizado);
        
        escribirUsuarios({ usuarios: usuariosActualizados });
        res.writeHead(204);
        res.end();
      }
    }
    else if (method === 'PUT' && pathname.startsWith('/usuarios/superusuario/')) {
      const usuarioDecoded = verificarToken(req, res);
      if (!usuarioDecoded) return;

      const dataUsuarios = leerUsuarios();
      const usuarioAdmin = dataUsuarios.usuarios.find(u => u.id === usuarioDecoded.id);
      
      if (!usuarioAdmin || !usuarioAdmin.superusuario) {
        return manejarError(res, 403, 'No tienes permisos para esta acción');
      }

      const id = parseInt(pathname.split('/')[3]);
      const usuarioIndex = dataUsuarios.usuarios.findIndex(u => u.id === id);
      
      if (usuarioIndex === -1) {
        return manejarError(res, 404, 'Usuario no encontrado');
      }

      dataUsuarios.usuarios[usuarioIndex].superusuario = true;
      escribirUsuarios(dataUsuarios);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dataUsuarios.usuarios[usuarioIndex]));
    }
    else if (method === 'POST' && pathname === '/login') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { email, password } = JSON.parse(body);
          const data = leerUsuarios();
          const usuario = data.usuarios.find(u => u.email === email && u.password === password);
          
          if (usuario) {
            const token = jwt.sign({ id: usuario.id, email: usuario.email }, SECRET_KEY, { expiresIn: '2h' });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ usuario, token }));
          } else {
            manejarError(res, 401, 'Correo o contraseña incorrectos');
          }
        } catch {
          manejarError(res, 400, 'Error en los datos enviados');
        }
      });
    }
    else {
      manejarError(res, 404, 'Ruta no válida');
    }

  } catch (err) {
    console.error('Error interno del servidor:', err);
    manejarError(res);
  }
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  
  // Verificar superusuario al iniciar
  const data = leerUsuarios();
  const superusuarios = data.usuarios.filter(u => u.superusuario);
  if (superusuarios.length === 0) {
    console.warn('ADVERTENCIA: No hay superusuarios registrados. Crea uno manualmente en el archivo usuarios.json');
  }
});