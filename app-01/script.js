"use strict";

const celloPresets = {
  canon: {
    name: "カノン（パッヘルベル作曲）",
    category: "クラシック（パブリックドメイン）",
    description:
      "美しい循環コード。低音の響きとピッチの安定を確認するのに最適です。",
    defaultKey: "D",
    beatsPerChord: 4,
    chords: ["D", "A", "Bm", "F#m", "G", "D", "G", "A"],
  },
  jesuJoy: {
    name: "主よ、人の望みの喜びよ（バッハ作曲）",
    category: "クラシック（パブリックドメイン）",
    description:
      "3拍子の流れの中で、移弦と和音の移り変わりを滑らかに練習できます。",
    defaultKey: "G",
    beatsPerChord: 3,
    chords: ["G", "C", "D7", "G", "Em", "Am", "D7", "G"],
  },
  auraLee: {
    name: "オーラ・リー（アメリカ民謡）",
    category: "民謡（パブリックドメイン）",
    description:
      "穏やかなテンポで、豊かなロングトーンと弓のコントロールを養います。",
    defaultKey: "G",
    beatsPerChord: 4,
    chords: ["G", "A7", "D7", "G", "G7", "C", "Cm", "G"],
  },
  celloSuitePrelude: {
    name: "無伴奏チェロ組曲 第1番 プレリュード（バッハ作曲）",
    category: "クラシック（パブリックドメイン）",
    description:
      "分散和音（アルペジオ）の骨格となるコード進行と響きを確認できます。",
    defaultKey: "G",
    beatsPerChord: 4,
    chords: ["G", "C/G", "D7/G", "G", "Em", "A7", "D", "G"],
  },
};

const KEY_PITCHES = { C: 0, D: 2, G: 7, A: 9, Am: 9 };
const KEY_LABELS = {
  C: "C major",
  D: "D major",
  G: "G major",
  A: "A major",
  Am: "A minor",
};
const SHARP_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_PITCHES = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};
const STORAGE_KEY = "cello-practice-list-v1";

const elements = {
  preset: document.getElementById("preset-select"),
  key: document.getElementById("key-select"),
  tempo: document.getElementById("tempo-range"),
  tempoValue: document.getElementById("tempo-value"),
  show: document.getElementById("show-practice-button"),
  selectedKey: document.getElementById("selected-key"),
  description: document.getElementById("practice-description"),
  progression: document.getElementById("chord-progression"),
  staff: document.getElementById("staff-container"),
  play: document.getElementById("play-button"),
  stop: document.getElementById("stop-button"),
  save: document.getElementById("save-button"),
  status: document.getElementById("playback-status"),
  savedList: document.getElementById("saved-list"),
  savedEmpty: document.getElementById("saved-list-empty"),
};

for (const [name, element] of Object.entries(elements)) {
  if (!element) {
    throw new Error(`必要な画面要素が見つかりません: ${name}`);
  }
}

let currentChords = [];
let savedPractices = [];
let storageReady = true;
let audioContext = null;
let playbackTimer = null;
let isPlaying = false;
let activeVoices = [];

function parseChord(chord) {
  const [chordPart, bassPart] = chord.split("/");
  const match = chordPart.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match || !(match[1] in NOTE_PITCHES)) {
    throw new Error(`認識できないコードです: ${chord}`);
  }
  if (bassPart && !(bassPart in NOTE_PITCHES)) {
    throw new Error(`認識できないベース音です: ${chord}`);
  }
  return { root: match[1], quality: match[2], bass: bassPart || null };
}

function transposeNote(note, semitones) {
  const pitch = NOTE_PITCHES[note];
  if (pitch === undefined) {
    throw new Error(`認識できない音名です: ${note}`);
  }
  return SHARP_NOTES[(pitch + semitones + 12) % 12];
}

