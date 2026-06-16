require("dotenv").config();

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { v2: cloudinary } = require("cloudinary");


const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ Falta DATABASE_URL en tu .env");
  process.exit(1);
}

const usarSSL =
  DATABASE_URL.includes("sslmode=require") ||
  process.env.PGSSL === "true" ||
  process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: usarSSL ? { rejectUnauthorized: false } : false
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const PASSWORD_DEMO = "Demo123*";

const TOTAL_ALUMNOS = Number(process.env.TOTAL_ALUMNOS || 60);
const TOTAL_ASESORES = Number(process.env.TOTAL_ASESORES || 10);
const TOTAL_ASESORIAS = Number(process.env.TOTAL_ASESORIAS || 160);
const TOTAL_MATERIALES = Number(process.env.TOTAL_MATERIALES || 55);
const TOTAL_CUESTIONARIOS = Number(process.env.TOTAL_CUESTIONARIOS || 24);
const TOTAL_RESULTADOS = Number(process.env.TOTAL_RESULTADOS || 180);
const TOTAL_REPORTES = Number(process.env.TOTAL_REPORTES || 14);

const SUBIR_ARCHIVOS_CLOUDINARY = process.env.SUBIR_ARCHIVOS_CLOUDINARY !== "false";

const instituciones = [
  "CECyT 9 Juan de Dios Bátiz",
  "CECyT 3 Estanislao Ramírez Ruiz",
  "CECyT 13 Ricardo Flores Magón",
  "ENP 6 Antonio Caso",
  "Colegio de Bachilleres Plantel 20",
  "Preparatoria Oficial No. 115",
  "Bachillerato Tecnológico Industrial",
  "Preparatoria Comunitaria CDMX"
];

const materias = [
  "Matemáticas",
  "Cálculo diferencial",
  "Física",
  "Química",
  "Programación",
  "Bases de datos",
  "Inglés",
  "Historia de México"
];

const nombresBase = [
  "Ana Sofía", "Carlos Eduardo", "Valeria", "Diego", "Ximena", "Luis Ángel",
  "Camila", "Mateo", "Regina", "Emiliano", "Fernanda", "Jorge", "Mariana",
  "Andrés", "Paola", "Sebastián", "Natalia", "Iván", "Alexa", "Rodrigo",
  "Jimena", "Bruno", "Daniela", "Santiago", "Montserrat", "Ángel", "Renata",
  "Gael", "Victoria", "Mauricio", "Danna", "José Manuel", "Fátima", "Leonardo",
  "Carolina", "Hugo", "Abril", "Kevin", "Isabella", "Miguel Ángel", "Emilia",
  "Nicolás", "María José", "Alan", "Aitana", "Pablo", "Lucía", "Adrián",
  "Romina", "Elías", "Valentina", "Oscar", "Erick", "Álvaro", "Elihu", "Luis Manuel"
];

const apellidos = [
  "López", "Hernández", "Martínez", "Ramírez", "Torres", "García", "Flores",
  "Cruz", "Morales", "Reyes", "Ortiz", "Castillo", "Vargas", "Rojas",
  "Silva", "Mendoza", "Navarro", "Luna", "Campos", "Aguilar", "Fuentes",
  "Peña", "Salas", "Medina", "Paredes", "Santos", "Bautista", "Velázquez",
  "Grande", "Rangel", "Barrios", "Briseño", "Cabrera", "Guerrero", "Acosta"
];

