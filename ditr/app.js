const audioInput = document.getElementById("audioInput");
const transcribeBtn = document.getElementById("transcribeBtn");
const pdfBtn = document.getElementById("pdfBtn");
const transcriptOutput = document.getElementById("transcriptOutput");
const statusBox = document.getElementById("status");

const WORKER_ENDPOINT =
  "https://gelani-openai-key-transcribe-diroya.rs-stigma.workers.dev/";

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", Boolean(isError));
}

function enablePDFButton(enable) {
  pdfBtn.disabled = !enable;
}

function exportTranscriptToPDF() {
  const text = transcriptOutput.value.trim();

  if (!text) {
    setStatus("Нет текста для сохранения в PDF.", true);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4"
  });

  const margin = 48;
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  const wrappedText = doc.splitTextToSize(text, maxWidth);

  doc.setFont("Times", "Normal");
  doc.setFontSize(12);
  doc.text(wrappedText, margin, margin);
  doc.save("transcript.pdf");

  setStatus("PDF успешно сохранён.");
}

async function transcribeAudio() {
  const file = audioInput.files?.[0];

  if (!file) {
    setStatus("Пожалуйста, выберите аудиофайл.", true);
    return;
  }

  setStatus("Загружаем и расшифровываем аудио, пожалуйста подождите…");
  enablePDFButton(false);

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("response_format", "text");

    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;

      try {
        const errorPayload = await response.json();
        if (errorPayload?.error?.message) {
          errorMessage = errorPayload.error.message;
        }
      } catch (jsonError) {
        // ignore JSON parse errors and fall back to status text
      }

      throw new Error(errorMessage);
    }

    const transcriptText = (await response.text()).trim();
    transcriptOutput.value = transcriptText;

    if (transcriptText) {
      setStatus("Готово! Стенограмма получена.");
      enablePDFButton(true);
    } else {
      setStatus(
        "Получен пустой ответ. Убедитесь, что аудио содержит речь.",
        true
      );
    }
  } catch (error) {
    console.error("Transcription error", error);
    setStatus(`Ошибка транскрибации: ${error.message}`, true);
  }
}

transcribeBtn.addEventListener("click", transcribeAudio);
pdfBtn.addEventListener("click", exportTranscriptToPDF);