function transposeChord(chord, semitones) {
  const parsed = parseChord(chord);
  const root = transposeNote(parsed.root, semitones);
  const bass = parsed.bass ? `/${transposeNote(parsed.bass, semitones)}` : "";
  return `${root}${parsed.quality}${bass}`;
}

function getCurrentPreset() {
  const preset = celloPresets[elements.preset.value];
  if (!preset) {
    throw new Error("選択された曲のプリセットが見つかりません。");
  }
  return preset;
}

function getCurrentPractice() {
  const key = elements.key.value;
  const tempo = Number(elements.tempo.value);
  if (!(key in KEY_PITCHES) || !Number.isInteger(tempo) || tempo < 50 || tempo > 120) {
    throw new Error("キーまたはテンポの設定が正しくありません。");
  }

  const preset = getCurrentPreset();
  const shift = KEY_PITCHES[key] - KEY_PITCHES[preset.defaultKey];
  return {
    presetId: elements.preset.value,
    key,
    tempo,
    chords: preset.chords.map((chord) => transposeChord(chord, shift)),
  };
}

function chordIntervals(quality) {
  if (quality.includes("dim")) {
    return quality.includes("7") ? [0, 3, 6, 9] : [0, 3, 6];
  }

  let intervals;
  if (quality.includes("sus2")) {
    intervals = [0, 2, 7];
  } else if (quality.includes("sus4")) {
    intervals = [0, 5, 7];
  } else if (quality.includes("aug")) {
    intervals = [0, 4, 8];
  } else {
    intervals = [0, /^m(?!aj)/.test(quality) ? 3 : 4, 7];
  }

  if (quality.includes("maj7")) {
    intervals.push(11);
  } else if (quality.includes("7")) {
    intervals.push(10);
  }
  return intervals;
}

function chordMidiNotes(chord) {
  const parsed = parseChord(chord);
  const rootPitch = NOTE_PITCHES[parsed.root];
  const rootMidi = 36 + rootPitch;
  const intervals = chordIntervals(parsed.quality);
  const notes = intervals.map((interval) => rootMidi + interval);
  if (parsed.bass) {
    notes.push(36 + NOTE_PITCHES[parsed.bass]);
  }
  return [...new Set(notes)].sort((a, b) => a - b);
}

function midiToVexKey(midi) {
  const pitchClass = midi % 12;
  const note = SHARP_NOTES[pitchClass];
  const letter = note[0].toLowerCase();
  const accidental = note.length > 1 ? note[1] : "";
  const octave = Math.floor(midi / 12) - 1;
  return `${letter}${accidental}/${octave}`;
}

function showStatus(message, isError) {
  elements.status.textContent = message;
  elements.status.classList.toggle("text-red-700", Boolean(isError));
  elements.status.classList.toggle("text-stone-600", !isError);
}

