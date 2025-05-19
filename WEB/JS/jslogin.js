document.addEventListener('DOMContentLoaded', () => {
  // DOM
  const loginTab = document.getElementById('login-tab');
  const registerTab = document.getElementById('register-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginError = document.getElementById('loginError');
  const registerError = document.getElementById('registerError');
  const passwordInput = document.getElementById('reg-password');
  const confirmPasswordInput = document.getElementById('reg-confirm-password');
  const capsWarning = document.getElementById('caps-warning');
  const lengthWarning = document.getElementById('length-warning');
  const emailError = document.getElementById('email-error');
  const usernameError = document.getElementById('username-error');
  const passwordMatchError = document.getElementById('password-match-error');
  const phoneError = document.getElementById('phone-error');

  // Cambiar entre pestañas
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
    loginError.textContent = '';
  });

  registerTab.addEventListener('click', () => {
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
    registerError.textContent = '';
  });

  // Detectar mayusculas
  passwordInput.addEventListener('keyup', (e) => {
    capsWarning.style.display = e.getModifierState('CapsLock') ? 'block' : 'none';
    lengthWarning.style.display = passwordInput.value.length < 8 ? 'block' : 'none';
  });

  passwordInput.addEventListener('blur', () => {
    capsWarning.style.display = 'none';
  });

  // Validar contraseña
  confirmPasswordInput.addEventListener('input', () => {
    if (passwordInput.value !== confirmPasswordInput.value) {
      passwordMatchError.textContent = 'Las contraseñas no coinciden';
      passwordMatchError.style.display = 'block';
    } else {
      passwordMatchError.style.display = 'none';
    }
  });

  // Validar email
  document.getElementById('reg-email').addEventListener('blur', async function() {
    const email = this.value;
    if (!email) return;
    
    try {
      const response = await fetch('http://localhost:3000/usuarios');
      if (!response.ok) throw new Error('Error al verificar email');
      
      const data = await response.json();
      const emailExists = data.usuarios.some(user => user.email === email);
      
      if (emailExists) {
        emailError.textContent = 'Este correo ya está registrado';
        emailError.style.display = 'block';
      } else {
        emailError.style.display = 'none';
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  // Validar usuarios
  document.getElementById('reg-username').addEventListener('blur', async function() {
    const username = this.value;
    if (!username) return;
    
    try {
      const response = await fetch('http://localhost:3000/usuarios');
      if (!response.ok) throw new Error('Error al verificar usuario');
      
      const data = await response.json();
      const userExists = data.usuarios.some(user => user.usuario === username);
      
      if (userExists) {
        usernameError.textContent = 'Este nombre de usuario ya existe';
        usernameError.style.display = 'block';
      } else {
        usernameError.style.display = 'none';
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  // Validar teléfono
  document.getElementById('reg-phone').addEventListener('input', function() {
    const phone = this.value;
    const phoneRegex = /^[0-9]{10,15}$/;
    
    if (!phoneRegex.test(phone)) {
      phoneError.textContent = 'Ingresa un número telefónico válido';
      phoneError.style.display = 'block';
    } else {
      phoneError.style.display = 'none';
    }
  });

  // Login
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    loginError.textContent = '';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
      const res = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const err = await res.json();
        loginError.textContent = err.error || 'Error al iniciar sesión';
        return;
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.usuario));
      window.location.href = 'home.html';
    } catch (err) {
      loginError.textContent = 'Fallo de red o servidor no disponible';
      console.error('Error:', err);
    }
  });

  registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    registerError.textContent = '';
    
    // Validaciones de contraseña
    if (passwordInput.value !== confirmPasswordInput.value) {
      passwordMatchError.textContent = 'Las contraseñas no coinciden';
      passwordMatchError.style.display = 'block';
      return;
    }

    if (passwordInput.value.length < 8) {
      registerError.textContent = 'La contraseña debe tener al menos 8 caracteres';
      return;
    }

    const userData = {
      email: document.getElementById('reg-email').value.trim(),
      usuario: document.getElementById('reg-username').value.trim(),
      password: passwordInput.value.trim(),
      nombre: document.getElementById('reg-name').value.trim(),
      fecha: document.getElementById('reg-birthdate').value,
      pais: document.getElementById('reg-country').value,
      estado: document.getElementById('reg-state').value.trim(),
      ciudad: document.getElementById('reg-city').value.trim(),
      codigoPostal: document.getElementById('reg-zip').value.trim(),
      direccion: document.getElementById('reg-address').value.trim(),
      telefono: document.getElementById('reg-phone').value.trim()
    };

    try {
      const res = await fetch('http://localhost:3000/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!res.ok) {
        const err = await res.json();
        registerError.textContent = err.error || 'Error al registrar usuario';
        return;
      }

      const data = await res.json();
      registerError.textContent = '¡Registro exitoso! Redirigiendo...';
      registerError.style.color = '#4caf50';
      
      // Auto-login
      setTimeout(async () => {
        try {
          const loginRes = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email: userData.email, 
              password: userData.password 
            })
          });

          if (!loginRes.ok) throw new Error('Auto-login failed');
          
          const loginData = await loginRes.json();
          localStorage.setItem('token', loginData.token);
          localStorage.setItem('user', JSON.stringify(loginData.usuario));
          window.location.href = 'home.html';
        } catch (error) {
          window.location.href = 'login.html';
        }
      }, 1500);
    } catch (err) {
      registerError.textContent = 'Fallo de red o servidor no disponible';
      console.error('Error:', err);
    }
  });
});