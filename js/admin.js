const usuarioActual = JSON.parse(localStorage.getItem("usuarioActual"));

if (!usuarioActual) {
  location.href = "../index.html";
}

document.getElementById("bienvenida").innerText =
  "Bienvenido, " + usuarioActual.nombre;

// =========================
// INIT
// =========================
mostrarEstadisticasAdmin();
mostrarUsuarios();
cargarMaterias();
cambiarSeccion("inicio");
mostrarEstadoSistema();
mostrarRelacionesSistema();

// =========================
// ESTADÍSTICAS
// =========================
async function mostrarEstadisticasAdmin(){

  const { data, error } = await supabaseClient
    .from("usuario")
    .select("*");

  if(error){
    console.log(error);
    return;
  }

  const docentes = data.filter(u => u.rol === "docente").length;
  const estudiantes = data.filter(u => u.rol === "estudiante").length;

  document.getElementById("estadisticasAdmin").innerHTML = `
    <div class="estadisticas">

      <div class="tarjeta-mini">
        <h2>👥</h2>
        <strong>${data.length}</strong>
        <p>Usuarios</p>
      </div>

      <div class="tarjeta-mini">
        <h2>👨‍🏫</h2>
        <strong>${docentes}</strong>
        <p>Docentes</p>
      </div>

      <div class="tarjeta-mini">
        <h2>👨‍🎓</h2>
        <strong>${estudiantes}</strong>
        <p>Estudiantes</p>
      </div>

    </div>
  `;
}

// =========================
// CARGAR MATERIAS
// =========================
async function cargarMaterias(){

  const { data, error } = await supabaseClient
    .from("materia")
    .select("*");

  if(error){
    console.log(error);
    return;
  }

  const cont = document.getElementById("materiasCheckbox");
  cont.innerHTML = "";

  data.forEach(m => {

    const chip = document.createElement("div");
    chip.classList.add("materia-chip");

    chip.innerText = m.nombre;
    chip.dataset.id = m.id;

    chip.onclick = () => {
      chip.classList.toggle("activa");
    };

    cont.appendChild(chip);
  });
}

// =========================
// TOGGLE MATERIAS (ROL)
// =========================
function toggleMaterias(){
  const rol = document.getElementById("rol").value;
  const box = document.getElementById("materiasBox");

  if(rol === "docente"){
    box.style.display = "block";
  } else {
    box.style.display = "none";
  }
}

// =========================
// CREAR USUARIO (FIX PRINCIPAL)
// =========================
async function crearUsuario(){

  const nombre = document.getElementById("nuevoUsuario").value.trim();
  const password = document.getElementById("nuevaPassword").value.trim();
  const rol = document.getElementById("rol").value;

  if(!nombre || !password){
    alert("Completa todos los campos");
    return;
  }

  const { data, error } = await supabaseClient
    .from("usuario")
    .insert({ nombre, password, rol })
    .select()
    .single();

  if(error){
    console.log(error);
    alert("Error creando usuario");
    return;
  }

  // =========================
  // SOLO DOCENTES
  // =========================
  if(rol === "docente"){

    const checks = document.querySelectorAll(".materia-chip.activa");

    // 🔥 IMPORTANTE: evitar duplicados previos
    await supabaseClient
      .from("docente_materias")
      .delete()
      .eq("docente_id", data.id);

    const inserts = [];

    checks.forEach(c => {
      inserts.push({
        docente_id: data.id,
        materia_id: parseInt(c.dataset.id)
      });
    });

    if(inserts.length > 0){

      const { error: relError } = await supabaseClient
        .from("docente_materias")
        .insert(inserts);

      if(relError){
        console.log(relError);
        alert("Usuario creado pero falló asignación de materias");
      }
    }
  }

  alert("Usuario creado correctamente");

  mostrarUsuarios();
  mostrarEstadisticasAdmin();
}

// =========================
// MOSTRAR USUARIOS
// =========================
async function mostrarUsuarios(){

  const lista = document.getElementById("listaUsuarios");
  lista.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("usuario")
    .select("*")
    .order("id", { ascending: false });

  if(error){
    console.log(error);
    return;
  }

  data.forEach(u => {

  lista.innerHTML += `
    <div class="usuario">

      <strong>${u.nombre}</strong><br>
      Rol: ${u.rol}

      <br><br>

      ${u.rol === "docente"
        ? `<button onclick="editarMateriasDocente(${u.id}, '${u.nombre}')">
            Editar materias
          </button>`
        : ""
      }

      ${u.rol !== "admin"
        ? `<button onclick="eliminarUsuario(${u.id})">
            Eliminar
          </button>`
        : `<span>Cuenta actual</span>`
      }

    </div>
  `;
});
}

// =========================
// ELIMINAR
// =========================
async function eliminarUsuario(id){

  if(!confirm("¿Eliminar usuario?")) return;

  await supabaseClient
    .from("usuario")
    .delete()
    .eq("id", id);

  mostrarUsuarios();
  mostrarEstadisticasAdmin();
}

// =========================
// UI
// =========================
function mostrarMenu(){
  document.getElementById("menuUsuario").classList.toggle("menu-activo");
  document.getElementById("nombreMenu").innerText = usuarioActual.nombre;
}

function cerrarSesion(){
  localStorage.removeItem("usuarioActual");
  location.assign("../index.html");
}

function cambiarSeccion(nombre){
  document.querySelectorAll(".seccion").forEach(s => s.style.display = "none");

  const act = document.getElementById(nombre);
  if(act) act.style.display = "block";
}

