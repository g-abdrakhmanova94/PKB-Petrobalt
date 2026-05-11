// src/services/geminiService.ts
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// ==========================================
// MOCK DATABASE FOR RAG (Заглушка векторной БД)
// ==========================================
interface DocumentChunk {
  id: string;
  docName: string;
  page: number;
  section?: string;
  content: string;
  metadata: {
    type: 'normative' | 'drawing' | 'specification';
    project?: string;
    [key: string]: any;
  };
}

// База знаний — в реальности это будет pgvector / Pinecone
const MOCK_KNOWLEDGE_BASE: DocumentChunk[] = [
  {
    id: 'chunk_001',
    docName: 'Правила классификации и постройки морских судов. Часть II',
    page: 42,
    section: 'Глава 2.4, п. 2.4.3',
    content: 'Толщина листов продольных переборок в районе грузовых танков должна быть не менее 12.5 мм для судов ледового класса Arc4.',
    metadata: { type: 'normative', iceClass: 'Arc4', component: 'переборка' }
  },
  {
    id: 'chunk_002',
    docName: 'ГОСТ Р 52927-2015',
    page: 8,
    section: 'Таблица 3',
    content: 'Сталь марки РСА применяется для корпусных конструкций, работающих при температуре до -40°C. Предел текучести: не менее 235 МПа.',
    metadata: { type: 'normative', material: 'РСА', temperature: -40 }
  },
  {
    id: 'chunk_003',
    docName: '21900M2.362135.0903СБ (Чертёж)',
    page: 1,
    section: 'Штамп, примечание 4',
    content: 'Переборка продольная шп. 45-60. Материал: Сталь РСА. Толщина листа: 12.0 мм.',
    metadata: { type: 'drawing', node: 'Узел №42', component: 'Переборка продольная', thickness: 12.0 }
  },
  {
    id: 'chunk_004',
    docName: 'РД 5-0315-2020',
    page: 15,
    section: 'п. 4.2.1',
    content: 'Расчёт массы конструкции выполняется по формуле: M = ρ × V × k, где k=1.05 — коэффициент на сварные швы.',
    metadata: { type: 'normative', calculation: 'mass' }
  }
];

