import { useState, useEffect, useCallback, useRef } from 'react';
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
    const cleanId = String(id).replace(/\D/g, '');
    const padded = cleanId.padStart(12, '0').slice(-12);
    return `00000000-0000-0000-0000-${padded}`;
};

// Request browser notification permission once
const requestNotifPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
};

const showBrowserNotif = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'stonevo-chat',
        });
        n.onclick = () => { window.focus(); n.close(); };
    }
};

const callNotifyApi = async (projectId, senderRole, senderName, messagePreview) => {
    try {
        await fetch('/api/notify-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, senderRole, senderName, messagePreview }),
        });
    } catch (err) {
        console.warn('[Chat] Notify API failed:', err.message);
    }
};

export const useProjectChat = (projectId, userRole, userName) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(new Set());

    // Normalize ID for database operations
    const dbProjectId = toUUID(projectId);

    // Request browser notification permission on first use
    useEffect(() => { requestNotifPermission(); }, []);

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

    // Send a text message
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

            // Fire email notifications to other parties (non-blocking)
            callNotifyApi(projectId, userRole, userName, messageText);
        } catch (err) {
            console.error('[Chat] Send error:', err);
            setMessages(prev => prev.filter(m => m !== newMessage));
            alert(`Message failed to send: ${err.message}`);
        }
    };

    // Ensure the chat-files bucket exists and is writable
    const ensureBucket = async () => {
        // Try to create it — if it already exists Supabase returns a harmless "already exists" error
        const { error: createErr } = await supabase.storage.createBucket('chat-files', {
            public: true,
            fileSizeLimit: 20971520 // 20 MB
        });

        // "already exists" is fine — anything else means we lack permission to create it
        if (createErr && !createErr.message?.toLowerCase().includes('already exist')) {
            console.warn('[Chat] Could not auto-create bucket:', createErr.message);
            // Don't throw — let the upload attempt proceed; it will surface a clearer error if bucket truly missing
        }
    };

    // Send a file (image or PDF)
    const sendFile = async (file) => {
        if (!file || !dbProjectId) return;

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (!isImage && !isPdf) {
            alert('Only images and PDF files are supported.');
            return;
        }

        const fileType = isImage ? 'image' : 'pdf';
        const fileName = file.name;
        const fileKey = `${dbProjectId}/${Date.now()}_${fileName}`;

        // Optimistic placeholder
        const optimisticId = `opt_${Date.now()}`;
        const optimisticMsg = {
            _optimisticId: optimisticId,
            project_id: dbProjectId,
            sender_name: userName || 'Anonymous',
            sender_role: userRole || 'guest',
            message: '',
            file_name: fileName,
            file_type: fileType,
            file_url: isImage ? URL.createObjectURL(file) : null,
            created_at: new Date().toISOString(),
            isOptimistic: true,
            isUploading: true
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setUploadingFiles(prev => new Set(prev).add(optimisticId));

        try {
            // Auto-create bucket if it doesn't exist yet
            await ensureBucket();

            // Upload file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('chat-files')
                .upload(fileKey, file, { upsert: false, contentType: file.type });

            if (uploadError) throw uploadError;

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('chat-files')
                .getPublicUrl(fileKey);

            // Insert the real message
            const dbMessage = {
                project_id: dbProjectId,
                sender_name: userName || 'Anonymous',
                sender_role: userRole || 'guest',
                message: '',
                file_url: publicUrl,
                file_type: fileType,
                file_name: fileName,
                created_at: new Date().toISOString()
            };

            const { error: insertError } = await supabase
                .from('project_messages')
                .insert(dbMessage);

            if (insertError) throw insertError;

            // Remove optimistic — realtime will add the real one
            setMessages(prev => prev.filter(m => m._optimisticId !== optimisticId));

            // Fire email notifications to other parties (non-blocking)
            callNotifyApi(projectId, userRole, userName, `Sent a ${fileType}: ${fileName}`);
        } catch (err) {
            console.error('[Chat] File upload error:', err);
            setMessages(prev => prev.filter(m => m._optimisticId !== optimisticId));
            const msg = err.message?.toLowerCase() || '';
            if (msg.includes('bucket') || msg.includes('not found') || msg.includes('resource')) {
                alert(
                    'Storage not set up yet.\n\n' +
                    '1. Go to Supabase → Storage → New Bucket\n' +
                    '2. Name it exactly: chat-files\n' +
                    '3. Enable "Public bucket"\n' +
                    '4. Then run in SQL Editor:\n\n' +
                    'CREATE POLICY "chat_upload" ON storage.objects\n' +
                    'FOR INSERT TO public\n' +
                    'WITH CHECK (bucket_id = \'chat-files\');\n\n' +
                    'Then try again.'
                );
            } else {
                alert(`Upload failed: ${err.message}`);
            }
        } finally {
            setUploadingFiles(prev => {
                const next = new Set(prev);
                next.delete(optimisticId);
                return next;
            });
        }
    };

    // Subscription logic with race-condition protection (Safe-Boot)
    useEffect(() => {
        if (!dbProjectId) return;

        const initTimer = setTimeout(() => {
            fetchMessages();

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
                                // Remove matching optimistic (text msg dedup by message content)
                                const filtered = prev.filter(m =>
                                    !m.isOptimistic ||
                                    m.message !== payload.new.message ||
                                    m.file_name !== payload.new.file_name
                                );
                                return [...filtered, payload.new];
                            });

                            // Browser notification for messages from other senders
                            const msg = payload.new;
                            const isFromMe = msg.sender_name === userName && msg.sender_role === userRole;
                            if (!isFromMe) {
                                const body = msg.message || (msg.file_name ? `Sent a file: ${msg.file_name}` : 'New message');
                                showBrowserNotif(`${msg.sender_name} on Stonevo`, body);
                            }

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
        }, 1500);

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
        sendFile,
        unreadCount,
        isPanelOpen,
        setIsPanelOpen,
        uploadingFiles
    };
};
