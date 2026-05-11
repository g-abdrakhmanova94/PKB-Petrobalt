import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  FileText, 
  History, 
  ShieldCheck, 
  AlertTriangle, 
  XOctagon, 
  Settings, 
  Plus, 
  Ship,
  Search,
  BookOpen,
  Menu,
  X,
  MessageSquare,
  Library,
  BarChart2,
  Database,
  ChevronRight,
  Info
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "motion/react";
import { cn } from "./lib/utils";
import { chatWithCoordinator } from "./services/geminiService";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type UserRole = "ENGINEER" | "KNOWLEDGE_ADMIN" | "SYSTEM_ADMIN";

interface User {
  name: string;
  role: UserRole;
  project: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  status: "synced" | "processing" | "error";
  description?: string;
  updatedAt: string;
}

const CURRENT_DATE = "2026-05-11";

const MOCK_DOCS: Document[] = [
  { id: "1", name: "Правила классификации и постройки морских судов. Часть II", type: "Правила РС", status: "synced", description: "Изд. 2023, Глава 2.4", updatedAt: CURRENT_DATE },
  { id: "2", name: "ГОСТ Р 52927-2015", type: "ГОСТ", status: "synced", description: "Прокат для судостроения из стали нормальной прочности", updatedAt: CURRENT_DATE },
  { id: "3", name: "СП 55.13330.2016", type: "СНиП", status: "processing", description: "Дома жилые одноквартирные", updatedAt: CURRENT_DATE },
];

const MOCK_LIBRARY = [
  { id: 'l1', name: 'Регистр_ПП_Ч2.pdf', pages: 142, status: 'OCR OK', date: CURRENT_DATE },
  { id: 'l2', name: 'ГОСТ_Р_52927.pdf', pages: 45, status: 'OCR OK', date: CURRENT_DATE },
  { id: 'l3', name: 'РД_5_0315.pdf', pages: 88, status: 'SYNCED', date: CURRENT_DATE },
  { id: 'l4', name: 'СП_55_13330.pdf', pages: 210, status: 'PROCESSING', date: CURRENT_DATE },
];

