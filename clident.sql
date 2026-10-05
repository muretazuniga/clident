CREATE DATABASE IF NOT EXISTS clident;

USe clident;

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