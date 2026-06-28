const ESTADOS_VALIDOS = [
    "Pendiente",
    "Completada"
];


const usuarioActual =
JSON.parse(localStorage.getItem("usuarioActual"));

if (!usuarioActual || !usuarioActual.id) {
  alert("Sesión inválida");
  location.href = "../index.html";
}


console.log("USUARIO ACTUAL:", usuarioActual);
console.log("ID DOCENTE:", usuarioActual.id);


let materiasDocente = [];


// =========================
// CARGA INICIAL
// =========================

document.addEventListener("DOMContentLoaded",()=>{

    cargarDocente();

});


async function cargarDocente(){


    materiasDocente =
    await obtenerMateriasDocente();

    estudiantesGlobales = await obtenerEstudiantes();


    cargarSelectorMaterias();


    document.getElementById("bienvenida")
    .innerText =
    "Bienvenido, " + usuarioActual.nombre;


    mostrarTareas();

    mostrarEstadisticas();


    cambiarSeccion("inicio");
    cargarActividadDocente();

}



// =========================
// ACTIVIDAD DOCENTE / ESTUDIANTES
// =========================

async function mostrarPanelRendimiento(){

  const contenedor = document.getElementById("panelRendimiento");
  if(!contenedor) return;

  const { data: tareas } = await supabaseClient
    .from("tareas")
    .select(`
      *,
      materia:materia_id(nombre)
    `)
    .eq("docente_id", usuarioActual.id);

  if(!tareas || tareas.length === 0){
    contenedor.innerHTML = "<p>No hay datos suficientes</p>";
    return;
  }

  // 📌 estado general
  const pendientes = tareas.filter(t=>t.estado==="Pendiente").length;
  const {data:evidencias}= await supabaseClient
.from("evidencias")
.select("*")
.in(
 "tarea_id",
 tareas.map(t=>t.id)
);


const completadas =
tareas.filter(t=>

evidencias.some(e=>
 e.tarea_id===t.id &&
 e.revisado===true
)

).length;

  // 📌 materias con nombre (no ID)

const tareasReales = [
  ...new Map(
    tareas.map(t => [`${t.titulo}-${t.materia_id}`, t])
  ).values()
];

  let materias = {};

  tareasReales.forEach(t=>{
  const nombreMateria = t.materia?.nombre || "Sin materia";
  materias[nombreMateria] = (materias[nombreMateria] || 0) + 1;
});

  const topMaterias = Object.entries(materias)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3);

  contenedor.innerHTML = `
    <div class="estadisticas">

      <div class="tarjeta-mini">
        <strong>${pendientes}</strong>
        <p>Pendientes</p>
      </div>

      <div class="tarjeta-mini">
        <strong>${progreso}</strong>
        <p>En progreso</p>
      </div>

      <div class="tarjeta-mini">
        <strong>${completadas}</strong>
        <p>Completadas</p>
      </div>

    </div>

    <br>

    <h3>📚 Materias con más actividad</h3>

    ${topMaterias.map(m=>`
      <div class="usuario">
        📚 ${m[0]}
        <br>
        📊 ${m[1]} tareas
      </div>
    `).join("")}
  `;

}


async function cargarActividadDocente(){

  const { data: tareas, error: errorTareas } = await supabaseClient
    .from("tareas")
    .select("*")
    .eq("docente_id", usuarioActual.id);

  if(errorTareas){
    console.log(errorTareas);
    return;
  }

  const tareasIds = tareas.map(t => t.id);

  const { data: evidencias, error: errorEv } = await supabaseClient
    .from("evidencias")
    .select("*")
    .in("tarea_id", tareasIds);

  if(errorEv){
    console.log(errorEv);
    return;
  }

  const actividad = document.getElementById("actividadReciente");
  const resumen = document.getElementById("resumenCurso");

  // 🔥 últimas evidencias SOLO del docente
  const ultimas = (evidencias || [])
    .sort((a,b)=> new Date(b.fecha_subida) - new Date(a.fecha_subida))
    .slice(0,5);

  actividad.innerHTML = ultimas.length
    ? ultimas.map(e => {

        const tarea = tareas.find(t => t.id === e.tarea_id);

        return `
          <div class="usuario">
            📎 Se subió evidencia en: <strong>${tarea?.titulo || "Sin título"}</strong>
          </div>
        `;
      }).join("")
    : "<p>No hay actividad reciente</p>";

  resumen.innerHTML = `
    <div class="estadisticas">

      <div class="tarjeta-mini">
        <strong>${tareas.length}</strong>
        <p>Tareas</p>
      </div>

      <div class="tarjeta-mini">
        <strong>${evidencias.length}</strong>
        <p>Entregas</p>
      </div>

    </div>
  `;
}


