import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  options?: string[];
}

interface UserProfile {
  program?: string;
  level?: string;
  age?: string;
  goals?: string;
  experience?: string;
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentStep, setCurrentStep] = useState("greeting");
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useMutation({
    mutationFn: async (data: { message: string; userProfile: UserProfile; step: string }) => {
      return await apiRequest("POST", "/api/chat", data);
    },
    onSuccess: (response: any) => {
      setIsTyping(false);
      addBotMessage(response.message, response.options);
      if (response.step) {
        setCurrentStep(response.step);
      }
    },
    onError: () => {
      setIsTyping(false);
      addBotMessage("Извините, произошла ошибка. Попробуйте еще раз.");
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Начальное приветствие
      setTimeout(() => {
        addBotMessage(
          "Привет! Я ваш персональный помощник в изучении английского языка. Давайте подберем идеальную программу для вас! Какое обучение вас интересует?",
          ["Общий английский", "Бизнес-английский", "Для детей", "Подготовка к IELTS", "Индивидуальные занятия", "Разговорный клуб"]
        );
      }, 500);
    }
  }, [isOpen]);

  const addMessage = (text: string, isBot: boolean, options?: string[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isBot,
      timestamp: new Date(),
      options
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addBotMessage = (text: string, options?: string[]) => {
    addMessage(text, true, options);
  };

  const addUserMessage = (text: string) => {
    addMessage(text, false);
  };

  const handleQuickReply = (option: string) => {
    addUserMessage(option);
    handleLocalResponse(option);
  };

  const handleLocalResponse = (userInput: string) => {
    setIsTyping(true);

    setTimeout(() => {
      switch (currentStep) {
        case "greeting":
          setUserProfile(prev => ({ ...prev, program: userInput }));
          setCurrentStep("level");
          setIsTyping(false);
          addBotMessage(
            "Отличный выбор! Какой у вас уровень английского языка?",
            ["Начинающий (A1)", "Элементарный (A2)", "Средний (B1)", "Выше среднего (B2)", "Продвинутый (C1)", "Не знаю"]
          );
          break;

        case "level":
          setUserProfile(prev => ({ ...prev, level: userInput }));
          setCurrentStep("age");
          setIsTyping(false);
          addBotMessage(
            "Понятно! Укажите ваш возраст или возрастную группу:",
            ["5-12 лет", "13-17 лет", "18-25 лет", "26-35 лет", "36-45 лет", "45+ лет"]
          );
          break;

        case "age":
          setUserProfile(prev => ({ ...prev, age: userInput }));
          setCurrentStep("goals");
          setIsTyping(false);
          addBotMessage(
            "Какие у вас цели в изучении английского?",
            ["Для работы/карьеры", "Для путешествий", "Для образования", "Для общения", "Для переезда", "Просто интересно"]
          );
          break;

        case "goals":
          setUserProfile(prev => ({ ...prev, goals: userInput }));
          setCurrentStep("experience");
          setIsTyping(false);
          addBotMessage(
            "Есть ли у вас опыт изучения английского языка?",
            ["Да, изучал(а) в школе", "Да, занимался(ась) с репетитором", "Да, самостоятельно", "Нет, начинаю с нуля", "Изучал(а) давно, забыл(а)"]
          );
          break;

        case "experience":
          const finalProfile = { ...userProfile, experience: userInput };
          setUserProfile(finalProfile);
          setCurrentStep("ai_mode");
          setIsTyping(false);
          addBotMessage(
            `Отлично! Теперь я знаю о вас достаточно. Вам подойдет программа "${finalProfile.program}" для уровня "${finalProfile.level}". У вас есть вопросы о наших курсах? Я помогу вам с выбором!`
          );
          break;

        case "ai_mode":
          // Отправляем запрос к OpenAI с контекстом пользователя
          sendMessage.mutate({
            message: userInput,
            userProfile,
            step: currentStep
          });
          break;
      }
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    addUserMessage(inputText);
    
    if (currentStep === "ai_mode") {
      setIsTyping(true);
      sendMessage.mutate({
        message: inputText,
        userProfile,
        step: currentStep
      });
    } else {
      handleLocalResponse(inputText);
    }
    
    setInputText("");
  };

  const openContactForm = () => {
    const contactSection = document.getElementById('contact');
    contactSection?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-20 z-40 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Чат с AI помощником"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comments'} text-lg`}></i>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 500 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
          >
            {/* Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <i className="fas fa-robot text-sm"></i>
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Помощник</h3>
                    <p className="text-xs opacity-90">Подбор программ обучения</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.isBot 
                      ? 'bg-gray-100 text-gray-800' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    <p className="text-sm">{message.text}</p>
                    
                    {/* Quick Reply Options */}
                    {message.isBot && message.options && (
                      <div className="mt-3 space-y-2">
                        {message.options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuickReply(option)}
                            className="block w-full text-left text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 p-4">
              {currentStep === "ai_mode" && (
                <div className="mb-2 flex space-x-2">
                  <button
                    onClick={openContactForm}
                    className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                  >
                    Записаться на урок
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Напишите ваш вопрос..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <i className="fas fa-paper-plane text-sm"></i>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}