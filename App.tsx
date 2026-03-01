import React, { useState, useRef, useEffect, useCallback } from 'react';
const BACKEND_URL = "https://promptcast-backend.onrender.com";
import { decodeBase64, decodeAudioData, mergeAudioBuffersWithLatency, audioBufferToWav } from './utils/audio-helpers';
import { VoiceName, SpeakerConfig } from './types';

type Language = 'en' | 'fr' | 'es' | 'it' | 'zh' | 'de' | 'pt' | 'ja' | 'tr' | 'ar' | 'hi' | 'ko' | 'ru';

interface VoiceOption {
  id: VoiceName;
  label: string;
  desc: string;
  gender: 'F' | 'M';
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'zephyr', label: 'Voix n°1', desc: 'Féminin - Doux & Clair', gender: 'F' },
  { id: 'aoede', label: 'Voix n°2', desc: 'Féminin - Mélodique', gender: 'F' },
  { id: 'leda', label: 'Voix n°3', desc: 'Féminin - Mature', gender: 'F' },
  { id: 'despina', label: 'Voix n°4', desc: 'Féminin - Vif', gender: 'F' },
  { id: 'callirrhoe', label: 'Voix n°5', desc: 'Féminin - Fluide', gender: 'F' },
  { id: 'charon', label: 'Voix n°6', desc: 'Masculin - Grave', gender: 'M' },
  { id: 'fenrir', label: 'Voix n°7', desc: 'Masculin - Puissant', gender: 'M' },
  { id: 'kore', label: 'Voix n°8', desc: 'Masculin - Calme', gender: 'M' },
  { id: 'puck', label: 'Voix n°9', desc: 'Masculin - Médium', gender: 'M' },
  { id: 'orus', label: 'Voix n°10', desc: 'Masculin - Narratif', gender: 'M' },
];

interface TranslationSet {
  flag: string;
  name: string;
  ui: {
    title: string;
    subtitle: string;
    speakers: string;
    duration: string;
    brief: string;
    placeholder: string;
    produce: string;
    producing: string;
    newProject: string;
    archives: string;
    empty: string;
    minutes: string;
    writing: string;
    synthesizing: string;
    wait: string;
    ready: string;
    cast: string;
    error: string;
    retry: string;
    latency: string;
    download: string;
    delete: string;
    samplePhrase: string;
    quotaError: string;
    quotaWarning: string;
  };
}