let docenteEditandoId = null;

async function editarMateriasDocente(id, nombre){

  docenteEditandoId = id;

  document.getElementById("panelEdicionDocente").style.display = "block";
  document.getElementById("docenteNombre").innerText = nombre;

  const cont = document.getElementById("editarMateriasCheckbox");
  cont.innerHTML = "<p>Cargando materias...</p>";

  // todas las materias
  const { data: materias } = await supabaseClient
    .from("materia")
    .select("*");

  // materias actuales del docente
  const { data: actuales } = await supabaseClient
    .from("docente_materias")
    .select("*")
    .eq("docente_id", id);

  const idsActuales = actuales.map(m => m.materia_id);

  cont.innerHTML = "";

  materias.forEach(m => {

    const checked = idsActuales.includes(m.id) ? "checked" : "";

    cont.innerHTML += `
      <label>
        <input type="checkbox" value="${m.id}" ${checked}>
        ${m.nombre}
      </label><br>
    `;
  });
}

async function guardarMateriasDocente(){

  if(!docenteEditandoId) return;

  const checks = document.querySelectorAll("#editarMateriasCheckbox input:checked");

  const nuevas = [];

  checks.forEach(c => {
    nuevas.push({
      docente_id: docenteEditandoId,
      materia_id: Number(c.value)
    });
  });

  // 1. borrar relaciones actuales
  const { error: delError } = await supabaseClient
    .from("docente_materias")
    .delete()
    .eq("docente_id", docenteEditandoId);

  if(delError){
    console.log(delError);
    alert("Error eliminando materias actuales");
    return;
  }

  // 2. insertar nuevas
  if(nuevas.length > 0){
    const { error: insError } = await supabaseClient
      .from("docente_materias")
      .insert(nuevas);

    if(insError){
      console.log(insError);
      alert("Error guardando materias nuevas");
      return;
    }
  }

  alert("Materias actualizadas correctamente");

  cerrarPanelEdicion();
  mostrarUsuarios();
}

function cerrarPanelEdicion(){
  document.getElementById("panelEdicionDocente").style.display = "none";
  docenteEditandoId = null;
}


async function mostrarEstadoSistema(){

  const { data: usuarios } = await supabaseClient
    .from("usuario")
    .select("*");

  const { data: tareas } = await supabaseClient
    .from("tareas")
    .select("*");

  const { data: evidencias } = await supabaseClient
    .from("evidencias")
    .select("*");

  const docentes = usuarios.filter(u => u.rol === "docente").length;
  const estudiantes = usuarios.filter(u => u.rol === "estudiante").length;

  document.getElementById("estadoSistema").innerHTML = `
    <div class="estadisticas">

      <div class="tarjeta-mini">
        <h2>👥</h2>
        <strong>${usuarios.length}</strong>
        <p>Usuarios</p>
      </div>

      <div class="tarjeta-mini">
        <h2>👨‍🏫</h2>
        <strong>${docentes}</strong>
        <p>Docentes</p>
      </div>

      <div class="tarjeta-mini">
        <h2>👨‍🎓</h2>
        <strong>${estudiantes}</strong>
        <p>Estudiantes</p>
      </div>

      <div class="tarjeta-mini">
        <h2>📝</h2>
        <strong>${tareas.length}</strong>
        <p>Tareas</p>
      </div>

      <div class="tarjeta-mini">
        <h2>📎</h2>
        <strong>${evidencias.length}</strong>
        <p>Evidencias</p>
      </div>

    </div>
  `;
}

async function mostrarRelacionesSistema(){

  const { data: relaciones } = await supabaseClient
    .from("docente_materias")
    .select(`
      docente_id,
      materia_id,
      usuario:docente_id(nombre),
      materia:materia_id(nombre)
    `);

  const cont = document.getElementById("relacionesSistema");

  if (!relaciones || relaciones.length === 0) {
    cont.innerHTML = "<p>No hay relaciones</p>";
    return;
  }

  cont.innerHTML = "";

  relaciones.forEach(r => {
    cont.innerHTML += `
      <div class="usuario">
        👨‍🏫 ${r.usuario?.nombre || "?"}
        ➜ 📚 ${r.materia?.nombre || "?"}
      </div>
    `;
  });
}

async function mostrarUsoSistema(){

  const { data: usuarios } = await supabaseClient.from("usuario").select("*");
  const { data: tareas } = await supabaseClient.from("tareas").select("*");
  const { data: evidencias } = await supabaseClient.from("evidencias").select("*");
  const { data: relaciones } = await supabaseClient.from("docente_materias").select("*");

  const cont = document.getElementById("usoSistema");

  cont.innerHTML = `
    <div class="estadisticas">

      <div class="tarjeta-mini">
        <h2>📊</h2>
        <strong>${usuarios.length}</strong>
        <p>Usuarios activos</p>
      </div>

      <div class="tarjeta-mini">
        <h2>📝</h2>
        <strong>${tareas.length}</strong>
        <p>Tareas creadas</p>
      </div>

      <div class="tarjeta-mini">
        <h2>📎</h2>
        <strong>${evidencias.length}</strong>
        <p>Evidencias subidas</p>
      </div>

      <div class="tarjeta-mini">
        <h2>🔗</h2>
        <strong>${relaciones.length}</strong>
        <p>Asignaciones docente-materia</p>
      </div>

    </div>
  `;
}
