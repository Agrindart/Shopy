let currentUser = null;
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentPage = 1;
const productsPerPage = 10;
let currentFilter = 'recent';

async function obtenerUsuario() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/usuario', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    currentUser = await res.json();

    // Mostrar usuario
    document.getElementById('usuarioLabel').textContent = currentUser.usuario;
    document.getElementById('emailLabel').textContent = currentUser.email;
  
    if (!currentUser.superusuario) {
      document.querySelector('.tab[data-tab="usuarios"]').style.display = 'none';
      document.querySelector('.tab[data-tab="vender"]').style.display = 'none';
      document.querySelector('.tab[data-tab="misventas"]').style.display = 'none';
    }

    // Cargar productos
    await cargarProductos();
    actualizarCarrito();
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
}

async function cargarProductos() {
  try {
    const res = await fetch('http://localhost:3000/productos');
    if (!res.ok) throw new Error('Error al cargar productos');
    
    products = await res.json();
    mostrarProductos();
    mostrarMisVentas();
  } catch (error) {
    console.error('Error:', error);
    alert('Error al cargar los productos');
  }
}

function mostrarProductos() {
  const container = document.getElementById('productsContainer');
  container.innerHTML = '';
  
  // Filtrar productos
  let filteredProducts = [...products];
  
  // Aplicar filtro
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  if (searchTerm) {
    filteredProducts = filteredProducts.filter(product => 
      product.nombre.toLowerCase().includes(searchTerm) || 
      product.descripcion.toLowerCase().includes(searchTerm)
    );
  }
  
  // Ordenamiento
  switch(currentFilter) {
    case 'price-high':
      filteredProducts.sort((a, b) => b.precio - a.precio);
      break;
    case 'price-low':
      filteredProducts.sort((a, b) => a.precio - b.precio);
      break;
    case 'recent':
    default:
      filteredProducts.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
      break;
  }
  
  // Paginas de productos
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);
  
  // Mostrar productos
  paginatedProducts.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
      <img src="${product.imagen || 'https://via.placeholder.com/150'}" alt="${product.nombre}">
      <div class="product-info">
        <div class="product-title">${product.nombre}</div>
        <div class="product-price">$${product.precio.toFixed(2)}</div>
        <div class="product-stock">Disponibles: ${product.existencias}</div>
        <div class="product-seller">Vendedor: ${product.vendedor || 'Anónimo'}</div>
        <div class="product-actions">
          <input type="number" class="quantity-selector" min="1" max="${product.existencias}" value="1">
          <button class="add-to-cart" data-id="${product.id}">Agregar</button>
        </div>
      </div>
    `;
    container.appendChild(productCard);
  });
  
  configurarPaginacion(filteredProducts.length);
  
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', agregarAlCarrito);
  });
}

function configurarPaginacion(totalProducts) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  
  const totalPages = Math.ceil(totalProducts / productsPerPage);
  
  if (totalPages <= 1) return;
  
  // Btn back
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&lt;&lt;';
    prevButton.addEventListener('click', () => {
      currentPage--;
      mostrarProductos();
    });
    pagination.appendChild(prevButton);
  }
  
  // Paginas
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    if (i === currentPage) {
      pageButton.className = 'active';
    }
    pageButton.addEventListener('click', () => {
      currentPage = i;
      mostrarProductos();
    });
    pagination.appendChild(pageButton);
  }
  
  // Next
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&gt;&gt;';
    nextButton.addEventListener('click', () => {
      currentPage++;
      mostrarProductos();
    });
    pagination.appendChild(nextButton);
  }
}

function agregarAlCarrito(e) {
  const productId = parseInt(e.target.dataset.id);
  const product = products.find(p => p.id === productId);
  
  if (!product) return;
  
  const quantityInput = e.target.previousElementSibling;
  const quantity = parseInt(quantityInput.value) || 1;
  
  if (quantity < 1 || quantity > product.existencias) {
    alert('Cantidad no válida');
    return;
  }
  
  // Buscar producto en el carrito
  const existingItem = cart.find(item => item.id === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      nombre: product.nombre,
      imagen: product.imagen,
      precio: product.precio,
      vendedor: product.vendedor,
      quantity: quantity
    });
  }
  
  // localStorage
  localStorage.setItem('cart', JSON.stringify(cart));
  
  actualizarCarrito();
  
  button.innerHTML = `<i class="fas fa-trash"></i>`;
  button.className = 'remove-item';
  button.setAttribute('data-id', item.id); 
  
  alert(`${quantity} ${product.nombre} agregado(s) al carrito`);
}

function actualizarCarrito() {
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  
  cartItems.innerHTML = '';
  
  if (cart.length === 0) {
    cartItems.innerHTML = '<p>Tu carrito está vacío</p>';
    cartTotal.textContent = '$0.00';
    return;
  }
  
  let total = 0;
  
  cart.forEach(item => {
    const itemTotal = item.precio * item.quantity;
    total += itemTotal;
    
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
      <img src="${item.imagen || 'https://via.placeholder.com/50'}" alt="${item.nombre}">
      <div class="cart-item-info">
        <div class="cart-item-title">${item.nombre}</div>
        <div class="cart-item-price">$${item.precio.toFixed(2)} c/u</div>
        <div>Vendedor: ${item.vendedor || 'Anónimo'}</div>
      </div>
      <input type="number" class="cart-item-quantity" value="${item.quantity}" min="1" data-id="${item.id}">
      <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash"></i></button>
    `;
    cartItems.appendChild(cartItem);
  });
  
  // Actualizar precio total
  cartTotal.textContent = `$${total.toFixed(2)}`;
  
  document.querySelectorAll('.cart-item-quantity').forEach(input => {
    input.addEventListener('change', actualizarCantidadCarrito);
  });
  
  document.querySelectorAll('.remove-item').forEach(button => {
    button.addEventListener('click', eliminarDelCarrito);
  });
}

