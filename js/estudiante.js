const usuarioActual =
JSON.parse(localStorage.getItem("usuarioActual"));

console.log("ESTUDIANTE ACTUAL:", usuarioActual);


// =========================
// INICIO
// =========================

document.addEventListener("DOMContentLoaded", () => {

  if (!usuarioActual) {
    console.error("No hay usuario en localStorage");
    return;
  }

  const bienvenida = document.getElementById("bienvenida");
  if (bienvenida) {
    bienvenida.innerText = "Bienvenido, " + usuarioActual.nombre;
  }

  mostrarTareas();
  mostrarProgreso();
  mostrarInicio();

  cambiarSeccion("inicio");
});


// =========================
// UTIL
// =========================

function getEstadoReal(tarea, ev) {
  if (!ev) return "Pendiente";
  if (ev.revisado) return "Revisada ✔";
  return "Por revisar ⏳";
}


// =========================
// TAREAS (SOLO INDIVIDUALES)
// =========================

async function obtenerTareasEstudiante() {

  const { data, error } = await supabaseClient
    .from("tareas")
    .select(`
      *,
      materia:materia_id(nombre)
    `)
    .eq("estudiante_id", usuarioActual.id);

  if (error) {
    console.log("ERROR tareas:", error);
    return [];
  }

  console.log("TAREAS INDIVIDUALES:", data);

  return data || [];
}


// =========================
// MOSTRAR TAREAS
// =========================

async function mostrarTareas() {

  const tareas = await obtenerTareasEstudiante();

  const { data: evidencias } = await supabaseClient
    .from("evidencias")
    .select("*")
    .eq("estudiante_id", usuarioActual.id);

  let pendientes = "";
  let revision = "";
  let completadas = "";

  tareas.forEach(t => {

    const ev = evidencias?.find(e =>
      Number(e.tarea_id) === Number(t.id)
    );

    const estadoReal = getEstadoReal(t, ev);

    let tarjeta = `
      <div class="tarea">

      <strong>📝 ${t.titulo}</strong>
      <br>
      📚 ${t.materia?.nombre || "Sin materia"}
      <br>
      📅 ${t.fecha_limite || "Sin fecha"}
      <br>
      Estado: <strong>${estadoReal}</strong>

      <br><br>
    `;

    if (ev) {

      tarjeta += `
        <p style="color:green;">✔ Evidencia entregada</p>
        <p>Revisión: ${ev.revisado ? "✔ Revisada" : "⏳ Por revisar"}</p>

        ${ev.revisado ? `
          <p>📌 Nota: <strong>${ev.calificacion ?? "Sin nota"}/10</strong></p>
          <p>💬 ${ev.comentario || ""}</p>
        ` : ""}

        <a href="${ev.archivo_url}" target="_blank">Ver archivo</a>
      `;

    } else {

      tarjeta += `
        <input type="file" id="file-${t.id}">
        <br><br>
        <button onclick="subirEvidencia(${t.id})">📤 Subir evidencia</button>
      `;
    }

    tarjeta += `</div><br>`;

    if (!ev) pendientes += tarjeta;
    else if (!ev.revisado) revision += tarjeta;
    else completadas += tarjeta;
  });

  const p = document.getElementById("pendientes");
  const r = document.getElementById("revision");
  const c = document.getElementById("completadas");

  if (p) p.innerHTML = pendientes || "<p>No hay tareas</p>";
  if (r) r.innerHTML = revision || "<p>No hay tareas por revisar</p>";
  if (c) c.innerHTML = completadas || "<p>No hay tareas completadas</p>";

  if (p) p.style.display = "block";
}


// =========================
// SUBIR EVIDENCIA
// =========================

async function subirEvidencia(tareaId) {

  const usuario = JSON.parse(localStorage.getItem("usuarioActual"));

  const input = document.getElementById(`file-${tareaId}`);
  const file = input?.files?.[0];

  if (!file) {
    alert("Selecciona un archivo primero");
    return;
  }

  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `estudiante_${usuario.id}/${fileName}`;

  const { error: uploadError } = await supabaseClient
    .storage
    .from("evidencias")
    .upload(filePath, file);

  if (uploadError) {
    console.log(uploadError);
    alert("Error al subir archivo");
    return;
  }

  const { data: urlData } = await supabaseClient
    .storage
    .from("evidencias")
    .getPublicUrl(filePath);

  const archivoUrl = urlData.publicUrl;

  const { error: insertError } = await supabaseClient
    .from("evidencias")
    .insert([{
      tarea_id: tareaId,
      estudiante_id: usuario.id,
      archivo_url: archivoUrl,
      nombre_archivo: file.name,
      revisado: false
    }]);

  if (insertError) {
    console.log(insertError);
    alert("Error guardando evidencia");
    return;
  }

  alert("Evidencia subida correctamente");

  await mostrarTareas();
  await mostrarProgreso();
}


