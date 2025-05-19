document.addEventListener('DOMContentLoaded', () => {
    const productosContainer = document.getElementById('productos-container');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const filterSearch = document.getElementById('filter-search');
    const filterSearchBtn = document.getElementById('filter-search-btn');
    const priceHighBtn = document.getElementById('price-high');
    const priceLowBtn = document.getElementById('price-low');
    const loadMoreBtn = document.getElementById('load-more');
    
    // Paginacion 3 x 3
    const productsPerPage = 9;
    let currentPage = 1;
    let allProducts = [];
    let filteredProducts = [];

    // Cargar productos
    async function cargarProductos() {
        try {
            const response = await fetch('http://localhost:3000/productos');
            
            if (!response.ok) {
                throw new Error('Error al cargar los productos');
            }
            
            allProducts = await response.json();
            filteredProducts = [...allProducts];
            mostrarProductosPagina(1);
            actualizarBotonCargarMas();
        } catch (error) {
            console.error('Error:', error);
            productosContainer.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>No se pudieron cargar los productos. Por favor intenta más tarde.</p>
                </div>
            `;
        }
    }
    
    // Mostrar productos
    function mostrarProductosPagina(page) {
        currentPage = page;
        const startIndex = (page - 1) * productsPerPage;
        const endIndex = startIndex + productsPerPage;
        const productosPagina = filteredProducts.slice(0, endIndex);
        
        if (productosPagina.length === 0) {
            productosContainer.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <p>No hay productos que coincidan con tu búsqueda.</p>
                </div>
            `;
            return;
        }
        
        productosContainer.innerHTML = productosPagina.map(producto => `
            <div class="producto-card">
                <img src="${producto.imagen}" alt="${producto.nombre}" class="producto-imagen">
                <div class="producto-info">
                    <h3 class="producto-nombre">${producto.nombre}</h3>
                    <p class="producto-descripcion">${producto.descripcion}</p>
                    <p class="producto-precio">$${producto.precio.toFixed(2)}</p>
                    <p class="producto-existencia">${producto.existencia} disponibles</p>
                </div>
            </div>
        `).join('');

        // Desplazamiento
        if (page > 1) {
            setTimeout(() => {
                window.scrollBy({
                    top: 600,
                    behavior: 'smooth'
                });
            }, 300);
        }
    }
    
    // "Cargar mas"
    function actualizarBotonCargarMas() {
        const totalMostrados = currentPage * productsPerPage;
        loadMoreBtn.style.display = totalMostrados < filteredProducts.length ? 'block' : 'none';
    }
    
    // Buscador productos
    function buscarProductos(termino) {
        const terminoLower = termino.toLowerCase().trim();
        if (terminoLower === '') {
            filteredProducts = [...allProducts];
        } else {
            filteredProducts = allProducts.filter(producto => 
                producto.nombre.toLowerCase().includes(terminoLower) || 
                producto.descripcion.toLowerCase().includes(terminoLower)
            );
        }
        currentPage = 1;
        mostrarProductosPagina(currentPage);
        actualizarBotonCargarMas();
    }
    
    //  Ordenar por precio (alto a bajo)
    function ordenarPrecioAlto() {
        filteredProducts.sort((a, b) => b.precio - a.precio);
        currentPage = 1;
        mostrarProductosPagina(currentPage);
        actualizarBotonCargarMas();
    }
    
    // Ordenar por precio (bajo a alto)
    function ordenarPrecioBajo() {
        filteredProducts.sort((a, b) => a.precio - b.precio);
        currentPage = 1;
        mostrarProductosPagina(currentPage);
        actualizarBotonCargarMas();
    }
    
    function cargarMasProductos() {
        mostrarProductosPagina(currentPage + 1);
    }
    
    searchBtn.addEventListener('click', () => buscarProductos(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarProductos(searchInput.value);
    });
    
    filterSearchBtn.addEventListener('click', () => buscarProductos(filterSearch.value));
    filterSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarProductos(filterSearch.value);
    });
    
    priceHighBtn.addEventListener('click', ordenarPrecioAlto);
    priceLowBtn.addEventListener('click', ordenarPrecioBajo);
    loadMoreBtn.addEventListener('click', cargarMasProductos);
    
    // Cargar productos 
    cargarProductos();
});