function actualizarCantidadCarrito(e) {
  const productId = parseInt(e.target.dataset.id);
  const newQuantity = parseInt(e.target.value) || 1;
  
  const cartItem = cart.find(item => item.id === productId);
  if (!cartItem) return;
  
  // Existencias
  const product = products.find(p => p.id === productId);
  if (product && newQuantity > product.existencias) {
    alert('No hay suficientes existencias');
    e.target.value = cartItem.quantity;
    return;
  }
  
  cartItem.quantity = newQuantity;
  localStorage.setItem('cart', JSON.stringify(cart));
  actualizarCarrito();
}

function eliminarDelCarrito(e) {
  const button = e.target.closest('.remove-item');
  if (!button) return;
  
  const productId = parseInt(button.dataset.id);
  const product = cart.find(item => item.id === productId);
  
  if (!product) return;
  
  if (!confirm(`¿Seguro quieres eliminar ${product.nombre} del carrito?`)) {
    return;
  }
  
  const cartItem = button.closest('.cart-item');
  if (cartItem) {
    cartItem.style.transition = 'all 0.3s ease';
    cartItem.style.opacity = '0';
    cartItem.style.height = '0';
    cartItem.style.padding = '0';
    cartItem.style.margin = '0';
    cartItem.style.overflow = 'hidden';
  }
  
  setTimeout(() => {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    actualizarCarrito();
    
    // Notificación
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = `Producto eliminado: ${product.nombre}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }, 300);
}

async function agregarProducto(e) {
  e.preventDefault();

  const token = localStorage.getItem('token');
  if (!token || !currentUser) {
    alert('Debes iniciar sesión para vender productos');
    window.location.href = 'login.html';
    return;
  }

  // Verificar administrador
  if (!currentUser.superusuario) {
    alert('Solo los administradores pueden vender productos');
    return;
  }

  // Valores del formulario
  const nombre = document.getElementById('productName').value.trim();
  const descripcion = document.getElementById('productDescription').value.trim();
  const imagen = document.getElementById('productImage').value.trim();
  const precio = parseFloat(document.getElementById('productPrice').value);
  const existencias = parseInt(document.getElementById('productStock').value);

  if (!nombre) {
    alert('El nombre del producto es requerido');
    return;
  }
  if (nombre.length > 30) {
    alert('El nombre no puede exceder los 30 caracteres');
    return;
  }
  if (!descripcion) {
    alert('La descripción es requerida');
    return;
  }
  if (descripcion.length > 500) {
    alert('La descripción no puede exceder los 500 caracteres');
    return;
  }
  if (!imagen) {
    alert('Debes proporcionar una URL de imagen');
    return;
  }
  if (isNaN(precio) || precio <= 0) {
    alert('Ingresa un precio válido (mayor que 0)');
    return;
  }
  if (isNaN(existencias) || existencias <= 0 || !Number.isInteger(existencias)) {
    alert('Ingresa una cantidad válida de existencias (número entero positivo)');
    return;
  }

  try {
    const nuevoProducto = {
      nombre,
      descripcion,
      imagen,
      precio,
      existencias,
      vendedor: currentUser.usuario,
      fechaCreacion: new Date().toISOString()
    };

    const res = await fetch('http://localhost:3000/productos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(nuevoProducto)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al agregar producto');
    }

    const productoAgregado = await res.json();
    
    // Actualizar la lista de productos localmente
    products.push(productoAgregado);
    
    // Limpiar formulario
    document.getElementById('sellForm').reset();

    alert(`Producto "${nombre}" agregado exitosamente`);
    
    mostrarMisVentas(); 
    mostrarProductos(); 
    cambiarPestana('misventas');

  } catch (error) {
    console.error('Error al agregar producto:', error);
    
    if (error.message.includes('Token')) {
      alert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    } else {
      alert(`Error al agregar producto: ${error.message || 'Por favor intenta nuevamente'}`);
    }
  }
}


function mostrarMisVentas()  {
  const container = document.getElementById('misVentasContainer');
  if (!container) {
    console.error('No se encontró el contenedor de Mis Ventas');
    return;
  }

  container.innerHTML = '';

  if (!currentUser) {
    container.innerHTML = '<p>No se ha identificado el usuario</p>';
    return;
  }

  // Verificar usuario
  if (!currentUser.superusuario) {
    container.innerHTML = '<p>No tienes permisos para ver esta sección</p>';
    return;
  }

  const productosUsuario = products.filter(product => 
    product.vendedor === currentUser.usuario
  );

  if (productosUsuario.length === 0) {
    container.innerHTML = `
      <div class="no-products">
        <p>No has publicado ningún producto aún.</p>
        <button onclick="cambiarPestana('vender')">Publicar mi primer producto</button>
      </div>
    `;
    return;
  }

  productosUsuario.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
      <img src="${product.imagen || 'https://via.placeholder.com/150'}" alt="${product.nombre}">
      <div class="product-info">
        <h3>${product.nombre}</h3>
        <p class="product-description">${product.descripcion}</p>
        <div class="product-details">
          <span class="price">$${product.precio.toFixed(2)}</span>
          <span class="stock">${product.existencias} disponibles</span>
        </div>
        <button class="delete-btn" data-id="${product.id}">
          <i class="fas fa-trash"></i> Eliminar
        </button>
      </div>
    `;
    container.appendChild(productCard);
  });

  // Btn de eliminar
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', function() {
      eliminarProducto(this.dataset.id);
    });
  });
}

