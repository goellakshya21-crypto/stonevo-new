import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, MessageSquare, X, ArrowRight, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logActivity } from '../utils/activityTracker';

const ChatAssistant = ({ marbles, onStoneClick, onVisualizeRequest }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [suggestedStones, setSuggestedStones] = useState([]);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Stone context for AI
    const stoneContext = marbles.map(m => ({
        id: m.id,
        name: m.name,
        application: m.physical_properties?.application || 'Unknown',
        color: m.physical_properties?.color || 'Unknown',
        pattern: m.physical_properties?.pattern || 'No',
        brightness: m.physical_properties?.brightness || 'N/A',
        desc: m.description,
        tags: m.tags || []
    }));

    // Auto-scroll into view on expansion
    useEffect(() => {
        if (isExpanded && containerRef.current) {
            // Wait for a brief moment for layout to stabilize
            setTimeout(() => {
                containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [isExpanded]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);
        setIsExpanded(true);

        // Log AI Query for Lead tracking
        logActivity('ai_query', { query: userMsg });

        try {
            // Prepare conversation history
            const history = messages.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

            const prompt = `You are the Stonevo Archivist & Curator. Your goal is to showcase the beauty and architectural significance of natural stones. 
            This is NOT a sales site. You are an educator and curator.
            
            Inventory Context: ${JSON.stringify(stoneContext)}

            Conversation History:
            ${history}
            
            Instructions:
            1. Describe stones with architectural depth (veining, mineral composition, aesthetic mood).
            2. Match the user's query against the "desc", "tags", "color", "application", "pattern", and "brightness" in the inventory.
            3. Never use sales language.
            4. KEEP IT CONCISE: 2 to 3 lines max (~40 words), unless the user explicitly asks for a paragraph.
            5. FUNNEL INTEGRATION: If the user asks about pricing, quality, comparisons, or how to purchase, elegantly recommend they "Book a Stone Audit". Frame the Stone Audit as the smartest next step for risk mitigation, quality verification, and price benchmarking (starting at ₹5k) before making large purchases. Let them know they can navigate to "Audit & Advisory" via the navigation links.
            6. Use the Conversation History to understand follow-up questions.
             5. Return your response in this EXACT JSON format:
                {
                  "text": "Your concise architectural description here...",
                  "suggestedStoneNames": ["Exact Name 1", "Exact Name 2", "Exact Name 3"],
                  "visualization": {
                    "request": true, 
                    "stoneName": "Exact Name", 
                    "roomType": "Kitchen/Bathroom/Living Room/Bedroom/Lobby",
                    "roomStyle": "Classical/Modern/Contemporary/Minimalist/Neo Classical/Modern Classical/Industrial/Scandinavian/Mediterranean/Art Deco/Sustainable / Green"
                  }
                }
             6. Set "visualization.request" to true ONLY if the user explicitly asks to see, visualize, or show a stone in a room. 
             7. Map the roomStyle to one of the exact architectural styles listed above. Use "Modern" as default if style is unclear.
             8. Map the roomType to one of the exact types listed above. Use "Kitchen" as default if type is unclear.
             9. Extact the intended Application (e.g. "Counter Top", "Flooring", "Wall Cladding", "Facade") from the user's message.
             10. IMPORTANT: Suggest as many relevant matches as possible (up to 8) if the user's query is broad (e.g., "blue stones").
             
             Current User Query: "${userMsg}"`;

            // Call our new backend Vertex AI endpoint
            const response = await fetch('/api/gemini-vertex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: prompt, // sending the full prompt here
                    history: messages.slice(-10),
                    model: 'gemini-2.5-flash'
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server error: ${response.status}`);
            }

            const vertexData = await response.json();
            const responseText = vertexData.text;

            // Robust JSON extraction
            let cleanedJson = responseText.trim();
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                cleanedJson = jsonMatch[0];
            }

            if (!cleanedJson) throw new Error("No JSON found in AI response");
            const data = JSON.parse(cleanedJson);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.text,
                stones: (data.suggestedStoneNames || []).map(name =>
                    marbles.find(m => m.name.toLowerCase().trim() === name.toLowerCase().trim())
                ).filter(Boolean)
            }]);

            // Handle Visualization Intent
            if (data.visualization?.request && onVisualizeRequest) {
                
                // More robust stone matching: check name, then check if stoneName is IN the name
                let stone = marbles.find(m => 
                    m.name.toLowerCase().trim() === data.visualization.stoneName?.toLowerCase().trim()
                );
                
                if (!stone && data.visualization.stoneName) {
                    const searchName = data.visualization.stoneName.toLowerCase().trim();
                    stone = marbles.find(m => m.name.toLowerCase().includes(searchName));
                }

                if (stone) {
                    onVisualizeRequest({
                        stone: {
                            name: stone.name,
                            type: stone.physical_properties?.marble || stone.physical_properties?.type || stone.type || 'Natural Stone',
                            image_url: stone.imageUrl || stone.image_url,
                            application: stone.physical_properties?.application || []
                        },
                        roomType: data.visualization.roomType,
                        roomStyle: data.visualization.roomStyle,
                        intendedApplication: data.visualization.application // new field
                    });
                } else {
                    console.warn("[Chatbot] Stone NOT matched in inventory:", data.visualization.stoneName);
                }
            }
        } catch (error) {
            console.error("Chatbot AI Error:", error);
            let errorMessage = "I'm having trouble retrieving the archives at the moment. Please explore the gallery below.";

            if (error.message.includes("API Key")) {
                errorMessage = "The Archivist is currently offline (Missing API Key). Please notify the administrator.";
            } else if (marbles.length === 0) {
                errorMessage = "I'm still organizing the collection. Give me a moment to load the archives and try again.";
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessage
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div ref={containerRef} className="w-full max-w-2xl mx-auto px-4 mb-12 relative z-[60]">
            {/* The Main Search Bar */}
            <motion.div
                layout
                initial={false}
                animate={{
                    boxShadow: isExpanded ? '0 30px 60px -12px rgba(6, 78, 59, 0.15)' : '0 4px 20px -5px rgba(163, 125, 75, 0.1)'
                }}
                transition={{
                    layout: {
                        type: "spring",
                        stiffness: 180,
                        damping: 24,
                        mass: 0.9
                    }
                }}
                style={{ height: isExpanded ? 500 : 'auto' }}
                className="glass-panel rounded-2xl overflow-hidden flex flex-col shadow-[0_30px_100px_rgba(0,0,0,0.6)]"
            >
                {/* Chat History */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-black/20"
                            ref={scrollRef}
                        >
                            {messages.length === 0 && (
                                <div className="text-center py-20">
                                    <div className="w-12 h-12 bg-bronze/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Sparkles className="text-bronze" size={24} strokeWidth={1.5} />
                                    </div>
                                    <p className="text-bronze text-[10px] font-bold tracking-[0.3em] uppercase mb-3 font-display">Stonevo Concierge</p>
                                    <h3 className="text-luxury-cream text-2xl font-serif italic leading-tight">Discuss your architectural vision</h3>
                                    <p className="text-sand/70 mt-4 text-sm max-w-sm mx-auto font-sans leading-relaxed">Describe a mood, a geological preference, or a project aesthetic to curate our collection.</p>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    key={idx}
                                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} `}
                                >
                                    <div className={`max-w-[85%] px-6 py-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-luxury-emerald/90 text-white rounded-tr-none shadow-lg shadow-luxury-emerald/20'
                                        : 'bg-white/5 border border-white/5 text-stone-200 rounded-tl-none shadow-sm font-serif'
                                        }`}>
                                        {msg.content}
                                    </div>

                                    {/* Visual Stone Cards in Chat */}
                                    {msg.stones && msg.stones.length > 0 && (
                                        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 w-full max-w-full no-scrollbar">
                                            {msg.stones.map((stone, sIdx) => (
                                                <motion.div
                                                    key={sIdx}
                                                    whileHover={{ y: -4, scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => onStoneClick(stone, msg.stones)}
                                                    className="w-24 flex-shrink-0 group cursor-pointer"
                                                >
                                                    <div className="aspect-[4/5] bg-stone-100 rounded-sm border border-stone-100 shadow-sm overflow-hidden mb-2 transition-all group-hover:shadow-xl group-hover:border-luxury-bronze/30">
                                                        <img
                                                            src={stone.imageUrl}
                                                            alt={stone.name}
                                                            className="w-full h-full object-cover grayscale-[0.3] transition-all duration-500 group-hover:grayscale-0 group-hover:scale-110"
                                                        />
                                                    </div>
                                                    <p className="text-[9px] font-bold text-stone-900 truncate tracking-wide uppercase group-hover:text-luxury-bronze transition-colors">{stone.name}</p>
                                                    <p className="text-[8px] italic text-stone-400 font-serif">{stone.physical_properties?.application || 'Natural Stone'}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-white/50 border border-stone-100 px-5 py-3 rounded-xl shadow-sm flex items-center gap-4">
                                        <Loader2 size={16} className="animate-spin text-luxury-bronze" />
                                        <span className="text-[11px] text-stone-500 font-serif italic tracking-wide">Archiving geological data...</span>
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* The Input Bar */}
                <form
                    onSubmit={handleSendMessage}
                    className="p-1 glass-panel ai-bar-border rounded-xl relative flex items-center shadow-2xl"
                >
                    <div className="absolute left-8 text-bronze z-10 pointer-events-none">
                        {isLoading ? (
                            <div className="animate-spin h-5 w-5 border-2 border-bronze border-t-transparent rounded-full" />
                        ) : (
                            <span className="material-symbols-outlined text-bronze">auto_awesome</span>
                        )}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        placeholder="Ask The Archivist about the Earth's Artistry..."
                        className="w-full pl-16 pr-32 py-5 bg-transparent rounded-xl text-luxury-cream placeholder:text-luxury-cream/40 transition-all outline-none text-lg font-display font-light border-none focus:ring-0"
                    />

                    <div className="absolute right-4 flex items-center gap-2">
                        {isExpanded && messages.length > 0 && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); setMessages([]); }}
                                className="bg-transparent text-luxury-cream/40 hover:text-bronze flex items-center gap-2 px-2 py-1 transition-colors z-[11]"
                                title="Clear Curation History"
                            >
                                <X size={16} strokeWidth={2} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] font-display">Clear</span>
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="bg-primary hover:bg-primary/80 text-white p-3 rounded-lg transition-all shadow-lg flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed group z-[11]"
                        >
                            <span className="material-icons group-active:translate-x-1 transition-transform">send</span>
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default ChatAssistant;
