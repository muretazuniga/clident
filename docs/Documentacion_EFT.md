# Ingeniería de Software (PRY3211)

Proyecto: CLIDENT

## Integrantes
- Belén Bustos
- Matías Ureta

---

# 1. Introducción

Mi Agenda Clínica es un sistema desarrollado en Python y MySQL orientado a la gestión de citas médicas. El sistema permite que los usuarios puedan iniciar sesión, registrar usuarios, visualizar citas médicas, agendar nuevas citas, editar citas existentes y cancelar citas.

El proyecto fue desarrollado utilizando Visual Studio Code, Python, XAMPP y phpMyAdmin, aplicando conocimientos adquiridos durante la asignatura Ingeniería de Software.

---

# 2. Objetivo del Proyecto

Desarrollar un sistema de escritorio basado en consola capaz de gestionar citas médicas mediante una conexión a base de datos MySQL, permitiendo realizar operaciones CRUD de manera segura y eficiente.

---

# 3. Tecnologías Utilizadas

- Python
- MySQL
- XAMPP
- phpMyAdmin
- Visual Studio Code
- GitHub

---

# 4. Funcionalidades del Sistema

## Gestión de usuarios
- Inicio de sesión.
- Registro de usuarios.

## Gestión de citas
- Ver citas.
- Agendar citas.
- Editar citas.
- Cancelar citas.

## Base de datos
- Conexión persistente con MySQL.
- Almacenamiento de usuarios y citas.

---

# 5. Requerimientos Funcionales

## RF01 – Inicio de sesión
El sistema debe permitir que los usuarios ingresen mediante correo y contraseña.

## RF02 – Registro de usuarios
El sistema debe permitir registrar nuevos usuarios.

## RF03 – Ver citas
El sistema debe mostrar las citas registradas por el usuario.

## RF04 – Agendar citas
El sistema debe permitir ingresar nuevas citas.

## RF05 – Editar citas
El sistema debe permitir modificar fecha y hora de citas.

## RF06 – Cancelar citas
El sistema debe permitir eliminar citas registradas.

---

# 6. Requerimientos No Funcionales

- El sistema debe conectarse correctamente a MySQL.
- El sistema debe ejecutarse mediante Python.
- La información debe almacenarse de forma persistente.
- El sistema debe contar con validaciones básicas.
- El sistema debe ser simple e intuitivo.

---

 Modelo de Base de Datos

# 7. Base de datos

```sql
clident
```

---

# 8. Script SQL Utilizado

```sql
CREATE DATABASE IF NOT EXISTS clident;

USE clident;

CREATE TABLE IF NOT EXISTS usuarios(
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    correo VARCHAR(100),
    contrasena VARCHAR(100),
    rol VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS citas(
    id_cita INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE,
    hora TIME,
    id_usuario INT,
    FOREIGN KEY(id_usuario) REFERENCES usuarios(id_usuario)
);

INSERT INTO usuarios(nombre, correo, contrasena, rol)
VALUES(
'Admin',
'admin@gmail.com',
'1234',
'admin'
);


```
---

# 9. Validaciones Implementadas

```
Validación de campos vacíos.
Validación de usuarios.
Validación de opciones inválidas.
Manejo básico de errores.
```

---

# 10. Metodología Scrum
Product Backlog
ID	Tarea	Estado
1	Crear login	Completado
2	Crear CRUD citas	Completado
3	Crear base de datos	Completado
4	Conectar Python y MySQL	Completado
5	Crear README	Completado
6	Crear documentación	Completado

---

# 11. Evidencias

El proyecto incluye:

GitHub
README
Trello
SQL
Python
UML
Figma
Diagramas

---

# 12. Conclusión

El proyecto permitió aplicar conocimientos de programación en Python, conexión con bases de datos MySQL y metodologías ágiles para el desarrollo de software.
Además, se fortalecieron habilidades relacionadas con documentación, organización de tareas y desarrollo de software utilizando herramientas reales del entorno profesional.
