/* ========= MODO OSCURO CACHE ========= */
if (localStorage.getItem("modoOscuro") === "true") {
  document.body.classList.add("oscuro");
  document.addEventListener("DOMContentLoaded", actualizarBotonModo);
}

/* ========= VARIABLES GLOBALES ========= */
let banco = [];
let examen = [];
let indice = 0;
let seleccionActual = null;
let aciertos = 0;
let falladas = [];
let corregida = false;
// "examen" | "falladas" | "tema"
let modoActual = null; 



let tiempo = 20 * 60; // 20 minutos
let timer = null;

fetch("preguntas.json")
  .then(r => r.json())
  .then(data => {
    banco = data.preguntas;
    cargarHistorico();
  });

/* ========= MODOS ========= */

function iniciarExamen() {
  modoActual = "examen";

  // generar examen real con distribución oficial
  examen = generarExamen();

  document.getElementById("vistaStats").style.display = "none";
  document.getElementById("vistaHistorico").style.display = "none";
  document.getElementById("menu").style.display = "none";
  document.getElementById("panel").style.display = "block";
  document.getElementById("temporizador").style.display = "block";

  // ARRANQUE REAL CON TIEMPO
  arrancar(true);
}

function iniciarFalladas() {
  if (falladas.length === 0) {
    alert("No hay preguntas falladas todavía");
    return;
  }
  modoActual = "falladas";
  examen = [...falladas];
  arrancar(false);
}

function iniciarPorTema() {
  const tema = document.getElementById("temaSelect").value;
  if (!tema) return alert("Selecciona un tema");

  const pool = banco.filter(p => p.tema === tema);
  mezclar(pool);
  examen = pool.slice(0, 20);
  arrancar(false);
}

/* ========= EXAMEN ========= */

function arrancar(conTiempo = true) {
  indice = 0;
  aciertos = 0;
  falladas = [];
  document.getElementById("vistaStats").style.display = "none";
  document.getElementById("vistaHistorico").style.display = "none";
  document.getElementById("menu").style.display = "none";
  document.getElementById("panel").style.display = "block";


  if (conTiempo) iniciarTemporizador();
  else detenerTemporizador();

  mostrarPregunta();
}

function mostrarPregunta() {
  seleccionActual = null;
  corregida = false;

  const p = examen[indice];
  document.getElementById("contador").innerText =
    `Pregunta ${indice + 1} de ${examen.length}`;
  document.getElementById("tema").innerText = `Tema ${p.tema}`;
  document.getElementById("enunciado").innerText = p.enunciado;
  document.getElementById("resultado").innerText =
    `Aciertos: ${aciertos}`;

  const cont = document.getElementById("opciones");
  cont.innerHTML = "";

  ["A","B","C"].forEach(l => {
    const d = document.createElement("div");
    d.className = "opcion";
    d.dataset.letra = l;
    d.innerText = `${l}) ${p.opciones[l]}`;
    d.onclick = () => seleccionar(d);
    cont.appendChild(d);
  });

  document.getElementById("progreso").style.width =
  ((indice) / examen.length * 100) + "%";

// aviso enquistada
const stats = loadStats();
const s = stats[qKey(p)];
const aviso = document.getElementById("aviso");
if (aviso) {
  if (s && isEnquistada(s)) {
    aviso.style.display = "block";
    aviso.innerText = "⚠️ Esta pregunta se te resiste. Repásala.";
  } else {
    aviso.style.display = "none";
  }
}


}

function seleccionar(div) {
  if (corregida) return;
  document.querySelectorAll(".opcion")
    .forEach(o => o.classList.remove("seleccionada"));
  div.classList.add("seleccionada");
  seleccionActual = div.dataset.letra;
}

document.getElementById("siguiente").onclick = () => {
  if (!seleccionActual || corregida) return;

  const p = examen[indice];
  document.querySelectorAll(".opcion").forEach(o => {
    const l = o.dataset.letra;
    if (l === p.correcta) o.classList.add("correcta");
    if (l === seleccionActual && l !== p.correcta)
      o.classList.add("incorrecta");
  });

  if (seleccionActual === p.correcta) aciertos++;
  else falladas.push(p);

  corregida = true;

  setTimeout(() => {
    indice++;
    if (indice < examen.length) mostrarPregunta();
    else finalizar();
  }, 800);
};

/* ========= FINAL ========= */

function finalizar() {
  detenerTemporizador();

  if (modoActual === "falladas") {
    alert(`Repaso terminado. Aciertos: ${aciertos}/${examen.length}`);
    return;
  }

  const aprobado = aciertos > 16;
  guardarHistorico(aprobado);
  alert(`Resultado: ${aciertos}/${examen.length}\n` + (aprobado ? "APROBADO" : "NO APROBADO"));
}


/* ========= TEMPORIZADOR ========= */

