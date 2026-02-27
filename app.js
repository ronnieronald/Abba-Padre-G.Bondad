const SHEET_ID =
  "2PACX-1vQK8r6I6vYuBhlxnU7pBKRkzknIwqLPFoyuF17xWeIhBihhMQ5JOfXdgy65YKn6sZQ-0BdvoS5Nj2S_";

const daysConfig = [
  {
    id: "lunes",
    jsonKey: "lunes",
    jsonFile: "Lunes.json",
    available: true,
  },
  {
    id: "martes",
    jsonKey: "martes",
    jsonFile: "Martes.json",
    available: true,
  },
  {
    id: "miércoles",
    jsonKey: "miercoles",
    jsonFile: "Miercoles.json",
    available: true,
  },
  {
    id: "jueves",
    jsonKey: "jueves",
    jsonFile: "Jueves.json",
    available: true,
  },
  {
    id: "viernes",
    jsonKey: "viernes",
    jsonFile: "Viernes.json",
    available: true,
  },
  {
    id: "sábado",
    jsonKey: "sabado",
    jsonFile: "Sabado.json",
    available: true,
  },
  {
    id: "domingo",
    jsonKey: "domingo",
    jsonFile: "Domingo.json",
    available: true,
  },
];

function getDayNameFromId(id) {
  switch (id) {
    case "lunes":
      return "Lunes";
    case "martes":
      return "Martes";
    case "miércoles":
      return "Miércoles";
    case "jueves":
      return "Jueves";
    case "viernes":
      return "Viernes";
    case "sábado":
      return "Sábado";
    case "domingo":
      return "Domingo";
    default:
      return id;
  }
}

/* -------- Obtener datos de Google Sheets -------- */
async function getDevocionales() {
  const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=0&single=true&output=tsv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo cargar Google Sheet");

  const text = await res.text();
  const lines = text.trim().split("\n");

  return lines.slice(1).map((line) => {
    const cols = line.split("\t").map((c) => c.trim());
    return {
      devocional: cols[1] || "Sin devocional",
      libro: cols[2] || "",
    };
  });
}

function getCurrentWeekdayId() {
  const today = new Date().getDay();
  // 0 domingo, 1 lunes, ..., 6 sábado
  switch (today) {
    case 1:
      return "lunes";
    case 2:
      return "martes";
    case 3:
      return "miércoles";
    case 4:
      return "jueves";
    case 5:
      return "viernes";
    case 6:
      return "sábado";
    case 0:
    default:
      return "domingo";
  }
}

async function renderDays() {
  const container = document.getElementById("days-container");
  const currentDayLabel = document.getElementById("current-day-label");
  if (!container || !currentDayLabel) return;

  container.innerHTML = "";

  const todayId = getCurrentWeekdayId();
  const todayIndex = daysConfig.findIndex((d) => d.id === todayId);
  let selectedDayId = todayId;

  let devocionales = [];
  try {
    devocionales = await getDevocionales();
  } catch (error) {
    console.error("Error al cargar devocionales:", error);
  }

  // Leer status de cada JSON (1 disponible, 0 no disponible)
  const statuses = await Promise.all(
    daysConfig.map(async (day) => {
      try {
        const res = await fetch(`data/${day.jsonFile}`);
        if (!res.ok) return null;
        const data = await res.json();
        const dayData = data[day.jsonKey];
        if (!dayData || dayData.status === undefined) return null;
        return String(dayData.status) === "1" ? 1 : 0;
      } catch {
        return null;
      }
    }),
  );

  function updateCurrentDayLabel(day) {
    if (!day) {
      currentDayLabel.textContent = "";
      return;
    }

    const dayIndex = daysConfig.findIndex((d) => d.id === day.id);
    const published =
      dayIndex >= 0 && statuses[dayIndex] !== null
        ? statuses[dayIndex] === 1
        : true;
    const inTime =
      todayIndex === -1 ? true : dayIndex !== -1 && dayIndex <= todayIndex;
    const isAvailable = published && inTime;

    const statusText = !published
      ? "Aún no publicado."
      : inTime
        ? "Disponible (día actual o anterior)."
        : "Aún no disponible.";

    const devoForDay =
      dayIndex >= 0 && devocionales[dayIndex]
        ? devocionales[dayIndex].devocional
        : null;

    const label =
      devoForDay && devoForDay.length > 0
        ? devoForDay
        : `Quiz ${dayIndex + 1}`;

    currentDayLabel.innerHTML = `Tema de hoy: <strong>${label}</strong> `;
  }

  daysConfig.forEach((day, index) => {
    const devo = devocionales[index];
    const temaTexto = devo ? devo.devocional : "";
    const published =
      statuses[index] !== null ? statuses[index] === 1 : true;
    const inTime =
      todayIndex === -1 ? true : index !== -1 && index <= todayIndex;
    const isAvailable = published && inTime;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-card";
    if (day.id === todayId) {
      button.classList.add("current");
    }
    if (!isAvailable) {
      button.classList.add("locked");
    }

    button.setAttribute("data-id", day.id);
    button.setAttribute("aria-label", temaTexto || `Quiz ${index + 1}`);

    button.innerHTML = `
      <div class="day-card-content">
        <div class="day-topic" title="${temaTexto || `Quiz ${index + 1}`}">
          ${temaTexto || `Quiz ${index + 1}`}
        </div>
        <div class="day-meta">
          <span class="pill">${getDayNameFromId(day.id)}</span>
          <span class="day-status">
            <span class="dot"></span>
            <span>${
              !published
                ? "No publicado"
                : isAvailable
                  ? "Disponible"
                  : "Aún no disponible"
            }</span>
          </span>
        </div>
      </div>
    `;

    button.addEventListener("click", () => {
      if (!isAvailable) return;

      selectedDayId = day.id;

      container
        .querySelectorAll(".day-card")
        .forEach((card) => card.classList.remove("current"));
      button.classList.add("current");

      updateCurrentDayLabel(day);

      // Redirigir a la página del quiz con el día seleccionado en la URL
      window.location.href = `kahoot.html?day=${encodeURIComponent(day.id)}`;
    });

    container.appendChild(button);
  });

  const initialDay = daysConfig.find((d) => d.id === selectedDayId);
  updateCurrentDayLabel(initialDay);
}

function getDayFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const dayId = params.get("day");
  if (!dayId) return null;
  return daysConfig.find((d) => d.id === dayId) || null;
}

async function loadQuestionsPage() {
  const titleEl = document.getElementById("questions-title");
  const containerEl = document.getElementById("questions-container");
  const feedbackEl = document.getElementById("feedback");

  if (!titleEl || !containerEl) return;

  const dayConfig = getDayFromQuery() || daysConfig[0];

  // Intentar obtener el tema y libro desde Google Sheets
  let temaForDay = null;
  try {
    const devocionales = await getDevocionales();
    const dayIndex = daysConfig.findIndex((d) => d.id === dayConfig.id);
    if (dayIndex >= 0 && devocionales[dayIndex]) {
      temaForDay = devocionales[dayIndex];
    }
  } catch (error) {
    console.error("No se pudo cargar devocionales para el título:", error);
  }

  if (temaForDay && (temaForDay.devocional || temaForDay.libro)) {
    const partes = [];
    if (temaForDay.devocional) partes.push(temaForDay.devocional);
    if (temaForDay.libro) partes.push(temaForDay.libro);
    titleEl.textContent = partes.join(" - ");
  } else {
    titleEl.textContent = `Preguntas de ${getDayNameFromId(dayConfig.id)}`;
  }

  try {
    const response = await fetch(`data/${dayConfig.jsonFile}`);
    if (!response.ok) {
      throw new Error("No se pudo cargar el archivo de preguntas.");
    }
    const data = await response.json();
    const dayData = data[dayConfig.jsonKey];

    if (!dayData || !Array.isArray(dayData.preguntas)) {
      throw new Error("Formato de datos inválido para este día.");
    }

    // Si el día está marcado como no disponible en el JSON, no mostrar el quiz
    if (dayData.status !== undefined && String(dayData.status) !== "1") {
      if (feedbackEl) {
        feedbackEl.textContent =
          "Este quiz aún no está disponible. Vuelve más tarde.";
      }
      return;
    }

    setupQuizUI(containerEl, feedbackEl, dayData);
  } catch (error) {
    console.error(error);
    if (feedbackEl) {
      feedbackEl.textContent =
        "Hubo un problema al cargar las preguntas. Inténtalo más tarde.";
    }
  }
}

