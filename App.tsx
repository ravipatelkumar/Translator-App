
import React, { useState, useCallback, useRef, useMemo } from 'react';
import { TranslationState, LANGUAGES, VOICES, VoiceOption } from './types.ts';
import { translateText, generateSpeech } from './services/geminiService.ts';
import { decodeBase64ToUint8Array, pcmToWavBlob, decodeAudioData } from './utils/audioUtils.ts';
import { 
  Languages, 
  ArrowRightLeft, 
  Volume2, 
  Download, 
  History, 
  Settings2,
  AlertCircle,
  Loader2,
  Trash2,
  Copy,
  Check,
  Share2,
  X,
  Code,
  Activity,
  CheckCircle2,
  User,
  UserCircle
} from 'lucide-react';

type DownloadStep = 'idle' | 'preparing' | 'encoding' | 'success';

const App: React.FC = () => {
  const [state, setState] = useState<TranslationState>({
    sourceText: '',
    translatedText: '',
    sourceLang: 'auto',
    targetLang: 'es',
    isTranslating: false,
    isGeneratingAudio: false,
    error: null,
  });

  const [downloadStep, setDownloadStep] = useState<DownloadStep>('idle');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [copied, setCopied] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const filteredVoices = useMemo(() => {
    return VOICES.filter(v => v.gender === selectedGender);
  }, [selectedGender]);

  const handleGenderChange = (gender: 'male' | 'female') => {
    setSelectedGender(gender);
    const firstVoice = VOICES.find(v => v.gender === gender);
    if (firstVoice) {
      setSelectedVoice(firstVoice.name);
    }
  };

  const handleTranslate = async () => {
    if (!state.sourceText.trim()) return;

    setState(prev => ({ ...prev, isTranslating: true, error: null }));
    try {
      const translation = await translateText(state.sourceText, state.targetLang, state.sourceLang);
      setState(prev => ({ ...prev, translatedText: translation, isTranslating: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Translation failed. Please try again.', isTranslating: false }));
    }
  };

  const handleSpeak = async () => {
    if (!state.translatedText) return;

    setState(prev => ({ ...prev, isGeneratingAudio: true }));
    try {
      const base64Audio = await generateSpeech(state.translatedText, selectedVoice);
      const audioData = decodeBase64ToUint8Array(base64Audio);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioBuffer = await decodeAudioData(audioData, audioContextRef.current);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();

      setState(prev => ({ ...prev, isGeneratingAudio: false }));
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Audio generation failed.', isGeneratingAudio: false }));
    }
  };

  const handleDownload = async () => {
    if (!state.translatedText || downloadStep !== 'idle') return;

    setDownloadStep('preparing');
    setState(prev => ({ ...prev, isGeneratingAudio: true }));
    
    try {
      const base64Audio = await generateSpeech(state.translatedText, selectedVoice);
      
      setDownloadStep('encoding');
      const audioData = decodeBase64ToUint8Array(base64Audio);
      const blob = await pcmToWavBlob(audioData);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation-${new Date().getTime()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloadStep('success');
      setState(prev => ({ ...prev, isGeneratingAudio: false }));
      
      setTimeout(() => setDownloadStep('idle'), 3000);
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Download failed.', isGeneratingAudio: false }));
      setDownloadStep('idle');
    }
  };

  const swapLanguages = () => {
    if (state.sourceLang === 'auto') return;
    setState(prev => ({
      ...prev,
      sourceLang: prev.targetLang,
      targetLang: prev.sourceLang,
      sourceText: prev.translatedText,
      translatedText: prev.sourceText
    }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(state.translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const embedCode = `<iframe src="${window.location.href}" width="100%" height="600px" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></iframe>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const renderDownloadButton = () => {
    const baseStyles = "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50 min-w-[140px] justify-center";
    
    switch (downloadStep) {
      case 'preparing':
        return (
          <button disabled className={`${baseStyles} bg-slate-800 text-white`}>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing...
          </button>
        );
      case 'encoding':
        return (
          <button disabled className={`${baseStyles} bg-indigo-600 text-white`}>
            <Activity className="w-4 h-4 animate-pulse" />
            Encoding...
          </button>
        );
      case 'success':
        return (
          <button disabled className={`${baseStyles} bg-emerald-500 text-white`}>
            <CheckCircle2 className="w-4 h-4" />
            Ready!
          </button>
        );
      default:
        return (
          <button 
            onClick={handleDownload}
            disabled={!state.translatedText || state.isGeneratingAudio}
            className={`${baseStyles} bg-slate-900 text-white hover:bg-slate-800`}
          >
            <Download className="w-4 h-4" />
            Download Audio
          </button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showEmbedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEmbedModal(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">Embed Code</h2>
              </div>
              <button onClick={() => setShowEmbedModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Copy and paste this HTML code into your website to embed LinguistAI.</p>
              <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-indigo-300 break-all leading-relaxed border border-slate-800">
                {embedCode}
              </div>
              <button 
                onClick={copyEmbedCode}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {embedCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {embedCopied ? 'Copied!' : 'Copy Embed Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Languages className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">LinguistAI</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <button 
                onClick={() => setShowEmbedModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
             >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
             </button>
             <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <History className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Settings2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6 relative">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <select 
                value={state.sourceLang}
                onChange={(e) => setState(prev => ({ ...prev, sourceLang: e.target.value }))}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-indigo-600 transition-colors"
              >
                <option value="auto">Detect Language</option>
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setState(prev => ({ ...prev, sourceText: '' }))}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              placeholder="Enter text to translate..."
              value={state.sourceText}
              onChange={(e) => setState(prev => ({ ...prev, sourceText: e.target.value }))}
              className="w-full h-64 p-6 text-xl text-slate-800 outline-none resize-none placeholder:text-slate-300"
            />
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <span className="text-xs text-slate-400 font-medium">
                {state.sourceText.length} characters
              </span>
            </div>
          </div>

          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <button 
              onClick={swapLanguages}
              disabled={state.sourceLang === 'auto'}
              className="bg-white p-3 rounded-full shadow-lg border border-slate-100 hover:scale-110 active:scale-95 transition-all text-indigo-600 disabled:opacity-50 disabled:scale-100"
            >
              <ArrowRightLeft className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <select 
                value={state.targetLang}
                onChange={(e) => setState(prev => ({ ...prev, targetLang: e.target.value }))}
                className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer hover:text-indigo-600 transition-colors"
              >
                {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
              <div className="flex gap-1 md:gap-2">
                <button 
                  onClick={copyToClipboard}
                  disabled={!state.translatedText}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-30 rounded-lg hover:bg-slate-100"
                  title="Copy Translation"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setShowEmbedModal(true)}
                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-100"
                  title="Get Embed Code"
                >
                  <Code className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative flex-1">
              {state.isTranslating && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
              )}
              <div className={`w-full h-64 p-6 text-xl text-slate-800 overflow-y-auto ${!state.translatedText ? 'text-slate-300 italic' : ''}`}>
                {state.translatedText || 'Translation will appear here...'}
              </div>
            </div>
            
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1 bg-slate-200/50 rounded-xl">
                  <button
                    onClick={() => handleGenderChange('female')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      selectedGender === 'female' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Female
                  </button>
                  <button
                    onClick={() => handleGenderChange('male')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      selectedGender === 'male' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <UserCircle className="w-4 h-4" />
                    Male
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-slate-400 ml-1 mb-0.5">Voice Tone</span>
                    <select 
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 min-w-[120px]"
                    >
                      {filteredVoices.map(voice => (
                        <option key={voice.name} value={voice.name}>{voice.label}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={handleSpeak}
                    disabled={!state.translatedText || state.isGeneratingAudio}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 mt-4"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    Listen
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                {renderDownloadButton()}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center lg:justify-end">
          <button
            onClick={handleTranslate}
            disabled={state.isTranslating || !state.sourceText.trim()}
            className="w-full lg:w-auto px-12 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            {state.isTranslating ? 'Translating...' : 'Translate'}
          </button>
        </div>

        {state.error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{state.error}</p>
          </div>
        )}

        <section className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
             <div className="bg-indigo-100 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600">
               <Languages className="w-5 h-5" />
             </div>
             <h3 className="font-bold text-slate-900">100+ Languages</h3>
             <p className="text-slate-500 text-sm leading-relaxed">Translate seamlessly between global languages with high-accuracy context-aware AI models.</p>
          </div>
          <div className="space-y-3">
             <div className="bg-emerald-100 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600">
               <Volume2 className="w-5 h-5" />
             </div>
             <h3 className="font-bold text-slate-900">Neural Audio</h3>
             <p className="text-slate-500 text-sm leading-relaxed">Choose between male and female personas to generate natural-sounding speech for any translation.</p>
          </div>
          <div className="space-y-3">
             <div className="bg-amber-100 w-10 h-10 rounded-xl flex items-center justify-center text-amber-600">
               <Download className="w-5 h-5" />
             </div>
             <h3 className="font-bold text-slate-900">WAV Exports</h3>
             <p className="text-slate-500 text-sm leading-relaxed">Download your translations as high-quality audio files for offline listening or use in other projects.</p>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-slate-200 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            Powered by Gemini AI • 2024 LinguistAI
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
