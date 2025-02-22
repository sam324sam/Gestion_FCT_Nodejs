const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require("mysql2");

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar la conexión a MySQL
const db = mysql.createConnection({
    host: "localhost", // Cambia esto si usas un servidor remoto
    user: "root", // Tu usuario de MySQL
    password: "", // Contraseña de tal es root y el mio esta vacio
    database: "aplicacion_fct" // Nombre de la base de datos
});

// Conectar a MySQL
db.connect((err) => {
    if (err) {
        console.error("Error al conectar con MySQL:", err);
        return;
    }
    console.log("Conectado a MySQL ✅");
});

// Configuración de la sesión
app.use(session({
    secret: 'tu-secreto',
    resave: false,
    saveUninitialized: true,
}));

//Acceder a datps de la seccion
app.get("/sesion", (req, res) => { //No sirve ahora de nada
    if (req.session.correo) {
        res.json({
            correo: req.session.correo,
            rol: req.session.rol
        });
    } else {
        res.status(401).json({ mensaje: "No estás logueado" });
    }
});

// cerrar sesion
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("Error al cerrar sesión");
        }
        res.redirect('/');
    });
});

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para manejar formularios de html

// Configuración de directorio publico de todos los html
app.use(express.static(path.join(__dirname, 'public')));

//Gestionar el login
app.post('/gestionar_login', (req, res) => {
    const { correo, clave } = req.body;
    // valido el correo y la clave
    db.query('SELECT * FROM profesores WHERE correo = ? AND clave = ?', [correo, clave], (err, results) => {
        if (err) {
            console.error("Error al realizar la consulta:", err);
            return res.json({ mensaje: 'Error en la base de datos' });
        }
        if (results.length > 0) {
            const user = results[0];
            // Guardar cosas de sesion
            req.session.correo = user.correo;
            req.session.rol = user.rol;
            return res.json({ mensaje: 'Inicio de sesión exitoso.' });
        } else {
            return res.json({ mensaje: 'Nombre completo o contraseña incorrectos' });
        }
    });
});

// Apartado para insertar por formulario (Opcional cambiarlo como lo tengo para el update si da tiempo)
// Insert de profesor
app.post('/insertarProfesor', async (req, res) => {
    const datos = req.body; // Recibimos todos los datos del formulario (filtrar si da tiempo)
    try {
        const result = await insertar('profesores', datos, req); // El req es para ver la session
        if (result) {
            res.status(200).json({ mensaje: 'Datos insertados con éxito' });
        } else {
            res.status(500).json({ mensaje: 'Error al insertar los datos' });
        }
    } catch (error) {
        console.error('Error en la operación de inserción:', error);
        res.status(500).json({ mensaje: error.message || 'Error en el servidor al procesar la solicitud' });
    }
});

// Insert de empresa
app.post('/insertarEmpresa', async (req, res) => {
    const datos = req.body; // Recibimos todos los datos del formulario (filtrar si da tiempo)
    try {
        const result = await insertar('empresa', datos, req);
        if (result) {
            res.status(200).json({ mensaje: 'Datos insertados con éxito' });
        } else {
            res.status(500).json({ mensaje: 'Error al insertar los datos' });
        }
    } catch (error) {
        console.error('Error en la operación de inserción:', error);
        res.status(500).json({ mensaje: error.message || 'Error en el servidor al procesar la solicitud' });
    }
});

// Insert de alumno
app.post('/insertarAlumno', async (req, res) => {
    const datos = req.body; // Recibimos todos los datos del formulario (filtrar si da tiempo)
    try {
        const result = await insertar('alumnos', datos, req);
        if (result) {
            res.status(200).json({ mensaje: 'Datos insertados con éxito' });
        } else {
            res.status(500).json({ mensaje: 'Error al insertar los datos' });
        }
    } catch (error) {
        console.error('Error en la operación de inserción:', error);
        res.status(500).json({ mensaje: error.message || 'Error en el servidor al procesar la solicitud' });
    }
});