async function verEvidencias(tareaId){

  console.log("Buscando evidencia tarea:", tareaId);


  const contenedor =
  document.getElementById("panelEvidencias");


  contenedor.innerHTML =
  "<h3>📎 Cargando evidencias...</h3>";


  const { data, error } =
  await supabaseClient
  .from("evidencias")
  .select(`
    *,
    estudiante:estudiante_id(nombre)
  `)
  .eq(
    "tarea_id",
    tareaId
  );


  if(error){

    console.log("ERROR EVIDENCIAS:",error);

    contenedor.innerHTML =
    "<p>Error cargando evidencias</p>";

    return;
  }



  if(data.length===0){

    contenedor.innerHTML =
    `
    <div class="tarjeta">
    <h3>📎 Evidencias</h3>

    <p>
    Este estudiante todavía no ha enviado evidencia.
    </p>

    </div>
    `;

    return;
  }




  let html =
  `
  <div class="tarjeta">

  <h3>📎 Evidencias</h3>
  `;



  data.forEach(e=>{


  html +=
  `

  <div class="usuario">

  👨‍🎓
  <strong>
  ${e.estudiante?.nombre}
  </strong>


  <br><br>


  📄
  <a href="${e.archivo_url}" target="_blank">
  Ver archivo
  </a>


  <br><br>


  Nota:

  <input 
  type="number"
  id="nota-${e.id}"
  value="${e.calificacion || ""}"
  >


  <br><br>


  Comentario:

  <input
  type="text"
  id="comentario-${e.id}"
  value="${e.comentario || ""}"
  >


  <br><br>


  <button onclick="calificarEvidencia(${e.id})">

  Guardar calificación

  </button>


  </div>

  <hr>


  `;


  });



  html += "</div>";


  contenedor.innerHTML = html;


}

async function calificarEvidencia(id){

  const nota = document.getElementById(`nota-${id}`).value;
  const comentario = document.getElementById(`comentario-${id}`).value;


  // 1) Guardar calificación y marcar evidencia revisada
  const { data:evidencia, error:errorEv } = await supabaseClient
    .from("evidencias")
    .update({
      calificacion: nota,
      comentario: comentario,
      revisado: true
    })
    .eq("id", id)
    .select()
    .single();


  if(errorEv){
    console.log(errorEv);
    alert("Error al guardar calificación");
    return;
  }



  // 2) Cambiar estado de la tarea
  const { error:errorTarea } = await supabaseClient
    .from("tareas")
    .update({
      estado:"Completada"
    })
    .eq(
      "id",
      evidencia.tarea_id
    );


  if(errorTarea){
    console.log(errorTarea);
    alert("Calificación guardada pero no se actualizó la tarea");
    return;
  }



  alert("Calificación guardada");


  // ocultar panel
  const panel =
  document.getElementById("panelEvidencias");

  if(panel){
    panel.innerHTML="";
  }


  // refrescar listas
  await mostrarTareas();

  await mostrarEstadisticas();

}



async function obtenerEstudiantes(){


const {data,error} =
await supabaseClient
.from("usuario")
.select("*")
.eq("rol","estudiante");


if(error){
console.log(error);
return [];
}


return data;


}




// =========================
// MATERIAS DOCENTE
// =========================

async function obtenerMateriasDocente(){

  const { data, error } = await supabaseClient
    .from("docente_materias")
    .select(`
      materia_id,
      materia:materia_id(nombre)
    `)
    .eq("docente_id", usuarioActual.id);

  console.log("MATERIAS DOCENTE:", data, error);

  if(error){
    return [];
  }

  return data || [];
}



