const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const session = require('express-session');


const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "views" directory
app.use(express.static('views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Path completo de la base de datos movies.db
const db = new sqlite3.Database('C:\\Users\\tomas\\Faculty\\Segundo_Ano\\Base de Datos\\Tp_Base_Datos\\movies.db');

// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');

app.use(session({
      secret: 'admin123',
      resave: true, // Evita guardar la sesión en cada solicitud si no ha cambiado
      saveUninitialized: true, // No guarda sesiones vacías
}));



// Middleware (función que se ejecuta antes de que una solicitud llegue a su controlador final) para gestionar la información del usuario en cada petición
app.use((req, res, next) => {
    if (req.session.userId) {
        req.user = {
            id: req.session.userId,
            name: req.session.userName
        };
        req.isAdmin = req.session.isAdmin;  //por si es admin que cambie
    } else {
        req.user = null;
        req.isAdmin = false;
    }
    next();
});

//Obtener la página de registro de usuario y le manda los datos necesarios
app.get('/register', (req, res) => {
    let user = null;
    if (req.session.userId) {
      user = {
        id: req.session.userId,
        name: req.session.userName
      };
    }
    res.render('register', { user }); //renderiza la página de registro
  });


//Obtener la página de olvidaste contraseña y le manda los datos necesarios
app.get('/olvidastecontra', (req, res) => {
    let user = null;
    if (req.session.userId) {
      user = {
        id: req.session.userId,
        name: req.session.userName
      };
    }
    res.render('olvidastecontra', { user });
});


app.use((req, res, next) => {
    // Verifica si existe un 'userId' en la sesión.
    if (req.session.userId) {
        // Si el 'userId' existe, se añade al objeto 'req' la información del usuario.
        req.user = {
            id: req.session.userId,      // Almacena el ID del usuario.
            name: req.session.userName   // Almacena el nombre del usuario.
        };
    } else {
        // Si no existe el 'userId', se asigna null al objeto 'req.user', indicando que no hay usuario autenticado.
        req.user = null;
    }
    // Llama al siguiente middleware o controlador de la solicitud.
    next();
});

//Obtiene la pagina principal
app.get('/', (req, res) => {
    // Renderiza la vista 'index' y pasa el objeto 'user' a la vista.
    res.render('index', { user: req.user });
});


app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Verifica si no se ha proporcionado un nombre de usuario.
    if (!username) {
        return res.status(400).send('Se requiere un nombre de usuario.');
    }

    // Verifica si el nombre de usuario ya existe en la base de datos.
    const checkUserQuery = `SELECT * FROM user WHERE username = ?`;
    db.get(checkUserQuery, [username], (err, row) => {
        if (err) {
            console.error('Error al verificar el usuario:', err);
            return res.status(500).send('Error al registrar el usuario.');
        }

        // Si se encuentra un usuario con ese nombre, responde con un error.
        if (row) {
            return res.status(400).send('El nombre de usuario ya está en uso. Por favor, elige otro.');
        }

        // Si el usuario no existe, inserta el nuevo usuario en la base de datos.
        const insertQuery = `INSERT INTO user (username, password) VALUES (?, ?)`;
        db.run(insertQuery, [username, password], function(err) {
            if (err) {
                console.error('Error al insertar el usuario:', err);
                return res.status(500).send('Error al registrar el usuario.');
            }
            // Si la inserción fue exitosa, muestra el ID del nuevo usuario y redirige al login.
            console.log('Usuario registrado exitosamente con ID:', this.lastID);
            res.redirect('/login');
        });
    });
});


// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    // Destruye la sesión del usuario actual
    req.session.destroy((err) => {
        if (err) {
            // Si ocurre un error al destruir la sesión, responde con un error 500
            return res.status(500).send('Error al cerrar sesión');
        }
        // Si la sesión se destruye correctamente, redirige al usuario a la página principal
        res.redirect('/');
    });
});