const UI_STRINGS: Record<Language, TranslationSet> = {
  en: { flag: '🇺🇸', name: 'English', ui: { title: 'PromptCast', subtitle: 'Turn Ideas into Episodes', speakers: 'Cast Size', duration: 'Duration', brief: 'Production brief', placeholder: 'Describe the theme...', produce: 'Start Recording', producing: 'Production in progress...', newProject: 'New Project', archives: 'Archives', empty: 'No archives', minutes: 'min', writing: 'WRITING SCRIPT', synthesizing: 'VOICE SYNTHESIS', wait: 'Connecting...', ready: 'Online', cast: 'THE PODCAST TEAM', error: 'Generation Error', retry: 'Retrying...', latency: 'Adding natural pauses...', download: 'Download WAV', delete: 'Delete', samplePhrase: 'Hello, how are you?', quotaError: 'Quota exceeded. Please try again later.', quotaWarning: 'API Limit reached.' } },
  fr: { flag: '🇫🇷', name: 'Français', ui: { title: 'PromptCast', subtitle: 'Transformez vos idées en épisodes', speakers: 'Nombre d\'invités', duration: 'Durée', brief: 'Brief de production', placeholder: 'Décrivez le thème, les points de débat et le ton souhaité...', produce: 'Lancer l\'enregistrement', producing: 'Production en cours...', newProject: 'Nouveau Projet', archives: 'Archives', empty: 'Aucune archive', minutes: 'min', writing: 'RÉDACTION DU SCRIPT', synthesizing: 'SYNTHÈSE MULTI-VOIX', wait: 'Connexion...', ready: 'Service en ligne', cast: 'L\'ÉQUIPE DU PODCAST', error: 'Erreur de génération', retry: 'Nouvelle tentative...', latency: 'Insertion des silences naturels...', download: 'Télécharger WAV', delete: 'Supprimer', samplePhrase: 'Bonjour, comment allez-vous ?', quotaError: 'Quota épuisé. Veuillez réessayer plus tard.', quotaWarning: 'Limite API atteinte.' } },
  es: { flag: '🇪🇸', name: 'Español', ui: { title: 'PromptCast', subtitle: 'Convierte ideas en episodios', speakers: 'Invitados', duration: 'Duración', brief: 'Resumen', placeholder: 'Describe el tema...', produce: 'Empezar grabación', producing: 'Produciendo...', newProject: 'Nuevo Proyecto', archives: 'Archivos', empty: 'Sin archivos', minutes: 'min', writing: 'ESCRIBIENDO', synthesizing: 'SINTETIZANDO', wait: 'Conectando...', ready: 'En línea', cast: 'EQUIPO', error: 'Error', retry: 'Reintentando...', latency: 'Silencios naturales...', download: 'Bajar WAV', delete: 'Borrar', samplePhrase: 'Hola, ¿cómo estás?', quotaError: 'Cuota excedida.', quotaWarning: 'Límite API.' } },
  it: { flag: '🇮🇹', name: 'Italiano', ui: { title: 'PromptCast', subtitle: 'Trasforma le idee in episodi', speakers: 'Ospiti', duration: 'Durata', brief: 'Briefing', placeholder: 'Descrivi il tema...', produce: 'Avvia registrazione', producing: 'Produzione...', newProject: 'Nuovo Progetto', archives: 'Archivi', empty: 'Nessun archivio', minutes: 'min', writing: 'SCRITTURA', synthesizing: 'SINTESI', wait: 'Connessione...', ready: 'Online', cast: 'SQUADRA', error: 'Errore', retry: 'Riprova...', latency: 'Pause naturali...', download: 'Scarica WAV', delete: 'Elimina', samplePhrase: 'Ciao, come stai?', quotaError: 'Quota superata.', quotaWarning: 'Limite API.' } },
  de: { flag: '🇩🇪', name: 'Deutsch', ui: { title: 'PromptCast', subtitle: 'Ideen in Episoden verwandeln', speakers: 'Gäste', duration: 'Dauer', brief: 'Briefing', placeholder: 'Thema beschreiben...', produce: 'Aufnahme starten', producing: 'Produktion...', newProject: 'Neues Projekt', archives: 'Archive', empty: 'Keine Archive', minutes: 'min', writing: 'SCHREIBEN', synthesizing: 'SYNTHESE', wait: 'Verbindung...', ready: 'Online', cast: 'TEAM', error: 'Fehler', retry: 'Wiederholen...', latency: 'Natürliche Pausen...', download: 'WAV laden', delete: 'Löschen', samplePhrase: 'Hallo, wie geht es dir?', quotaError: 'Limit erreicht.', quotaWarning: 'API-Limit.' } },
  pt: { flag: '🇵🇹', name: 'Português', ui: { title: 'PromptCast', subtitle: 'Transforme ideias em episódios', speakers: 'Convidados', duration: 'Duração', brief: 'Briefing', placeholder: 'Descreva o tema...', produce: 'Iniciar gravação', producing: 'Produzindo...', newProject: 'Nuevo Projeto', archives: 'Arquivos', empty: 'Sem arquivos', minutes: 'min', writing: 'ESCREVENDO', synthesizing: 'SINTETIZANDO', wait: 'Conectando...', ready: 'Online', cast: 'EQUIPE', error: 'Erro', retry: 'Repetir...', latency: 'Pausas naturais...', download: 'Baixar WAV', delete: 'Apagar', samplePhrase: 'Olá, como vai?', quotaError: 'Cota excedida.', quotaWarning: 'Limite API.' } },
  zh: { flag: '🇨🇳', name: '中文', ui: { title: 'PromptCast', subtitle: '将想法转化为播客节目', speakers: '嘉宾人数', duration: '时长', brief: '制作简介', placeholder: '描述主题...', produce: '开始录制', producing: '制作中...', newProject: '新项目', archives: '存档', empty: '无存档', minutes: '分钟', writing: '撰写脚本', synthesizing: '语音合成', wait: '连接中...', ready: '在线', cast: '播客团队', error: '生成错误', retry: '重试中...', latency: '添加自然停顿...', download: '下载 WAV', delete: '删除', samplePhrase: '你好，你好吗？', quotaError: '配额已满。', quotaWarning: 'API限制。' } },
  ja: { flag: '🇯🇵', name: '日本語', ui: { title: 'PromptCast', subtitle: 'アイデアをエピソードに', speakers: 'ゲスト数', duration: '再生時間', brief: '制作概要', placeholder: 'テーマを説明してください...', produce: '収録開始', producing: '制作中...', newProject: '新規プロジェクト', archives: 'アーカイブ', empty: 'アーカイブなし', minutes: '分', writing: '脚本作成중', synthesizing: '音声合成中', wait: '接続中...', ready: 'オンライン', cast: 'チーム', error: 'エラー', retry: '再試行中...', latency: '自然な間を追加中...', download: 'WAVをダウンロード', delete: '削除', samplePhrase: 'こんにちは、元気ですか？', quotaError: '制限を超えました।', quotaWarning: 'API制限।' } },
  tr: { flag: '🇹🇷', name: 'Türkçe', ui: { title: 'PromptCast', subtitle: 'Fikirleri Bölümlere Dönüştürün', speakers: 'Konuklar', duration: 'Süre', brief: 'Özet', placeholder: 'Temayı açıklayın...', produce: 'Kaydı Başlat', producing: 'Üretiliyor...', newProject: 'Yeni Proje', archives: 'Arşivler', empty: 'Arşiv yok', minutes: 'dk', writing: 'YAZILIYOR', synthesizing: 'SENTEZLENİYOR', wait: 'Bağlanıyor...', ready: 'Çevrimiçi', cast: 'EKİP', error: 'Hata', retry: 'Tekrar deneniyor...', latency: 'Doğal duraklamalar...', download: 'WAV İndir', delete: 'Sil', samplePhrase: 'Merhaba, nasılsın?', quotaError: 'Kota aşıldı.', quotaWarning: 'API Sınırı.' } },
  ar: { flag: '🇸🇦', name: 'العربية', ui: { title: 'PromptCast', subtitle: 'حول أفكارك إلى حلقات', speakers: 'عدد الضيوف', duration: 'المدة', brief: 'ملخص الإنتاج', placeholder: 'صف الموضوع...', produce: 'ابدأ التسجيل', producing: 'جاري الإنتاج...', newProject: 'مشروع جديد', archives: 'الأرشيف', empty: 'لا يوجد أرشيف', minutes: 'دقيقة', writing: 'جاري كتابة النص', synthesizing: 'جاري تركيب الصوت', wait: 'جاري الاتصال...', ready: 'متصل', cast: 'فريق العمل', error: 'خطأ في التوليد', retry: 'إعادة المحاولة...', latency: 'إضافة فواصل طبيعية...', download: 'تحميل WAV', delete: 'حذف', samplePhrase: 'مرحباً، كيف हालك؟', quotaError: 'تم تجاوز الحصة.', quotaWarning: 'حد API.' } },
  // Fix: Replaced IndianHindi syntax errors with valid Hindi strings in quotes
  hi: { flag: '🇮🇳', name: 'हिन्दी', ui: { title: 'PromptCast', subtitle: 'विचारों को पॉडकास्ट में बदलें', speakers: 'अतिथि संख्या', duration: 'अवधि', brief: 'विवरण', placeholder: 'विषय का वर्णन करें...', produce: 'रिकॉर्डिंग शुरू करें', producing: 'प्रगति पर...', newProject: 'नया प्रोजेक्ट', archives: 'संग्रह', empty: 'कोई संग्रह नहीं', minutes: 'मिनट', writing: 'स्क्रिप्ट लेखन', synthesizing: 'आवाज संश्लेषण', wait: 'कनेक्ट हो रहा है...', ready: 'ऑनलाइन', cast: 'टीम', error: 'त्रुटि', retry: 'पुनः प्रयास...', latency: 'विराम जोड़ रहे हैं...', download: 'WAV डाउनलोड करें', delete: 'मिटाएँ', samplePhrase: 'नमस्ते, आप कैसे हैं?', quotaError: 'कोटा समाप्त हो गया है।', quotaWarning: 'API सीमा।' } },
  ko: { flag: '🇰🇷', name: '한국어', ui: { title: 'PromptCast', subtitle: '아이디어를 에피소드로', speakers: '출연진 수', duration: '시간', brief: '제작 브리핑', placeholder: '주제를 설명하세요...', produce: '녹음 시작', producing: '제작 중...', newProject: '새 프로젝트', archives: '아카이브', empty: '아카이브 없음', minutes: '분', writing: '스크립트 작성 중', synthesizing: '음성 합성 중', wait: '연결 중...', ready: '온라인', cast: '팀', error: '오류', retry: '재시도 중...', latency: '자연스러운 공백 추가 중...', download: 'WAV 다운로드', delete: '삭제', samplePhrase: '안녕하세요, 어떻게 지내세요?', quotaError: '할당량 초과.', quotaWarning: 'API 제한.' } },
  ru: { flag: '🇷🇺', name: 'Русский', ui: { title: 'PromptCast', subtitle: 'Превращайте идеи в эпизоды', speakers: 'Гости', duration: 'Длительность', brief: 'Бриф', placeholder: 'Опишите тему...', produce: 'Начать запись', producing: 'Создание...', newProject: 'Новый проект', archives: 'Архивы', empty: 'Пусто', minutes: 'мин', writing: 'ПИШЕМ СЦЕНАРИЙ', synthesizing: 'СИНТЕЗ ГОЛОСА', wait: 'Подключение...', ready: 'Онлайн', cast: 'КОМАНДА', error: 'Ошибка', retry: 'Повтор...', latency: 'Добавляем паузы...', download: 'Скачать WAV', delete: 'Удалить', samplePhrase: 'Привет, как дела?', quotaError: 'Квота исчерпана.', quotaWarning: 'Лимит API.' } },
} as any;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<any> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) { await new Promise(r => setTimeout(r, Math.pow(2,i)*2000+3000)); lastError = new Error("429"); continue; }
      if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d.error || String(res.status)); }
      return await res.json();
    } catch(err: any) { lastError = err; if (!err.message?.includes("429")) throw err; }
  }
  throw lastError;
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isQuotaError = err.message?.includes('429') || err.message?.includes('quota');
      if (isQuotaError) {
        const waitTime = Math.pow(2, i) * 2000 + 3000;
        await sleep(waitTime);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

interface Episode {
  id: string;
  title: string;
  script: string;
  audioBuffer: AudioBuffer | null;
  date: string;
  duration: number;
}

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('fr'); 
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<'script' | 'audio' | 'idle'>('idle');
  const [audioProgress, setAudioProgress] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [speakerCount, setSpeakerCount] = useState(2);
  const [targetMinutes, setTargetMinutes] = useState(2);
  const [previewingVoice, setPreviewingVoice] = useState<VoiceName | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<VoiceName | null>(null);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState(false);
  
  const sampleCache = useRef<Record<string, AudioBuffer>>({});

  const [speakers, setSpeakers] = useState<SpeakerConfig[]>([
    { id: '1', name: 'Sophie', voice: 'zephyr' },
    { id: '2', name: 'Marc', voice: 'charon' },
    { id: '3', name: 'Léa', voice: 'aoede' },
    { id: '4', name: 'Thomas', voice: 'fenrir' },
    { id: '5', name: 'Julie', voice: 'leda' },
  ]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Logique d'extraction automatique des noms depuis le brief
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!prompt.trim()) return;
      
      const blacklist = ['Podcast', 'PromptCast', 'Episode', 'Theme', 'The', 'And', 'With', 'By', 'Le', 'La', 'Les', 'Et', 'Dans', 'Sur', 'Pour', 'Un', 'Une', 'Description', 'Sujet', 'Voici', 'Script'];
      // Regex pour trouver des mots commençant par une majuscule après des mots de liaison communs
      const nameRegex = /\b(?:avec|par|entre|et|and|with|between|,)\s+([A-Z][a-zÀ-ÿ]+)/g;
      const foundNames: string[] = [];
      let match;
      
      // Heuristique : vérifier aussi le tout début du texte
      const startRegex = /^([A-Z][a-zÀ-ÿ]+)\s+(?:et|and|avec|with)\s+([A-Z][a-zÀ-ÿ]+)/;
      const startMatch = prompt.trim().match(startRegex);
      if (startMatch) {
        if (!blacklist.includes(startMatch[1])) foundNames.push(startMatch[1]);
        if (!blacklist.includes(startMatch[2])) foundNames.push(startMatch[2]);
      }

      while ((match = nameRegex.exec(prompt)) !== null) {
        const name = match[1];
        if (name && !blacklist.includes(name) && !foundNames.includes(name)) {
          foundNames.push(name);
        }
      }

      if (foundNames.length > 0) {
        setSpeakers(prev => {
          const next = [...prev];
          let changed = false;
          foundNames.forEach((name, i) => {
            if (next[i] && next[i].name !== name) {
              next[i] = { ...next[i], name };
              changed = true;
            }
          });
          return changed ? next : prev;
        });
        
        // Ajuster automatiquement le nombre d'invités si on détecte plus de noms que le compte actuel
        if (foundNames.length > speakerCount && foundNames.length <= 5) {
          setSpeakerCount(foundNames.length);
        }
      }
    }, 800); // Délai pour ne pas saccader la saisie

    return () => clearTimeout(timer);
  }, [prompt, speakerCount]);

  const getTTSAudio = async (text: string, voice: VoiceName): Promise<string | null> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tts`, { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({text, voice}) });
      if (!res.ok) throw new Error((await res.json()).error || "TTS error");
      const data = await res.json();
      setIsQuotaExhausted(false);
      return data.audio || null;
    } catch (e: any) {
      if (e.message?.includes('429')) {
        setIsQuotaExhausted(true);
      }
      throw e;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('promptcast_episodes');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEpisodes(parsed.map((e: any) => ({ ...e, audioBuffer: null })));
    }
  }, []);

  const saveEpisodes = (list: Episode[]) => {
    const toSave = list.map(({ audioBuffer, ...rest }) => rest);
    localStorage.setItem('promptcast_episodes', JSON.stringify(toSave));
  };

  const deleteEpisode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newList = episodes.filter(ep => ep.id !== id);
    setEpisodes(newList);
    saveEpisodes(newList);
    if (currentEpisode?.id === id) setCurrentEpisode(null);
  };

  const updateSpeaker = (index: number, field: keyof SpeakerConfig, value: string) => {
    const newSpeakers = [...speakers];
    newSpeakers[index] = { ...newSpeakers[index], [field]: value } as any;
    setSpeakers(newSpeakers);
  };

  const t = UI_STRINGS[lang] || UI_STRINGS.en;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const handlePreviewVoice = async (voice: VoiceName, e: React.MouseEvent) => {
    e.stopPropagation();
    const ctx = await initAudio();
    if (previewingVoice || isPreviewLoading) return;
    
    const cacheKey = `${lang}_${voice}`;
    const cachedBuffer = sampleCache.current[cacheKey];

    if (cachedBuffer) {
      setPreviewingVoice(voice);
      const source = ctx.createBufferSource();
      source.buffer = cachedBuffer;
      source.connect(ctx.destination);
      source.start(0);
      source.onended = () => setPreviewingVoice(null);
      return;
    }

    setIsPreviewLoading(voice);
    try {
      const audio = await getTTSAudio(t.ui.samplePhrase, voice);
      if (audio) {
        const buffer = await decodeAudioData(decodeBase64(audio), ctx, 24000, 1);
        sampleCache.current[cacheKey] = buffer;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        setPreviewingVoice(voice);
        setIsPreviewLoading(null);
        source.onended = () => setPreviewingVoice(null);
      } else {
        setIsPreviewLoading(null);
      }
    } catch (err: any) {
      setIsPreviewLoading(null);
      if (err.message?.includes('429')) {
        alert(t.ui.quotaError);
        setIsQuotaExhausted(true);
      }
    }
  };

  const handleDownload = () => {
    if (!currentEpisode?.audioBuffer) return;
    const wavBlob = audioBufferToWav(currentEpisode.audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PromptCast_${currentEpisode.title.replace(/\s+/g, '_')}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePlayPause = async () => {
    if (!currentEpisode?.audioBuffer) return;
    const ctx = await initAudio();
    if (isPlaying) {
      sourceRef.current?.stop();
      if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      setIsPlaying(false);
    } else {
      const source = ctx.createBufferSource();
      source.buffer = currentEpisode.audioBuffer;
      source.connect(ctx.destination);
      source.start(0);
      sourceRef.current = source;
      setIsPlaying(true);
      
      const start = Date.now();
      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        setCurrentTime(elapsed);
        if (elapsed >= currentEpisode.audioBuffer!.duration) {
          setIsPlaying(false);
          setCurrentTime(0);
          if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
        }
      }, 100);
      source.onended = () => {
        setIsPlaying(false);
        if (progressIntervalRef.current) window.clearInterval(progressIntervalRef.current);
      };
    }
  };

  const generatePodcast = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenerationStep('script');
    setAudioProgress(0);
    const ctx = await initAudio();

    try {
      const activeSpeakers = speakers.slice(0, speakerCount);
      const scriptData = await fetchWithRetry(`${BACKEND_URL}/api/generate-script`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt, language: t.name, speakers: activeSpeakers, targetMinutes}),
      });
      const script = scriptData.script;
      if (!script) throw new Error("Could not generate script.");
      
      setGenerationStep('audio');
      const lines = script.split('\n').filter((l: string) => l.includes(':') && l.trim().length > 3);
      const audioChunks: AudioBuffer[] = [];

      for (let i = 0; i < lines.length; i++) {
        setAudioProgress(Math.round(((i + 1) / lines.length) * 100));
        const line = lines[i];
        const colonIndex = line.indexOf(':');
        const speakerNameRaw = line.substring(0, colonIndex).trim().toLowerCase();
        const text = line.substring(colonIndex + 1).trim();
        const speaker = activeSpeakers.find(s => speakerNameRaw.includes(s.name.toLowerCase())) || activeSpeakers[0];
        
        const audio = await callWithRetry(() => getTTSAudio(text, speaker.voice));
        if (audio && ctx) {
          const buffer = await decodeAudioData(decodeBase64(audio), ctx, 24000, 1);
          audioChunks.push(buffer);
        }
        await sleep(2000); 
      }

      if (audioChunks.length === 0) throw new Error("No audio was generated.");

      const finalBuffer = mergeAudioBuffersWithLatency(audioChunks, ctx, 0.8);
      const newEp: Episode = {
        id: Date.now().toString(),
        title: prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt,
        script,
        audioBuffer: finalBuffer,
        duration: finalBuffer.duration,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setEpisodes(prev => [newEp, ...prev]);
      saveEpisodes([newEp, ...episodes]);
      setCurrentEpisode(newEp);
    } catch (e: any) {
      if (e.message?.includes('429')) {
        alert(t.ui.quotaError);
        setIsQuotaExhausted(true);
      } else {
        alert(`${t.ui.error}: ${e.message}`);
      }
      console.error(e);
    } finally {
      setIsGenerating(false);
      setGenerationStep('idle');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-[#86cf31]/30">
      <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#86cf31] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(134,207,49,0.2)] shrink-0">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-black" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M10 5h4v0.5h-4V5zm0 2h4v0.5h-4V7zm0 2h4v0.5h-4V9zm0 2h4v0.5h-4v-0.5z" fill="#86cf31"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <div className="text-xl font-bold tracking-tight">Prompt<span className="text-[#86cf31]">Cast</span></div>
        </div>
        
        <div className="flex items-center gap-4">
          {isQuotaExhausted && (
             <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-black uppercase animate-pulse">
               {t.ui.quotaWarning}
             </div>
          )}
          <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer font-bold hover:bg-white/10 transition-all">
            {Object.keys(UI_STRINGS).map(k => <option key={k} value={k} className="bg-black">{UI_STRINGS[k as Language].flag} {UI_STRINGS[k as Language].name}</option>)}
          </select>
          <button onClick={() => setShowHistory(true)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all group">
            <svg className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
        <div className="max-w-6xl mx-auto">
          {!currentEpisode && !isGenerating ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center space-y-4">
                <h1 className="text-7xl md:text-8xl font-black tracking-tighter leading-none uppercase">{t.ui.title}</h1>
                <p className="text-[#86cf31] text-sm uppercase tracking-[0.5em] font-black opacity-80">{t.ui.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-8 backdrop-blur-sm">
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t.ui.speakers}</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setSpeakerCount(n)} className={`h-11 rounded-xl text-xs font-black transition-all border ${speakerCount === n ? 'bg-[#86cf31] text-black border-[#86cf31]' : 'bg-white/5 border-white/5 text-white/20'}`}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase font-black text-white/30 tracking-widest">{t.ui.duration}</label>
                      <select value={targetMinutes} onChange={e => setTargetMinutes(Number(e.target.value))} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 outline-none font-bold text-sm cursor-pointer hover:bg-white/10 transition-colors">
                        {[1, 2, 3, 5, 10].map(m => <option key={m} value={m} className="bg-[#0a0a0a]">{m} {t.ui.minutes}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 h-full flex flex-col backdrop-blur-sm shadow-inner">
                    <label className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-4">{t.ui.brief}</label>
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t.ui.placeholder} className="flex-1 bg-transparent text-2xl font-light outline-none resize-none min-h-[220px] placeholder:text-white/5 leading-relaxed" />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-white/5" />
                  <span className="text-[10px] font-black tracking-[0.4em] text-white/30 uppercase">{t.ui.cast}</span>
                  <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {speakers.slice(0, speakerCount).map((speaker, index) => (
                    <div key={speaker.id} className={`bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6 transition-all group ${VOICE_OPTIONS.find(v => v.id === speaker.voice)?.gender === 'F' ? 'hover:border-pink-500/50' : 'hover:border-blue-500/50'}`}>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Nom de l'invité</label>
                        <input type="text" value={speaker.name} onChange={(e) => updateSpeaker(index, 'name', e.target.value)} className={`bg-white/5 rounded-2xl px-4 py-3 outline-none text-sm font-bold w-full border border-white/5 transition-all ${VOICE_OPTIONS.find(v => v.id === speaker.voice)?.gender === 'F' ? 'focus:border-pink-500/50' : 'focus:border-blue-500/50'}`} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] uppercase font-black text-white/20 tracking-widest">Timbre de voix</label>
                        <div className="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-[300px] pr-1 no-scrollbar">
                          {VOICE_OPTIONS.map(v => (
                            <button key={v.id} onClick={() => updateSpeaker(index, 'voice', v.id)} className={`flex flex-col items-start px-4 py-3 rounded-2xl border text-[11px] font-bold transition-all relative ${speaker.voice === v.id ? (v.gender === 'F' ? 'bg-pink-500/20 border-pink-500/50 text-pink-400' : 'bg-blue-500/20 border-blue-500/50 text-blue-400') : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}>
                              <div className="flex items-center gap-2 w-full">
                                <button 
                                  onClick={(e) => handlePreviewVoice(v.id, e)}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${previewingVoice === v.id || isPreviewLoading === v.id ? (v.gender === 'F' ? 'bg-pink-500 text-white animate-pulse' : 'bg-blue-500 text-white animate-pulse') : (v.gender === 'F' ? 'bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white' : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white')}`}
                                >
                                  {isPreviewLoading === v.id ? (
                                    <div className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : previewingVoice === v.id ? (
                                    <div className="w-2 h-2 bg-white rounded-full" />
                                  ) : (
                                    <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                  )}
                                </button>
                                <div className="flex-1 flex flex-col items-start">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${v.gender === 'F' ? 'bg-pink-500' : 'bg-blue-500'}`} />
                                    <span>{v.label}</span>
                                  </div>
                                  <span className="opacity-50 text-[9px] italic font-medium mt-0.5">{v.desc}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={generatePodcast} disabled={!prompt.trim() || isGenerating} className="w-full bg-[#86cf31] text-black py-8 rounded-[32px] text-base font-black uppercase tracking-[0.5em] hover:scale-[1.01] active:scale-95 transition-all shadow-2xl shadow-[#86cf31]/20 disabled:opacity-20">
                {isGenerating ? t.ui.producing : t.ui.produce}
              </button>
            </div>
          ) : isGenerating ? (
            <div className="min-h-[500px] flex flex-col items-center justify-center gap-12">
              <div className="relative">
                 <div className="w-24 h-24 border-[8px] border-[#86cf31]/10 border-t-[#86cf31] rounded-full animate-spin" />
                 {generationStep === 'audio' && (
                    <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-[#86cf31]">
                      {audioProgress}%
                    </div>
                 )}
              </div>
              <div className="text-center space-y-4">
                <p className="text-[14px] uppercase tracking-[0.8em] text-[#86cf31] font-black">{generationStep === 'script' ? t.ui.writing : t.ui.synthesizing}</p>
                <p className="text-white/30 text-sm italic max-w-xs mx-auto text-balance">{t.ui.latency}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-700 pb-20">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black tracking-tight uppercase">{currentEpisode?.title}</h2>
                <div className="flex gap-2">
                  <button onClick={handleDownload} className="text-[10px] font-black uppercase bg-[#86cf31] text-black px-6 py-3 rounded-2xl hover:scale-105 transition-all">{t.ui.download}</button>
                  <button onClick={() => {setIsPlaying(false); setCurrentEpisode(null);}} className="text-[10px] font-black uppercase bg-white/5 border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all">{t.ui.newProject}</button>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-[56px] p-10 md:p-20 max-h-[600px] overflow-y-auto no-scrollbar space-y-12 shadow-2xl backdrop-blur-sm relative">
                {currentEpisode?.script.split('\n').map((line, i) => {
                  const parts = line.split(':');
                  if (parts.length < 2) return null;
                  return (
                    <div key={i} className="group">
                      <span className="text-[10px] font-black uppercase text-[#86cf31]/40 tracking-widest block mb-3">{parts[0]}</span>
                      <p className="text-2xl text-white/60 font-light leading-relaxed group-hover:text-white transition-colors duration-500">{parts.slice(1).join(':')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {currentEpisode && !isGenerating && (
        <div className="fixed bottom-0 left-0 right-0 p-6 md:p-10 z-[100] animate-in slide-in-from-bottom-full duration-1000">
          <div className="max-w-4xl mx-auto bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[60px] p-6 md:px-14 md:py-8 flex flex-col md:flex-row items-center gap-10 shadow-2xl">
            <button onClick={handlePlayPause} className="w-20 h-20 rounded-full bg-[#86cf31] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shrink-0">
              {isPlaying ? <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-10 h-10 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
            </button>
            <div className="flex-1 w-full space-y-4">
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                <div className="h-full bg-[#86cf31] transition-all duration-100" style={{ width: `${(currentTime / currentEpisode.duration) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[11px] font-black text-white/20 uppercase">
                <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                <span>{Math.floor(currentEpisode.duration / 60)}:{(Math.floor(currentEpisode.duration % 60)).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowHistory(false)} />
          <aside className="relative w-full max-w-md h-full bg-[#080808] border-l border-white/5 p-12 overflow-y-auto space-y-12 animate-in slide-in-from-right-full duration-500 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-[#86cf31]">{t.ui.archives}</h2>
              <button onClick={() => setShowHistory(false)} className="text-white/20 hover:text-white p-2 transition-colors">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-6">
              {episodes.map(e => (
                <div key={e.id} className="relative group">
                  <button onClick={() => {setCurrentEpisode(e); setShowHistory(false);}} className="w-full text-left p-8 rounded-[32px] bg-white/[0.03] border border-white/5 hover:border-[#86cf31]/40 transition-all relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#86cf31] opacity-0 group-hover:opacity-100 transition-all" />
                    <p className="font-bold text-lg truncate mb-2 group-hover:text-[#86cf31] transition-colors pr-8">{e.title}</p>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{e.date} • {Math.floor(e.duration / 60)}min</p>
                  </button>
                  <button onClick={(ev) => deleteEpisode(e.id, ev)} className="absolute top-8 right-6 text-white/10 hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              ))}
              {episodes.length === 0 && <p className="text-center py-24 text-[11px] font-black uppercase tracking-[0.3em] text-white/5">{t.ui.empty}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};