// =========================
// SELECTOR DE MATERIAS
// =========================
function cargarSelectorMaterias() {
  const contenedor = document.getElementById("materiaDocente");

  if (!contenedor) {
    console.log("No existe #materiaDocente");
    return;
  }

  contenedor.innerHTML = "";

  const label = document.createElement("p");
  label.innerText = "📚 Seleccione materia";
  contenedor.appendChild(label);

  if (!materiasDocente || materiasDocente.length === 0) {
    contenedor.innerHTML += "<p>No tienes materias asignadas</p>";
    return;
  }

  materiasDocente.forEach(m => {
    const nombre = m.materia?.nombre;

    if (!nombre) return;

    const chip = document.createElement("div");
    chip.className = "materia-chip";

    chip.innerText = nombre;
    chip.dataset.id = m.materia_id;

    chip.onclick = () => {
      chip.classList.toggle("activa");

      console.log(
        "Seleccionadas:",
        document.querySelectorAll(".materia-chip.activa").length
      );
    };

    contenedor.appendChild(chip);
  });

  console.log("Materias renderizadas:", materiasDocente.length);
}




// =========================
// ESTADISTICAS
// =========================


async function mostrarEstadisticas(){

  const {data:tareas,error}= await supabaseClient
    .from("tareas")
    .select(`
      *,
      usuario:estudiante_id(nombre),
      materia:materia_id(nombre)
    `)
    .eq("docente_id", usuarioActual.id);

  if(error){
    console.log(error);
    return;
  }

  const {data:usuarios}= await supabaseClient
    .from("usuario")
    .select("*")
    .eq("rol","estudiante");

  const estudiantes = usuarios.length;

  const pendientes = tareas.filter(t=>t.estado==="Pendiente").length;
  const progreso = tareas.filter(t=>t.estado==="En progreso").length;

const {data:evidencias}= await supabaseClient
.from("evidencias")
.select("*")
.in(
  "tarea_id",
  tareas.map(t=>t.id)
);


const completadasIds = [
  ...new Set(
    evidencias
    .filter(e=>e.revisado === true)
    .map(e=>e.tarea_id)
  )
];


const completadas = completadasIds.length;

  // 🔥 FIX IMPORTANTE
  const tareasReales = [
    ...new Map(
      tareas.map(t => [`${t.titulo}-${t.materia_id}`, t])
    ).values()
  ];

  const totalTareas = tareasReales.length;

  let porcentaje = 0;
  if(totalTareas > 0){
    porcentaje = Math.round((completadas / totalTareas) * 100);
  }

  const materias = materiasDocente.length;

  document.getElementById("estadisticas").innerHTML = `
    <div class="estadisticas">

      <div class="tarjeta-mini">
        <strong>${estudiantes}</strong>
        <p>Estudiantes</p>
      </div>

      <div class="tarjeta-mini">
        <strong>${materias}</strong>
        <p>Materias</p>
      </div>

      <div class="tarjeta-mini">
        <strong>${totalTareas}</strong>
        <p>Tareas creadas</p>
      </div>

      <div class="tarjeta-mini">
        <strong>${porcentaje}%</strong>
        <p>Completadas</p>
      </div>

    </div>
  `;

  // 👇 estas líneas ahora sí funcionan
  mostrarActividadReciente(tareasReales);
  mostrarEstadoClases(tareas);
}













async function mostrarActividadReciente(tareas){


const contenedor =
document.getElementById(
"actividadReciente"
);


if(!contenedor){
return;
}



if(!tareas || tareas.length===0){


contenedor.innerHTML =
`
<p>
No hay actividad reciente.
</p>
`;

return;

}




// agrupar tareas por título

let agrupadas = {};



tareas.forEach(t=>{


if(!agrupadas[t.titulo]){


agrupadas[t.titulo]=[];

}


agrupadas[t.titulo].push(t);


});





let html="";



Object.keys(agrupadas)
.slice(0,5)
.forEach((titulo,index)=>{



let grupo =
agrupadas[titulo];



let estudiantes="";



grupo.forEach(t=>{


estudiantes +=
`

<div class="detalle-estudiante">


👨‍🎓
${t.usuario?.nombre || "Sin nombre"}



<br>

Estado:
<strong>
${estadoReal}
</strong>


</div>


`;



});





html +=
`

<div class="actividad-item">



<strong>
📝 ${titulo}
</strong>

<br>

📚 ${grupo[0].materia?.nombre || "Sin materia"}


<br>


👥 Estudiantes:
${grupo.length}



<br><br>



<button onclick="toggleActividad(${index})">


Ver estudiantes ▼


</button>



<div
id="actividad-${index}"
style="display:none;">


<br>

${estudiantes}


</div>



</div>



<br>


`;



});



contenedor.innerHTML=html;



}

