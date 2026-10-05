CREATE DATABASE clident;
USE clident;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50),
    apellido VARCHAR(50),
    correo VARCHAR(100) UNIQUE,
    contrasena VARCHAR(100),
    rol VARCHAR(20)
);

CREATE TABLE pacientes (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    rut VARCHAR(20),
    telefono VARCHAR(20),
    direccion VARCHAR(100),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE especialidades (
    id_especialidad INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50),
    descripcion VARCHAR(100)
);

CREATE TABLE medicos (
    id_medico INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    id_especialidad INT,
    numero_registro VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_especialidad) REFERENCES especialidades(id_especialidad)
);

CREATE TABLE horarios (
    id_horario INT AUTO_INCREMENT PRIMARY KEY,
    id_medico INT,
    fecha DATE,
    hora_inicio TIME,
    hora_fin TIME,
    disponible BOOLEAN,
    FOREIGN KEY (id_medico) REFERENCES medicos(id_medico)
);

CREATE TABLE citas (
    id_cita INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT,
    id_medico INT,
    fecha DATE,
    hora TIME,
    estado VARCHAR(20),
    motivo VARCHAR(100),
    FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
    FOREIGN KEY (id_medico) REFERENCES medicos(id_medico)
);

-- SOLO 2 USUARIOS
INSERT INTO usuarios (nombre, apellido, correo, contrasena, rol) VALUES
('Belen', 'Bustos', 'belen.bustos.bravo.1999@gmail.com', '1234', 'paciente'),
('Matias', 'Ureta', 'm.ureta@duocuc.cl', '1234', 'medico');

-- 1 PACIENTE
INSERT INTO pacientes (id_usuario, rut, telefono, direccion) VALUES
(1, '11.111.111-1', '987654321', 'Santiago');

-- 1 ESPECIALIDAD
INSERT INTO especialidades (nombre, descripcion) VALUES
('Medicina General', 'Atencion general');

-- 1 MEDICO
INSERT INTO medicos (id_usuario, id_especialidad, numero_registro) VALUES
(2, 1, 'MED123');

-- 1 HORARIO
INSERT INTO horarios (id_medico, fecha, hora_inicio, hora_fin, disponible) VALUES
(1, '2026-04-20', '09:00:00', '12:00:00', TRUE);

-- 1 CITA
INSERT INTO citas (id_paciente, id_medico, fecha, hora, estado, motivo) VALUES
(1, 1, '2026-04-20', '09:30:00', 'Agendada', 'Control general');

-- CRUD
INSERT INTO citas (id_paciente, id_medico, fecha, hora, estado, motivo)
VALUES (1, 1, '2026-04-22', '11:00:00', 'Agendada', 'Chequeo');

SELECT * FROM citas;

UPDATE citas
SET estado = 'Cancelada'
WHERE id_cita = 1;

DELETE FROM citas
WHERE id_cita = 2;
