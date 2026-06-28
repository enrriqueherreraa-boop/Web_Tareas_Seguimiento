import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {

    apiKey: "AIzaSyAvunbe-omw36HvioSSskRWmeCDqe5bdm0",
    authDomain: "segimiento-de-tareas.firebaseapp.com",
    projectId: "segimiento-de-tareas",
    storageBucket: "segimiento-de-tareas.firebasestorage.app",
    messagingSenderId: "760169972971",
    appId: "1:760169972971:web:0b238fc2f9470d0666eaae",
    measurementId: "G-JF2C2CSF5K"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

console.log("Firebase conectado correctamente");

async function probarFirestore(){

    const consulta =
    await getDocs(
        collection(db, "usuarios")
    );

    consulta.forEach(doc => {

        console.log(
    JSON.stringify(doc.data())
);

    });

}

probarFirestore();

export { db };