async function mostrarEstadoClases(tareas){


const contenedor =
document.getElementById(
"estadoClases"
);


if(!contenedor){
    return;
}



if(!tareas || tareas.length===0){

contenedor.innerHTML =
`
<p>
No hay tareas asignadas todavía.
</p>
`;

return;

}




let agrupadas = {};



tareas.forEach(t=>{


if(!agrupadas[t.titulo]){

agrupadas[t.titulo] = [];

}


agrupadas[t.titulo].push(t);



});




let html = "";



Object.keys(agrupadas)
.forEach(titulo=>{



let grupo =
agrupadas[titulo];



let total =
grupo.length;



let completadas =
grupo.filter(
t=>t.estado==="Completada"
)
.length;



let porcentaje =
Math.round(
(completadas / total) * 100
);



html +=
`

<div class="actividad-item">


<strong>
📝 ${titulo}
</strong>


<br>


📚 Materia:
${grupo[0].materia?.nombre || "Sin materia"}



<br><br>



👨‍🎓 Cumplieron:

<strong>
${completadas} de ${total}
</strong>



<br>



<div class="barra">

<div 
class="progreso"
style="
width:${porcentaje}%
">
</div>

</div>



<small>
${porcentaje}% completado
</small>



</div>


<br>


`;




});



contenedor.innerHTML = html;


}


  secciones.forEach(s => {
    const div = document.getElementById(s);
    if(div) div.style.display = "none";
  });

  const activa = document.getElementById(id);

  if(activa){
    const visible = getComputedStyle(activa).display !== "none";
    activa.style.display = visible ? "none" : "block";
  }

// =========================
// ESTUDIANTES DOCENTE
// =========================


async function mostrarEstudiantes(){


const contenedor =
document.getElementById(
"listaEstudiantes"
);



if(!contenedor){
    return;
}



const {data: estudiantes, error} =
await supabaseClient
.from("usuario")
.select("*")
.eq(
"rol",
"estudiante"
);



if(error){

console.log(error);
return;

}



const {data:tareas} =
await supabaseClient
.from("tareas")
.select("*")
.eq(
"docente_id",
usuarioActual.id
);

const {data:evidencias}= await supabaseClient
.from("evidencias")
.select("*");

let html = "";



estudiantes.forEach(estudiante=>{


const tareasEstudiante =
tareas.filter(
t =>
t.estudiante_id === estudiante.id
);



const completadas =
tareasEstudiante.filter(
t =>
t.estado==="Completada"
)
.length;



const pendientes =
tareasEstudiante.filter(
t =>
t.estado==="Pendiente"
)
.length;



let porcentaje = 0;



if(tareasEstudiante.length>0){

porcentaje =
Math.round(
(completadas / tareasEstudiante.length)
*100
);

}



html +=
`

<div class="usuario">


<h3>
👨‍🎓 ${estudiante.nombre}
</h3>


📚 Tareas asignadas:
<strong>
${tareasEstudiante.length}
</strong>


<br>


✅ Completadas:
<strong>
${completadas}
</strong>


<br>


🕒 Pendientes:
<strong>
${pendientes}
</strong>


<br><br>


Progreso:

<div class="barra-contenedor">

<div 
class="barra-progreso"
style="width:${porcentaje}%">

</div>

</div>


<p>
${porcentaje}% completado
</p>


</div>


`;



});



if(html===""){

html =
"<p>No hay estudiantes registrados</p>";

}



contenedor.innerHTML = html;



}