function renderNotation(chords) {
  const vex = window.Vex && window.Vex.Flow;
  if (!vex) {
    elements.staff.textContent = "楽譜ライブラリを読み込めませんでした。ページを再読み込みしてください。";
    throw new Error("VexFlowを読み込めませんでした。");
  }

  elements.staff.replaceChildren();
  elements.staff.className = "notation-container";
  const width = Math.max(300, Math.floor(elements.staff.getBoundingClientRect().width));
  const renderer = new vex.Renderer(elements.staff, vex.Renderer.Backends.SVG);
  renderer.resize(width, 280);
  const context = renderer.getContext();

  for (let row = 0; row < 2; row += 1) {
    const rowChords = chords.slice(row * 4, row * 4 + 4);
    if (rowChords.length === 0) continue;

    const stave = new vex.Stave(10, 12 + row * 132, width - 20);
    stave.addClef("bass").setContext(context).draw();
    const notes = rowChords.map((chord) => {
      const keys = chordMidiNotes(chord).map(midiToVexKey);
      const note = new vex.StaveNote({ clef: "bass", keys, duration: "q" });
      keys.forEach((key, index) => {
        const accidental = key.match(/[b#]/);
        if (accidental) {
          note.addModifier(new vex.Accidental(accidental[0]), index);
        }
      });
      return note;
    });
    const voice = new vex.Voice({ num_beats: rowChords.length, beat_value: 4 });
    voice.addTickables(notes);
    new vex.Formatter()
      .joinVoices([voice])
      .format([voice], Math.max(80, stave.getWidth() - 90));
    voice.draw(context, stave);
  }
}

function renderPractice() {
  if (isPlaying) {
    stopPlayback();
  }
  try {
    const preset = getCurrentPreset();
    const practice = getCurrentPractice();
    currentChords = practice.chords;

    elements.description.textContent = preset.description;
    elements.progression.textContent = currentChords.join("  →  ");
    elements.selectedKey.textContent = KEY_LABELS[practice.key];
    elements.tempoValue.textContent = `♩ ${practice.tempo} BPM`;
    showStatus("", false);
    elements.play.disabled = false;
    elements.save.disabled = !storageReady;
    try {
      renderNotation(currentChords);
    } catch (error) {
      showStatus(error.message, true);
    }
  } catch (error) {
    showStatus(error.message, true);
    elements.play.disabled = true;
    elements.save.disabled = true;
  }
}

function validSavedPractice(item) {
  return (
    item &&
    typeof item.id === "string" &&
    typeof item.presetId === "string" &&
    Object.prototype.hasOwnProperty.call(celloPresets, item.presetId) &&
    typeof item.key === "string" &&
    Object.prototype.hasOwnProperty.call(KEY_PITCHES, item.key) &&
    Number.isInteger(item.tempo) &&
    item.tempo >= 50 &&
    item.tempo <= 120
  );
}

function renderSavedList() {
  elements.savedList.replaceChildren();
  elements.savedEmpty.hidden = savedPractices.length > 0;

  for (const practice of savedPractices) {
    const preset = celloPresets[practice.presetId];
    const item = document.createElement("li");
    item.className = "saved-item";

    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = "saved-load";
    loadButton.dataset.loadId = practice.id;
    loadButton.textContent = `${preset.name} · ${KEY_LABELS[practice.key]} · ${practice.tempo} BPM`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "saved-delete";
    deleteButton.dataset.deleteId = practice.id;
    deleteButton.textContent = "削除";
    deleteButton.setAttribute("aria-label", `${preset.name} の保存を削除`);

    item.append(loadButton, deleteButton);
    elements.savedList.append(item);
  }
}

function loadSavedPractices() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      savedPractices = [];
    } else {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.every(validSavedPractice)) {
        throw new Error("保存データの形式が正しくありません。");
      }
      savedPractices = parsed;
    }
    renderSavedList();
  } catch (error) {
    storageReady = false;
    elements.save.disabled = true;
    showStatus(`保存リストを読み込めませんでした: ${error.message}`, true);
    renderSavedList();
  }
}

function saveCurrentPractice() {
  if (!storageReady) {
    showStatus("ブラウザーの保存領域を利用できないため、保存できません。", true);
    return;
  }
  try {
    const practice = getCurrentPractice();
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextPractices = [
      ...savedPractices,
      { id, presetId: practice.presetId, key: practice.key, tempo: practice.tempo },
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPractices));
    savedPractices = nextPractices;
    renderSavedList();
    showStatus("練習メニューを保存しました。", false);
  } catch (error) {
    showStatus(`練習メニューを保存できませんでした: ${error.message}`, true);
  }
}

function deleteSavedPractice(id) {
  if (!storageReady) {
    showStatus("ブラウザーの保存領域を利用できないため、削除できません。", true);
    return;
  }
  try {
    const nextPractices = savedPractices.filter((practice) => practice.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPractices));
    savedPractices = nextPractices;
    renderSavedList();
    showStatus("保存した練習メニューを削除しました。", false);
  } catch (error) {
    showStatus(`練習メニューを削除できませんでした: ${error.message}`, true);
  }
}

