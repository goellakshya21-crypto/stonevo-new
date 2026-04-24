import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Deterministically converts a string/number ID into a valid UUID format
 * to satisfy database type requirements while maintaining stable room IDs.
 */
const toUUID = (id) => {
    if (!id) return null;
    
    // If it's already a valid UUID, return it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return id;

    // Handle special case for personal workspace
    if (id === 'personal_workspace') {
        return '00000000-0000-0000-0000-000000000000';
    }

    // Convert string to a padded hex format to create a "Virtual UUID"
    // We use a fixed prefix and pad the input to 12 hex chars
    const cleanId = String(id).replace(/\D/g, '');
    const padded = cleanId.padStart(12, '0').slice(-12);
    return `00000000-0000-0000-0000-${padded}`;
};

export const useProjectChat = (projectId, userRole, userName) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Normalize ID for database operations
    const dbProjectId = toUUID(projectId);

    // Fetch initial message history
    const fetchMessages = useCallback(async () => {
        if (!dbProjectId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_messages')
                .select('*')
                .eq('project_id', dbProjectId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('[Chat] Fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [dbProjectId]);

    // Send a message
    const sendMessage = async (text) => {
        if (!text?.trim() || !dbProjectId) return;

        const messageText = text.trim();
        const newMessage = {
            project_id: dbProjectId,
            sender_name: userName || 'Anonymous',
            sender_role: userRole || 'guest',
            message: messageText,
            created_at: new Date().toISOString(),
            isOptimistic: true 
        };

        setMessages(prev => [...prev, newMessage]);

        try {
            const { isOptimistic, ...dbMessage } = newMessage;
            const { error } = await supabase
                .from('project_messages')
                .insert(dbMessage);

            if (error) throw error;
        } catch (err) {
            console.error('[Chat] Send error:', err);
            setMessages(prev => prev.filter(m => m !== newMessage));
            alert(`Message failed to send: ${err.message}`);
        }
    };

    // Subscription logic with race-condition protection (Safe-Boot)
    useEffect(() => {
        if (!dbProjectId) return;

        // Wait for the main page to stabilize before starting chat services
        const initTimer = setTimeout(() => {
            fetchMessages();

            // Set up real-time sync after initial fetch
            const channel = supabase
                .channel(`project_chat_${dbProjectId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'project_messages',
                        filter: `project_id=eq.${dbProjectId}`
                    },
                    (payload) => {
                        if (!payload || !payload.new) return;
                        
                        try {
                            setMessages(prev => {
                                if (!Array.isArray(prev)) return [payload.new];
                                const filtered = prev.filter(m => !m.isOptimistic || (m.message !== payload.new.message));
                                return [...filtered, payload.new];
                            });
                            
                            if (!isPanelOpen) {
                                setUnreadCount(c => c + 1);
                            }
                        } catch (subErr) {
                            console.error("[Chat] Sync error:", subErr);
                        }
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }, 1500); // 1.5s delay for page stability

        return () => clearTimeout(initTimer);
    }, [dbProjectId, fetchMessages, isPanelOpen]);

    // Reset unread when panel opens
    useEffect(() => {
        if (isPanelOpen) {
            setUnreadCount(0);
        }
    }, [isPanelOpen]);

    return {
        messages,
        isLoading,
        sendMessage,
        unreadCount,
        isPanelOpen,
        setIsPanelOpen
    };
};