function iniciarTemporizador() {
  tiempo = 20 * 60;
  timer = setInterval(() => {
    tiempo--;
    document.getElementById("temporizador").innerText =
      `Tiempo: ${Math.floor(tiempo/60)}:${(tiempo%60).toString().padStart(2,"0")}`;
    if (tiempo <= 0) finalizar();
  }, 1000);
}

function detenerTemporizador() {
  clearInterval(timer);
  document.getElementById("temporizador").innerText = "";
}

/* ========= HISTÓRICO ========= */

function guardarHistorico(aprobado) {
  const hist = JSON.parse(localStorage.getItem("hist") || "[]");
  hist.push({
    fecha: new Date().toLocaleString(),
    resultado: `${aciertos}/${examen.length}`,
    estado: aprobado ? "APROBADO" : "NO APROBADO"
  });
  localStorage.setItem("hist", JSON.stringify(hist));
  cargarHistorico();
}

function cargarHistorico() {
  const hist = JSON.parse(localStorage.getItem("hist") || "[]");
  const ul = document.getElementById("historico");
  ul.innerHTML = "";
  hist.forEach(h => {
    const li = document.createElement("li");
    li.innerText = `${h.fecha} – ${h.resultado} – ${h.estado}`;
    ul.appendChild(li);
  });
}

/* ========= UTIL ========= */

function generarExamen() {
  const dist = {I:3,II:3,III:2,IV:3,V:3,VI:2,VII:4};
  let res = [];
  for (const t in dist) {
    const pool = banco.filter(p => p.tema === t);
    mezclar(pool);
    res = res.concat(pool.slice(0, dist[t]));
  }
  mezclar(res);
  return res;
}

function mezclar(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function reiniciarExamen() {
  // parar temporizador
  detenerTemporizador();

  // resetear estado
  indice = 0;
  aciertos = 0;
  falladas = [];
  seleccionActual = null;
  corregida = false;

  // ocultar panel y volver al menú
  document.getElementById("panel").style.display = "none";

  alert("Examen reiniciado. Puedes empezar uno nuevo.");
}


  // modo oscuro
function toggleModo() {
  const oscuro = document.body.classList.toggle("oscuro");

  localStorage.setItem("modoOscuro", oscuro);

  actualizarBotonModo();
}

  // actualizar texto botón modo oscuro
function actualizarBotonModo() {
  const btn = document.getElementById("btnModo");
  if (!btn) return;

  const oscuro = document.body.classList.contains("oscuro");

  if (oscuro) {
    btn.textContent = "☀️ Modo claro";
  } else {
    btn.textContent = "🌙 Modo oscuro";
  }
}


function volverMenu() {
  detenerTemporizador();

  document.getElementById("panel").style.display = "none";
  document.getElementById("vistaHistorico").style.display = "none";
  document.getElementById("vistaStats").style.display = "none";
  document.getElementById("menu").style.display = "block";
}


function mostrarHistorico() {
  detenerTemporizador();

  document.getElementById("menu").style.display = "none";
  document.getElementById("panel").style.display = "none";
  document.getElementById("vistaHistorico").style.display = "block";

  cargarHistorico();
}

// === stats.js (puede ir dentro de app.js si prefieres) ===
const STATS_KEY = "statsPreguntas_v1";

function loadStats() {
  return JSON.parse(localStorage.getItem(STATS_KEY) || "{}");
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function qKey(p) {
  return `${p.tema}-${p.numero}`;
}

function ensureQ(stats, p) {
  const k = qKey(p);
  if (!stats[k]) {
    stats[k] = {
      tema: p.tema,
      numero: p.numero,
      aciertos: 0,
      fallos: 0,
      rachaFallos: 0,
      total: 0,
      last: null // "A" | "F"
    };
  }
  return stats[k];
}

s.total++;
if (seleccionActual === p.correcta) {
  s.aciertos++;
  s.rachaFallos = 0;
  s.last = "A";
} else {
  s.fallos++;
  s.rachaFallos++;
  s.last = "F";
}

saveStats(stats);


// === marcar enquistadas ===
function isEnquistada(s) {
  if (s.total >= 5 && (s.fallos / s.total) >= 0.6) return true;
  if (s.rachaFallos >= 3) return true;
  return false;
}

function mostrarStats() {
  const stats = loadStats();
  let totalQ = 0, enq = 0;
  for (const k in stats) {
    totalQ++;
    if (isEnquistada(stats[k])) enq++;
  }
  document.getElementById("statsResumen").innerText =
    `Preguntas vistas: ${totalQ}\nEnquistadas: ${enq}`;
  document.getElementById("menu").style.display = "none";
  document.getElementById("panel").style.display = "none";
  document.getElementById("vistaStats").style.display = "block";
}

function repasarEnquistadas() {
  const stats = loadStats();
  const set = new Set(Object.keys(stats).filter(k => isEnquistada(stats[k])));
  examen = banco.filter(p => set.has(qKey(p)));
  if (!examen.length) return alert("No hay preguntas enquistadas.");
  modoActual = "falladas"; // sin aprobado/suspenso
  arrancar(false);
}