function loadSavedPractice(id) {
  const practice = savedPractices.find((item) => item.id === id);
  if (!practice) {
    showStatus("選択された練習メニューが見つかりません。", true);
    return;
  }
  stopPlayback();
  elements.preset.value = practice.presetId;
  elements.key.value = practice.key;
  elements.tempo.value = String(practice.tempo);
  renderPractice();
  showStatus("保存した練習メニューを呼び出しました。", false);
}

function removeActiveVoices() {
  if (!audioContext) return;
  const now = audioContext.currentTime;
  for (const voice of activeVoices) {
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.001, now, 0.025);
    voice.oscillator.stop(now + 0.12);
  }
  activeVoices = [];
}

function playChord(chord, duration) {
  const notes = chordMidiNotes(chord);
  const now = audioContext.currentTime + 0.03;
  const end = now + duration * 0.92;

  for (const midi of notes) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12 / notes.length, now + 0.08);
    gain.gain.setValueAtTime(0.12 / notes.length, Math.max(now + 0.09, end - 0.14));
    gain.gain.linearRampToValueAtTime(0.001, end);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(end + 0.02);
    oscillator.onended = () => {
      activeVoices = activeVoices.filter((voice) => voice.oscillator !== oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    activeVoices.push({ oscillator, gain });
  }
}

async function startPlayback() {
  if (isPlaying || currentChords.length === 0) return;
  try {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error("このブラウザーはWeb Audio APIに対応していません。");
    }
    if (!audioContext) {
      audioContext = new AudioContextConstructor();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const preset = getCurrentPreset();
    const secondsPerBeat = 60 / Number(elements.tempo.value);
    const chordDuration = secondsPerBeat * preset.beatsPerChord;
    let chordIndex = 0;
    isPlaying = true;
    elements.play.disabled = true;
    elements.stop.disabled = false;

    const playNext = () => {
      if (!isPlaying) return;
      if (chordIndex >= currentChords.length) {
        isPlaying = false;
        elements.play.disabled = false;
        elements.stop.disabled = true;
        showStatus("再生が終わりました。", false);
        return;
      }
      const chord = currentChords[chordIndex];
      playChord(chord, chordDuration);
      showStatus(`再生中: ${chord}（${chordIndex + 1}/${currentChords.length}）`, false);
      chordIndex += 1;
      playbackTimer = window.setTimeout(playNext, chordDuration * 1000);
    };

    playNext();
  } catch (error) {
    isPlaying = false;
    elements.play.disabled = false;
    elements.stop.disabled = true;
    showStatus(`再生を開始できませんでした: ${error.message}`, true);
  }
}

function stopPlayback() {
  if (playbackTimer !== null) {
    window.clearTimeout(playbackTimer);
    playbackTimer = null;
  }
  const wasPlaying = isPlaying;
  isPlaying = false;
  removeActiveVoices();
  elements.play.disabled = false;
  elements.stop.disabled = true;
  if (wasPlaying) {
    showStatus("再生を停止しました。", false);
  }
}

elements.preset.addEventListener("change", () => {
  elements.key.value = getCurrentPreset().defaultKey;
  renderPractice();
});
elements.key.addEventListener("change", renderPractice);
elements.tempo.addEventListener("input", () => {
  elements.tempoValue.textContent = `♩ ${elements.tempo.value} BPM`;
});
elements.show.addEventListener("click", renderPractice);
elements.play.addEventListener("click", startPlayback);
elements.stop.addEventListener("click", stopPlayback);
elements.save.addEventListener("click", saveCurrentPractice);
elements.savedList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.loadId) {
    loadSavedPractice(target.dataset.loadId);
  } else if (target.dataset.deleteId) {
    deleteSavedPractice(target.dataset.deleteId);
  }
});

renderPractice();
loadSavedPractices();
window.addEventListener("resize", () => {
  if (currentChords.length > 0) {
    try {
      renderNotation(currentChords);
    } catch (error) {
      showStatus(error.message, true);
    }
  }
});
