/**
 * Audio, Voice (TTS), dan Haptic Feedback untuk Petugas Lapangan.
 * Dirancang hands-free agar petugas mendengar informasi tanpa harus terus menatap layar ponsel.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Memainkan nada notifikasi sintetis menggunakan Web Audio API */
export function playSound(type: "pickup" | "warning" | "success" | "skip") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "pickup") {
      // Dua nada ceria (C5 -> E5) untuk titik penjemputan valid tercapai
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.12); // E5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "warning") {
      // Sirine peringatan berdenyut tajam untuk konsumen menunggak
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(320, now + 0.15);
      osc.frequency.linearRampToValueAtTime(440, now + 0.3);
      osc.frequency.linearRampToValueAtTime(300, now + 0.45);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === "success") {
      // Tiga nada sukses (C5 -> E5 -> G5)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "skip") {
      // Nada rendah lembut untuk lewati tugas
      osc.type = "sine";
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio context dicegah oleh policy browser sebelum interaksi user
  }
}

/** Text-to-Speech (TTS) Suara Bahasa Indonesia */
export function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel(); // batalkan ucapan sebelumnya agar tidak tumpuk
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 1.05; // sedikit lebih cepat untuk kelancaran rute
    utterance.pitch = 1.0;

    // Cari voice berbahasa Indonesia jika ada
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes("id") || v.lang.includes("ID"));
    if (idVoice) {
      utterance.voice = idVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore jika TTS tidak didukung browser
  }
}

/** Getaran ponsel (Haptic Feedback) */
export function vibrate(type: "pickup" | "warning" | "success") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    if (type === "pickup") {
      navigator.vibrate(150);
    } else if (type === "warning") {
      // Getar ganda tajam untuk peringatan
      navigator.vibrate([200, 100, 200, 100, 250]);
    } else if (type === "success") {
      navigator.vibrate([70, 50, 100]);
    }
  } catch {
    // Ignore jika perangkat menolak getar
  }
}