// Insert de contacto
app.post('/insertarContacto_fct', async (req, res) => {
    const datos = req.body;
    try {
        const result = await insertar('contactos', datos, req);
        if (result) {
            res.status(200).json({ mensaje: 'Datos insertados con éxito' });
        } else {
            res.status(500).json({ mensaje: 'Error al insertar los datos' });
        }
    } catch (error) {
        console.error('Error en la operación de inserción:', error);
        res.status(500).json({ mensaje: error.message || 'Error en el servidor al procesar la solicitud' });
    }
});

// Apartado para realizar updates de las tablas con put (verbo como el delte de mas abajo)
// Actualizar profesor
app.put('/actualizar/:tabla/:id', async (req, res) => {
    const { tabla, id } = req.params;
    const datos = req.body;

    try {
        const result = await actualizar(tabla, id, datos, req);
        if (result) {
            res.status(200).json({ mensaje: 'Datos actualizados con éxito' });
        } else {
            res.status(500).json({ mensaje: 'Error al actualizar los datos' });
        }
    } catch (error) {
        console.error('Error en la operación de actualización:', error);
        res.status(500).json({ mensaje: error.message || 'Error en el servidor al procesar la solicitud' });
    }
});

// Realizar insert de cualquier tabla
async function insertar(tabla, datos, req) {
    try {
        // Obtener las claves y valores de los datos
        const campos = Object.keys(datos);
        const valores = Object.values(datos);

        let camposPlaceholder = '';
        let placeholders = '';

        // Crear los placeholders para la consulta usando forEach (Esto en php es mas facil son dos metodos pero bueno)
        campos.forEach((campo, index) => {
            camposPlaceholder += `\`${campo}\``;
            placeholders += '?';

            // Añadir la coma si no es el ultimo campo
            if (index < campos.length - 1) {
                camposPlaceholder += ', ';
                placeholders += ', ';
            }
        });

        // Crear la consulta
        const sql = `INSERT INTO \`${tabla}\` (${camposPlaceholder}) VALUES (${placeholders})`;

        // Usamos una promesa para manejar la asincronia de la consulta cpm em js del html
        return new Promise((resolve, reject) => {
            // Para no mostrar los datos si no estas login a si no eres admin para el profesor
            if (!req.session.correo) {
                return res.status(401).json({ error: 'No tienes una sesión activa' });
            } else if (req.session.rol != 'admin' && tabla == 'profesores') {
                return res.status(401).json({ error: 'No tienes permisos para realizar esta acción' });
            }

            db.execute(sql, valores, (err, result) => {
                if (err) {
                    // Manejo de errores: rechazamos la promesa con un error con mensaje
                    console.error('Error al insertar los datos: ', err.message);
                    reject(new Error('Error al insertar los datos en la base de datos verifique los datos'));
                } else {
                    resolve(true);
                }
            });
        });
    } catch (error) {
        // En caso de error dentro de la función
        console.error('Error en la función insertar:', error.message);
        throw new Error('Error inesperado al procesar la inserción'); // Rechazamos la promesa con un mensaje de error (No usar el rejetc de la promesa o si no bum)
    }
}

// Actualizar datos de x tabla (Parecido a lo que se hace con el insert)
async function actualizar(tabla, id, datos, req, res) {
    try {
        const campos = Object.keys(datos);
        const valores = Object.values(datos);
        let camposPlaceholder = '';
        campos.forEach((campo, index) => {
            camposPlaceholder += `\`${campo}\` = ?`;
            if (index < campos.length - 1) {
                camposPlaceholder += ', ';
            }
        });

        // Crear la consulta
        const sql = `UPDATE \`${tabla}\` SET ${camposPlaceholder} WHERE id = ?`;
        
        // mira otra forma de agregar los valores a la consulta
        valores.push(id);

        return new Promise((resolve, reject) => {
            if (!req.session.correo) {
                return res.status(401).json({ error: 'No tienes una sesión activa' });
            } else if (req.session.rol !== 'admin' && tabla === 'profesores') {
                return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
            }

            db.execute(sql, valores, (err, result) => {
                if (err) {
                    console.error('Error al actualizar los datos: ', err.message);
                    reject(new Error('Error al actualizar los datos en la base de datos. Verifique los datos.'));
                } else {
                    resolve(true);
                }
            });
        });
    } catch (error) {
        console.error('Error en la función actualizar:', error.message);
        throw new Error('Error inesperado al procesar la actualización.');
    }
}

