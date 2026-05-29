const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");

const {
  runQuery,
  getQuery
} = require("../utils/dbHelpers");

// =====================================
// REGISTER ALUMNO
// =====================================

exports.registerAlumno = async (req, res) => {

  try {

    const {
      nombre,
      correo,
      password,
      institucion,
      telefono,
      tipo_documento
    } = req.body;

    if (
      !nombre ||
      !correo ||
      !password ||
      !institucion
    ) {

      return res.status(400).json({
        ok: false,
        message: "Faltan campos obligatorios"
      });

    }

    if (!req.file) {

      return res.status(400).json({
        ok: false,
        message:
          "Debes subir tu constancia de estudios o documento equivalente"
      });

    }

    const existingUser = await getQuery(
      `
      SELECT id_usuario
      FROM usuarios
      WHERE correo = $1
      `,
      [correo]
    );

    if (existingUser) {

      return res.status(409).json({
        ok: false,
        code: "EMAIL_YA_REGISTRADO",
        message: "Ese correo ya está registrado"
      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const result = await runQuery(

      `
      INSERT INTO usuarios (

        nombre,
        correo,
        password,
        rol,
        estado_validacion,
        institucion,
        telefono,
        badge_verificacion

      )

      VALUES (

        $1,
        $2,
        $3,
        'alumno',
        'pendiente',
        $4,
        $5,
        'Sin verificar'

      )

      RETURNING id_usuario
      `,

      [
        nombre,
        correo,
        hashedPassword,
        institucion,
        telefono || null
      ]

    );

    const idUsuario =
      result.rows[0].id_usuario;

    const uploadedDocument =
      await uploadBufferToCloudinary(
        req.file,
        "constancias"
      );

    await runQuery(

      `
      INSERT INTO alumnos (

        id_usuario,
        documento_estudiante_url,
        tipo_documento

      )

      VALUES (

        $1,
        $2,
        $3

      )
      `,

      [
        idUsuario,
        uploadedDocument.url,
        tipo_documento || "constancia_estudios"
      ]

    );

    return res.status(201).json({

      ok: true,

      message:
        "Alumno registrado correctamente. Tu cuenta está en revisión.",

      user: {

        id_usuario: idUsuario,

        nombre,

        correo,

        rol: "alumno",

        estado_validacion: "pendiente",

        badge_verificacion:
          "Sin verificar"

      }

    });

  } catch (error) {

    console.error(
      "Error registerAlumno:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al registrar alumno",

      error: error.message

    });

  }

};

// =====================================
// REGISTER ASESOR
// =====================================

exports.registerAsesor = async (req, res) => {

  try {

    const {

      nombre,
      correo,
      password,
      institucion,
      telefono,
      especialidad,
      materias,
      descripcion,
      modalidad,
      tipo_documento

    } = req.body;

    if (
      !nombre ||
      !correo ||
      !password ||
      !institucion ||
      !especialidad
    ) {

      return res.status(400).json({
        ok: false,
        message: "Faltan campos obligatorios"
      });

    }

    if (!req.file) {

      return res.status(400).json({
        ok: false,
        message:
          "Debes subir tu documento de respaldo"
      });

    }

    const existingUser = await getQuery(
      `
      SELECT id_usuario
      FROM usuarios
      WHERE correo = $1
      `,
      [correo]
    );

    if (existingUser) {

      return res.status(409).json({
        ok: false,
        code: "EMAIL_YA_REGISTRADO",
        message: "Ese correo ya está registrado"
      });

    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const result = await runQuery(

      `
      INSERT INTO usuarios (

        nombre,
        correo,
        password,
        rol,
        estado_validacion,
        institucion,
        telefono,
        badge_verificacion

      )

      VALUES (

        $1,
        $2,
        $3,
        'asesor',
        'pendiente',
        $4,
        $5,
        'Sin verificar'

      )

      RETURNING id_usuario
      `,

      [
        nombre,
        correo,
        hashedPassword,
        institucion,
        telefono || null
      ]

    );

    const idUsuario =
      result.rows[0].id_usuario;

    const uploadedDocument =
      await uploadBufferToCloudinary(
        req.file,
        "respaldos"
      );

    await runQuery(

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

      VALUES (

        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7

      )
      `,

      [

        idUsuario,

        especialidad,

        materias || null,

        descripcion || null,

        modalidad || "virtual",

        uploadedDocument.url,

        tipo_documento ||
          "documento_respaldo"

      ]

    );

    return res.status(201).json({

      ok: true,

      message:
        "Asesor registrado correctamente. Tu cuenta está en revisión.",

      user: {

        id_usuario: idUsuario,

        nombre,

        correo,

        rol: "asesor",

        estado_validacion: "pendiente",

        badge_verificacion:
          "Sin verificar"

      }

    });

  } catch (error) {

    console.error(
      "Error registerAsesor:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al registrar asesor",

      error: error.message

    });

  }

};

// =====================================
// LOGIN
// =====================================

exports.login = async (req, res) => {

  try {

    const {
      correo,
      password
    } = req.body;

    if (!correo || !password) {

      return res.status(400).json({

        ok: false,

        message:
          "Correo y contraseña son obligatorios"

      });

    }

    const user = await getQuery(

      `
      SELECT *
      FROM usuarios
      WHERE correo = $1
      `,

      [correo]

    );

    if (!user) {

      return res.status(401).json({

        ok: false,

        message:
          "Credenciales inválidas"

      });

    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {

      return res.status(401).json({

        ok: false,

        message:
          "Credenciales inválidas"

      });

    }

    const token = jwt.sign(

      {

        id_usuario:
          user.id_usuario,

        correo:
          user.correo,

        rol:
          user.rol,

        estado_validacion:
          user.estado_validacion

      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d"
      }

    );

    return res.json({

      ok: true,

      message:
        "Inicio de sesión exitoso",

      token,

      user: {

        id_usuario:
          user.id_usuario,

        nombre:
          user.nombre,

        correo:
          user.correo,

        rol:
          user.rol,

        estado_validacion:
          user.estado_validacion,

        badge_verificacion:
          user.badge_verificacion

      }

    });

  } catch (error) {

    console.error(
      "Error login:",
      error
    );

    return res.status(500).json({

      ok: false,

      message:
        "Error al iniciar sesión",

      error:
        error.message

    });

  }

};