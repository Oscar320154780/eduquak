-- =========================
-- TABLA USUARIOS
-- =========================

CREATE TABLE IF NOT EXISTS usuarios (

  id_usuario SERIAL PRIMARY KEY,

  nombre TEXT NOT NULL,

  correo TEXT NOT NULL UNIQUE,

  password TEXT NOT NULL,

  rol TEXT NOT NULL
    CHECK (
      rol IN (
        'alumno',
        'asesor',
        'admin'
      )
    ),

  estado_validacion TEXT NOT NULL
    DEFAULT 'pendiente'

    CHECK (
      estado_validacion IN (
        'pendiente',
        'verificado',
        'rechazado'
      )
    ),

  institucion TEXT,

  telefono TEXT,

  badge_verificacion TEXT
    DEFAULT 'Sin verificar',

  motivo_rechazo TEXT,

  fecha_rechazo TIMESTAMP,

  documento_reenviado BOOLEAN
    DEFAULT FALSE,

  fecha_reenvio_documento TIMESTAMP,

  fecha_registro TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLA ALUMNOS
-- =========================

CREATE TABLE IF NOT EXISTS alumnos (

  id_alumno SERIAL PRIMARY KEY,

  id_usuario INTEGER NOT NULL UNIQUE,

  documento_estudiante_url TEXT,

  tipo_documento TEXT,

  FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA ASESORES
-- =========================

CREATE TABLE IF NOT EXISTS asesores (

  id_asesor SERIAL PRIMARY KEY,

  id_usuario INTEGER NOT NULL UNIQUE,

  especialidad TEXT,

  materias TEXT,

  descripcion TEXT,

  modalidad TEXT
    CHECK (
      modalidad IN (
        'virtual',
        'presencial',
        'ambas'
      )
    ),

  documento_respaldo_url TEXT,

  tipo_documento TEXT,

  promedio_calificacion REAL
    DEFAULT 0,

  total_calificaciones INTEGER
    DEFAULT 0,

  FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA ADMINS
-- =========================

CREATE TABLE IF NOT EXISTS admins (

  id_admin SERIAL PRIMARY KEY,

  id_usuario INTEGER NOT NULL UNIQUE,

  FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA ASESORIAS
-- =========================

CREATE TABLE IF NOT EXISTS asesorias (

  id_asesoria SERIAL PRIMARY KEY,

  id_alumno INTEGER,

  id_asesor INTEGER NOT NULL,

  estado TEXT NOT NULL
    DEFAULT 'pendiente'

    CHECK (
      estado IN (
        'pendiente',
        'aceptada',
        'rechazada',
        'finalizada'
      )
    ),

  fecha TEXT,

  hora TEXT,

  tipo TEXT NOT NULL
    DEFAULT 'individual'

    CHECK (
      tipo IN (
        'individual',
        'grupal'
      )
    ),

  mensaje TEXT,

  cupo_maximo INTEGER
    DEFAULT 1,

  room_name TEXT,

  video_url TEXT,

  fecha_creacion TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_alumno)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE,

  FOREIGN KEY (id_asesor)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA MATERIALES
-- =========================

CREATE TABLE IF NOT EXISTS materiales (

  id_material SERIAL PRIMARY KEY,

  id_asesor INTEGER NOT NULL,

  titulo TEXT NOT NULL,

  descripcion TEXT,

  materia TEXT NOT NULL,

  archivo_url TEXT NOT NULL,

  estado_revision TEXT NOT NULL
    DEFAULT 'pendiente_revision'

    CHECK (
      estado_revision IN (
        'pendiente_revision',
        'aprobado',
        'rechazado',
        'oculto'
      )
    ),

  motivo_revision TEXT,

  fecha_subida TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_asesor)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA CUESTIONARIOS
-- =========================

CREATE TABLE IF NOT EXISTS cuestionarios (

  id_cuestionario SERIAL PRIMARY KEY,

  id_asesor INTEGER NOT NULL,

  titulo TEXT NOT NULL,

  descripcion TEXT,

  materia TEXT NOT NULL,

  estado_revision TEXT NOT NULL
    DEFAULT 'pendiente_revision'

    CHECK (
      estado_revision IN (
        'pendiente_revision',
        'aprobado',
        'rechazado',
        'oculto'
      )
    ),

  motivo_revision TEXT,

  fecha_creacion TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_asesor)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA PREGUNTAS
-- =========================

CREATE TABLE IF NOT EXISTS preguntas (

  id_pregunta SERIAL PRIMARY KEY,

  id_cuestionario INTEGER NOT NULL,

  pregunta TEXT NOT NULL,

  opcion_a TEXT NOT NULL,

  opcion_b TEXT NOT NULL,

  opcion_c TEXT NOT NULL,

  opcion_d TEXT NOT NULL,

  respuesta_correcta TEXT NOT NULL

    CHECK (
      respuesta_correcta IN (
        'A',
        'B',
        'C',
        'D'
      )
    ),

  FOREIGN KEY (id_cuestionario)
    REFERENCES cuestionarios(id_cuestionario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA RESULTADOS
-- =========================

CREATE TABLE IF NOT EXISTS resultados_cuestionario (

  id_resultado SERIAL PRIMARY KEY,

  id_cuestionario INTEGER NOT NULL,

  id_alumno INTEGER NOT NULL,

  puntaje REAL NOT NULL,

  total_preguntas INTEGER NOT NULL,

  fecha TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_cuestionario)
    REFERENCES cuestionarios(id_cuestionario)
    ON DELETE CASCADE,

  FOREIGN KEY (id_alumno)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- TABLA RESEÑAS
-- =========================

CREATE TABLE IF NOT EXISTS resenas_asesor (

  id_resena SERIAL PRIMARY KEY,

  id_asesoria INTEGER NOT NULL UNIQUE,

  id_alumno INTEGER NOT NULL,

  id_asesor INTEGER NOT NULL,

  calificacion INTEGER NOT NULL

    CHECK (
      calificacion BETWEEN 1 AND 5
    ),

  comentario TEXT,

  fecha TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_asesoria)
    REFERENCES asesorias(id_asesoria)
    ON DELETE CASCADE,

  FOREIGN KEY (id_alumno)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE,

  FOREIGN KEY (id_asesor)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- INSCRIPCIONES GRUPALES
-- =========================

CREATE TABLE IF NOT EXISTS inscripciones_asesoria (

  id_inscripcion SERIAL PRIMARY KEY,

  id_asesoria INTEGER NOT NULL,

  id_alumno INTEGER NOT NULL,

  estado TEXT NOT NULL
    DEFAULT 'inscrito'

    CHECK (
      estado IN (
        'inscrito',
        'cancelado'
      )
    ),

  fecha_inscripcion TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_asesoria)
    REFERENCES asesorias(id_asesoria)
    ON DELETE CASCADE,

  FOREIGN KEY (id_alumno)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);


-- =========================
-- CHAT DE ASESORÍAS
-- =========================

CREATE TABLE IF NOT EXISTS chat_mensajes (

  id_mensaje SERIAL PRIMARY KEY,

  id_asesoria INTEGER NOT NULL,

  id_emisor INTEGER NOT NULL,

  mensaje TEXT NOT NULL,

  fecha_envio TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_asesoria)
    REFERENCES asesorias(id_asesoria)
    ON DELETE CASCADE,

  FOREIGN KEY (id_emisor)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================
-- REPORTES
-- =========================

CREATE TABLE IF NOT EXISTS reportes_asesoria (

  id_reporte SERIAL PRIMARY KEY,

  id_asesoria INTEGER NOT NULL,

  id_alumno INTEGER NOT NULL,

  id_asesor INTEGER NOT NULL,

  motivo TEXT NOT NULL,

  descripcion TEXT,

  evidencia_url TEXT,

  tipo_evidencia TEXT,

  estado TEXT NOT NULL
    DEFAULT 'pendiente'

    CHECK (
      estado IN (
        'pendiente',
        'revisado',
        'resuelto'
      )
    ),

  fecha_reporte TIMESTAMP
    DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_asesoria)
    REFERENCES asesorias(id_asesoria)
    ON DELETE CASCADE,

  FOREIGN KEY (id_alumno)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE,

  FOREIGN KEY (id_asesor)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);