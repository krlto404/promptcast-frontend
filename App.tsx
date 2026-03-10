
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Play, Pause, Download, Trash2, History, Plus, Globe, ChevronRight, Loader2, Volume2, Sparkles, Coffee, Users, PenTool, Radio, User } from 'lucide-react';
import { decodeBase64, decodeAudioData, mergeAudioBuffersWithDynamicLatency, audioBufferToWav } from './utils/audio-helpers';
import { VoiceName, SpeakerConfig } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Language = 'en' | 'fr' | 'es' | 'it' | 'zh' | 'de' | 'pt' | 'ja' | 'tr' | 'ar' | 'hi' | 'ko' | 'ru';

interface VoiceOption {
  id: VoiceName;
  label: string;
  desc: string;
  gender: 'F' | 'M';
}

const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'zephyr', label: 'Voix n°1', desc: 'Féminin - Clair & Dynamique', gender: 'F' },
  { id: 'aoede', label: 'Voix n°2', desc: 'Féminin - Doux & Mélodique', gender: 'F' },
  { id: 'leda', label: 'Voix n°3', desc: 'Féminin - Mature & Posé', gender: 'F' },
  { id: 'charon', label: 'Voix n°4', desc: 'Masculin - Grave & Profond', gender: 'M' },
  { id: 'fenrir', label: 'Voix n°5', desc: 'Masculin - Puissant & Autoritaire', gender: 'M' },
  { id: 'puck', label: 'Voix n°6', desc: 'Masculin - Énergique & Médium', gender: 'M' },
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
  en: { flag: '🇺🇸', name: 'English', ui: { title: 'PromptCast', subtitle: 'Give your ideas a voice', speakers: 'Cast Size', duration: 'Duration', brief: 'Production brief', placeholder: 'Describe the vibe and topic...', produce: 'Generate Conversation', producing: 'Simulating life...', newProject: 'New Project', archives: 'Archives', empty: 'No archives', minutes: 'min', writing: 'IMAGINING DIALOGUE', synthesizing: 'VOICE SYNTHESIS', wait: 'Connecting...', ready: 'Online', cast: 'THE PODCAST TEAM', error: 'Generation Error', retry: 'Retrying...', latency: 'Adjusting conversational rhythm...', download: 'Download WAV', delete: 'Delete', samplePhrase: 'Hello. Welcome to Promptcast.', quotaError: 'Quota exceeded.', quotaWarning: 'API Limit.' } },
  fr: { flag: '🇫🇷', name: 'Français', ui: { title: 'PromptCast', subtitle: 'Donnez une voix à vos idées', speakers: 'Nombre d\'invités', duration: 'Durée', brief: 'Sujet de l\'épisode', placeholder: 'Décrivez le thème, les points de débat et le ton souhaité...', produce: 'Lancer la discussion', producing: 'Simulation en cours...', newProject: 'Nouveau Projet', archives: 'Archives', empty: 'Aucune archive', minutes: 'min', writing: 'IMAGINATION DES DIALOGUES', synthesizing: 'SYNTHÈSE MULTI-VOIX', wait: 'Connexion...', ready: 'Service en ligne', cast: 'L\'ÉQUIPE DU PODCAST', error: 'Erreur de génération', retry: 'Nouvelle tentative...', latency: 'Ajustement du rythme conversationnel...', download: 'Télécharger WAV', delete: 'Supprimer', samplePhrase: 'Bonjour. Bienvenue sur Promptcast.', quotaError: 'Quota épuisé.', quotaWarning: 'Limite API.' } },
  es: { flag: '🇪🇸', name: 'Español', ui: { title: 'PromptCast', subtitle: 'Dale una voz a tus ideas', speakers: 'Invitados', duration: 'Duración', brief: 'Resumen', placeholder: 'Describe el tema...', produce: 'Empezar debate', producing: 'Simulando vida...', newProject: 'Nuevo Proyecto', archives: 'Archivos', empty: 'Sin archivos', minutes: 'min', writing: 'ESCRIBIENDO DIÁLOGO', synthesizing: 'SINTETIZANDO', wait: 'Conectando...', ready: 'En línea', cast: 'EQUIPO', error: 'Error', retry: 'Reintentando...', latency: 'Ajustando rythme...', download: 'Bajar WAV', delete: 'Borrar', samplePhrase: 'Hola. Bienvenido a Promptcast.', quotaError: 'Cuota excedida.', quotaWarning: 'Límite API.' } },
  it: { flag: '🇮🇹', name: 'Italiano', ui: { title: 'PromptCast', subtitle: 'Dai voce alle tue idee', speakers: 'Ospiti', duration: 'Durata', brief: 'Brief di produzione', placeholder: 'Descrivi il tema...', produce: 'Inizia discussione', producing: 'Simulando vita...', newProject: 'Nuovo Progetto', archives: 'Archivi', empty: 'Nessun archivio', minutes: 'min', writing: 'SCRIVENDO DIALOGO', synthesizing: 'SINTETIZZANDO', wait: 'Connessione...', ready: 'In linea', cast: 'TEAM', error: 'Errore', retry: 'Riprova...', latency: 'Regolando ritmo...', download: 'Scarica WAV', delete: 'Elimina', samplePhrase: 'Ciao. Benvenuto su Promptcast.', quotaError: 'Quota superata.', quotaWarning: 'Limite API.' } },
  de: { flag: '🇩🇪', name: 'Deutsch', ui: { title: 'PromptCast', subtitle: 'Geben Sie Ihren Ideen eine Stimme', speakers: 'Gäste', duration: 'Dauer', brief: 'Produktionsbrief', placeholder: 'Thema beschreiben...', produce: 'Diskussion starten', producing: 'Simulation läuft...', newProject: 'Neues Projekt', archives: 'Archive', empty: 'Keine Archive', minutes: 'min', writing: 'DIALOG SCHREIBEN', synthesizing: 'SYNTHETISIEREN', wait: 'Verbinden...', ready: 'Online', cast: 'TEAM', error: 'Fehler', retry: 'Wiederholen...', latency: 'Rhythmus anpassen...', download: 'WAV laden', delete: 'Löschen', samplePhrase: 'Hallo. Willkommen bei Promptcast.', quotaError: 'Quota überschritten.', quotaWarning: 'API-Limit.' } },
  pt: { flag: '🇵🇹', name: 'Português', ui: { title: 'PromptCast', subtitle: 'Dê voz às suas ideias', speakers: 'Convidados', duration: 'Duração', brief: 'Briefing', placeholder: 'Descreva o tema...', produce: 'Iniciar debate', producing: 'Simulando vida...', newProject: 'Novo Projeto', archives: 'Arquivos', empty: 'Sem arquivos', minutes: 'min', writing: 'ESCREVENDO DIÁLOGO', synthesizing: 'SINTETIZANDO', wait: 'Conectando...', ready: 'Online', cast: 'EQUIPE', error: 'Erro', retry: 'Repetindo...', latency: 'Ajustando ritmo...', download: 'Baixar WAV', delete: 'Excluir', samplePhrase: 'Olá. Bem-vindo ao Promptcast.', quotaError: 'Cota excedida.', quotaWarning: 'Limite API.' } },
  zh: { flag: '🇨🇳', name: '中文', ui: { title: 'PromptCast', subtitle: '给您的创意一个声音', speakers: '嘉宾人数', duration: '时长', brief: '制作简介', placeholder: '描述主题...', produce: '开始对话', producing: '模拟生活中...', newProject: '新项目', archives: '存档', empty: '无存档', minutes: '分钟', writing: '编写对话中', synthesizing: '语音合成中', wait: '连接中...', ready: '在线', cast: '播客团队', error: '生成错误', retry: '重试中...', latency: '调整节奏...', download: '下载 WAV', delete: '删除', samplePhrase: '你好。欢迎来到 Promptcast。', quotaError: '配额已用完。', quotaWarning: 'API 限制。' } },
  ja: { flag: '🇯🇵', name: '日本語', ui: { title: 'PromptCast', subtitle: 'あなたのアイデアに声を', speakers: 'ゲスト数', duration: '再生時間', brief: '制作概要', placeholder: 'トピックを説明してください...', produce: '会話を生成', producing: 'シミュレーション中...', newProject: '新規プロジェクト', archives: 'アーカイブ', empty: 'アーカイブなし', minutes: '分', writing: '台本作成中', synthesizing: '音声合成中', wait: '接続中...', ready: 'オンライン', cast: 'チーム', error: 'エラー', retry: '再試行中...', latency: 'リズム調整中...', download: 'WAVを保存', delete: '削除', samplePhrase: 'こんにちは。Promptcast へようこそ。', quotaError: 'クォータを超過しました。', quotaWarning: 'API 制限。' } },
  ko: { flag: '🇰🇷', name: '한국어', ui: { title: 'PromptCast', subtitle: '당신의 아이디어에 목소리를 입히세요', speakers: '출연진 수', duration: '기간', brief: '제작 브리핑', placeholder: '주제를 설명해주세요...', produce: '대화 생성', producing: '시뮬레이션 중...', newProject: '새 프로젝트', archives: '아카이브', empty: '아카이브 없음', minutes: '분', writing: '대본 작성 중', synthesizing: '음성 합성 중', wait: '연결 중...', ready: '온라인', cast: '팀', error: '오류', retry: '재시도 중...', latency: '리듬 조정 중...', download: 'WAV 다운로드', delete: '삭제', samplePhrase: '안녕하세요. Promptcast에 오신 것을 환영합니다.', quotaError: '할당량이 초과되었습니다.', quotaWarning: 'API 제한.' } },
  ru: { flag: '🇷🇺', name: 'Русский', ui: { title: 'PromptCast', subtitle: 'Дайте голос своим идеям', speakers: 'Гости', duration: 'Длительность', brief: 'Бриф', placeholder: 'Опишите тему...', produce: 'Начать обсуждение', producing: 'Симуляция...', newProject: 'Новый проект', archives: 'Архив', empty: 'Пусто', minutes: 'мин', writing: 'ПИШЕМ ДИАЛОГ', synthesizing: 'СИНТЕЗ ГОЛОСА', wait: 'Подключение...', ready: 'В сети', cast: 'КОМАНДА', error: 'Ошибка', retry: 'Повтор...', latency: 'Настройка ритма...', download: 'Скачать WAV', delete: 'Удалить', samplePhrase: 'Привет. Добро пожаловать в Promptcast.', quotaError: 'Квота превышена.', quotaWarning: 'Лимит API.' } },
  tr: { flag: '🇹🇷', name: 'Türkçe', ui: { title: 'PromptCast', subtitle: 'Fikirlerinize ses verin', speakers: 'Konuk Sayısı', duration: 'Süre', brief: 'Yapım Özeti', placeholder: 'Konuyu açıklayın...', produce: 'Sohbet Oluştur', producing: 'Simüle ediliyor...', newProject: 'Yeni Proje', archives: 'Arşivler', empty: 'Arşiv yok', minutes: 'dk', writing: 'DİYALOG YAZILIYOR', synthesizing: 'SES SENTEZLENİYOR', wait: 'Bağlanıyor...', ready: 'Çevrimiçi', cast: 'EKİP', error: 'Hata', retry: 'Tekrar deneniyor...', latency: 'Ritim ayarlanıyor...', download: 'WAV İndir', delete: 'Sil', samplePhrase: 'Merhaba. Promptcast\'e hoş geldiniz.', quotaError: 'Kota aşıldı.', quotaWarning: 'API Sınırı.' } },
  ar: { flag: '🇸🇦', name: 'العربية', ui: { title: 'PromptCast', subtitle: 'امنح أفكارك صوتاً', speakers: 'عدد الضيوف', duration: 'المدة', brief: 'ملخص الإنتاج', placeholder: 'صف الموضوع...', produce: 'إنشاء المحادثة', producing: 'محاكاة...', newProject: 'مشروع جديد', archives: 'الأرشيف', empty: 'لا يوجد أرشيف', minutes: 'دقيقة', writing: 'كتابة الحوار', synthesizing: 'توليف الصوت', wait: 'جاري الاتصال...', ready: 'متصل', cast: 'الفريق', error: 'خطأ', retry: 'إعادة المحاولة...', latency: 'ضبط الإيقاع...', download: 'تحميل WAV', delete: 'حذف', samplePhrase: 'مرحباً. أهلاً بكم في Promptcast.', quotaError: 'تم تجاوز الحصة.', quotaWarning: 'حد API.' } },
  hi: { flag: '🇮🇳', name: 'हिन्दी', ui: { title: 'PromptCast', subtitle: 'अपने विचारों को आवाज़ दें', speakers: 'अतिथियों की संख्या', duration: 'अवधि', brief: 'प्रोडक्शन ब्रीफ', placeholder: 'विषय का वर्णन करें...', produce: 'बातचीत शुरू करें', producing: 'सिमुलेशन जारी...', newProject: 'नया प्रोजेक्ट', archives: 'संग्रह', empty: 'कोई संग्रह नहीं', minutes: 'मिनट', writing: 'संवाद लिख रहे हैं', synthesizing: 'आवाज़ तैयार हो रही है', wait: 'जुड़ रहा है...', ready: 'ऑनलाइन', cast: 'टीम', error: 'त्रुटि', retry: 'पुनः प्रयास...', latency: 'लय ठीक कर रहे हैं...', download: 'WAV डाउनलोड करें', delete: 'हटाएं', samplePhrase: 'नमस्ते। Promptcast में आपका स्वागत है।', quotaError: 'कोटा समाप्त।', quotaWarning: 'API सीमा।' } },
} as any;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const OnAirSign = ({ active }: { active: boolean }) => {
  return (
    <div className="flex justify-center">
      <div className={cn(
        "relative px-6 py-2 rounded-md border-2 transition-all duration-500 flex items-center gap-3 overflow-hidden",
        active 
          ? "bg-red-600/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]" 
          : "bg-white/5 border-white/10 opacity-20"
      )}>
        {/* Glass Reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
        
        {/* Red Light Indicator */}
        <div className={cn(
          "w-2.5 h-2.5 rounded-full transition-all duration-500",
          active ? "bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse" : "bg-white/20"
        )} />
        
        <span className={cn(
          "text-sm font-black uppercase tracking-[0.4em] transition-colors duration-500",
          active ? "text-red-500" : "text-white/40"
        )}>
          On Air
        </span>

        {/* Subtle scanline effect when active */}
        {active && (
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="w-full h-[1px] bg-red-400 animate-[scan_3s_linear_infinite]" />
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(400%); }
        }
      `}} />
    </div>
  );
};

const ProductionVisualizer = ({ step, progress }: { step: 'script' | 'audio' | 'idle', progress: number }) => {
  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      {/* Central Hub */}
      <div className="relative z-10">
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 bg-[#86cf31]/10 rounded-full flex items-center justify-center border border-[#86cf31]/20 shadow-[0_0_50px_rgba(134,207,49,0.1)]"
        >
          <Mic className="w-12 h-12 text-[#86cf31]" />
        </motion.div>
        
        {/* Orbiting Elements */}
        <AnimatePresence>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
                x: Math.cos(i * 60 * Math.PI / 180) * 80,
                y: Math.sin(i * 60 * Math.PI / 180) * 80,
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                delay: i * 0.5,
                ease: "easeInOut"
              }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              {i % 3 === 0 ? <PenTool className="w-4 h-4 text-[#86cf31]/40" /> : 
               i % 3 === 1 ? <Volume2 className="w-4 h-4 text-[#86cf31]/40" /> : 
               <Sparkles className="w-4 h-4 text-[#86cf31]/40" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Visualizer bars */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-1.5 h-12">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              height: step === 'audio' ? [4, Math.random() * 40 + 8, 4] : [4, 8, 4],
              opacity: step === 'audio' ? 1 : 0.2
            }}
            transition={{ 
              duration: 0.4 + Math.random() * 0.4, 
              repeat: Infinity,
              delay: i * 0.05
            }}
            className="w-2 bg-[#86cf31] rounded-full shadow-[0_0_10px_rgba(134,207,49,0.3)]"
          />
        ))}
      </div>

      {/* Progress Ring Background */}
      <svg className="absolute w-48 h-48 -rotate-90 opacity-10">
        <circle
          cx="96"
          cy="96"
          r="88"
          stroke="currentColor"
          strokeWidth="2"
          fill="transparent"
          className="text-[#86cf31]"
        />
      </svg>
      
      {/* Progress Ring Active */}
      <motion.svg className="absolute w-48 h-48 -rotate-90">
        <motion.circle
          cx="96"
          cy="96"
          r="88"
          stroke="currentColor"
          strokeWidth="2"
          fill="transparent"
          strokeDasharray="553"
          animate={{ strokeDashoffset: 553 - (553 * (step === 'script' ? 30 : progress) / 100) }}
          className="text-[#86cf31] drop-shadow-[0_0_8px_rgba(134,207,49,0.5)]"
        />
      </motion.svg>
    </div>
  );
};
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errMsg = (err.message || "").toString();
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        // Exponential backoff with jitter
        const waitTime = Math.pow(2, i) * 3000 + 4000 + Math.random() * 2000;
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
  
  const sampleCache = useRef<Record<string, AudioBuffer>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const [speakers, setSpeakers] = useState<SpeakerConfig[]>([
    { id: '1', name: 'Sophie', voice: 'zephyr' },
    { id: '2', name: 'Marc', voice: 'charon' },
    { id: '3', name: 'Léa', voice: 'aoede' },
    { id: '4', name: 'Thomas', voice: 'fenrir' },
    { id: '5', name: 'Julie', voice: 'leda' },
  ]);

  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!prompt.trim() || isGenerating) return;
      const blacklist = ['Podcast', 'PromptCast', 'Episode', 'Theme', 'Le', 'La', 'Les', 'Et', 'Dans', 'Script', 'Avec', 'Par'];
      const words = prompt.split(/[\s,.:;!?"'()]+/).filter((w: string) => w.length > 2);
      const foundNames: string[] = [];
      
      for (const word of words) {
        if (/^[A-Z][a-zÀ-ÿ]+$/.test(word) && !blacklist.includes(word)) {
          if (!foundNames.includes(word)) foundNames.push(word);
        }
      }

      if (foundNames.length > 0) {
        setSpeakers((prev: SpeakerConfig[]) => {
          const next = [...prev];
          let changed = false;
          foundNames.slice(0, 5).forEach((name, i) => {
            if (next[i] && next[i].name !== name) {
              next[i] = { ...next[i], name };
              changed = true;
            }
          });
          return changed ? next : prev;
        });
        if (foundNames.length > speakerCount && foundNames.length <= 5) setSpeakerCount(foundNames.length);
      }
    }, 1000); 
    return () => clearTimeout(timer);
  }, [prompt, speakerCount, isGenerating]);

  const getTTSAudio = async (text: string, voice: VoiceName): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  };

  const generatePodcast = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenerationStep('script');
    setAudioProgress(0);
    const ctx = await initAudio();
    const currentT = UI_STRINGS[lang] || UI_STRINGS.en;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });
      const activeSpeakers = speakers.slice(0, speakerCount);
      const speakerNames = activeSpeakers.map((s: SpeakerConfig) => s.name);
      
      const scriptPrompt = `Tu es un scénariste expert en conversations humaines naturelles et débats passionnés.
      Langue : ${currentT.name}.
      Sujet : "${prompt}".
      Intervenants : ${speakerNames.join(', ')}.
      Durée : ${targetMinutes} minutes environ.

      CONSIGNES POUR UN RENDU "VIVANT" :
      1. Évite le style formel. Utilise des expressions parlées, des hésitations ("euh", "bah", "en fait").
      2. INTERRUPTIONS : Les personnages doivent se couper la parole. Si un personnage se fait couper, termine sa phrase par "..." ou "—".
      3. RÉACTIONS : Inclus des interjections courtes ("Ah ?", "Exactement !", "Attends...") pour dynamiser l'échange.
      4. RYTHME : Fais varier la longueur des phrases. Pas de longs monologues, privilégie le tac-au-tac.
      5. Pas d'intro/outro clichés sauf si demandé. Entre directement dans le vif du sujet.

      FORMAT STRICT : Chaque ligne DOIT commencer par "Nom: ".
      Exemple :
      ${speakerNames[0]}: Mais c'est n'importe quoi, enfin...
      ${speakerNames[1] || speakerNames[0]}: Bah non ! Écoute—
      ${speakerNames[0]}: Non, je t'arrête tout de suite !`;

      const scriptResponse: GenerateContentResponse = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: scriptPrompt,
      }));

      const script = scriptResponse.text;
      if (!script) throw new Error("Script generation failed");
      
      setGenerationStep('audio');
      const lines = script.split('\n').filter((l: string) => l.includes(':') && l.trim().length > 3);
      const audioChunks: (AudioBuffer | null)[] = new Array(lines.length).fill(null);
      const latencies: number[] = [];

      // Préparation des latences
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const match = line.match(/^([^:]+):/);
        if (!match) {
          latencies.push(0.65);
          continue;
        }
        const text = line.substring(match[0].length).trim();
        const isInterruption = text.endsWith('...') || text.endsWith('—');
        const isShortReaction = text.length < 15;
        
        if (isInterruption) latencies.push(0.15);
        else if (isShortReaction) latencies.push(0.35);
        else latencies.push(0.65);
      }

      // Parallélisation de la synthèse audio avec une limite de concurrence réduite pour éviter les erreurs de quota
      const CONCURRENCY_LIMIT = 1;
      const tasks = lines.map((line: string, index: number) => async () => {
        const match = line.match(/^([^:]+):/);
        if (!match) return;
        
        const speakerName = match[1].trim().toLowerCase();
        const text = line.substring(match[0].length).trim();
        
        const speaker = activeSpeakers.find((s: SpeakerConfig) => 
          speakerName === s.name.toLowerCase() || 
          speakerName.includes(s.name.toLowerCase())
        ) || activeSpeakers[0];

        try {
          const audio = await callWithRetry(() => getTTSAudio(text, speaker.voice), 8);
          if (audio) {
            audioChunks[index] = await decodeAudioData(decodeBase64(audio), ctx, 24000, 1);
          }
        } catch (err) {
          console.error(`Failed to synthesize line ${index}:`, err);
        }
        
        // Mise à jour de la progression
        const completed = audioChunks.filter(c => c !== null).length;
        setAudioProgress(Math.round((completed / lines.length) * 100));
      });

      // Exécution par lots pour respecter la limite de concurrence
      for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
        const batch = tasks.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.all(batch.map((task: () => Promise<void>) => task()));
        // Délai entre les lots pour ménager l'API
        if (i + CONCURRENCY_LIMIT < tasks.length) await sleep(1000);
      }

      const validChunks = audioChunks.filter((c): c is AudioBuffer => c !== null);
      if (validChunks.length === 0) throw new Error("Audio synthesis failed completely");

      // Ajustement des latences si certains chunks ont échoué
      const finalLatencies = latencies.slice(0, validChunks.length - 1);

      const finalBuffer = mergeAudioBuffersWithDynamicLatency(validChunks, ctx, finalLatencies);
      const newEp: Episode = {
        id: Date.now().toString(),
        title: prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt,
        script, audioBuffer: finalBuffer, duration: finalBuffer.duration,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setEpisodes((prev: Episode[]) => [newEp, ...prev]);
      setCurrentEpisode(newEp);
    } catch (e: any) {
      alert(`${currentT.ui.error}: ${e.message}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep('idle');
    }
  };

  const handlePlayPause = async () => {
    if (!currentEpisode?.audioBuffer) return;
    const ctx = await initAudio();
    if (isPlaying) {
      sourceRef.current?.stop();
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
          window.clearInterval(progressIntervalRef.current!);
        }
      }, 100);
      source.onended = () => setIsPlaying(false);
    }
  };

  const handlePreviewVoice = async (voice: VoiceName, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingVoice || isPreviewLoading) return;
    const ctx = await initAudio();
    const cacheKey = `${lang}_${voice}`;
    
    if (sampleCache.current[cacheKey]) {
      const source = ctx.createBufferSource();
      source.buffer = sampleCache.current[cacheKey];
      source.connect(ctx.destination);
      setPreviewingVoice(voice);
      source.start(0);
      source.onended = () => setPreviewingVoice(null);
      return;
    }

    setIsPreviewLoading(voice);
    try {
      const currentT = UI_STRINGS[lang] || UI_STRINGS.en;
      const audio = await getTTSAudio(currentT.ui.samplePhrase, voice);
      if (audio) {
        const buffer = await decodeAudioData(decodeBase64(audio), ctx, 24000, 1);
        sampleCache.current[cacheKey] = buffer;
        setPreviewingVoice(voice);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        source.onended = () => setPreviewingVoice(null);
      }
    } catch (err) {
      console.error("Preview failed", err);
    } finally {
      setIsPreviewLoading(null);
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');

  const loadingMessages = [
    "Recrutement de doubleurs talentueux...",
    "Préparation du café pour les invités...",
    "Ajustement de la sensibilité des micros...",
    "Écriture de blagues (pas toujours drôles)...",
    "Simulation de silences gênants...",
    "Vérification de la connexion neuronale...",
    "Polissage des répliques cultes...",
    "Synchronisation des égos des intervenants...",
    "Nettoyage des bruits de bouche...",
    "Ajout d'une dose d'intelligence (artificielle)..."
  ];

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
      }, 3000);
      setLoadingMessage(loadingMessages[0]);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  const t = UI_STRINGS[lang] || UI_STRINGS.en;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-[#86cf31]/30">
      <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#86cf31] rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(134,207,49,0.2)]">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-black" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
          </div>
          <div className="text-xl font-bold tracking-tight">Prompt<span className="text-[#86cf31]">Cast</span></div>
        </div>
        <div className="flex items-center gap-4">
          <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs outline-none cursor-pointer hover:bg-white/10 transition-all">
            {Object.keys(UI_STRINGS).map(k => <option key={k} value={k} className="bg-black">{(UI_STRINGS as any)[k].flag} {(UI_STRINGS as any)[k].name}</option>)}
          </select>
          <button onClick={() => setShowHistory(true)} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center transition-all group">
            <History className="w-5 h-5 opacity-40 group-hover:opacity-100" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 overflow-y-auto pb-32 no-scrollbar">
        <div className="max-w-6xl mx-auto">
          {!currentEpisode && !isGenerating ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="text-center space-y-3">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] max-w-4xl mx-auto">
                  {t.ui.subtitle}
                </h1>
                <p className="text-[10px] uppercase tracking-[0.6em] font-black flex items-center justify-center gap-2 text-[#86cf31]">
                  <span className="w-8 h-[1px] bg-[#86cf31]/30"></span>
                  {t.ui.title}
                  <span className="w-8 h-[1px] bg-[#86cf31]/30"></span>
                </p>
                <div className="pt-4">
                  <OnAirSign active={isGenerating || prompt.trim().length > 0} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-[#86cf31]/20 rounded-[32px] p-6 space-y-6">
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
                    <select value={targetMinutes} onChange={e => setTargetMinutes(Number(e.target.value))} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 outline-none font-bold text-sm cursor-pointer hover:bg-white/10">
                      {[1, 2, 3, 5, 10].map(m => <option key={m} value={m} className="bg-black">{m} {t.ui.minutes}</option>)}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2 bg-white/5 border border-[#86cf31]/20 rounded-[32px] p-6 flex flex-col backdrop-blur-sm">
                  <label className="text-[10px] uppercase font-black text-white/30 tracking-widest mb-4">{t.ui.brief}</label>
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t.ui.placeholder} className="flex-1 bg-transparent text-2xl font-light outline-none resize-none min-h-[200px] placeholder:text-white/5" />
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-white/5" />
                  <span className="text-[10px] font-black tracking-[0.4em] text-white/30 uppercase">{t.ui.cast}</span>
                  <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {speakers.slice(0, speakerCount).map((speaker, index) => {
                    const currentVoice = VOICE_OPTIONS.find(v => v.id === speaker.voice);
                    return (
                      <div key={index} className={`bg-white/5 border border-[#86cf31]/20 rounded-[32px] p-6 space-y-6 transition-all ${currentVoice?.gender === 'F' ? 'hover:border-pink-500/30' : 'hover:border-blue-500/30'}`}>
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase font-black text-white/20">Nom de l'invité</label>
                          <input type="text" value={speaker.name} onChange={(e) => {
                            const n = [...speakers]; n[index].name = e.target.value; setSpeakers(n);
                          }} className="bg-white/5 rounded-2xl px-4 py-3 outline-none text-sm font-bold w-full border border-white/5 focus:border-[#86cf31]/50" />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[9px] uppercase font-black text-white/20">Timbre de voix</label>
                          <div className="grid gap-1.5 max-h-[250px] overflow-y-auto no-scrollbar pr-1">
                            {VOICE_OPTIONS.map(v => (
                              <div key={v.id} onClick={() => {
                                const n = [...speakers]; n[index].voice = v.id; setSpeakers(n);
                              }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-[11px] font-bold transition-all cursor-pointer relative ${speaker.voice === v.id ? (v.gender === 'F' ? 'bg-pink-500/10 border-pink-500/50 text-pink-400' : 'bg-blue-500/10 border-blue-500/50 text-blue-400') : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}>
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handlePreviewVoice(v.id, e);
                                  }} 
                                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all relative z-10 ${previewingVoice === v.id || isPreviewLoading === v.id ? 'bg-[#86cf31] text-black animate-pulse' : 'bg-white/10 text-white hover:bg-[#86cf31] hover:text-black'}`}
                                >
                                  {isPreviewLoading === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : previewingVoice === v.id ? <div className="w-2 h-2 bg-black rounded-full"/> : <Play className="w-3 h-3 ml-0.5" />}
                                </button>
                                <div className="flex-1 text-left">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${v.gender === 'F' ? 'bg-pink-500' : 'bg-blue-500'}`} />
                                    <span>{v.label}</span>
                                  </div>
                                  <p className="text-[8px] opacity-40 italic font-medium mt-0.5">{v.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button onClick={generatePodcast} disabled={!prompt.trim() || isGenerating} className="w-full bg-[#86cf31] text-black py-8 rounded-[32px] text-sm font-black uppercase tracking-[0.5em] hover:scale-[1.01] active:scale-95 transition-all shadow-2xl shadow-[#86cf31]/20 disabled:opacity-20">
                {isGenerating ? t.ui.producing : t.ui.produce}
              </button>
            </div>
          ) : isGenerating ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-h-[600px] flex flex-col items-center justify-center gap-12 text-center"
            >
              <ProductionVisualizer step={generationStep} progress={audioProgress} />

              <div className="space-y-8 max-w-md w-full">
                <div className="space-y-3">
                  <h3 className="text-3xl font-black uppercase tracking-tighter">
                    {generationStep === 'script' ? t.ui.writing : t.ui.synthesizing}
                  </h3>
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={loadingMessage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-[#86cf31] font-bold italic text-sm tracking-wide"
                    >
                      {loadingMessage}
                    </motion.p>
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${generationStep === 'script' ? 30 : audioProgress}%` }}
                      className="h-full bg-gradient-to-r from-[#86cf31]/50 to-[#86cf31] shadow-[0_0_20px_rgba(134,207,49,0.4)] relative"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[progress-stripe_1s_linear_infinite]" />
                    </motion.div>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <p className="text-white/20 text-[10px] font-black tracking-[0.3em] uppercase">STATUS: {generationStep === 'script' ? 'ANALYSIS' : 'SYNTHESIS'}</p>
                    <p className="text-[#86cf31] text-xs font-black tracking-widest uppercase">{generationStep === 'script' ? '30' : audioProgress}%</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 opacity-30">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0 }}><Coffee className="w-5 h-5" /></motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}><Users className="w-5 h-5" /></motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}><Radio className="w-5 h-5" /></motion.div>
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}><Sparkles className="w-5 h-5" /></motion.div>
              </div>

              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes progress-stripe {
                  from { background-position: 0 0; }
                  to { background-position: 20px 0; }
                }
              `}} />
            </motion.div>
          ) : (
            <div className="space-y-12 animate-in fade-in duration-700 pb-20">
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black uppercase tracking-tight">{currentEpisode?.title}</h2>
                <div className="flex gap-2">
                  <button onClick={() => {setIsPlaying(false); setCurrentEpisode(null);}} className="text-[10px] font-black uppercase bg-white/5 border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all">{t.ui.newProject}</button>
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-[48px] p-10 max-h-[500px] overflow-y-auto no-scrollbar space-y-10 backdrop-blur-sm">
                {currentEpisode?.script.split('\n').map((line: string, i: number) => {
                  const parts = line.split(':');
                  if (parts.length < 2) return null;
                  return (
                    <div key={i} className="group">
                      <span className="text-[10px] font-black uppercase text-[#86cf31]/40 block mb-2">{parts[0]}</span>
                      <p className="text-xl text-white/60 font-light leading-relaxed group-hover:text-white transition-colors">{parts.slice(1).join(':')}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {currentEpisode && !isGenerating && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-8 z-[100]"
        >
          <div className="max-w-4xl mx-auto bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[50px] p-6 flex items-center gap-8 shadow-2xl">
            <button onClick={handlePlayPause} className="w-16 h-16 rounded-full bg-[#86cf31] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            <div className="flex-1 space-y-3">
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#86cf31]" 
                  initial={false}
                  animate={{ width: `${(currentTime / currentEpisode.duration) * 100}%` }} 
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-white/20 uppercase tracking-widest">
                <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
                <span>{Math.floor(currentEpisode.duration / 60)}:{(Math.floor(currentEpisode.duration % 60)).toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <aside className="relative w-full max-w-md h-full bg-[#080808] border-l border-white/5 p-10 overflow-y-auto space-y-10 animate-in slide-in-from-right-full duration-500 shadow-2xl">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#86cf31]">{t.ui.archives}</h2>
            <div className="space-y-4">
              {episodes.map((e: Episode) => (
                <button key={e.id} onClick={() => {setCurrentEpisode(e); setShowHistory(false);}} className="w-full text-left p-6 rounded-[24px] bg-white/[0.03] border border-white/5 hover:border-[#86cf31]/30 transition-all relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#86cf31] opacity-0 group-hover:opacity-100 transition-all" />
                  <p className="font-bold truncate mb-1 group-hover:text-[#86cf31] transition-colors">{e.title}</p>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{e.date} • {Math.floor(e.duration / 60)}min</p>
                </button>
              ))}
              {episodes.length === 0 && <p className="text-center py-20 text-[10px] uppercase text-white/10 tracking-widest">{t.ui.empty}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
