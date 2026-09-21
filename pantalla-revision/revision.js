const checks = document.querySelectorAll(".check");
const barra = document.getElementById("barra");
const contador = document.getElementById("contador");

checks.forEach(check => {

    check.addEventListener("change", actualizarProgreso);

});

function actualizarProgreso() {

    const total = checks.length;

    const completados =
        document.querySelectorAll(".check:checked").length;

    const porcentaje = (completados / total) * 100;

    barra.style.width = porcentaje + "%";

    contador.textContent =
        completados + " de " + total + " requisitos verificados";
}

function guardarBorrador() {

    alert("La revisión fue guardada como borrador.");

}

function solicitarCorreccion() {

    const observaciones =
        document.getElementById("observaciones").value;

    if (observaciones.trim() === "") {

        alert("Debe escribir las observaciones que debe corregir el solicitante.");
        return;

    }

    alert("Se ha solicitado la corrección del expediente.");

}

function rechazar() {

    const observaciones =
        document.getElementById("observaciones").value;

    if (observaciones.trim() === "") {

        alert("Debe indicar el motivo del rechazo.");
        return;

    }

    if (confirm("¿Está seguro de rechazar este expediente?")) {

        alert("Expediente rechazado.");

    }
}

function aprobar() {

    const pendientes =
        document.querySelectorAll(".check:not(:checked)").length;

    if (pendientes > 0) {

        alert("Debe completar todos los requisitos antes de aprobar.");
        return;

    }

    if (confirm("¿Desea aprobar la revisión del expediente?")) {

        alert("Revisión aprobada correctamente.");

    }
}