const asesoresBase = [
  {
    nombre: "Mtra. Laura Sánchez Pineda",
    especialidad: "Matemáticas y cálculo",
    materias: "Matemáticas, Cálculo diferencial, Álgebra",
    descripcion: "Explico paso a paso y dejo ejercicios tipo examen. Ideal para regularización y exámenes parciales.",
    modalidad: "virtual"
  },
  {
    nombre: "Ing. Roberto Méndez Alcántara",
    especialidad: "Programación web y bases de datos",
    materias: "Programación, JavaScript, Node.js, PostgreSQL, Bases de datos",
    descripcion: "Apoyo en proyectos escolares, APIs, consultas SQL y depuración de errores.",
    modalidad: "ambas"
  },
  {
    nombre: "QFB. Andrea Ruiz Salgado",
    especialidad: "Química general",
    materias: "Química, Estequiometría, Equilibrio químico, Electroquímica",
    descripcion: "Trabajo con ejercicios resueltos, balanceo, molaridad y problemas de examen.",
    modalidad: "virtual"
  },
  {
    nombre: "Dr. Miguel Torres Ibarra",
    especialidad: "Física",
    materias: "Física, Mecánica, Electricidad, Ondas",
    descripcion: "Ayudo a entender fórmulas, despejes y análisis de problemas sin memorizar de más.",
    modalidad: "presencial"
  },
  {
    nombre: "Lic. Karen Díaz Robledo",
    especialidad: "Inglés académico",
    materias: "Inglés, Reading, Grammar, Writing",
    descripcion: "Práctica de lectura, escritura y conversación para nivel medio superior.",
    modalidad: "ambas"
  },
  {
    nombre: "Mtro. Daniel Herrera Cruz",
    especialidad: "Historia y ciencias sociales",
    materias: "Historia de México, Historia universal, Civismo",
    descripcion: "Clases con líneas del tiempo, mapas mentales y preguntas tipo examen.",
    modalidad: "virtual"
  },
  {
    nombre: "Ing. Fernanda Molina Castro",
    especialidad: "Bases de datos",
    materias: "Bases de datos, SQL, Modelo entidad-relación, PostgreSQL",
    descripcion: "Asesorías para diagramas ER, normalización, consultas y proyectos con backend.",
    modalidad: "ambas"
  },
  {
    nombre: "Mtra. Paola Navarro Jiménez",
    especialidad: "Probabilidad y estadística",
    materias: "Matemáticas, Probabilidad, Estadística",
    descripcion: "Explico distribución binomial, geométrica, tablas, gráficas y varianza.",
    modalidad: "virtual"
  },
  {
    nombre: "Ing. Sebastián Luna Mercado",
    especialidad: "Desarrollo frontend",
    materias: "Programación, HTML, CSS, JavaScript",
    descripcion: "Ayuda con interfaces, formularios, validaciones, responsive design y consumo de APIs.",
    modalidad: "ambas"
  },
  {
    nombre: "Mtra. Mariana Silva Ortega",
    especialidad: "Redacción e inglés",
    materias: "Inglés, Redacción, Comunicación",
    descripcion: "Apoyo en ensayos, guiones, exposiciones y preparación oral.",
    modalidad: "virtual"
  }
];

const mensajesAlumno = [
  "Hola, tengo duda con los ejercicios que dejaron de tarea.",
  "¿Podemos repasar desde lo básico? Me perdí en la clase pasada.",
  "Tengo examen esta semana y quiero practicar ejercicios tipo guía.",
  "¿Me puede ayudar con un problema específico?",
  "Ya subí mis dudas, gracias.",
  "¿La sesión puede ser virtual?",
  "Me interesa una asesoría grupal porque varios compañeros traen la misma duda.",
  "¿Podemos revisar mi procedimiento y ver en dónde me equivoco?"
];

const mensajesAsesor = [
  "Claro, preparo ejercicios graduados para que avancemos poco a poco.",
  "Sí, comparte tus dudas y las revisamos en la sesión.",
  "Perfecto, nos enfocamos en ejercicios tipo examen.",
  "Te recomiendo traer libreta y calculadora para practicar.",
  "Va, revisamos primero teoría y después problemas.",
  "Confirmo horario, te espero en la videollamada.",
  "Sí, para grupal puedo abrir cupo de 8 estudiantes.",
  "No te preocupes, lo resolvemos paso por paso."
];

const resenas = [
  "Explica claro y no avanza hasta que entiendas.",
  "Me ayudó a mejorar mi procedimiento.",
  "Muy buena asesoría, los ejemplos fueron parecidos al examen.",
  "Resolvió mis dudas y dejó ejercicios extra.",
  "La clase estuvo bien organizada.",
  "Buena atención y puntualidad.",
  "Me gustó que usó ejemplos sencillos.",
  "La sesión grupal estuvo dinámica."
];