// =========================
// PROGRESO
// =========================

async function mostrarProgreso() {

  const contenedor = document.getElementById("estadisticasEstudiante");
  if (!contenedor) return;

  const tareas = await obtenerTareasEstudiante();

  const { data: evidencias } = await supabaseClient
    .from("evidencias")
    .select("tarea_id, revisado")
    .eq("estudiante_id", usuarioActual.id);

  const revisadas = new Set(
    (evidencias || [])
      .filter(e => e.revisado)
      .map(e => Number(e.tarea_id))
  );

  const total = tareas.length;

  const completadas = tareas.filter(t =>
    revisadas.has(Number(t.id))
  ).length;

  const pendientes = total - completadas;

  const porcentaje = total > 0
    ? Math.round((completadas / total) * 100)
    : 0;

  contenedor.innerHTML = `
    <div class="estadisticas">

      <div class="tarjeta-mini">
        <h2>📝</h2>
        <strong>${total}</strong>
        <p>Tareas</p>
      </div>

      <div class="tarjeta-mini">
        <h2>✅</h2>
        <strong>${completadas}</strong>
        <p>Completadas</p>
      </div>

      <div class="tarjeta-mini">
        <h2>🕒</h2>
        <strong>${pendientes}</strong>
        <p>Pendientes</p>
      </div>

    </div>

    <br>

    <div>
      Progreso:
      <div class="barra-contenedor">
        <div class="barra-progreso" style="width:${porcentaje}%"></div>
      </div>
      <strong>${porcentaje}%</strong>
    </div>
  `;
}


// =========================
// INICIO
// =========================

async function mostrarInicio() {

  const tareas = await obtenerTareasEstudiante();

  const { data: evidencias } = await supabaseClient
    .from("evidencias")
    .select("tarea_id, revisado")
    .eq("estudiante_id", usuarioActual.id);

  const resumen = document.getElementById("resumenEstudiante");
  const caja = document.getElementById("tareasInicio");

  if (!resumen || !caja) return;

  const ultimas = tareas.slice(0, 3);

  const revisadas = new Set(
    (evidencias || [])
      .filter(e => e.revisado)
      .map(e => Number(e.tarea_id))
  );

  const completadas = ultimas.filter(t =>
    revisadas.has(Number(t.id))
  ).length;

  resumen.innerHTML = `
    Tienes <strong>${tareas.length}</strong> tareas asignadas.
    <br>
    Has completado <strong>${completadas}</strong>.
  `;

  caja.innerHTML = "";

  ultimas.forEach(t => {

    const ev = evidencias?.find(e =>
      Number(e.tarea_id) === Number(t.id)
    );

    const estado = ev?.revisado
      ? "Revisada ✔"
      : ev
        ? "Por revisar ⏳"
        : "Pendiente";

    caja.innerHTML += `
      <div class="actividad-item">
        <strong>📝 ${t.titulo}</strong>
        <br>
        📚 ${t.materia?.nombre || "Sin materia"}
        <br>
        Estado: <strong>${estado}</strong>
      </div>
      <br>
    `;
  });
}


// =========================
// NAV
// =========================

function cambiarSeccion(nombre) {
  document.querySelectorAll(".seccion")
    .forEach(s => s.style.display = "none");

  const activa = document.getElementById(nombre);
  if (activa) activa.style.display = "block";
}

function toggleTareas(tipo) {

  const actual = document.getElementById(tipo);
  const visible = actual?.style.display === "block";

  ["pendientes", "revision", "completadas"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

  if (!visible && actual) {
    actual.style.display = "block";
  }
}


// =========================
// MENU
// =========================

function mostrarMenu() {
  const menu = document.getElementById("menuUsuario");
  if (!menu) return;

  menu.classList.toggle("menu-activo");

  const nombre = document.getElementById("nombreMenu");
  if (nombre) nombre.innerText = usuarioActual.nombre;
}

function cerrarSesion() {
  localStorage.removeItem("usuarioActual");
  location.assign("../index.html");
}