// Eliminar (El delete es un verbo del formualrio como el get y el post)
app.delete('/eliminar/:tabla/:id', (req, res) => {
    // gestion simple de seguridad (hacer un metodo aparte si hay tiempo)
    if (!req.session.correo) {
        return res.status(401).json({ error: 'No tienes una sesión activa' });
    } else if (req.session.rol != 'admin' && tabla == 'profesores') {
        return res.status(401).json({ error: 'No tienes permisos para realizar esta acción' });
    }

    const { tabla, id } = req.params;

    const sql = `DELETE FROM ?? WHERE id = ?`;

    db.query(sql, [tabla, id], (error, resultado) => {
        if (error) {
            return res.status(500).json({ error: 'Error al eliminar el registro' });
        }
        res.json({ mensaje: `Registro ${id} eliminado correctamente de ${tabla}` });
    });
});

// consultar todos los datos en una tabla sin where
// Consultar todos los datos en una tabla sin WHERE
app.get('/datos/:tabla', async (req, res) => {
    try {
        const { tabla } = req.params;

        // Verificar si el usuario tiene sesión activa
        if (!req.session.correo) {
            return res.status(401).json({ error: 'No tienes una sesión activa' });
        }

        let sql;
        let valores = [tabla];

        // Si el usuario es profesor, limitar la consulta a nombre_completo y rol (para el inset y el update)
        if (tabla === 'profesores') {
            if (req.session.rol === 'profesor' || req.session.rol === 'tutor_centro') {
                sql = 'SELECT nombre_completo, rol FROM ??';
            } else if (req.session.rol === 'admin') {
                sql = 'SELECT * FROM ??';
            }
        } else {
            sql = 'SELECT * FROM ??';
        }

        const [resultados] = await db.promise().query(sql, valores);
        res.json(resultados);
    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).json({ error: 'Error en la consulta' });
    }
});

// consulata especifica mediante el id y la tabla
app.get('/datos/:tabla/:id', async (req, res) => {
    try {
        const { tabla, id } = req.params;
        // Para no mostrar los datos si no estas login a si no eres admin para el profesor
        if (!req.session.correo) {
            return res.status(401).json({ error: 'No tienes una sesión activa' });
        } else if (req.session.rol != 'admin' && tabla == 'profesores') {
            return res.status(401).json({ error: 'No tienes permisos para realizar esta acción' });
        }

        const sql = 'SELECT * FROM ?? WHERE id = ?';

        const [resultados] = await db.promise().query(sql, [tabla, id]);
        res.json(resultados);
    } catch (error) {
        console.error('Error en la consulta:', error);
        res.status(500).json({ error: 'Error en la consulta' });
    }
});

app.put('/actualizar/:tabla/:id', async (req, res) => {
    const { tabla, id } = req.params;
    const datos = req.body;

    try {
        const result = await actualizar(tabla, id, datos, req);
        if (result) {
            res.status(200).json({ mensaje: 'Datos actualizados con éxito' });
        } else {
            res.status(500).json({ mensaje: 'Error al actualizar los datos' });
        }
    } catch (error) {
        console.error('Error en la operación de actualización:', error);
        res.status(500).json({ mensaje: error.message || 'Error en el servidor al procesar la solicitud' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});