// =========================
// REPORTES
// =========================


async function mostrarReportes(){


const contenedor =
document.getElementById(
"reporteGeneral"
);



if(!contenedor){
return;
}




const {data:tareas,error}=
await supabaseClient
.from("tareas")
.select(`
*,
materia:materia_id(
nombre
),
usuario:estudiante_id(
nombre
)
`)
.eq(
"docente_id",
usuarioActual.id
);

const {data:evidencias=[]}= await supabaseClient
.from("evidencias")
.select("*");



if(error){

console.log(error);
return;

}




if(tareas.length===0){

contenedor.innerHTML =
`
<p>
No existen tareas para generar reportes.
</p>
`;

return;

}





let materias = {};




tareas.forEach(t=>{


let nombreMateria =
t.materia?.nombre ||
"Sin materia";



if(!materias[nombreMateria]){

materias[nombreMateria]=[];

}



materias[nombreMateria].push(t);



});





let html="";




Object.keys(materias)
.forEach(materia=>{


let lista =
materias[materia];



// tareas únicas por título

let tareasUnicas =
[
...new Set(
lista.map(
t=>t.titulo
)
)
];



let total =
tareasUnicas.length;



let completadas =
[
...new Set(
 lista
 .filter(t =>
   evidencias.some(e =>
    e.tarea_id===t.id &&
    e.revisado===true
   )
 )
 .map(t=>t.titulo)
)
].length;



let porcentaje =
Math.round(
(completadas/total)*100
);



html +=
`

<div class="usuario">


<h3>
📚 ${materia}
</h3>



<p>

Tareas:
<strong>
${total}
</strong>

</p>



<div class="barra-contenedor">


<div 
class="barra-progreso"
style="width:${porcentaje}%">

</div>


</div>



<p>
Rendimiento:
<strong>
${porcentaje}%
</strong>
</p>




<button onclick="toggleReporte('${materia}')">

Ver detalle ▼

</button>



<div 
id="reporte-${materia}"
style="display:none;">



`;



lista.forEach(t=>{


html +=
`

<p>

👨‍🎓
${t.usuario?.nombre || "Sin estudiante"}

<br>

📝
${t.titulo}

<br>

let estadoReal =
evidencias.some(e =>
 e.tarea_id===t.id &&
 e.revisado===true
)
?
"Completada"
:
t.estado;

Estado:
<strong>
${estadoReal}
</strong>

</p>

<hr>


`;


});



html +=
`

</div>


</div>

<br>


`;



});




contenedor.innerHTML = html;



}



function toggleReporte(materia){


const div =
document.getElementById(
"reporte-"+materia
);



if(!div)return;



if(div.style.display==="none"){

div.style.display="block";

}else{

div.style.display="none";

}


}



// =========================
// CREAR TAREA
// =========================


async function asignarATodos(){

  let titulo = document.getElementById("tituloGlobal").value.trim();
  let fecha = document.getElementById("fechaGlobal").value;

  const materiasSeleccionadas =
    document.querySelectorAll(".materia-chip.activa");


  if(!titulo || !fecha || materiasSeleccionadas.length === 0){
    alert("Complete todos los campos");
    return;
  }

  // =====================
  // TAREA INDIVIDUAL
  // =====================

  

    let estudiantes = await obtenerEstudiantes();
    let tareas = [];

    materiasSeleccionadas.forEach(m => {
      estudiantes.forEach(e => {
        tareas.push({
          titulo,
          descripcion: "",
          materia_id: m.dataset.id,
          docente_id: usuarioActual.id,
          estudiante_id: e.id,
          fecha_limite: fecha,
          estado: "Pendiente",
          observacion: "",
          tipo: "Individual"
        });
      });
    });

    const { error } = await supabaseClient
      .from("tareas")
      .insert(tareas);

    if(error){
      console.log(error);
      alert("Error creando tarea");
      return;
    }

    alert("Tarea creada correctamente");
    mostrarTareas();
  }




// =========================
// MOSTRAR TAREAS
// =========================


