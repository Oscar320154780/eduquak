require("dotenv").config();

const bcrypt = require("bcryptjs");

const {
  getQuery,
  runQuery
} = require("../utils/dbHelpers");

async function seedAdmin() {

  try {

    const correo =
      "admin@eduquak.com";

    const existingAdmin =
      await getQuery(

        `
        SELECT id_usuario
        FROM usuarios
        WHERE correo = $1
        `,

        [correo]

      );

    if (existingAdmin) {

      console.log(
        "⚠️ El admin ya existe"
      );

      process.exit(0);

    }

    const hashedPassword =
      await bcrypt.hash(
        "Admin123*",
        10
      );

    const result =
      await runQuery(

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
          'admin',
          'verificado',
          $4,
          $5,
          'Verificado'

        )

        RETURNING id_usuario
        `,

        [

          "Administrador",

          correo,

          hashedPassword,

          "EduQuak",

          "0000000000"

        ]

      );

    const id_usuario =
      result.rows[0].id_usuario;

    await runQuery(

      `
      INSERT INTO admins (
        id_usuario
      )
      VALUES ($1)
      `,

      [id_usuario]

    );

    console.log(
      " Admin creado correctamente"
    );

    console.log(
      " Correo:",
      correo
    );

    console.log(
      " Password:",
      "Admin123*"
    );

    process.exit(0);

  } catch (error) {

    console.error(
      " Error creando admin:"
    );

    console.error(error);

    process.exit(1);

  }

}

seedAdmin();