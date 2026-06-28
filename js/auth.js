// ================================
// LOGIN CON SUPABASE
// ================================


async function iniciarSesion() {



    const usuario =
    document.getElementById("usuario")
    .value
    .trim();



    const password =
    document.getElementById("password")
    .value
    .trim();




    if(
        usuario === "" ||
        password === ""
    ){

        alert("Complete todos los campos");
        return;

    }





    const { data, error } =

    await window.supabaseClient

    .from("usuario")

    .select("*");





    if(error){

    console.log("ERROR SUPABASE:");
    console.log(error);

    alert(error.message);

    return;

}






    let encontrado = null;






    data.forEach(datos => {

    console.log("USUARIO BD:", datos);
    console.log("COMPARANDO:");
    console.log("BD nombre:", datos.nombre);
    console.log("Escrito:", usuario);
    console.log("BD password:", datos.password);
    console.log("Escrito:", password);


    if(
        datos.nombre.trim() === usuario.trim() &&
        datos.password.trim() === password.trim()
    ){

        encontrado = datos;

    }


});







    if(!encontrado){


        alert(
            "Usuario o contraseña incorrectos"
        );


        return;


    }







    localStorage.setItem(

        "usuarioActual",

        JSON.stringify(encontrado)

    );







    console.log(
        "Usuario encontrado:",
        encontrado
    );








    if(
        encontrado.rol === "admin"
    ){



        window.location.href =

        "./paginas/admin.html";



    }

    else if(

        encontrado.rol === "docente"

    ){



        window.location.href =

        "./paginas/docente.html";



    }

    else {



        window.location.href =

        "./paginas/estudiante.html";



    }





}









// ================================
// BOTON LOGIN
// ================================


document

.getElementById("btnLogin")

.addEventListener(

    "click",

    iniciarSesion

);