// Ruta para mostrar el formulario de inicio de sesión
app.get('/login', (req, res) => {
    // Inicializa la variable 'user' como null por defecto
    let user = null;
    
    // Verifica si existe un 'userId' en la sesión, lo que indica que el usuario está autenticado
    if (req.session.userId) {
        // Si el usuario está autenticado, crea un objeto 'user' con los datos de la sesión
        user = {
            id: req.session.userId,     // ID del usuario
            name: req.session.userName  // Nombre del usuario
        };
    }
    
    // Renderiza la vista 'login', pasando el objeto 'user' (que puede ser null si no está autenticado)
    res.render('login', { user });
});


//Rgeistra los datos mandados por el usuario y falla si no se mandan los datos necesarios o estan incorrectos
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const checkUserQuery = `SELECT * FROM user WHERE username = ?`;
    db.get(checkUserQuery, [username], (err, row) => {
        if (err) {
            console.error('Error al verificar el usuario:', err);
            return res.status(500).json({ success: false, message: 'Error al iniciar sesión.' });
        }

        if (!row) {
            return res.status(400).json({ success: false, message: 'El usuario no existe.' });
        }

        if (row.password !== password) {
            return res.status(401).json({ success: false, message: 'Contraseña incorrecta.' });
        }

        req.session.userId = row.id;
        req.session.userName = row.username;
        req.session.isAdmin = row.username === 'admin'; // Establecer `isAdmin` si el usuario es admin
        res.json({ success: true, redirect: '/' });
    });
});


// Ruta para listar y administrar usuarios
app.get('/admin', (req, res) => {
    if (req.session.isAdmin) {
        const selectQuery = `SELECT username FROM user`;
        db.all(selectQuery, [], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al cargar los usuarios.');
            }
            res.render('admin', { users: rows });
        });
    } else {
        res.status(403).send('Acceso denegado.');
    }
});


// Ruta para eliminar un usuario
app.post('/deleteUser/:username', (req, res) => {
    if (req.session.isAdmin) {
        const username = req.params.username;
        const deleteQuery = `DELETE FROM user WHERE username = ?`;

        db.run(deleteQuery, [username], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).send('Error al eliminar el usuario.');
            }
            res.redirect('/admin');
        });
    } else {
        res.status(403).send('Acceso denegado.');
    }
});


// Ruta para Películas
app.get('/movies', (req, res) => {
    const query = 'SELECT movie_id, title FROM movie';  
    db.all(query, [], (err, movies) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar las películas');
        }
        res.render('movies', { movies, user: req.user, title: 'Películas' });
    });
});

// Ruta para Directores
app.get('/directors', (req, res) => {
    const query = `
        SELECT DISTINCT person.person_id, person.person_name
        FROM person
        JOIN movie_crew ON person.person_id = movie_crew.movie_id 
        WHERE movie_crew.job = 'Director'
    `;
    db.all(query, [], (err, directors) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar los directores');
        }
        res.render('directors', { directors, user: req.user, title: 'Directores' });
    });
});


// Ruta para actores
app.get('/actors', (req, res) => {
    const query = `
        SELECT distinct person.person_id, person.person_name
        FROM person
        JOIN movie_cast ON person.person_id = movie_cast.person_id
        JOIN movie_crew ON movie_cast.movie_id = movie_crew.movie_id
        WHERE movie_crew.job = 'Characters'
    `;
    db.all(query, [], (err, actors) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error al cargar los actores');
        }
        res.render('actors', { actors, user: req.user, title: 'Actores' });
    });
});