async function mostrarTareas(){

  const contenedor = document.getElementById("listaTareas");
  if(!contenedor) return;


  const {data,error}= await supabaseClient
    .from("tareas")
    .select(`
      *,
      usuario:estudiante_id(nombre),
      materia:materia_id(nombre)
    `)
    .eq("docente_id", usuarioActual.id)
    .order("id",{ascending:false});


  if(error){
    console.log(error);
    return;
  }



  const {data:evidencias}= await supabaseClient
  .from("evidencias")
.select(`
  *,
  tarea:tarea_id(titulo)
`)



  let pendientes="";
let revision="";
let revisadas="";

  document.getElementById("tareasPendientes").style.display="none";
document.getElementById("tareasRevision").style.display="none";
document.getElementById("tareasRevisadas").style.display="none";



  data.forEach(t=>{


   let evs = evidencias.filter(e => e.tarea_id === t.id);
let ev = evs[evs.length - 1]; // la última evidencia



    let tarjeta = `

    <div class="usuario">

      <strong>
      👨‍🎓 ${t.usuario?.nombre || ""}
      </strong>

      <br><br>

      📝 ${t.titulo}

      <br>

      📚 ${t.materia?.nombre || ""}

      <br>

      Estado:
      <strong>
      ${t.estado}
      </strong>


      <br><br>


      ${
ev && !ev.revisado
?
`
<button onclick="verEvidencias(${t.id})">
📎 Revisar evidencia
</button>
`
:
""
}


      <br><br>


      <button onclick="eliminarTarea(${t.id})">
      Eliminar
      </button>


    </div>

    <br>

    `;



    // =======================
// CLASIFICAR TAREAS
// =======================


// Sin evidencia todavía
if(!ev){

  pendientes += tarjeta;

}


// Tiene evidencia pero falta revisar
else if(ev.revisado == false || ev.revisado == "false" || ev.revisado == null){

  revision += tarjeta;

}


// Evidencia ya revisada
else if(ev.revisado === true || ev.revisado === "true"){

  revisadas += tarjeta;

}


  });




contenedor.innerHTML =
`
<h3>📋 Todas las tareas</h3>

${
data.length===0
?
"<p>No existen tareas</p>"
:
"<p>Seleccione una categoría para ver las tareas.</p>"
}

`;



  document.getElementById("tareasPendientes")
.innerHTML =
`
<h3>🕒 Pendientes</h3>
${pendientes || "<p>No hay pendientes</p>"}
`;






  document.getElementById("tareasRevision")
.innerHTML =
`
<h3>📎 Por revisar</h3>
${revision || "<p>No hay evidencias por revisar</p>"}
`;



  document.getElementById("tareasRevisadas")
.innerHTML =
`
<h3>✅ Revisadas</h3>
${revisadas || "<p>No hay revisadas</p>"}
`;

}





async function eliminarTarea(id){


if(!confirm("¿Eliminar tarea?"))
return;



await supabaseClient
.from("tareas")
.delete()
.eq("id",id);



mostrarTareas();

}





// =========================
// NAVEGACION
// =========================


function cambiarSeccion(nombre){

  document.querySelectorAll(".seccion").forEach(s=>{
    s.style.display="none";
  });

  const activa = document.getElementById(nombre);
  if(activa) activa.style.display="block";

  if(nombre === "reportes"){
    mostrarReportes();
  }

  if(nombre === "actividad"){
    mostrarPanelRendimiento();
  }

  if(nombre === "inicio"){
    cargarActividadDocente();
  }
}


function toggleTareas(id){

  const secciones =
[
"tareasPendientes",
"tareasRevision",
"tareasRevisadas"
];

secciones.forEach(s=>{


let div =
document.getElementById(s);


if(div){

div.style.display="none";

}


});



const activa =
document.getElementById(id);



if(activa){

if(activa.style.display==="block"){

activa.style.display="none";

}else{

activa.style.display="block";

}

}


}

// =========================
// MENU USUARIO
// =========================

function mostrarMenu(){

    document
    .getElementById("menuUsuario")
    .classList.toggle("menu-activo");


    document
    .getElementById("nombreMenu")
    .innerText = usuarioActual.nombre;

}



function cerrarSesion(){

    localStorage.removeItem("usuarioActual");

    location.assign("../index.html");

}