const materialesPorMateria = {
  "Matemáticas": ["Álgebra básica", "Factorización", "Ecuaciones cuadráticas", "Funciones lineales"],
  "Cálculo diferencial": ["Límites", "Derivadas básicas", "Regla de la cadena", "Aplicaciones de derivadas"],
  "Física": ["MRU y MRUA", "Leyes de Newton", "Trabajo y energía", "Circuitos eléctricos"],
  "Química": ["Balanceo", "Estequiometría", "Molaridad", "Equilibrio químico"],
  "Programación": ["Condicionales", "Arreglos", "Funciones", "APIs con Express"],
  "Bases de datos": ["Modelo ER", "Normalización", "Consultas SELECT", "Joins en SQL"],
  "Inglés": ["Modal verbs", "Reading comprehension", "Past simple", "Future forms"],
  "Historia de México": ["Independencia", "Reforma", "Porfiriato", "Revolución mexicana"]
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function slug(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

function fechaHaceDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59), 0);
  return d;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function toTimestamp(date) {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function horaEscolar() {
  return pick(["07:30", "08:00", "09:00", "10:30", "12:00", "13:30", "15:00", "16:00", "17:30", "18:00", "19:00"]);
}

function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[áÁ]/g, "a")
    .replace(/[éÉ]/g, "e")
    .replace(/[íÍ]/g, "i")
    .replace(/[óÓ]/g, "o")
    .replace(/[úÚüÜ]/g, "u")
    .replace(/[ñÑ]/g, "n");
}

function crearPdfBuffer(titulo, lineas) {
  const safeTitulo = escapePdfText(titulo);
  const safeLines = lineas.map(escapePdfText).slice(0, 22);

  let y = 760;
  const content = [
    "BT",
    "/F1 18 Tf",
    `50 ${y} Td (${safeTitulo}) Tj`,
    "/F1 11 Tf"
  ];

  y -= 35;

  safeLines.forEach((linea, index) => {
    content.push(`50 ${y - index * 18} Td (${linea}) Tj`);
    content.push(`-50 ${-(y - index * 18)} Td`);
  });

  content.push("ET");

  const stream = content.join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj"
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj + "\n";
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

function assertCloudinary() {
  const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter(
    (key) => !process.env[key]
  );

  if (SUBIR_ARCHIVOS_CLOUDINARY && missing.length > 0) {
    throw new Error(`Faltan variables de Cloudinary en .env: ${missing.join(", ")}`);
  }
}

function subirBufferCloudinary(buffer, folder, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `eduquak/seed-realista/${folder}`,
        public_id: `${publicId}_${Date.now()}_${randomInt(1000, 9999)}`,
        resource_type: "auto",
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(buffer);
  });
}

async function crearArchivoReal(tipo, titulo, lineas, folder) {
  if (!SUBIR_ARCHIVOS_CLOUDINARY) {
    return "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
  }

  const buffer = crearPdfBuffer(titulo, lineas);
  const publicId = `${tipo}_${slug(titulo).slice(0, 55)}`;
  return subirBufferCloudinary(buffer, folder, publicId);
}

async function insertarUsuario(client, data) {
  const result = await client.query(
    `
    INSERT INTO usuarios (
      nombre,
      correo,
      password,
      rol,
      estado_validacion,
      institucion,
      telefono,
      badge_verificacion,
      motivo_rechazo,
      fecha_rechazo,
      documento_reenviado,
      fecha_reenvio_documento,
      fecha_registro
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (correo) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      password = EXCLUDED.password,
      estado_validacion = EXCLUDED.estado_validacion,
      institucion = EXCLUDED.institucion,
      telefono = EXCLUDED.telefono,
      badge_verificacion = EXCLUDED.badge_verificacion,
      motivo_rechazo = EXCLUDED.motivo_rechazo,
      fecha_rechazo = EXCLUDED.fecha_rechazo,
      documento_reenviado = EXCLUDED.documento_reenviado,
      fecha_reenvio_documento = EXCLUDED.fecha_reenvio_documento
    RETURNING id_usuario
    `,
    [
      data.nombre,
      data.correo,
      data.password,
      data.rol,
      data.estado_validacion,
      data.institucion,
      data.telefono,
      data.badge_verificacion,
      data.motivo_rechazo || null,
      data.fecha_rechazo || null,
      data.documento_reenviado || false,
      data.fecha_reenvio_documento || null,
      data.fecha_registro
    ]
  );

  return result.rows[0].id_usuario;
}