async function eliminarProducto(idProducto) {
  const confirmacion = confirm("¿Estás seguro de que deseas eliminar este producto?");
  if (!confirmacion) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/productos/${idProducto}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Error al eliminar el producto');

    alert('Producto eliminado correctamente');
    await cargarProductos();
    mostrarMisVentas();
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    alert('Hubo un error al eliminar el producto');
  }
}

async function cargarUsuarios() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    const res = await fetch('http://localhost:3000/usuarios', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 403) {
        document.querySelector('.tab[data-tab="usuarios"]').style.display = 'none';
        return;
      }
      throw new Error('Error al cargar usuarios');
    }

    const data = await res.json();
    mostrarUsuarios(data);
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    document.querySelector('.tab[data-tab="usuarios"]').style.display = 'none';
  }
}

function mostrarUsuarios(usuarios) {
  const tbody = document.querySelector('#usuariosTable tbody');
  tbody.innerHTML = '';

  usuarios.forEach(usuario => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${usuario.id}</td>
      <td>${usuario.usuario}</td>
      <td>${usuario.email}</td>
      <td>${usuario.nombre || '-'}</td>
      <td>${usuario.superusuario ? 'Sí' : 'No'}</td>
      <td>${new Date(usuario.fechaCreacion).toLocaleDateString()}</td>
      <td>
        ${!usuario.superusuario ? 
          `<button class="delete-user-btn" data-id="${usuario.id}">
            <i class="fas fa-trash"></i> Eliminar
          </button>` : 
          '<span class="no-action">No disponible</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Btn eliminar
  document.querySelectorAll('.delete-user-btn').forEach(button => {
    button.addEventListener('click', function() {
      eliminarUsuario(this.dataset.id);
    });
  });
}

// Eliminar usuarios
async function eliminarUsuario(idUsuario) {
  const confirmacion = confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.");
  if (!confirmacion) return;

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:3000/usuarios/${idUsuario}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Error al eliminar el usuario');
    }

    alert('Usuario eliminado correctamente');
    
    // Recargar usuarios
    await cargarUsuarios();
    
    // Recargar productos del usuario eliminado 
    await cargarProductos();
    
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    alert(error.message || 'Hubo un error al eliminar el usuario');
  }
}