function setupQuizUI(containerEl, feedbackEl, dayData) {
  const questions = dayData.preguntas || [];
  let currentIndex = 0;
  let answered = false;
  let timerInterval = null;
  const TIEMPO_PREGUNTA = 20;
  let tiempoRestante = TIEMPO_PREGUNTA;
  let ayudasRestantes = 3;
  let correctas = 0;
  let incorrectas = 0;
  let noRespondidas = 0;
  const preguntasFalladas = [];
  let ayudaUsadaEnPregunta = false;

  containerEl.innerHTML = "";

  const quizWrapper = document.createElement("div");
  quizWrapper.className = "quiz-wrapper";

  const headerRow = document.createElement("div");
  headerRow.className = "quiz-header";

  const counterEl = document.createElement("p");
  counterEl.className = "question-counter";

  const timerEl = document.createElement("p");
  timerEl.className = "quiz-timer";

  const scoreEl = document.createElement("p");
  scoreEl.className = "quiz-score";

  const helpBtn = document.createElement("button");
  helpBtn.type = "button";
  helpBtn.className = "help-btn";

  function actualizarTextoAyuda() {
    helpBtn.textContent = `💡 ${ayudasRestantes}`;
    helpBtn.disabled = ayudasRestantes <= 0 || ayudaUsadaEnPregunta;
  }

  actualizarTextoAyuda();

  function actualizarScore() {
    scoreEl.textContent = `Puntaje: ${correctas}`;
  }

  actualizarScore();

  headerRow.appendChild(counterEl);
  headerRow.appendChild(timerEl);
  headerRow.appendChild(scoreEl);
  headerRow.appendChild(helpBtn);

  const timeBar = document.createElement("div");
  timeBar.className = "time-bar";
  const timeBarFill = document.createElement("div");
  timeBarFill.className = "time-bar-fill";
  timeBar.appendChild(timeBarFill);

  const card = document.createElement("article");
  card.className = "question-card";

  const questionTitle = document.createElement("h3");
  questionTitle.className = "question-text";

  const ref = document.createElement("p");
  ref.className = "question-ref";

  const optionsList = document.createElement("div");
  optionsList.className = "options-list";

  const controls = document.createElement("div");
  controls.className = "quiz-controls";

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "next-btn";
  nextBtn.textContent = "Siguiente pregunta";
  nextBtn.disabled = true;

  controls.appendChild(nextBtn);

  card.appendChild(questionTitle);
  card.appendChild(ref);
  card.appendChild(optionsList);

  quizWrapper.appendChild(headerRow);
  quizWrapper.appendChild(timeBar);
  quizWrapper.appendChild(card);
  quizWrapper.appendChild(controls);

  containerEl.appendChild(quizWrapper);

  function actualizarTimer() {
    timerEl.textContent = `Tiempo: ${tiempoRestante}s`;
    const pct = Math.max(0, Math.min(100, (tiempoRestante / TIEMPO_PREGUNTA) * 100));
    timeBarFill.style.width = `${pct}%`;
  }

  function detenerTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function iniciarTimer() {
    detenerTimer();
    tiempoRestante = TIEMPO_PREGUNTA;
    actualizarTimer();
    timerInterval = setInterval(() => {
      tiempoRestante -= 1;
      if (tiempoRestante < 0) {
        tiempoRestante = 0;
      }
      actualizarTimer();
      if (tiempoRestante <= 0) {
        detenerTimer();
        if (!answered) {
          marcarNoRespondida();
        }
      }
    }, 1000);
  }

  function irASiguientePregunta() {
    if (currentIndex < questions.length - 1) {
      currentIndex += 1;
      renderCurrentQuestion();
    } else {
      finalizarQuiz();
    }
  }

  function finalizarQuiz() {
    detenerTimer();
    nextBtn.disabled = true;
    nextBtn.textContent = "Fin del quiz";
    if (feedbackEl) {
      const total = questions.length;
      feedbackEl.textContent = `Quiz finalizado. Obtuviste ${correctas} de ${total} correctas.`;
    }

    const resumen = document.createElement("section");
    resumen.className = "quiz-summary";

    const totalPreguntas = questions.length;

    resumen.innerHTML = `
      <h3>Resumen del quiz</h3>
      <p><strong>Correctas:</strong> ${correctas}</p>
      <p><strong>Incorrectas:</strong> ${incorrectas}</p>
      <p><strong>No respondidas:</strong> ${noRespondidas}</p>
      <p><strong>Puntaje:</strong> ${correctas} / ${totalPreguntas}</p>
    `;

    const ratio = totalPreguntas > 0 ? correctas / totalPreguntas : 0;
    let mensajeFinal = "";
    if (ratio === 1) {
      mensajeFinal = "¡Perfecto! Dominaste todas las preguntas.";
    } else if (ratio >= 0.7) {
      mensajeFinal = "¡Muy bien! Solo unos detalles por ajustar.";
    } else if (ratio >= 0.4) {
      mensajeFinal = "Buen intento. Sigue practicando y mejorarás.";
    } else {
      mensajeFinal = "Fue un buen comienzo. Vuelve a intentarlo para mejorar tu puntaje.";
    }

    const mensajeEl = document.createElement("p");
    mensajeEl.className = "quiz-summary-message";
    mensajeEl.textContent = mensajeFinal;
    resumen.appendChild(mensajeEl);

    if (preguntasFalladas.length > 0) {
      const lista = document.createElement("ul");
      lista.className = "quiz-summary-list";
      preguntasFalladas.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = `${item.indice + 1}. ${item.referencia}`;
        lista.appendChild(li);
      });
      const tituloRefs = document.createElement("p");
      tituloRefs.innerHTML = "<strong>Referencias de preguntas incorrectas:</strong>";
      resumen.appendChild(tituloRefs);
      resumen.appendChild(lista);
    }

    containerEl.appendChild(resumen);
  }

  function marcarNoRespondida() {
    if (answered) return;
    answered = true;
    noRespondidas += 1;
    const current = questions[currentIndex];
    if (feedbackEl) {
      feedbackEl.textContent = "Sin respuesta a tiempo.";
    }
    if (current.referencia) {
      preguntasFalladas.push({
        indice: currentIndex,
        referencia: current.referencia,
      });
    }
    setTimeout(() => {
      irASiguientePregunta();
    }, 1500);
  }

  helpBtn.addEventListener("click", () => {
    if (ayudasRestantes <= 0 || ayudaUsadaEnPregunta) return;
    const current = questions[currentIndex];
    if (!current) return;
    ayudasRestantes -= 1;
    ayudaUsadaEnPregunta = true;
    actualizarTextoAyuda();
    if (current.referencia) {
      mostrarVentanaAyuda(current.referencia);
    }
  });

  function mostrarVentanaAyuda(texto) {
    const backdrop = document.createElement("div");
    backdrop.className = "help-modal-backdrop";

    const modal = document.createElement("div");
    modal.className = "help-modal";

    const titulo = document.createElement("h4");
    titulo.textContent = "Referencia de la pregunta";

    const cuerpo = document.createElement("p");
    cuerpo.textContent = texto;

    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "help-modal-close";
    cerrar.textContent = "Cerrar";

    cerrar.addEventListener("click", () => {
      document.body.removeChild(backdrop);
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        document.body.removeChild(backdrop);
      }
    });

    modal.appendChild(titulo);
    modal.appendChild(cuerpo);
    modal.appendChild(cerrar);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
  }

  function renderCurrentQuestion() {
    const total = questions.length;
    const current = questions[currentIndex];

    if (!current) return;

    answered = false;
    ayudaUsadaEnPregunta = false;
    actualizarTextoAyuda();
    nextBtn.disabled = true;
    if (feedbackEl) {
      feedbackEl.textContent = "";
    }

    counterEl.textContent = `Pregunta ${currentIndex + 1} de ${total}`;
    questionTitle.textContent = current.pregunta;
    ref.textContent = "";

    optionsList.innerHTML = "";

    const correctLetter = current.correcta;

    current.alternativas.forEach((alt, i) => {
      const optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "option-btn";

      const letter = String.fromCharCode(65 + i);
      optionBtn.dataset.letter = letter;
      optionBtn.textContent = alt;

      optionBtn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        detenerTimer();

        const isCorrect = letter === correctLetter;

        if (isCorrect) {
          correctas += 1;
          optionBtn.classList.add("correct");
          actualizarScore();
          if (feedbackEl) {
            feedbackEl.textContent = "¡Correcto!";
          }
          nextBtn.disabled = false;
        } else {
          incorrectas += 1;
          optionBtn.classList.add("incorrect");
          const correctOption = optionsList.querySelector(
            `.option-btn[data-letter="${correctLetter}"]`,
          );
          if (correctOption) {
            correctOption.classList.add("correct");
          }
          if (feedbackEl) {
            feedbackEl.textContent = "Respuesta incorrecta.";
          }
          if (current.referencia) {
            preguntasFalladas.push({
              indice: currentIndex,
              referencia: current.referencia,
            });
          }
          setTimeout(() => {
            irASiguientePregunta();
          }, 1500);
        }
      });

      optionsList.appendChild(optionBtn);
    });

    iniciarTimer();
  }

  nextBtn.addEventListener("click", () => {
    if (!answered) return;
    irASiguientePregunta();
  });

  renderCurrentQuestion();
}

document.addEventListener("DOMContentLoaded", () => {
  const daysContainer = document.getElementById("days-container");
  const questionsContainer = document.getElementById("questions-container");

  if (daysContainer) {
    renderDays();
  }

  if (questionsContainer) {
    loadQuestionsPage();
  }
});