function generarAlumno(index) {
  const nombre = `${pick(nombresBase)} ${pick(apellidos)} ${pick(apellidos)}`;
  const correo = `${slug(nombre)}.${String(index + 1).padStart(3, "0")}@demo.eduquak.local`;

  return {
    nombre,
    correo,
    institucion: pick(instituciones),
    telefono: `55${randomInt(10000000, 99999999)}`
  };
}

function preguntasPorMateria(materia, n) {
  const banco = {
    "Matemáticas": [
      ["¿Cuál es el resultado de factorizar x^2 - 9?", "(x-3)(x+3)", "x(x-9)", "(x-9)(x+1)", "x^2+9", "A"],
      ["Si 2x + 5 = 17, ¿cuánto vale x?", "5", "6", "7", "8", "B"]
    ],
    "Cálculo diferencial": [
      ["La derivada de x^2 es:", "x", "2x", "x^3", "2", "B"],
      ["Un límite sirve principalmente para analizar:", "comportamiento cercano a un valor", "solo áreas", "solo porcentajes", "solo vectores", "A"]
    ],
    "Física": [
      ["En MRU la velocidad es:", "variable", "constante", "cero siempre", "negativa siempre", "B"],
      ["La unidad de fuerza en SI es:", "Joule", "Newton", "Watt", "Pascal", "B"]
    ],
    "Química": [
      ["El mol es una unidad de:", "cantidad de sustancia", "temperatura", "presión", "volumen", "A"],
      ["En equilibrio químico, Kc se expresa con:", "concentraciones", "masas solamente", "colores", "temperaturas solamente", "A"]
    ],
    "Programación": [
      ["¿Qué estructura permite tomar decisiones?", "if", "array", "string", "console", "A"],
      ["En JavaScript, === compara:", "solo valor", "valor y tipo", "solo tipo", "nada", "B"]
    ],
    "Bases de datos": [
      ["Una llave primaria identifica:", "un registro único", "una tabla duplicada", "un usuario externo", "un archivo CSS", "A"],
      ["SQL se usa para:", "consultar bases de datos", "diseñar logos", "editar videos", "comprimir imágenes", "A"]
    ],
    "Inglés": [
      ["'Can' expresa principalmente:", "ability", "past obligation", "future perfect", "comparison", "A"],
      ["Past simple de 'go':", "goed", "went", "gone", "goes", "B"]
    ],
    "Historia de México": [
      ["La Independencia de México inició en:", "1810", "1821", "1910", "1857", "A"],
      ["La Revolución Mexicana inició en:", "1910", "1810", "1521", "2000", "A"]
    ]
  };

  const base = banco[materia] || banco["Matemáticas"];
  const seleccion = [];

  for (let i = 0; i < n; i++) {
    const item = base[i % base.length];
    seleccion.push({
      pregunta: item[0],
      opcion_a: item[1],
      opcion_b: item[2],
      opcion_c: item[3],
      opcion_d: item[4],
      respuesta_correcta: item[5]
    });
  }

  return seleccion;
}