// Ruta para realizar las consultas
app.get('/buscar', (req, res) => {
    const searchTerm = req.query.q;  // Obtener el término de búsqueda
    const searchType = req.query.type;  // Obtener el tipo de búsqueda (title, actor, director)

    // Verifica si se ingresó un término de búsqueda y tipo de búsqueda
    if (!searchTerm || !searchType) {
        return res.status(400).send('Se requiere un término de búsqueda y un tipo de búsqueda.');
    }

    console.log("Tipo de búsqueda:", searchType);  // Depuración: Verifica el tipo de búsqueda
    console.log("Término de búsqueda:", searchTerm);  // Depuración: Verifica el término de búsqueda

    let query = '';  // Inicializar la consulta SQL
    let params = [`${searchTerm}%`];  // Parámetros para la consulta SQL

    // Si el tipo de búsqueda es 'all', realiza las tres consultas por separado
    if (searchType === 'all') {
        console.log("Buscando por todo...");

        // Consulta para películas por título
        const titleQuery = `SELECT movie.title AS movie_title, NULL AS actor_name, NULL AS director_name, movie.movie_id as movie_id FROM movie WHERE title LIKE ?`;
        
        // Consulta para actores
        const actorQuery = `SELECT DISTINCT movie.title AS movie_title, person.person_name AS actor_name, NULL AS director_name, person.person_id as actor_id
                            FROM movie
                            JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
                            JOIN person ON movie_cast.person_id = person.person_id
                            WHERE person.person_name LIKE ?
                            GROUP BY person.person_name, person.person_id;`;

        // Consulta para directores sin duplicados
        const directorQuery = `SELECT DISTINCT movie.title AS movie_title, person.person_name AS director_name, person.person_id as director_id
                FROM movie 
                JOIN movie_crew ON movie.movie_id = movie_crew.movie_id 
                JOIN person ON movie_crew.person_id = person.person_id 
                WHERE movie_crew.job = 'Director' 
                AND person.person_name LIKE ?
                GROUP BY person.person_name, person.person_id;`;

        let combinedResults = [];

        // Promesa para la consulta de títulos
        const queryTitles = new Promise((resolve, reject) => {
            db.all(titleQuery, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => ({
                    movie_title: row.movie_title,
                    actor_name: null,
                    director_name: null,
                    movie_id: row.movie_id  
                })));
            });
        });

        // Promesa para la consulta de actores
        const queryActors = new Promise((resolve, reject) => {
            db.all(actorQuery, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => ({
                    movie_id: row.movie_id,
                    movie_title: row.movie_title,
                    actor_name: row.actor_name,
                    director_name: null,
                    actor_id: row.actor_id,
                })));
            });
        });

        // Promesa para la consulta de directores
        const queryDirectors = new Promise((resolve, reject) => {
            db.all(directorQuery, params, (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => ({
                    movie_title: row.movie_title,
                    actor_name: null,
                    director_name: row.director_name,
                    director_id: row.director_id,
                    movie_id: row.movie_id
                })));
            });
        });

        // Ejecutar todas las consultas y combinar los resultados
        Promise.all([queryTitles, queryActors, queryDirectors])
        .then(results => {
            const [titles, actors, directors] = results;
            
            // Agregar títulos a los resultados combinados
            combinedResults = [...titles];

            // Agregar actores a los resultados combinados
            combinedResults = combinedResults.concat(actors);

            // Agregar directores a los resultados combinados
            combinedResults = combinedResults.concat(directors);

            // Verificar si se encontraron resultados
            if (combinedResults.length === 0) {
                return res.render('resultadosAll', { 
                    movies: [], 
                    message: `No se encontraron resultados para "${searchTerm}".`,
                    user: req.user // Pasar el objeto user aquí
                });
            }

            const resultMessage = `Se encontraron ${combinedResults.length} resultados para "${searchTerm}" en todos los campos.`;

            // Renderizar la vista con los resultados
            res.render('resultadosAll', { 
                movies: combinedResults, 
                message: resultMessage, 
                searchTerm,
                user: req.user // Pasar el objeto user también en este caso
            });
        })
        .catch(err => {
            console.error("Error en la consulta:", err.message);
            return res.status(500).send('Error en la búsqueda.');
        });
        return;  // Salir de la función aquí para evitar la doble ejecución
    }

    // Otras búsquedas específicas por título, actor o director
    if (searchType === 'title') {
        console.log("Buscando por título...");
        query = 'SELECT DISTINCT * FROM movie WHERE title LIKE ?';
    } else if (searchType === 'actor') {
        console.log("Buscando por actor...");
        query = `SELECT DISTINCT movie.* 
                 FROM movie 
                 JOIN movie_cast ON movie.movie_id = movie_cast.movie_id 
                 JOIN person ON movie_cast.person_id = person.person_id 
                 WHERE person.person_name LIKE ?;`;
    } else if (searchType === 'director') {
        console.log("Buscando por director...");
        query = `SELECT DISTINCT movie.* 
                 FROM movie 
                 JOIN movie_crew ON movie.movie_id = movie_crew.movie_id 
                 JOIN person ON movie_crew.person_id = person.person_id 
                 WHERE movie_crew.job = 'Director' AND person.person_name LIKE ?;`;
    } else if (searchType === 'keyword') { // Busqueda por Keyword
        console.log("Buscando por KeyWords...");
        query = `SELECT DISTINCT movie.*
                 FROM movie 
                 JOIN movie_keywords ON movie.movie_id = movie_keywords.movie_id
                 JOIN keyword ON movie_keywords.keyword_id = keyword.keyword_id
                 WHERE keyword.keyword_name LIKE ?;`;
    } else {
        console.log("Tipo de búsqueda no válido:", searchType);
        return res.status(400).send('Tipo de búsqueda no válido.');
    }

    // Ejecutar la consulta para title, actor o director
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Error en la consulta:", err.message);
            return res.status(500).send('Error en la búsqueda.');
        }

        // Verificar si se encontraron resultados
        if (rows.length === 0) {
            console.log("No se encontraron resultados para:", searchTerm);
            return res.render('resultado', { 
                movies: [], 
                message: `No se encontraron resultados para "${searchTerm}".`,
                user: req.user // Pasar el objeto user aquí
            });
        }
        
        // Construir el mensaje dependiendo del tipo de búsqueda
        const resultMessage = `Se encontraron ${rows.length} resultados para ${searchTerm} en ${searchType}.`;
        
        // Renderizar la vista con los resultados
        res.render('resultado', { 
            movies: rows, 
            message: resultMessage,
            user: req.user // Pasar el objeto user también en este caso
        });        
    });
});