const MOCK_CAD_DATA = [
   { id: 'c1', node: 'Узел №42', component: 'Переборка продольная', material: 'Сталь РСА', weight: '12.4 т', status: 'Verified' },
   { id: 'c2', node: 'Узел №60', component: 'Фундамент ГД', material: 'Сталь РСВ', weight: '45.1 т', status: 'Pending' },
   { id: 'c3', node: 'Узел №12', component: 'Шпангоут рамный', material: 'Сталь РСА', weight: '8.2 т', status: 'Error' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedModel, setSelectedModel] = useState("Gemini 1.5 Pro (Precision)");
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUserListModalOpen, setIsUserListModalOpen] = useState(false);
  const INITIAL_MESSAGES: Message[] = [
    {
      id: "1",
      role: "assistant",
      content: "## 1. Краткий ответ\n\nДобро пожаловать, инженер. Я — «Нейро-координатор» ПКБ «Петробалт». Готов помочь вам в поиске информации по НСИ, проверке проектных решений и выполнении технических расчетов.\n\nЗадайте вопрос или укажите узел для проверки.",
      timestamp: new Date(),
    }
  ];

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const NAV_ITEMS = [
    { id: "chat", icon: MessageSquare, label: "Текущий расчет", roles: ["ENGINEER", "KNOWLEDGE_ADMIN", "SYSTEM_ADMIN"] },
    { id: "library", icon: Library, label: "Библиотека НСИ", roles: ["ENGINEER", "KNOWLEDGE_ADMIN"] },
    { id: "monitoring", icon: BarChart2, label: "Мониторинг веса", roles: ["ENGINEER", "SYSTEM_ADMIN"] },
    { id: "cad", icon: Database, label: "База CAD-метаданных", roles: ["ENGINEER", "KNOWLEDGE_ADMIN"] },
    { id: "settings", icon: Settings, label: "Настройки", roles: ["SYSTEM_ADMIN", "KNOWLEDGE_ADMIN", "ENGINEER"] },
  ];

  const handleLogin = (role: UserRole) => {
    const roles: Record<UserRole, string> = {
      ENGINEER: "Иванов А.В.",
      KNOWLEDGE_ADMIN: "Смирнова Е.Н.",
      SYSTEM_ADMIN: "Петров С.С."
    };
    setUser({
      name: roles[role],
      role: role,
      project: "Проект 22220 \"Арктика\""
    });
    setMessages(INITIAL_MESSAGES);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'chat' && user) {
      scrollToBottom();
    }
  }, [messages, activeTab, user]);

  if (!user) {
    return (
      <div className="h-screen w-screen bg-sleek-bg flex items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-2xl border border-sleek-border shadow-2xl max-w-sm w-full text-center"
        >
          <Ship size={64} className="text-sleek-accent mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-sleek-nav mb-2 uppercase tracking-widest">ПЕТРОБАЛТ</h1>
          <p className="text-sleek-text-muted text-sm mb-8 uppercase tracking-tighter">Нейро-координатор v2.4</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => handleLogin("ENGINEER")}
              className="w-full py-3 bg-sleek-nav text-white rounded-xl hover:bg-sleek-nav/90 transition-all font-semibold text-sm"
            >
              Вход: Инженер-конструктор
            </button>
            <button 
              onClick={() => handleLogin("KNOWLEDGE_ADMIN")}
              className="w-full py-3 border border-sleek-nav text-sleek-nav rounded-xl hover:bg-sleek-bg transition-all font-semibold text-sm"
            >
              Вход: Администратор знаний
            </button>
            <button 
              onClick={() => handleLogin("SYSTEM_ADMIN")}
              className="w-full py-3 border border-sleek-accent text-sleek-accent rounded-xl hover:bg-sleek-accent/5 transition-all font-semibold text-sm"
            >
              Вход: Системный администратор
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await chatWithCoordinator(inputValue, history);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response || "Ошибка связи с сервером.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "### ❌ Ошибка\nНе удалось получить ответ от нейро-координатора. Проверьте API ключ в настройках.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <>
            {/* Chat Section */}
            <section className="flex-1 bg-sleek-panel rounded-xl border border-sleek-border shadow-sm flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {messages.map((message) => (
                  <div key={message.id} className="flex flex-col">
                    {message.role === 'user' ? (
                      <div className="bg-sleek-bg p-4 rounded-xl border-l-4 border-sleek-accent mb-6 text-sm leading-relaxed max-w-[90%] self-start">
                        {message.content}
                      </div>
                    ) : (
                      <div className="ai-response text-sm leading-relaxed">
                        <ReactMarkdown
                          components={{
                            blockquote: ({ children }) => (
                              <div className="bg-sleek-source-bg border border-sleek-source-border rounded-md p-3 my-2 text-[13px] italic">
                                {children}
                              </div>
                            ),
                            h2: ({ children }) => (
                              <h2 className="font-bold text-[15px] mb-2 mt-6 text-sleek-text-main flex items-center gap-2 first:mt-0">
                                {children}
                              </h2>
                            ),
                            p: ({ children }) => {
                              const text = React.Children.toArray(children).join("");
                              if (text.includes("✅ OK")) {
                                return <span className="inline-flex px-3 py-1 rounded bg-sleek-validation-ok-bg text-sleek-validation-ok-text border border-sleek-validation-ok-border font-bold text-xs mb-3">✅ OK: Соответствует НСИ</span>;
                              }
                              if (text.includes("⚠️ WARNING")) {
                                return <span className="inline-flex px-3 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs mb-3">⚠️ WARNING: Есть нюансы</span>;
                              }
                              if (text.includes("❌ ERROR")) {
                                return <span className="inline-flex px-3 py-1 rounded bg-red-100 text-red-800 border border-red-200 font-bold text-xs mb-3">❌ ERROR: Нарушение требований</span>;
                              }
                              return <p className="mb-4 last:mb-0">{children}</p>;
                            },
                            code: ({ children }) => (
                              <div className="bg-sleek-formula-bg rounded-lg p-4 font-mono text-sm text-[#334155] my-4 overflow-x-auto whitespace-pre">
                                {children}
                              </div>
                            )
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-center gap-3 text-sleek-text-muted animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-sleek-bg border border-sleek-border flex items-center justify-center">
                      <Ship size={16} />
                    </div>
                    <span className="text-xs font-medium italic">Нейро-координатор выполняет поиск в НСИ...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-5 border-t border-sleek-border flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Задайте вопрос по проекту или нормативной базе..."
                  className="flex-1 bg-sleek-bg border border-sleek-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sleek-accent/50 transition-all text-sleek-text-main"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-sleek-accent hover:bg-sleek-accent-hover text-white px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                >
                  Отправить
                </button>
              </div>
            </section>

            {/* Inspector Section */}
            <aside className="hidden lg:flex w-80 bg-sleek-panel rounded-xl border border-sleek-border flex-col overflow-hidden shadow-sm">
              <div className="p-4 border-b border-sleek-border font-bold text-sm bg-sleek-bg/30">
                Контекстные документы
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {MOCK_DOCS.map((doc) => (
                  <div key={doc.id} className="p-4 border-b border-sleek-border last:border-b-0 hover:bg-sleek-bg/50 transition-colors cursor-pointer group">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-sleek-text-muted mb-1 group-hover:text-sleek-accent transition-colors">
                      {doc.type}
                    </div>
                    <div className="text-[13px] font-bold mb-1 leading-tight">{doc.name}</div>
                    <div className="text-[11px] text-sleek-text-muted">{doc.description}</div>
                  </div>
                ))}

                <div className="p-4 mt-4 bg-sleek-bg/50 border-t border-sleek-border">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-sleek-text-muted uppercase tracking-widest mb-3">
                    <Info size={14} className="text-sleek-accent" />
                    OCR Статус
                  </div>
                  <p className="text-[12px] text-sleek-text-main leading-relaxed">
                    Обработано 124 страницы PDF.<br />
                    Ошибок распознавания: 0.<br />
                    Точность данных: <span className="text-sleek-status-text font-bold">Высокая</span>.
                  </p>
                </div>
              </div>
            </aside>
          </>
        );
      case 'library':
        return (
          <div className="flex-1 bg-sleek-panel rounded-xl border border-sleek-border shadow-sm flex flex-col overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wider text-sleek-text-main">
                <Library className="text-sleek-accent" /> Библиотека НСИ (ГОСТ, РД, СП)
              </h2>
              {user.role === 'KNOWLEDGE_ADMIN' && (
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-sleek-accent hover:bg-sleek-accent-hover text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md group"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                  Загрузить документ
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-sleek-border bg-sleek-bg/30">
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Наименование документа</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Тип</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Стр.</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Статус обработки</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Дата обновления</th>
                    {user.role === 'KNOWLEDGE_ADMIN' && <th className="p-4 font-bold uppercase tracking-tighter text-xs">Действия</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sleek-border">
                  {MOCK_LIBRARY.map(doc => (
                    <tr key={doc.id} className="hover:bg-sleek-bg/30 transition-colors">
                      <td className="p-4 font-medium">{doc.name}</td>
                      <td className="p-4"><span className="text-[10px] px-2 py-0.5 rounded bg-sleek-bg border border-sleek-border">PDF</span></td>
                      <td className="p-4 text-sleek-text-muted">{doc.pages}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold",
                          doc.status === 'OCR OK' || doc.status === 'SYNCED' ? "bg-sleek-status-bg text-sleek-status-text" : "bg-amber-100 text-amber-700"
                        )}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="p-4 text-sleek-text-muted font-mono">{doc.date}</td>
                      {user.role === 'KNOWLEDGE_ADMIN' && (
                        <td className="p-4">
                          <button 
                            onClick={() => console.log(`Запущен повторный OCR для ${doc.name}`)}
                            className="text-[10px] font-bold text-sleek-accent hover:underline uppercase"
                          >
                            Повторный OCR
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {user.role === 'KNOWLEDGE_ADMIN' && (
              <div className="mt-6 flex gap-4">
                <div className="p-4 bg-sleek-bg rounded-lg border border-sleek-border flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-sleek-text-muted mb-2">Очередь обработки</p>
                  <div className="h-1 bg-sleek-border rounded-full overflow-hidden">
                    <div className="h-full bg-sleek-accent w-2/3" />
                  </div>
                  <p className="text-[11px] mt-2 italic text-sleek-text-muted">67% страниц распознано (12/18 листов)</p>
                </div>
              </div>
            )}
            <div className="mt-auto pt-6 text-[11px] text-sleek-text-muted italic border-t border-sleek-border">
              * Всего в базе: ~4500 документов. Поиск по чанкам с использованием RAG.
            </div>
          </div>
        );
      case 'monitoring':
        return (
          <div className="flex-1 bg-sleek-panel rounded-xl border border-sleek-border shadow-sm flex flex-col overflow-hidden p-6">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 uppercase tracking-wider text-sleek-text-main">
              <BarChart2 className="text-sleek-accent" /> Мониторинг веса и нагрузок
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-sleek-bg rounded-lg border border-sleek-border">
                <p className="text-[10px] uppercase text-sleek-text-muted font-bold tracking-widest mb-1">Общий вес конструкций</p>
                <p className="text-2xl font-bold text-sleek-text-main">1,245.8 т</p>
                <p className="text-[10px] text-sleek-status-text mt-1">▲ 0.5% от расчетного</p>
              </div>
              <div className="p-4 bg-sleek-bg rounded-lg border border-sleek-border">
                <p className="text-[10px] uppercase text-sleek-text-muted font-bold tracking-widest mb-1">Центр тяжести (LCG)</p>
                <p className="text-2xl font-bold text-sleek-text-main">45.23 м</p>
                <p className="text-[10px] text-sleek-text-muted mt-1">Норма (от миделя)</p>
              </div>
              <div className="p-4 bg-sleek-bg rounded-lg border border-sleek-border">
                <p className="text-[10px] uppercase text-sleek-text-muted font-bold tracking-widest mb-1">Запас плавучести</p>
                <p className="text-2xl font-bold text-sleek-status-text">92.4%</p>
                <p className="text-[10px] text-sleek-text-muted mt-1">Статус: ✅ Оптимально</p>
              </div>
            </div>
            {user.role === 'SYSTEM_ADMIN' ? (
              <div className="flex items-center justify-center border-2 border-dashed border-sleek-border rounded-xl h-64 bg-slate-50">
                 <div className="text-center">
                    <History size={32} className="mx-auto text-sleek-accent mb-4" />
                    <h4 className="font-bold mb-2">Журнал аналитики системы</h4>
                    <p className="text-xs text-sleek-text-muted max-w-sm">Среднее время ответа (RAG): 2.4 сек | Доля ответов с источниками: 92.4%</p>
                 </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-sleek-border rounded-xl">
                <p className="text-sm text-sleek-text-muted text-center max-w-sm">
                  Интеграция с расчетным модулем. Выполняет автоматический перерасчет при изменении CAD-метаданных.
                </p>
              </div>
            )}
          </div>
        );
      case 'cad':
        return (
          <div className="flex-1 bg-sleek-panel rounded-xl border border-sleek-border shadow-sm flex flex-col overflow-hidden p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2 uppercase tracking-wider text-sleek-text-main">
                <Database className="text-sleek-accent" /> База CAD-метаданных (ИС Меридиан)
              </h2>
              {user.role === 'ENGINEER' && (
                <button 
                   onClick={() => console.log("Поиск расхождений запущен...")}
                   className="bg-sleek-accent hover:bg-sleek-accent-hover text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Сверка с НСИ
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-sleek-border bg-sleek-bg/30">
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Узел/Секция</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Компонент</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Материал</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Масса</th>
                    <th className="p-4 font-bold uppercase tracking-tighter text-xs">Статус</th>
                    {user.role === 'ENGINEER' && <th className="p-4 font-bold uppercase tracking-tighter text-xs">Функции</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sleek-border">
                  {MOCK_CAD_DATA.map(item => (
                    <tr key={item.id} className="hover:bg-sleek-bg/30 transition-colors">
                      <td className="p-4 font-bold">{item.node}</td>
                      <td className="p-4 text-sleek-text-muted">{item.component}</td>
                      <td className="p-4 font-mono text-xs">{item.material}</td>
                      <td className="p-4 font-bold">{item.weight}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold border",
                          item.status === 'Verified' ? "bg-sleek-validation-ok-bg text-sleek-validation-ok-text border-sleek-validation-ok-border" : 
                          item.status === 'Pending' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {item.status}
                        </span>
                      </td>
                      {user.role === 'ENGINEER' && (
                        <td className="p-4">
                           <button 
                             onClick={() => console.log("Извлечение параметров чертежа...")}
                             className="text-[10px] font-bold text-sleek-accent hover:underline uppercase"
                           >
                             Извлечь
                           </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {user.role === 'ENGINEER' && (
              <div className="mt-6 p-4 bg-sleek-bg border border-sleek-border rounded-xl">
                 <div className="flex items-center gap-2 text-[11px] font-bold text-sleek-nav uppercase mb-3 tracking-widest">
                   <ChevronRight size={14} className="text-sleek-accent" /> Резюме: Сверка документов
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border border-sleek-border">
                       <p className="text-[10px] font-bold text-sleek-status-text uppercase mb-1">Требование нормы</p>
                       <p className="text-xs">Толщина продольной переборки шп. 45-60: не менее 12.5мм</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-sleek-border">
                       <p className="text-[10px] font-bold text-sleek-text-muted uppercase mb-1">Данные чертежа</p>
                       <p className="text-xs">Лист 12.0мм (черт. 21900M2.362135.0903СБ)</p>
                       <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">✖ ОБНАРУЖЕНО РАСХОЖДЕНИЕ</p>
                    </div>
                 </div>
              </div>
            )}
          </div>
        );
      case 'settings':
        return (
          <div className="flex-1 bg-sleek-panel rounded-xl border border-sleek-border shadow-sm flex flex-col overflow-hidden p-6 max-w-2xl mx-auto w-full mt-10">
            <h2 className="text-lg font-bold mb-8 flex items-center gap-2 uppercase tracking-wider text-sleek-text-main">
              <Settings className="text-sleek-accent" /> Настройки системы
            </h2>
            <div className="space-y-6">
              {/* LLM Setting */}
              <div className="flex items-center justify-between p-4 bg-sleek-bg rounded-lg border border-sleek-border">
                <div>
                  <p className="text-sm font-bold">Используемая LLM</p>
                  <p className="text-xs text-sleek-text-muted">{selectedModel}</p>
                </div>
                <button 
                  onClick={() => setIsModelModalOpen(true)}
                  className="text-xs font-bold text-sleek-accent border border-sleek-accent px-4 py-2 rounded-lg hover:bg-sleek-accent/10 transition-colors"
                >
                  Изменить
                </button>
              </div>

              {/* Roles Logic Section */}
              {user.role === 'SYSTEM_ADMIN' && (
                <div className="flex items-center justify-between p-4 bg-sleek-bg rounded-lg border border-sleek-border">
                  <div>
                    <p className="text-sm font-bold">Управление пользователями</p>
                    <p className="text-xs text-sleek-text-muted">Активно сотрудников: 124</p>
                  </div>
                  <button 
                    onClick={() => setIsUserListModalOpen(true)}
                    className="text-xs font-bold text-sleek-accent border border-sleek-accent px-4 py-2 rounded-lg hover:bg-sleek-accent/10 transition-colors"
                  >
                    Список
                  </button>
                </div>
              )}

              {/* Common System Info */}
              <div className="flex items-center justify-between p-4 bg-sleek-bg rounded-lg border border-sleek-border">
                <div>
                  <p className="text-sm font-bold">Интеграция с ИС Меридиан</p>
                  <p className="text-xs text-sleek-status-text font-bold">Подключено (API v2.4)</p>
                </div>
                <button 
                  disabled={user.role !== 'SYSTEM_ADMIN'}
                  className="text-xs font-bold text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-30"
                >
                  Отключить
                </button>
              </div>

              {user.role === 'KNOWLEDGE_ADMIN' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} /> Журнал ошибок
                  </h4>
                  <ul className="text-[11px] text-amber-700 space-y-1">
                    <li>• [10:45] ГОСТ_Р_52927: Ошибка парсинга таблицы на стр. 12</li>
                    <li>• [09:12] Регистр_ПП: Низкое качество OCR (deskew failed)</li>
                  </ul>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                  <strong>Версия: 1.0 (Build 2026.05.11)</strong><br />
                  Нейро-координатор ПКБ «Петробалт». Активная роль: {user.role === 'ENGINEER' ? 'Инженер' : user.role === 'KNOWLEDGE_ADMIN' ? 'Админ знаний' : 'Системный админ'}.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-sleek-bg overflow-hidden flex-col md:flex-row font-sans text-sleek-text-main">
      {/* Sidebar */}
      <aside className={cn(
        "bg-sleek-nav text-white flex flex-col transition-all duration-300 z-30 w-64 shrink-0",
        !isSidebarOpen && "-ml-64 md:ml-0 md:w-20"
      )}>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Ship size={24} className="text-sleek-accent" />
            <div className={cn("overflow-hidden transition-opacity", isSidebarOpen ? "opacity-100" : "opacity-0 md:hidden whitespace-nowrap")}>
              <h1 className="font-bold text-lg tracking-wider text-sleek-accent uppercase">ПЕТРОБАЛТ</h1>
              <p className="text-[10px] opacity-60 uppercase tracking-tighter">Нейро-координатор v2.4</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 mt-5 space-y-1">
          {NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user.role)).map((item) => (
            <div 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 cursor-pointer transition-colors text-sm",
                activeTab === item.id ? "bg-sleek-accent-hover text-white" : "hover:bg-white/5 text-white/70 hover:text-white",
                !isSidebarOpen && "md:justify-center px-0"
              )}
            >
              <item.icon size={18} />
              <span className={cn("transition-opacity", isSidebarOpen ? "opacity-100" : "opacity-0 md:hidden")}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className={cn("mt-auto p-6 text-[11px] opacity-70 border-t border-white/10 leading-relaxed bg-white/5", !isSidebarOpen && "md:hidden")}>
          <div className="flex flex-col gap-1">
            <p className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {user.name}
            </p>
            <p className="text-[10px] opacity-60 uppercase tracking-tighter">
              {user.role === 'ENGINEER' ? 'Инженер-конструктор' : 
               user.role === 'KNOWLEDGE_ADMIN' ? 'Администратор знаний' : 
               'Системный администратор'}
            </p>
            <p className="mt-2 text-white/40">{user.project}</p>
          </div>
          <button 
            onClick={() => {
              setUser(null);
              setMessages(INITIAL_MESSAGES);
            }}
            className="mt-4 text-white/50 hover:text-white transition-colors underline flex items-center gap-1"
          >
            <X size={10} /> Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-sleek-header border-b border-sleek-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden text-sleek-text-muted hover:text-sleek-text-main"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center text-sm text-sleek-text-muted truncate">
              <span>Проекты</span>
              <ChevronRight size={14} className="mx-2" />
              <span>Корпусные конструкции</span>
              <ChevronRight size={14} className="mx-2" />
              <span className="font-semibold text-sleek-text-main">Проверка переборки</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-sleek-status-bg text-sleek-status-text rounded-full text-xs font-bold ring-1 ring-sleek-status-text/10">
            <div className="w-2 h-2 bg-sleek-status-text rounded-full animate-pulse" />
            БАЗА ЗНАНИЙ ОБНОВЛЕНА
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex p-5 gap-5 overflow-hidden">
          {renderContent()}
        </div>

        {/* --- Modals Portal --- */}
        
        {/* User List Modal */}
        {isUserListModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden border border-sleek-border shadow-2xl"
            >
              <div className="p-6 border-b border-sleek-border flex justify-between items-center bg-sleek-bg/30">
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                   <ShieldCheck size={18} className="text-sleek-accent" /> Список пользователей
                </h3>
                <button onClick={() => setIsUserListModalOpen(false)} className="hover:text-sleek-accent transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-sleek-border bg-sleek-bg/30">
                        <th className="p-4 font-bold uppercase tracking-tighter text-xs">Имя</th>
                        <th className="p-4 font-bold uppercase tracking-tighter text-xs">Роль</th>
                        <th className="p-4 font-bold uppercase tracking-tighter text-xs">Статус</th>
                        <th className="p-4 font-bold uppercase tracking-tighter text-xs">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sleek-border">
                      {[
                        { name: "Иванов А.В.", role: "ENGINEER", status: "Active" },
                        { name: "Смирнова Е.Н.", role: "KNOWLEDGE_ADMIN", status: "Active" },
                        { name: "Петров С.С.", role: "SYSTEM_ADMIN", status: "Active" },
                        { name: "Сидоров И.И.", role: "ENGINEER", status: "Inactive" }
                      ].map((u, i) => (
                        <tr key={i} className="hover:bg-sleek-bg/30 transition-colors">
                          <td className="p-4 font-medium">{u.name}</td>
                          <td className="p-4 text-xs font-mono">{u.role}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold uppercase",
                              u.status === 'Active' ? "bg-sleek-status-bg text-sleek-status-text" : "bg-red-50 text-red-700"
                            )}>
                              {u.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <button 
                              onClick={() => {
                                alert(`Редактирование пользователя: ${u.name}`);
                                setIsUserListModalOpen(false);
                              }}
                              className="text-[10px] font-bold text-sleek-accent hover:underline uppercase"
                            >
                              Править
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden border border-sleek-border shadow-2xl"
            >
              <div className="p-6 border-b border-sleek-border flex justify-between items-center bg-sleek-bg/30">
                <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                   <Plus size={18} className="text-sleek-accent" /> Загрузка инженерного документа
                </h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="hover:text-sleek-accent transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-6">
                <div className="border-2 border-dashed border-sleek-border rounded-xl p-10 text-center hover:border-sleek-accent transition-colors cursor-pointer bg-sleek-bg/20 group">
                  <Plus size={32} className="mx-auto mb-4 text-sleek-text-muted group-hover:text-sleek-accent transition-colors" />
                  <p className="text-sm font-medium">Перетащите PDF или выберите файл</p>
                  <p className="text-[10px] text-sleek-text-muted mt-2">Поддерживаются: PDF, Скан (OCR), Чертёж, Спецификация</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-sleek-text-muted uppercase mb-1 block">Тип документа</label>
                    <select className="w-full bg-sleek-bg border border-sleek-border rounded-lg px-4 py-2 text-sm focus:outline-none">
                      <option>Нормативный документ (PDF)</option>
                      <option>Архивный скан (OCR)</option>
                      <option>Чертёж</option>
                      <option>Спецификация</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      console.log("Upload started");
                    }}
                    className="flex-1 bg-sleek-accent text-white py-3 rounded-xl font-bold text-sm hover:bg-sleek-accent-hover transition-all"
                  >
                    Начать загрузку и OCR
                  </button>
                  <button 
                     onClick={() => setIsUploadModalOpen(false)}
                     className="px-6 py-3 border border-sleek-border rounded-xl text-sm font-bold hover:bg-sleek-bg"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* LLM Selection Modal */}
        {isModelModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden border border-sleek-border shadow-2xl"
            >
              <div className="p-6 border-b border-sleek-border flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase tracking-wider">Выбор модели (LLM)</h3>
                <button onClick={() => setIsModelModalOpen(false)} className="hover:text-sleek-accent transition-colors"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { id: '1', name: 'Gemini 1.5 Pro (Precision)', desc: 'Высокая точность поиска' },
                  { id: '2', name: 'Gemini 1.5 Flash (Speed)', desc: 'Быстрые ответы' },
                  { id: '3', name: 'GigaChat Pro (Local Fallback)', desc: 'Локальная альтернатива' }
                ].map(model => (
                  <div 
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.name);
                      setIsModelModalOpen(false);
                    }}
                    className={cn(
                      "p-4 rounded-xl cursor-pointer border transition-all",
                      selectedModel === model.name ? "border-sleek-accent bg-sleek-bg/50" : "border-transparent hover:bg-sleek-bg"
                    )}
                  >
                    <p className="text-sm font-bold">{model.name}</p>
                    <p className="text-[11px] text-sleek-text-muted">{model.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
