require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const demoRoutes = require("./routes/demo.routes");
const adminRoutes = require("./routes/admin.routes");
const asesoriasRoutes = require("./routes/asesorias.routes");
const materialesRoutes = require("./routes/materiales.routes");
const cuestionariosRoutes = require("./routes/cuestionarios.routes");
const resenasRoutes = require("./routes/resenas.routes");
const statsRoutes = require("./routes/stats.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

const PORT =
  process.env.PORT || 3000;

/* =========================
   MIDDLEWARES GLOBALES
========================= */

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

/* =========================
   ARCHIVOS SUBIDOS
========================= */

/*
  uploads normales:
  backend/src/uploads
*/

const uploadsPath =
  path.join(__dirname, "uploads");

console.log("UPLOADS PATH:");
console.log(uploadsPath);

app.use(
  "/uploads",

  express.static(uploadsPath, {

    setHeaders: (
      res,
      filePath
    ) => {

      if (
        filePath
          .toLowerCase()
          .endsWith(".pdf")
      ) {

        res.setHeader(
          "Content-Type",
          "application/pdf"
        );

        res.setHeader(
          "Content-Disposition",
          "inline"
        );

      }

    }

  })
);

/* =========================
   REPORTES (UPLOADS EXTERNOS)
========================= */

/*
  reportes:
  backend/uploads/reportes
*/

const reportesPath =
  path.join(
    __dirname,
    "..",
    "uploads",
    "reportes"
  );

console.log("REPORTES PATH:");
console.log(reportesPath);

app.use(
  "/uploads/reportes",

  express.static(reportesPath, {

    setHeaders: (
      res,
      filePath
    ) => {

      if (
        filePath
          .toLowerCase()
          .endsWith(".pdf")
      ) {

        res.setHeader(
          "Content-Type",
          "application/pdf"
        );

        res.setHeader(
          "Content-Disposition",
          "inline"
        );

      }

    }

  })
);

/* =========================
   HEALTH CHECK
========================= */

app.get(
  "/health",
  (req, res) => {

    res.json({

      ok: true,

      message:
        "Servidor funcionando correctamente",

      time:
        new Date().toISOString()

    });

  }
);

/* =========================
   RUTA PRINCIPAL
========================= */

app.get(
  "/",
  (req, res) => {

    res.sendFile(

      path.join(
        __dirname,
        "../../frontend/index.html"
      )

    );

  }
);

/* =========================
   FRONTEND ESTÁTICO
========================= */

app.use(
  express.static(
    path.join(
      __dirname,
      "../../frontend"
    )
  )
);

/* =========================
   RUTAS API
========================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  usersRoutes
);

app.use(
  "/api/demo",
  demoRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use(
  "/api/asesorias",
  asesoriasRoutes
);

app.use(
  "/api/materiales",
  materialesRoutes
);

app.use(
  "/api/cuestionarios",
  cuestionariosRoutes
);

app.use(
  "/api/resenas",
  resenasRoutes
);

app.use(
  "/api/stats",
  statsRoutes
);

app.use(
  "/api/chat",
  chatRoutes
);

/* =========================
   ARRANQUE SERVIDOR
========================= */

app.listen(
  PORT,
  () => {

    console.log(
      `🚀 Servidor corriendo en http://localhost:${PORT}`
    );

  }
);