// Ruta principal para mostrar una película específica y sus reseñas
app.get('/pelicula/:id', (req, res) => {
    const movieId = req.params.id;
    
    // Verificar si hay un usuario logueado
    let user = null;
    if (req.session.userId) {
        user = {
            id: req.session.userId,
            name: req.session.userName
        };
    }

    // Objeto para almacenar todos los datos de la película
    const movieData = {
        id: null,
        title: null,
        release_date: null,
        overview: null,
        directors: [],
        writers: [],
        cast: [],
        crew: [],
        genres: [],
        countries: [],
        production_companies: [],
        languages: [],
        reviews: []
    };

    // 1. Obtener datos básicos de la película
    const queryMovie = `SELECT * FROM movie WHERE movie_id = ?`;
    
    db.get(queryMovie, [movieId], (err, row) => {
        if (err) {
            console.error('Error al obtener datos de la película:', err);
            return res.status(500).send('Error al cargar los datos de la película.');
        }
        
        if (!row) {
            return res.status(404).send('Película no encontrada.');
        }

        // Guardar datos básicos
        movieData.id = row.movie_id;
        movieData.title = row.title;
        movieData.release_date = row.release_date;
        movieData.overview = row.overview;

        // 2. Obtener el elenco (cast)
        const queryCast = `
            SELECT 
                actor.person_name AS actor_name,
                actor.person_id AS actor_id,
                movie_cast.character_name,
                movie_cast.cast_order
            FROM movie_cast
            LEFT JOIN person AS actor ON movie_cast.person_id = actor.person_id
            WHERE movie_cast.movie_id = ?
            ORDER BY movie_cast.cast_order ASC`;

        db.all(queryCast, [movieId], (err, castRows) => {
            if (err) {
                console.error('Error al obtener el elenco:', err);
                return res.status(500).send('Error al cargar el elenco.');
            }

            movieData.cast = castRows.map(row => ({
                actor_id: row.actor_id,
                actor_name: row.actor_name,
                character_name: row.character_name,
                cast_order: row.cast_order
            }));

            // 3. Obtener el equipo técnico (crew)
            const queryCrew = `
                SELECT 
                    crew_member.person_name AS crew_member_name,
                    crew_member.person_id AS crew_member_id,
                    movie_crew.job,
                    department.department_name
                FROM movie_crew
                LEFT JOIN person AS crew_member ON movie_crew.person_id = crew_member.person_id
                LEFT JOIN department ON movie_crew.department_id = department.department_id
                WHERE movie_crew.movie_id = ?
                ORDER BY department.department_name, movie_crew.job`;

            db.all(queryCrew, [movieId], (err, crewRows) => {
                if (err) {
                    console.error('Error al obtener el equipo técnico:', err);
                    return res.status(500).send('Error al cargar el equipo de producción.');
                }

                // Clasificar miembros del crew según su rol
                crewRows.forEach(row => {
                    if (row.job === 'Director' && row.department_name === 'Directing') {
                        movieData.directors.push({
                            crew_member_id: row.crew_member_id,
                            crew_member_name: row.crew_member_name
                        });
                    } else if (row.job === 'Writer' && row.department_name === 'Writing') {
                        movieData.writers.push({
                            crew_member_id: row.crew_member_id,
                            crew_member_name: row.crew_member_name
                        });
                    } else {
                        movieData.crew.push({
                            crew_member_id: row.crew_member_id,
                            crew_member_name: row.crew_member_name,
                            department_name: row.department_name,
                            job: row.job
                        });
                    }
                });

                // 4. Obtener géneros
                const queryGenres = `
                    SELECT DISTINCT genre.genre_name 
                    FROM movie_genres 
                    JOIN genre ON genre.genre_id = movie_genres.genre_id 
                    WHERE movie_genres.movie_id = ?
                    ORDER BY genre.genre_name`;

                db.all(queryGenres, [movieId], (err, genreRows) => {
                    if (err) {
                        console.error('Error al obtener géneros:', err);
                        return res.status(500).send('Error al cargar los géneros.');
                    }

                    movieData.genres = genreRows.map(row => row.genre_name);

                    // 5. Obtener países de producción
                    const queryCountries = `
                        SELECT DISTINCT country.country_name 
                        FROM production_country 
                        JOIN country ON country.country_id = production_country.country_id 
                        WHERE production_country.movie_id = ?
                        ORDER BY country.country_name`;

                    db.all(queryCountries, [movieId], (err, countryRows) => {
                        if (err) {
                            console.error('Error al obtener países:', err);
                            return res.status(500).send('Error al cargar los países de producción.');
                        }

                        movieData.countries = countryRows.map(row => row.country_name);

                        // 6. Obtener compañías de producción
                        const queryCompanies = `
                            SELECT DISTINCT production_company.company_name 
                            FROM movie_company 
                            JOIN production_company ON production_company.company_id = movie_company.company_id 
                            WHERE movie_company.movie_id = ?
                            ORDER BY production_company.company_name`;

                        db.all(queryCompanies, [movieId], (err, companyRows) => {
                            if (err) {
                                console.error('Error al obtener compañías:', err);
                                return res.status(500).send('Error al cargar las compañías de producción.');
                            }

                            movieData.production_companies = companyRows.map(row => row.company_name);

                            // 7. Obtener idiomas
                            const queryLanguages = `
                                SELECT DISTINCT language.language_name 
                                FROM movie_languages 
                                JOIN language ON language.language_id = movie_languages.language_id 
                                WHERE movie_languages.movie_id = ?
                                ORDER BY language.language_name`;

                            db.all(queryLanguages, [movieId], (err, languageRows) => {
                                if (err) {
                                    console.error('Error al obtener idiomas:', err);
                                    return res.status(500).send('Error al cargar los idiomas.');
                                }

                                movieData.languages = languageRows.map(row => row.language_name);

                                const queryReviews = `
                                    SELECT
                                    reviews.review_id,
                                    reviews.content,
                                    user.username,
                                    reviews.stars,
                                    user.id
                                    FROM reviews
                                    JOIN user ON reviews.user_id = user.id
                                    WHERE reviews.movie_id = ?;`;

                                db.all(queryReviews, [movieId], (err, reviewRows) => {
                                    if (err) {
                                        console.error('Error al obtener reseñas:', err);
                                        return res.status(500).send('Error al cargar las reseñas.');
                                    }

                                    movieData.reviews = reviewRows.map(row => ({
                                        id: row.review_id,
                                        content: row.content,
                                        created_at: row.created_at,
                                        username: row.username,
                                        stars: row.stars,
                                        user_id: row.user_id,
                                        is_owner: req.user ? (row.user_id === req.user.id) : false
                                    }));

                                    // Renderizar la página con todos los datos
                                    res.render('pelicula', {
                                        movie: movieData,
                                        user: req.user,  // Cambié de 'user: user' a 'user: req.user'
                                        isAuthenticated: !!req.user  // Cambié de 'user' a 'req.user'
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});


app.post('/pelicula/:id/review', (req, res) => {
    // Verificar si el usuario está autenticado
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Debe iniciar sesión para dejar una reseña'
        });
    }

    const movieId = req.params.id;
    const { content } = req.body;
    const userId = req.session.userId;

    // Validar que haya contenido
    if (!content || content.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'El contenido de la reseña no puede estar vacío'
        });
    }

    // Obtener el valor de la calificación
    const ratingInput = req.body.rating;
    const rating = ratingInput ? parseInt(ratingInput) : null;

    // Insertar la nueva reseña
    const insertReviewQuery = `
        INSERT INTO reviews (movie_id, user_id, content, stars) 
        VALUES (?, ?, ?, ?)
    `;

    db.run(insertReviewQuery, [movieId, userId, content.trim(), rating], function(err) {
        if (err) {
            console.error('Error al guardar la reseña:', err);
            return res.status(500).json({
                success: false,
                message: 'Error al guardar la reseña'
            });
        }

        // Devolver respuesta exitosa
        res.json({
            success: true,
            message: 'Reseña guardada exitosamente',
            reviewId: this.lastID
        });
    });
});

// Ruta para eliminar una reseña
app.delete('/pelicula/:movieId/review/:reviewId', (req, res) => {
    // Verificar si el usuario está autenticado
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'No autorizado'
        });
    }

    const { reviewId } = req.params;
    const userId = req.session.userId;

    // Eliminar la reseña (solo si pertenece al usuario)
    const deleteReviewQuery = `
        DELETE FROM reviews 
        WHERE review_id = ? AND user_id = ?`;

    db.run(deleteReviewQuery, [reviewId, userId], function(err) {
        if (err) {
            console.error('Error al eliminar la reseña:', err);
            return res.status(500).json({
                success: false,
                message: 'Error al eliminar la reseña'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reseña no encontrada o no autorizado para eliminarla'
            });
        }

        res.json({
            success: true,
            message: 'Reseña eliminada exitosamente'
        });
    });
});



// Ruta para mostrar la página de un actor específico
app.get('/actor/:id', (req, res) => {
    const actorId = req.params.id;

    // Consulta SQL para obtener las películas en las que participó el actor
    const query = `
    SELECT DISTINCT
      person.person_name as actorName,
      movie.*
    FROM movie
    INNER JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
    INNER JOIN person ON person.person_id = movie_cast.person_id
    WHERE movie_cast.person_id = ?;
  `;

    // Ejecutar la consulta
    db.all(query, [actorId], (err, movies) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar las películas del actor.');
        } else {
            // Obtener el nombre del actor
            const actorName = movies.length > 0 ? movies[0].actorName : '';

            res.render('actor', { 
                actorName, 
                movies,
                user: req.user // Asegúrate de que req.user esté pasando el usuario a la vista
            });          
        }
    });
});

// Ruta para mostrar la página de un director específico
app.get('/director/:id', (req, res) => {
    const directorId = req.params.id;

    // Consulta SQL para obtener las películas dirigidas por el director
    const query = `
    SELECT DISTINCT
      person.person_name as directorName,
      movie.*
    FROM movie
    INNER JOIN movie_crew ON movie.movie_id = movie_crew.movie_id
    INNER JOIN person ON person.person_id = movie_crew.person_id
    WHERE movie_crew.job = 'Director' AND movie_crew.person_id = ?;
  `;


    // console.log('query = ', query)

    // Ejecutar la consulta
    db.all(query, [directorId], (err, movies) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar las películas del director.');
        } else {
            // console.log('movies.length = ', movies.length)
            // Obtener el nombre del director
            const directorName = movies.length > 0 ? movies[0].directorName : '';
            res.render('director', { 
                directorName, 
                movies,
                user: req.user // Pasar el objeto user aquí
            }); 
        }
    });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