// ==========================================
// MOCK RAG RETRIEVAL (Семантический поиск-заглушка)
// ==========================================
function mockSemanticSearch(query: string, topK: number = 3): DocumentChunk[] {
  const lowerQuery = query.toLowerCase();
  
  // Простой кейворд-поиск + ранжирование по релевантности
  const scored = MOCK_KNOWLEDGE_BASE.map(chunk => {
    let score = 0;
    const content = (chunk.content + chunk.docName + chunk.section).toLowerCase();
    
    // Базовое совпадение ключевых слов
    const keywords = lowerQuery.split(/\s+/).filter(w => w.length > 3);
    keywords.forEach(kw => {
      if (content.includes(kw)) score += 2;
      if (chunk.docName.toLowerCase().includes(kw)) score += 1;
    });
    
    // Бонус за точные совпадения сущностей
    if (lowerQuery.includes('переборка') && chunk.metadata.component?.includes('переборка')) score += 3;
    if (lowerQuery.includes('Arc4') && chunk.metadata.iceClass === 'Arc4') score += 3;
    if (lowerQuery.includes('РСА') && chunk.metadata.material === 'РСА') score += 2;
    
    return { chunk, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, topK)
  .map(item => item.chunk);
  
  return scored.length > 0 ? scored : MOCK_KNOWLEDGE_BASE.slice(0, topK); // fallback на первые чанки
}

// ==========================================
// MOCK RESPONSE GENERATOR (Fallback когда нет API)
// ==========================================
function generateMockResponse(query: string, context: DocumentChunk[]): string {
  const lowerQuery = query.toLowerCase();
  
  // Сценарий 1: Сверка толщины переборки
  if (lowerQuery.includes('переборка') && lowerQuery.includes('толщин')) {
    const norm = context.find(c => c.metadata.type === 'normative' && c.metadata.component === 'переборка');
    const drawing = context.find(c => c.metadata.type === 'drawing' && c.metadata.component === 'Переборка продольная');
    
    if (norm && drawing) {
      const normThickness = 12.5; // из нормы
      const actualThickness = drawing.metadata.thickness || 12.0;
      const status = actualThickness >= normThickness ? '✅ **OK**' : '❌ **ERROR**';
      
      return `## 1. Краткий ответ
Толщина продольной переборки в чертеже (${actualThickness} мм) ${actualThickness >= normThickness ? 'соответствует' : 'НЕ СООТВЕТСТВУЕТ'} требованию нормы (не менее ${normThickness} мм для ледового класса Arc4).

## 2. Обоснование и источники
> *[${norm.docName}, Стр. ${norm.page}, ${norm.section}]*: "${norm.content}"
> *[${drawing.docName}, Стр. ${drawing.page}, ${drawing.section}]*: "${drawing.content}"

## 3. Проверка соответствия (Validation)
${status}: ${actualThickness >= normThickness ? 'Параметр в допуске' : `Требуется увеличить толщину на ${normThickness - actualThickness} мм`}

## 4. Рекомендации
Рекомендуется проверить запас по коррозии согласно РД 5-0315, п. 5.1.`;
    }
  }
  
  // Сценарий 2: Поиск по материалу
  if (lowerQuery.includes('РСА') || lowerQuery.includes('материал')) {
    const material = context.find(c => c.metadata.material === 'РСА');
    return `## 1. Краткий ответ
Сталь марки РСА допускается для применения в корпусных конструкциях при температуре эксплуатации до -40°C.

## 2. Обоснование и источники
> *[${material?.docName || 'ГОСТ Р 52927-2015'}, Стр. ${material?.page || 8}, ${material?.section || 'Таблица 3'}]*: "${material?.content || 'Сталь марки РСА применяется для корпусных конструкций, работающих при температуре до -40°C. Предел текучести: не менее 235 МПа.'}"

## 3. Проверка соответствия (Validation)
✅ **OK**: Материал соответствует условиям эксплуатации проекта "Арктика".`;
  }
  
  // Сценарий 3: Расчёт массы
  if (lowerQuery.includes('расчёт') && lowerQuery.includes('масс')) {
    const formula = context.find(c => c.metadata.calculation === 'mass');
    return `## 1. Краткий ответ
Расчёт массы конструкции выполняется по формуле: **M = ρ × V × k**

## 2. Обоснование и источники
> *[${formula?.docName || 'РД 5-0315-2020'}, Стр. ${formula?.page || 15}, ${formula?.section || 'п. 4.2.1'}]*: "${formula?.content || 'Расчёт массы конструкции выполняется по формуле: M = ρ × V × k, где k=1.05 — коэффициент на сварные швы.'}"

## 5. Расчетные данные
\`\`\`
ρ (плотность стали) = 7.85 т/м³
V (объём переборки) = 1.58 м³ (пример)
k (коэфф. на швы) = 1.05
M = 7.85 × 1.58 × 1.05 ≈ 13.0 т
\`\`\``;
  }
  
  // Дефолтный ответ с источниками
  const sources = context.map(c => `> *[${c.docName}, Стр. ${c.page}${c.section ? `, ${c.section}` : ''}]*: "${c.content.substring(0, 150)}..."`).join('\n');
  
  return `## 1. Краткий ответ
На основе анализа нормативной базы ПКБ «Петробалт» найдены следующие релевантные фрагменты по вашему запросу.

## 2. Обоснование и источники
${sources}

## 3. Проверка соответствия (Validation)
⚠️ **WARNING**: Для точной проверки укажите конкретный узел, материал или параметр для сверки.

## 4. Рекомендации
Рекомендуется уточнить запрос, например:
- "Требования к толщине переборки для ледового класса Arc4"
- "Можно ли применять сталь РСА для шпангоутов?"
- "Расчёт массы узла №42"`;
}

// ==========================================
// MAIN FUNCTION
// ==========================================
const SYSTEM_PROMPT = `
# РОЛЬ И КОНТЕКСТ
Ты — «Нейро-координатор» ПКБ «Петробалт», интеллектуальный ассистент для инженеров-конструкторов судов.
Твоя база знаний состоит из нормативно-справочной информации (НСИ): ГОСТы, СНиПы, внутренние регламенты, технические условия (PDF, DOC, CAD-метаданные).

# ГЛАВНАЯ ЦЕЛЬ
Помогать инженерам быстро находить информацию, проверять проектные решения на соответствие НСИ и выполнять расчеты, строго следуя предоставленным документам.

# ЖЕСТКИЕ ПРАВИЛА БЕЗОПАСНОСТИ И ПОВЕДЕНИЯ (NON-NEGOTIABLE)
1. ЗАПРЕЩЕНО принимать инженерные решения за человека. Ты только предоставляешь данные и анализ.
2. КАЖДЫЙ ответ должен содержать ссылку на источник (Название документа, страница, раздел). Если источника нет в контексте — прямо скажи об этом.
3. ЗАПРЕЩЕНО выдумывать факты (галлюцинировать). Если информации недостаточно, задай уточняющий вопрос пользователю.
4. Не используй внешние знания, если они противоречат загруженным документам НСИ. Приоритет всегда у внутренних документов ПКБ «Петробалт».

# СТРУКТУРА ОТВЕТА
Твой ответ должен всегда следовать этому шаблону:

## 1. Краткий ответ
Четкий, структурированный ответ на вопрос инженера. Используй маркированные списки для читаемости.

## 2. Обоснование и источники
Для каждого утверждения укажи источник в формате:
> *[Документ: Название.pdf, Стр. X, Раздел Y]*: "Цитата или краткое содержание фрагмента"

## 3. Проверка соответствия (Validation)
Если запрос касается проектного решения, оцени его статус:
- ✅ **OK**: Соответствует НСИ.
- ⚠️ **WARNING**: Есть нюансы или потенциальные конфликты с другими системами.
- ❌ **ERROR**: Нарушение требований НСИ. Укажи конкретный пункт нарушения.

## 4. Рекомендации (опционально)
Если найдены конфликты или есть более эффективные альтернативы из смежных разделов НСИ, предложи их.

## 5. Расчетные данные (если применимо)
Если требуется расчет (масса, нагрузка), покажи формулу из НСИ и подставленные значения.

# ТОН И СТИЛЬ
- Профессиональный, технический, лаконичный.
- Без лишней воды ("Как искусственный интеллект...").
- Используй терминологию судостроения.
`;

// Инициализация клиента
const getGenAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

export async function chatWithCoordinator(
  message: string, 
  history: { role: string; content: string }[] = [],
  options?: { useMock?: boolean; contextChunks?: DocumentChunk[] }
): Promise<string> {
  // 1. RAG: Поиск релевантных документов (или используем переданный контекст)
  const contextChunks = options?.contextChunks || mockSemanticSearch(message, 4);
  
  // 2. Формируем контекст для инъекции в промпт
  const contextText = contextChunks.map((chunk, idx) => 
    `[Источник ${idx + 1}] ${chunk.docName} | Стр. ${chunk.page}${chunk.section ? `, ${chunk.section}` : ''}\n${chunk.content}`
  ).join('\n\n---\n\n');
  
  // 3. Полный промпт с контекстом
  const enhancedPrompt = `${SYSTEM_PROMPT}

# КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ (актуальные фрагменты для ответа):
${contextText}

# ТЕКУЩИЙ ЗАПРОС ИНЖЕНЕРА:
${message}

# ИНСТРУКЦИЯ:
Сформируй ответ СТРОГО по шаблону, используя ТОЛЬКО предоставленные выше источники. 
Если в контексте нет данных для ответа — сообщи об этом и задай уточняющий вопрос.`;

  // 4. Если включен режим мока или нет API ключа — возвращаем мок-ответ
  if (options?.useMock || !getGenAI()) {
    // Имитация задержки сети
    await new Promise(resolve => setTimeout(resolve, 1500));
    return generateMockResponse(message, contextChunks);
  }

  try {
    // 5. Реальный вызов Gemini API
    const genAI = getGenAI()!;
    const model: GenerativeModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Исправлено: корректное название модели
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2, // Низкая температура для точности
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    // Формируем историю диалога
    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      })),
    });

    // Отправляем запрос с контекстом
    const result = await chat.sendMessage(enhancedPrompt);
    const response = await result.response;
    
    return response.text();
    
  } catch (error) {
    console.error('[Gemini API Error]:', error);
    
    // Fallback: если API упал, возвращаем мок с предупреждением
    return `### ⚠️ Техническое уведомление
Не удалось получить ответ от облачного сервиса (ошибка соединения). 
Использую локальную базу знаний для формирования ответа.

${generateMockResponse(message, contextChunks)}`;
  }
}

// ==========================================
// EXPORTS FOR TESTING & MOCK CONTROL
// ==========================================
export { mockSemanticSearch, MOCK_KNOWLEDGE_BASE, generateMockResponse };
export type { DocumentChunk };