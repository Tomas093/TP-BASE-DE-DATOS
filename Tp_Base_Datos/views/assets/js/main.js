/*=============== SHOW HIDDEN - PASSWORD ===============*/
const showHiddenPass = (passId, eyeId) => {
    const input = document.getElementById(passId),
          iconEye = document.getElementById(eyeId);

    iconEye.addEventListener('click', () => {
        if(input.type === 'password'){
            input.type = 'text';
            iconEye.classList.add('ri-eye-line');
            iconEye.classList.remove('ri-eye-off-line');
        } else {
            input.type = 'password';
            iconEye.classList.remove('ri-eye-line');
            iconEye.classList.add('ri-eye-off-line');
        }
    });
}

// Llamadas a la función para ambos campos
showHiddenPass('login-pass', 'login-eye');
showHiddenPass('repeat-pass', 'toggle-repeat-pass');

// Función para mostrar mensajes de error o éxito
const showMessage = (message, isError = true) => {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.color = isError ? 'red' : 'green';
};

// Manejar el envío del formulario
// main.js

document.getElementById('register-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-pass').value;
    const repeatPassword = document.getElementById('repeat-pass').value;

    if (!username) {
        showMessage('El nombre de usuario es requerido.');
        return;
    }
    
    if (password !== repeatPassword) {
        showMessage('Las contraseñas no coinciden.');
        return;
    }

    try {
        const data = {
            username: username, // Asegúrate de que coincide con app.js y register.ejs
            password: password  // Asegúrate de que coincide con app.js y register.ejs
        };

        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.redirected) {
            window.location.href = response.url;
        } else if (response.ok) {
            showMessage('Registro exitoso! Redirigiendo...', false);
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } else {
            showMessage('Error en el registro');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al conectar con el servidor. Por favor, intente nuevamente.');
    }
});