async function main() {
  assertCloudinary();

  const client = await pool.connect();

  try {
    console.log("✅ Conectado a Neon/PostgreSQL");
    console.log("🌱 Generando base realista de 3 meses para EduQuak...");
    console.log(`☁️ Cloudinary: ${SUBIR_ARCHIVOS_CLOUDINARY ? "subiendo archivos reales" : "modo sin subida real"}`);

    await client.query("BEGIN");

    if (process.env.RESET_DEMO === "true") {
      console.log("🧹 Borrando usuarios demo anteriores...");
      await client.query("DELETE FROM usuarios WHERE correo LIKE '%@demo.eduquak.local'");
    }

    const passwordHash = await bcrypt.hash(PASSWORD_DEMO, 10);
    const alumnos = [];
    const asesores = [];

    for (let i = 0; i < TOTAL_ALUMNOS; i++) {
      const alumno = generarAlumno(i);
      const estado = i < Math.round(TOTAL_ALUMNOS * 0.78)
        ? "verificado"
        : i < Math.round(TOTAL_ALUMNOS * 0.90)
          ? "pendiente"
          : "rechazado";

      const diasRegistro = randomInt(3, 89);
      const motivoRechazo = estado === "rechazado" ? pick([
        "Documento ilegible",
        "No coincide la información",
        "Archivo incompleto",
        "La constancia no tiene fecha visible"
      ]) : null;

      const docUrl = await crearArchivoReal(
        "constancia",
        `Constancia de estudios - ${alumno.nombre}`,
        [
          "DOCUMENTO DEMO GENERADO PARA PRUEBAS DE CARGA.",
          `Nombre: ${alumno.nombre}`,
          `Institucion: ${alumno.institucion}`,
          `Correo demo: ${alumno.correo}`,
          `Fecha simulada: ${toDateOnly(fechaHaceDias(diasRegistro - 1))}`,
          "Este archivo no pertenece a una persona real."
        ],
        "documentos-alumnos"
      );

      const idUsuario = await insertarUsuario(client, {
        nombre: alumno.nombre,
        correo: alumno.correo,
        password: passwordHash,
        rol: "alumno",
        estado_validacion: estado,
        institucion: alumno.institucion,
        telefono: alumno.telefono,
        badge_verificacion: estado === "verificado" ? "Verificado" : estado === "rechazado" ? "Rechazado" : "Sin verificar",
        motivo_rechazo: motivoRechazo,
        fecha_rechazo: estado === "rechazado" ? toTimestamp(fechaHaceDias(randomInt(1, 20))) : null,
        documento_reenviado: estado === "pendiente" && i % 3 === 0,
        fecha_reenvio_documento: estado === "pendiente" && i % 3 === 0 ? toTimestamp(fechaHaceDias(randomInt(1, 8))) : null,
        fecha_registro: toTimestamp(fechaHaceDias(diasRegistro))
      });

      await client.query(
        `
        INSERT INTO alumnos (id_usuario, documento_estudiante_url, tipo_documento)
        VALUES ($1,$2,$3)
        ON CONFLICT (id_usuario) DO UPDATE SET
          documento_estudiante_url = EXCLUDED.documento_estudiante_url,
          tipo_documento = EXCLUDED.tipo_documento
        `,
        [idUsuario, docUrl, "constancia_estudios"]
      );

      alumnos.push({ id: idUsuario, ...alumno, estado });
      if ((i + 1) % 10 === 0) console.log(`   👤 Alumnos creados: ${i + 1}/${TOTAL_ALUMNOS}`);
    }

    for (let i = 0; i < TOTAL_ASESORES; i++) {
      const asesor = asesoresBase[i % asesoresBase.length];
      const correo = `${slug(asesor.nombre)}.${String(i + 1).padStart(2, "0")}@demo.eduquak.local`;
      const diasRegistro = randomInt(8, 89);

      const docUrl = await crearArchivoReal(
        "cedula",
        `Documento profesional - ${asesor.nombre}`,
        [
          "DOCUMENTO DEMO GENERADO PARA PRUEBAS DE CARGA.",
          `Nombre: ${asesor.nombre}`,
          `Especialidad: ${asesor.especialidad}`,
          `Materias: ${asesor.materias}`,
          "Este archivo no pertenece a una persona real."
        ],
        "documentos-asesores"
      );

      const idUsuario = await insertarUsuario(client, {
        nombre: asesor.nombre,
        correo,
        password: passwordHash,
        rol: "asesor",
        estado_validacion: "verificado",
        institucion: "EduQuak Red de Asesores",
        telefono: `56${randomInt(10000000, 99999999)}`,
        badge_verificacion: "Verificado",
        fecha_registro: toTimestamp(fechaHaceDias(diasRegistro))
      });

      await client.query(
        `
        INSERT INTO asesores (
          id_usuario,
          especialidad,
          materias,
          descripcion,
          modalidad,
          documento_respaldo_url,
          tipo_documento
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id_usuario) DO UPDATE SET
          especialidad = EXCLUDED.especialidad,
          materias = EXCLUDED.materias,
          descripcion = EXCLUDED.descripcion,
          modalidad = EXCLUDED.modalidad,
          documento_respaldo_url = EXCLUDED.documento_respaldo_url,
          tipo_documento = EXCLUDED.tipo_documento
        `,
        [
          idUsuario,
          asesor.especialidad,
          asesor.materias,
          asesor.descripcion,
          asesor.modalidad,
          docUrl,
          "cedula_profesional"
        ]
      );

      asesores.push({ id: idUsuario, correo, ...asesor });
      console.log(`   👨‍🏫 Asesor creado: ${asesor.nombre}`);
    }

    const asesorias = [];
    const alumnosVerificados = alumnos.filter((a) => a.estado === "verificado");

    for (let i = 0; i < TOTAL_ASESORIAS; i++) {
      const dias = randomInt(-14, 89);
      const fechaObj = fechaHaceDias(dias);
      const esFutura = dias < 0;
      const muyReciente = dias >= 0 && dias <= 5;
      const tipo = i % 6 === 0 ? "grupal" : "individual";
      const estado = esFutura
        ? "aceptada"
        : muyReciente
          ? pick(["aceptada", "finalizada", "pendiente"])
          : pick(["finalizada", "finalizada", "finalizada", "aceptada", "rechazada", "pendiente"]);

      const asesor = pick(asesores);
      const alumno = tipo === "individual" ? pick(alumnosVerificados) : null;
      const materia = pick(materias);
      const tema = pick(materialesPorMateria[materia] || [materia]);
      const cupoMaximo = tipo === "grupal" ? randomInt(5, 14) : 1;
      const roomName = `eduquak-${slug(materia)}-${i + 1}-${randomInt(1000, 9999)}`;

      const result = await client.query(
        `
        INSERT INTO asesorias (
          id_alumno,
          id_asesor,
          estado,
          fecha,
          hora,
          tipo,
          mensaje,
          cupo_maximo,
          room_name,
          video_url,
          fecha_creacion
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        RETURNING id_asesoria
        `,
        [
          alumno ? alumno.id : null,
          asesor.id,
          estado,
          toDateOnly(fechaObj),
          horaEscolar(),
          tipo,
          `Necesito apoyo en ${materia}, especialmente en ${tema}.`,
          cupoMaximo,
          roomName,
          `https://meet.jit.si/${roomName}`,
          toTimestamp(fechaHaceDias(Math.min(89, Math.max(1, dias + randomInt(1, 10)))))
        ]
      );

      const idAsesoria = result.rows[0].id_asesoria;
      asesorias.push({ id: idAsesoria, asesor, alumno, estado, tipo, materia, tema, fechaObj });

      if (tipo === "grupal") {
        const inscritos = randomInt(2, Math.min(cupoMaximo, alumnosVerificados.length, 10));
        for (const alumnoGrupo of shuffle(alumnosVerificados).slice(0, inscritos)) {
          await client.query(
            `
            INSERT INTO inscripciones_asesoria (id_asesoria, id_alumno, estado, fecha_inscripcion)
            VALUES ($1,$2,$3,$4)
            `,
            [idAsesoria, alumnoGrupo.id, pick(["inscrito", "inscrito", "inscrito", "cancelado"]), toTimestamp(fechaHaceDias(randomInt(1, 89)))]
          );
        }
      }
    }

    console.log(`   📅 Asesorías creadas: ${TOTAL_ASESORIAS}`);

    for (let i = 0; i < TOTAL_MATERIALES; i++) {
      const asesor = pick(asesores);
      const materia = pick(materias);
      const tema = pick(materialesPorMateria[materia] || [materia]);
      const estadoRevision = i < Math.round(TOTAL_MATERIALES * 0.76)
        ? "aprobado"
        : i < Math.round(TOTAL_MATERIALES * 0.90)
          ? "pendiente_revision"
          : "rechazado";

      const archivoUrl = await crearArchivoReal(
        "material",
        `${tema} - ${materia}`,
        [
          `Materia: ${materia}`,
          `Tema: ${tema}`,
          `Asesor: ${asesor.nombre}`,
          "Contenido demo:",
          "1. Concepto principal explicado en lenguaje sencillo.",
          "2. Ejemplo resuelto paso a paso.",
          "3. Ejercicios para practicar.",
          "4. Recomendaciones para examen.",
          "Archivo generado para prueba realista de Cloudinary."
        ],
        "materiales"
      );

      await client.query(
        `
        INSERT INTO materiales (
          id_asesor,
          titulo,
          descripcion,
          materia,
          archivo_url,
          estado_revision,
          motivo_revision,
          fecha_subida
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          asesor.id,
          `${tema} - guía rápida`,
          `Material con explicación, ejemplo y ejercicios de ${tema}.`,
          materia,
          archivoUrl,
          estadoRevision,
          estadoRevision === "rechazado" ? pick(["El archivo no cumple el formato solicitado", "Falta información del tema", "Documento incompleto"]) : null,
          toTimestamp(fechaHaceDias(randomInt(1, 89)))
        ]
      );

      if ((i + 1) % 10 === 0) console.log(`   📚 Materiales subidos: ${i + 1}/${TOTAL_MATERIALES}`);
    }

    const cuestionarios = [];

    for (let i = 0; i < TOTAL_CUESTIONARIOS; i++) {
      const asesor = pick(asesores);
      const materia = pick(materias);
      const tema = pick(materialesPorMateria[materia] || [materia]);
      const estadoRevision = i < Math.round(TOTAL_CUESTIONARIOS * 0.82) ? "aprobado" : "pendiente_revision";

      const result = await client.query(
        `
        INSERT INTO cuestionarios (
          id_asesor,
          titulo,
          descripcion,
          materia,
          estado_revision,
          motivo_revision,
          fecha_creacion
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id_cuestionario
        `,
        [
          asesor.id,
          `Quiz de ${tema}`,
          `Cuestionario breve para practicar ${materia}.`,
          materia,
          estadoRevision,
          null,
          toTimestamp(fechaHaceDias(randomInt(1, 89)))
        ]
      );

      const idCuestionario = result.rows[0].id_cuestionario;
      cuestionarios.push({ id: idCuestionario, materia });

      const preguntas = preguntasPorMateria(materia, 6);
      for (const pregunta of preguntas) {
        await client.query(
          `
          INSERT INTO preguntas (
            id_cuestionario,
            pregunta,
            opcion_a,
            opcion_b,
            opcion_c,
            opcion_d,
            respuesta_correcta
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [
            idCuestionario,
            pregunta.pregunta,
            pregunta.opcion_a,
            pregunta.opcion_b,
            pregunta.opcion_c,
            pregunta.opcion_d,
            pregunta.respuesta_correcta
          ]
        );
      }
    }

    for (let i = 0; i < TOTAL_RESULTADOS; i++) {
      const cuestionario = pick(cuestionarios);
      await client.query(
        `
        INSERT INTO resultados_cuestionario (
          id_cuestionario,
          id_alumno,
          puntaje,
          total_preguntas,
          fecha
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          cuestionario.id,
          pick(alumnosVerificados).id,
          randomInt(2, 6),
          6,
          toTimestamp(fechaHaceDias(randomInt(1, 89)))
        ]
      );
    }

    console.log(`   📝 Cuestionarios creados: ${TOTAL_CUESTIONARIOS}`);
    console.log(`   📊 Resultados creados: ${TOTAL_RESULTADOS}`);

    const finalizadas = asesorias.filter((a) => a.estado === "finalizada");

    for (const asesoria of finalizadas.slice(0, Math.min(finalizadas.length, 70))) {
      let alumnoResena = asesoria.alumno;

      if (!alumnoResena) {
        const result = await client.query(
          "SELECT id_alumno FROM inscripciones_asesoria WHERE id_asesoria = $1 AND estado = 'inscrito' LIMIT 1",
          [asesoria.id]
        );

        const idAlumno = result.rows[0]?.id_alumno;
        alumnoResena = alumnosVerificados.find((a) => a.id === idAlumno) || pick(alumnosVerificados);
      }

      await client.query(
        `
        INSERT INTO resenas_asesor (
          id_asesoria,
          id_alumno,
          id_asesor,
          calificacion,
          comentario,
          fecha
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (id_asesoria) DO NOTHING
        `,
        [
          asesoria.id,
          alumnoResena.id,
          asesoria.asesor.id,
          pick([3, 4, 4, 4, 5, 5, 5]),
          pick(resenas),
          toTimestamp(fechaHaceDias(randomInt(1, 70)))
        ]
      );
    }

    for (const asesoria of asesorias.slice(0, 100)) {
      const alumnoChat = asesoria.alumno || pick(alumnosVerificados);
      const fechaBase = fechaHaceDias(randomInt(1, 89));

      await client.query(
        `
        INSERT INTO chat_mensajes (id_asesoria, id_emisor, mensaje, fecha_envio)
        VALUES
          ($1,$2,$3,$4),
          ($1,$5,$6,$7),
          ($1,$2,$8,$9)
        `,
        [
          asesoria.id,
          alumnoChat.id,
          pick(mensajesAlumno),
          toTimestamp(fechaBase),
          asesoria.asesor.id,
          pick(mensajesAsesor),
          toTimestamp(new Date(fechaBase.getTime() + randomInt(5, 45) * 60000)),
          pick(["Gracias, ya quedó claro.", "Perfecto, ahí estaré.", "Va, llevo mis ejercicios.", "Gracias por responder."]),
          toTimestamp(new Date(fechaBase.getTime() + randomInt(60, 180) * 60000))
        ]
      );
    }

    for (const asesoria of finalizadas.slice(0, Math.min(TOTAL_REPORTES, finalizadas.length))) {
      const alumnoReporte = asesoria.alumno || pick(alumnosVerificados);
      const evidenciaUrl = await crearArchivoReal(
        "reporte",
        `Evidencia reporte asesoria ${asesoria.id}`,
        [
          "EVIDENCIA DEMO PARA PRUEBA DE REPORTES.",
          `Materia: ${asesoria.materia}`,
          `Tema: ${asesoria.tema}`,
          `Alumno: ${alumnoReporte.nombre}`,
          `Asesor: ${asesoria.asesor.nombre}`,
          "Descripción: archivo generado automáticamente para probar carga y visualización."
        ],
        "reportes"
      );

      await client.query(
        `
        INSERT INTO reportes_asesoria (
          id_asesoria,
          id_alumno,
          id_asesor,
          motivo,
          descripcion,
          evidencia_url,
          tipo_evidencia,
          estado,
          fecha_reporte
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          asesoria.id,
          alumnoReporte.id,
          asesoria.asesor.id,
          pick(["Problema con horario", "Material incompleto", "Duda no resuelta", "Problema técnico en videollamada"]),
          "Reporte demo generado para validar el flujo del administrador.",
          evidenciaUrl,
          "pdf",
          pick(["pendiente", "revisado", "resuelto"]),
          toTimestamp(fechaHaceDias(randomInt(1, 80)))
        ]
      );
    }

    await client.query(`
      UPDATE asesores a
      SET
        promedio_calificacion = COALESCE(stats.promedio, 0),
        total_calificaciones = COALESCE(stats.total, 0)
      FROM (
        SELECT
          id_asesor,
          ROUND(AVG(calificacion)::numeric, 2)::real AS promedio,
          COUNT(*)::int AS total
        FROM resenas_asesor
        GROUP BY id_asesor
      ) stats
      WHERE a.id_usuario = stats.id_asesor
    `);

    await client.query("COMMIT");

    console.log("\n✅ Seed realista cargado correctamente");
    console.log("-------------------------------------");
    console.log(`👤 Alumnos: ${TOTAL_ALUMNOS}`);
    console.log(`👨‍🏫 Asesores: ${TOTAL_ASESORES}`);
    console.log(`📅 Asesorías: ${TOTAL_ASESORIAS}`);
    console.log(`📚 Materiales: ${TOTAL_MATERIALES}`);
    console.log(`📝 Cuestionarios: ${TOTAL_CUESTIONARIOS}`);
    console.log(`📊 Resultados: ${TOTAL_RESULTADOS}`);
    console.log(`💬 Chats: aprox. ${Math.min(100, TOTAL_ASESORIAS) * 3} mensajes`);
    console.log(`🚩 Reportes: ${TOTAL_REPORTES}`);
    console.log("🔐 Password demo:", PASSWORD_DEMO);
    console.log("Ejemplo alumno: revisa cualquier correo @demo.eduquak.local en tabla usuarios");
    console.log("Ejemplo asesor: revisa cualquier asesor @demo.eduquak.local en tabla usuarios");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error cargando seed realista:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