//Pestañas
function cambiarPestana(tabId) {
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Desactivar las pestañas
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });

  // Activar pestañas
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');

  if (tabId === 'carrito') {
    actualizarCarrito();
  } else if (tabId === 'misventas') {
    mostrarMisVentas();
  } else if (tabId === 'usuarios') {
    cargarUsuarios(); 
  }
}

async function obtenerUsuario() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/usuario', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
      return;
    }

    currentUser = await res.json();

    // Mostrar usuario en la tarjeta
    document.getElementById('usuarioLabel').textContent = currentUser.usuario;
    document.getElementById('emailLabel').textContent = currentUser.email;
    
    // Formulario
    document.getElementById('nombreInput').value = currentUser.nombre || '';
    document.getElementById('paisInput').value = currentUser.pais || '';
    document.getElementById('estadoInput').value = currentUser.estado || '';
    document.getElementById('ciudadInput').value = currentUser.ciudad || '';
    document.getElementById('direccionInput').value = currentUser.direccion || '';
    document.getElementById('cpInput').value = currentUser.codigoPostal || '';
    document.getElementById('telefonoInput').value = currentUser.telefono || '';

    // Mostrar imagen
    if (currentUser.imagen) {
      document.getElementById('fotoPerfil').src = currentUser.imagen;
    } else {
      document.getElementById('fotoPerfil').src = 'https://via.placeholder.com/150';
    }

    // Manejar superusuario 
    if (currentUser.superusuario) {
      document.body.classList.add('superusuario');
    } else {
      document.body.classList.remove('superusuario');
      // Ocultar pestañas de admin!!
      document.querySelectorAll('.tab[data-tab="usuarios"], .tab[data-tab="vender"], .tab[data-tab="misventas"]').forEach(tab => {
        tab.style.display = 'none';
      });
    }

    await cargarProductos();
    actualizarCarrito();
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  }
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('cart');
  window.location.href = 'login.html';
}

// Actualizar usr existente
document.getElementById('formUsuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('token');

  const datosActualizados = {
    nombre: document.getElementById('nombreInput').value,
    pais: document.getElementById('paisInput').value,
    estado: document.getElementById('estadoInput').value,
    ciudad: document.getElementById('ciudadInput').value,
    direccion: document.getElementById('direccionInput').value,
    codigoPostal: document.getElementById('cpInput').value,
    telefono: document.getElementById('telefonoInput').value
  };

  try {
    const res = await fetch('http://localhost:3000/usuario', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(datosActualizados)
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'No se pudo guardar los cambios');
    }
    
    const usuarioActualizado = await res.json();
    alert('Datos actualizados correctamente');
    
    document.getElementById('nombreInput').value = usuarioActualizado.nombre || '';
    document.getElementById('cpInput').value = usuarioActualizado.codigoPostal || '';
    document.getElementById('telefonoInput').value = usuarioActualizado.telefono || '';
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    alert(error.message || 'Hubo un error al guardar los cambios');
  }
});

// Actualizar imagen de perfil
document.getElementById('inputFoto').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    alert('La imagen no debe superar los 2MB');
    return;
  }

  // Convertir imagen a base64
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/usuario/imagen', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imagen: e.target.result })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al actualizar la imagen');
      }

      const data = await res.json();
      document.getElementById('fotoPerfil').src = data.imagen;
      alert('Imagen de perfil actualizada correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert(error.message || 'Error al actualizar la imagen de perfil');
    }
  };
  reader.readAsDataURL(file);
});

// Pestañas
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    cambiarPestana(tabId);
    
    // Actualizarla pestaña de carrito 
    if (tabId === 'carrito') {
      actualizarCarrito();
    }
  });
});

document.getElementById('searchBtn').addEventListener('click', () => {
  currentPage = 1;
  mostrarProductos();
});

document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    currentPage = 1;
    mostrarProductos();
  }
});

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    currentPage = 1;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    button.classList.add('active');
    
    mostrarProductos();
  });
});

// Formulario de venta
document.getElementById('sellForm').addEventListener('submit', agregarProducto);

// Procesar pago
document.querySelector('.checkout-btn').addEventListener('click', () => {
  if (cart.length === 0) {
    alert('Tu carrito está vacío');
    return;
  }
  
  alert('Funcionalidad de pago será implementada próximamente');
});

// Inicializar
window.onload = obtenerUsuario;