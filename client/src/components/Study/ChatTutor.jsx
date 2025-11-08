import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function ChatTutor({
  api,
  selected,
  docs,
  chats,
  setChats,
  activeChat,
  setActiveChat,
  activeChatId,
  setActiveChatId,
  question,
  setQuestion,
  answer,
  setAnswer,
  citations,
  setCitations,
  loadingAsk,
  setLoadingAsk,
  setYt,
  setActiveTab,
  generateChatVideoRecommendations,
  generatingChatYt
}) {
  // --- Speech Recognition (Mic) ---
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuestion(q => {
        const newQ = (q ? q + ' ' : '') + transcript;
        // Also update the textarea value directly for immediate feedback
        if (inputRef.current) {
          inputRef.current.value = newQ;
          inputRef.current.style.height = 'auto';
          const newHeight = Math.max(78, Math.min(inputRef.current.scrollHeight, 200));
          inputRef.current.style.height = newHeight + 'px';
        }
        return newQ;
      });
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
    };
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current && recognitionRef.current.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        setIsListening(true);
        recognitionRef.current.start();
      } else {
        alert('Speech recognition is not supported in this browser.');
      }
    }
  };
  const [errorMsg, setErrorMsg] = useState("");
  const chatContainerRef = useRef(null);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingIntervalRef = useRef(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [currentVoicePref, setCurrentVoicePref] = useState('');
  const shouldAutoScrollRef = useRef(true); // Track if we should auto-scroll
  const [userBubbleTheme, setUserBubbleTheme] = useState(localStorage.getItem('userBubbleTheme') || 'blue');
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messageRefs = useRef([]); // refs to message elements
  const lastUserMessageIndexRef = useRef(null); // Track the last user message to anchor to
  const abortControllerRef = useRef(null); // Abort controller for cancelling requests
  const [editingMessageIndex, setEditingMessageIndex] = useState(null); // Track which message is being edited
  const [editedText, setEditedText] = useState(""); // Text being edited
  // Store versions per chat: { chatId: { messageIndex: [versions] } }
  const [allChatVersions, setAllChatVersions] = useState({});
  // Store current version index per chat: { chatId: { messageIndex: versionIndex } }
  const [allCurrentVersions, setAllCurrentVersions] = useState({});
  // Store latest messages per chat: { chatId: { messageIndex: messages } }
  const [allLatestMessages, setAllLatestMessages] = useState({});
  const [inDepthMode, setInDepthMode] = useState(false); // Toggle for in-depth responses
  const [uploadedImages, setUploadedImages] = useState([]); // Store uploaded image URLs
  const [uploadingImage, setUploadingImage] = useState(false); // Track image upload status
  // Modal image preview state
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [analyzingMessageId, setAnalyzingMessageId] = useState(null); // Track which message is being analyzed
  
  // Handler for analyzing message and getting YouTube recommendations
  const handleAnalyzeForYouTube = async (messageText, messageIndex) => {
    // Set analyzing state for this specific message
    setAnalyzingMessageId(messageIndex);
    try {
      // Get message ID from activeChat
      const messageId = activeChat?.messages[messageIndex]?._id;
      if (!messageId) {
        throw new Error('Message not found');
      }
      
      // Generate recommendations for this specific message
      // Tab switching will be handled automatically by the parent after the API call completes
      await generateChatVideoRecommendations(messageId);
    } catch (error) {
      console.error('Error analyzing message:', error);
    } finally {
      setAnalyzingMessageId(null);
    }
  };
  
  // Get current chat's versions
  const messageVersions = allChatVersions[activeChatId] || {};
  const currentVersionIndex = allCurrentVersions[activeChatId] || {};
  const latestMessages = allLatestMessages[activeChatId] || {};
  
  // When switching chats, reset to show latest versions (but keep version history)
  useEffect(() => {
    if (activeChatId) {
      // Reset current version indices to show latest messages
      // Keep the version history data so navigation still works
      setAllCurrentVersions(prev => {
        const newVersions = { ...prev };
        newVersions[activeChatId] = {}; // Empty object = show latest for all messages
        return newVersions;
      });
    }
  }, [activeChatId]); // Run whenever chat ID changes
  
  // Auto-scroll to bottom when opening a chat
  useEffect(() => {
    if (activeChat && activeChat.messages && activeChat.messages.length > 0 && chatContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 150);
      });
    }
  }, [activeChatId, activeChat?.messages?.length]); // Trigger on chat change and when messages load
  
  // Debug loadingAsk state
  useEffect(() => {
    console.log('loadingAsk state changed:', loadingAsk);
  }, [loadingAsk]);

  // Helper to handle image files from paste/drop events
  const handlePasteOrDropImages = (items) => {
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile ? item.getAsFile() : item;
        if (file && file.type.startsWith('image/')) {
          imageFiles.push(file);
        }
      }
    }
    if (imageFiles.length > 0) {
      handleImageUpload(imageFiles);
    }
  };

  // Handle image upload
  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    try {
      const token = localStorage.getItem('token');
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: formData
        });
        if (!response.ok) {
          throw new Error('Failed to upload image');
        }
        const data = await response.json();
        uploadedUrls.push(data.url);
        console.log('Image uploaded:', data.url);
      }
      setUploadedImages(prev => [...prev, ...uploadedUrls]);
      setUploadingImage(false);
    } catch (error) {
      console.error('Image upload error:', error);
      setErrorMsg('Failed to upload image');
      setUploadingImage(false);
    }
  };

  // User bubble theme options (imported from localStorage)
  const getBubbleTheme = () => {
    const themes = {
      // Gradient themes
      purple: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      blue: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
      green: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
      orange: "linear-gradient(135deg, #f46b45 0%, #eea849 100%)",
      pink: "linear-gradient(135deg, #e91e63 0%, #f06292 100%)",
      teal: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      red: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
      indigo: "linear-gradient(135deg, #5f72bd 0%, #9b23ea 100%)",
      // Solid dark themes
      slate: "#1e293b",
      charcoal: "#2d3748",
      navy: "#1a202c",
      forest: "#1b3a2f",
      burgundy: "#3e1f2a",
      midnight: "#0f172a",
    };
    return themes[userBubbleTheme] || themes.green;
  };

  // Initialize voice preference from localStorage
  useEffect(() => {
    const loadVoicePreference = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const savedPref = localStorage.getItem('voicePreference');
        if (savedPref && voices.find(v => v.name === savedPref)) {
          setCurrentVoicePref(savedPref);
        } else {
          // Find Gini (Google Hindi) as default (best quality), then other good voices
          const defaultVoice = voices.find(v => v.name === 'Google हिन्दी') ||
            voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
            voices.find(v => v.name.includes('Microsoft Zira')) ||
            voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0]; // Fallback to first available voice
          
          if (defaultVoice) {
            setCurrentVoicePref(defaultVoice.name);
            localStorage.setItem('voicePreference', defaultVoice.name);
          }
        }
      }
    };
    
    loadVoicePreference();
    window.speechSynthesis.onvoiceschanged = loadVoicePreference;
  }, []);

  // Listen for voice preference changes
  useEffect(() => {
    const handleVoiceChange = (event) => {
      setCurrentVoicePref(event.detail);
    };
    
    const handleThemeChange = (event) => {
      setUserBubbleTheme(event.detail);
    };
    
    window.addEventListener('voicePreferenceChanged', handleVoiceChange);
    window.addEventListener('userBubbleThemeChanged', handleThemeChange);
    
    return () => {
      window.removeEventListener('voicePreferenceChanged', handleVoiceChange);
      window.removeEventListener('userBubbleThemeChanged', handleThemeChange);
    };
  }, []);

  // Only update scroll-to-bottom button visibility (no auto-scroll during typing)
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    }
  }, [activeChat?.messages, loadingAsk, isTyping]);

  // Track scroll position to toggle scroll-to-bottom button
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
      
      // If user manually scrolls, release the anchor
      // (Only release if they scroll away significantly from the anchored position)
      if (lastUserMessageIndexRef.current !== null) {
        const userMessageEl = messageRefs.current[lastUserMessageIndexRef.current];
        if (userMessageEl) {
          const containerRect = el.getBoundingClientRect();
          const messageRect = userMessageEl.getBoundingClientRect();
          const currentOffset = messageRect.top - containerRect.top;
          const targetOffsetFromTop = 80;
          
          // If user scrolled more than 150px away from anchor point, release it
          if (Math.abs(currentOffset - targetOffsetFromTop) > 150) {
            lastUserMessageIndexRef.current = null;
          }
        }
      }
    };
    el.addEventListener('scroll', onScroll);
    // Initialize
    onScroll();
    return () => {
      el.removeEventListener('scroll', onScroll);
    };
  }, [activeChatId]);

  const scrollToBottom = () => {
    const el = chatContainerRef.current;
    if (!el) return;
    // Release the anchor when manually scrolling to bottom
    lastUserMessageIndexRef.current = null;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
    shouldAutoScrollRef.current = false;
    setShowScrollToBottom(false);
  };

  // Typewriter effect for tutor response
  const typeText = (text) => {
    setIsTyping(true);
    setTypingText("");
    let index = 0;
    
    // Clear any existing typing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    
    typingIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setTypingText((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(typingIntervalRef.current);
        setIsTyping(false);
      }
    }, 2); // 2ms per character for very fast typing
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Stop speech when chat changes or component unmounts
  useEffect(() => {
    // Cancel speech and clear state when switching chats
    window.speechSynthesis.cancel();
    setSpeakingMessageId(null);
    // reset message refs on chat switch
    messageRefs.current = [];
    // reset anchor when switching chats
    lastUserMessageIndexRef.current = null;
    // Cancel any ongoing generation when switching chats
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadingAsk(false);
    setIsTyping(false);
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    
    return () => {
      // Also cleanup on unmount
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [activeChatId]);

  // Start editing a message
  const onEditMessage = (index, text) => {
    setEditingMessageIndex(index);
    setEditedText(text);
  };

  // Cancel editing
  const onCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditedText("");
  };

  // Save edited message and regenerate
  const onSaveEdit = async () => {
    if (!editedText.trim() || editingMessageIndex === null) return;
    
    const messages = activeChat?.messages || [];
    const originalMessage = messages[editingMessageIndex];
    
    // Save the current conversation branch before editing
    const branchKey = editingMessageIndex;
    const currentBranch = messages.slice(editingMessageIndex);
    
    // Save latest messages if this is the first edit at this point
    if (!latestMessages[branchKey]) {
      setAllLatestMessages(prev => ({
        ...prev,
        [activeChatId]: {
          ...(prev[activeChatId] || {}),
          [branchKey]: currentBranch
        }
      }));
    }
    
    setAllChatVersions(prev => ({
      ...prev,
      [activeChatId]: {
        ...(prev[activeChatId] || {}),
        [branchKey]: [
          ...((prev[activeChatId] || {})[branchKey] || []),
          { messages: currentBranch, timestamp: new Date().toISOString() }
        ]
      }
    }));
    
    // Update the message with edited text
    const updatedMessages = messages.slice(0, editingMessageIndex);
    updatedMessages.push({
      ...originalMessage,
      text: editedText.trim(),
      edited: true,
      editedAt: new Date().toISOString()
    });
    
    setActiveChat({
      ...activeChat,
      messages: updatedMessages
    });
    
    setEditingMessageIndex(null);
    setEditedText("");
    
    // Regenerate response for the edited question
    setLoadingAsk(true);
    abortControllerRef.current = new AbortController();
    
    try {
      // Add placeholder tutor message
      const chatWithPlaceholder = {
        ...activeChat,
        messages: [
          ...updatedMessages,
          { role: "tutor", text: "", createdAt: new Date().toISOString(), citations: [], isPlaceholder: true }
        ]
      };
      setActiveChat(chatWithPlaceholder);
      
      const res = await api.ask(
        editedText.trim(),
        selected === "all" ? null : selected,
        false,
        activeChatId,
        false,
        abortControllerRef.current?.signal
      );
      
      setLoadingAsk(false);
      abortControllerRef.current = null;
      
      if (res.answer) {
        const tutorMessage = {
          role: "tutor",
          text: res.answer,
          createdAt: new Date().toISOString(),
          citations: res.citations || [],
          _fullText: res.answer
        };
        
        const finalChat = {
          ...activeChat,
          messages: [...updatedMessages, tutorMessage]
        };
        setActiveChat(finalChat);
        
        // Update latest messages with the new response
        setAllLatestMessages(prev => ({
          ...prev,
          [activeChatId]: {
            ...(prev[activeChatId] || {}),
            [editingMessageIndex]: [...updatedMessages.slice(editingMessageIndex), tutorMessage]
          }
        }));
        
        // Start typing animation
        requestAnimationFrame(() => {
          typeText(res.answer);
        });
        
        const typingDuration = res.answer.length * 2;
        setTimeout(() => {
          setTypingText("");
          setIsTyping(false);
          if (chatContainerRef.current) {
            requestAnimationFrame(() => {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            });
          }
        }, typingDuration + 100);
      }
      
      // Refresh chat list
      const lst = await api.listChats(selected === "all" ? null : selected);
      setChats(lst.chats || []);
      
    } catch (err) {
      console.error("Regenerate error:", err);
      if (err.name === 'AbortError') {
        setErrorMsg("Generation stopped by user");
      } else {
        setErrorMsg(err.message || "Failed to regenerate response");
      }
      setLoadingAsk(false);
      abortControllerRef.current = null;
    }
  };

  // Navigate to a specific version
  const navigateToVersion = (messageIndex, versionIndex) => {
    const versions = messageVersions[messageIndex];
    if (!versions || versionIndex < -1 || versionIndex >= versions.length) return;
    
    const messages = activeChat?.messages || [];
    let messagesToRestore;
    
    if (versionIndex === -1) {
      // Restore latest version
      messagesToRestore = latestMessages[messageIndex];
      if (!messagesToRestore) {
        // If no saved latest, we're already at latest
        setAllCurrentVersions(prev => ({
          ...prev,
          [activeChatId]: {
            ...(prev[activeChatId] || {}),
            [messageIndex]: -1
          }
        }));
        return;
      }
    } else {
      // Restore a previous version
      const branch = versions[versionIndex];
      messagesToRestore = branch.messages;
    }
    
    const updatedMessages = [
      ...messages.slice(0, messageIndex),
      ...messagesToRestore
    ];
    
    setActiveChat({
      ...activeChat,
      messages: updatedMessages
    });
    
    setAllCurrentVersions(prev => ({
      ...prev,
      [activeChatId]: {
        ...(prev[activeChatId] || {}),
        [messageIndex]: versionIndex
      }
    }));
  };
  
  // Go to previous version
  const onPreviousVersion = (messageIndex) => {
    const currentIdx = currentVersionIndex[messageIndex] ?? -1;
    const versions = messageVersions[messageIndex];
    if (!versions) return;
    
    const newIndex = currentIdx + 1;
    if (newIndex < versions.length) {
      navigateToVersion(messageIndex, newIndex);
    }
  };
  
  // Go to next version (more recent)
  const onNextVersion = (messageIndex) => {
    const currentIdx = currentVersionIndex[messageIndex] ?? -1;
    const newIndex = currentIdx - 1;
    if (newIndex >= -1) {
      navigateToVersion(messageIndex, newIndex);
    }
  };

  // Stop generation
  const onStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadingAsk(false);
    setIsTyping(false);
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setTypingText("");
    setErrorMsg(""); // Clear any error messages
    
    // Remove the placeholder or any incomplete/just-added assistant/tutor message
    if (activeChat?.messages?.length > 0) {
      let msgs = [...activeChat.messages];
      // Remove all trailing tutor/assistant messages that are placeholders, empty, or just added
      while (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (
          lastMsg.isPlaceholder ||
          ((lastMsg.role === 'tutor' || lastMsg.role === 'assistant') && (!lastMsg.text || lastMsg.text.trim() === "" || lastMsg.text === lastMsg._fullText))
        ) {
          msgs.pop();
        } else {
          break;
        }
      }
      setActiveChat({
        ...activeChat,
        messages: msgs
      });
    }
  };

  // Ask the tutor a question
  const onAsk = async () => {
    if (!question.trim() || loadingAsk) return; // Prevent sending while loading
    
    const userQuestion = question.trim();
    
    // Set loading state FIRST before any async operations
    setLoadingAsk(true);
    console.log('Loading state set to true');
    setQuestion(""); // Clear input immediately after setting loading
    setAnswer("");
    setCitations([]);
    setErrorMsg("");
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    console.log('Abort controller created');
    // Don't force auto-scroll; we'll anchor the view to the new user message near the top
    shouldAutoScrollRef.current = false;
    
    try {
      let chatId = activeChatId;
      let chatToUpdate = activeChat;
      
      // If no active chat, create one
      if (!chatId) {
        console.log('Creating new chat...');
        const docTitle = docs.find((d) => d._id === selected)?.title || "General Chat";
        // Use first question as title (max 50 chars) or doc title
        const chatTitle = userQuestion.slice(0, 50) || docTitle;
        const created = await api.createChat(selected === "all" ? null : selected, chatTitle);
        chatId = created.id;
        console.log('Chat created with ID:', chatId);
        // Set both chatId and chat state synchronously before proceeding
        chatToUpdate = {
          _id: chatId,
          title: chatTitle,
          documentId: selected === "all" ? null : selected,
          messages: []
        };
        setActiveChatId(chatId);
        setActiveChat(chatToUpdate);
        // Wait for state to flush before continuing (force sync)
        await new Promise((resolve) => setTimeout(resolve, 0));
      }


      // Optimistically add user message and always add a placeholder tutor message (for animation)
      const optimisticMessages = [
        ...(chatToUpdate?.messages || []),
        {
          role: "user",
          text: userQuestion,
          images: uploadedImages.length > 0 ? [...uploadedImages] : undefined,
          createdAt: new Date().toISOString(),
          citations: []
        },
        {
          role: "tutor",
          text: "",
          createdAt: new Date().toISOString(),
          citations: [],
          isPlaceholder: true
        }
      ];
      const optimisticChat = {
        ...chatToUpdate,
        messages: optimisticMessages
      };
      // Clear uploaded images after adding to message
      const messagesToSend = uploadedImages.length > 0 ? [...uploadedImages] : [];
      setUploadedImages([]);
      // Store the index of this user message for anchoring
      const userMessageIndex = optimisticMessages.length - 2;
      lastUserMessageIndexRef.current = userMessageIndex;
      setActiveChat(optimisticChat);

      // After DOM commits, anchor scroll so the new user message appears near top-right (ChatGPT style)
      setTimeout(() => {
        const container = chatContainerRef.current;
        const userMessageEl = messageRefs.current[userMessageIndex];
        
        if (container && userMessageEl) {
          const containerRect = container.getBoundingClientRect();
          const messageRect = userMessageEl.getBoundingClientRect();
          
          // Calculate how much to scroll to position user message near top (80px from top for breathing room)
          const targetOffsetFromTop = 80;
          const scrollDelta = messageRect.top - containerRect.top - targetOffsetFromTop;
          
          container.scrollTop += scrollDelta;
        }
      }, 50); // Small delay to ensure DOM has updated

      console.log('Making API call with:', {
        query: userQuestion.slice(0, 50),
        documentId: selected === "all" ? null : selected,
        allowGeneral: false,
        chatId,
        createIfMissing: false,
        inDepthMode
      });

      const res = await api.ask(
        userQuestion,
        selected === "all" ? null : selected,
        false,
        chatId,
        false,
        abortControllerRef.current?.signal, // Pass abort signal
        inDepthMode, // Pass in-depth mode
        messagesToSend // Pass images
      );

      console.log('API Response received:', res);

      // Stop loading IMMEDIATELY when response arrives
      setLoadingAsk(false);
      abortControllerRef.current = null;

      // Clear answer/citations state so they don't show in fallback display
      setAnswer("");
      setCitations([]);

      // Check if response is valid
      if (!res || typeof res !== 'object') {
        throw new Error('Invalid response from server');
      }

      // Add tutor message with full text immediately (for typing animation)
      if (res.answer) {
        // Replace the placeholder tutor message (last message, isPlaceholder: true) with the real answer
        let newMessages = [...optimisticChat.messages];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === 'tutor' && lastMsg.isPlaceholder) {
          newMessages[newMessages.length - 1] = {
            role: "tutor",
            text: res.answer,
            createdAt: new Date().toISOString(),
            citations: res.citations || [],
            _fullText: res.answer
          };
        } else {
          // Fallback: append if no placeholder found
          newMessages.push({
            role: "tutor",
            text: res.answer,
            createdAt: new Date().toISOString(),
            citations: res.citations || [],
            _fullText: res.answer
          });
        }
        // Force state update to ensure re-render (works for both general and PDF-selected modes)
        setActiveChat(prev => ({ ...optimisticChat, messages: [...newMessages] }));
        // Start typing animation with no delay
        requestAnimationFrame(() => {
          typeText(res.answer);
        });
        // After typing finishes, clear typing state and scroll to bottom
        const typingDuration = res.answer.length * 2;
        setTimeout(() => {
          setTypingText("");
          setIsTyping(false);
          if (chatContainerRef.current) {
            requestAnimationFrame(() => {
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            });
          }
          lastUserMessageIndexRef.current = null;
        }, typingDuration + 100);
      } else {
        // No answer in response
        console.error('No answer in response:', res);
        throw new Error(res.error || 'No response received from the server');
      }

      // Refresh chat list to update timestamps
      const lst = await api.listChats(selected === "all" ? null : selected);
      setChats(lst.chats || []);

      // fetch YouTube recommendations
      try {
        const ytRes = await api.youtube(userQuestion, selected === "all" ? null : selected);
        setYt(ytRes);
      } catch {
        setYt({
          query: userQuestion,
          suggestions: [],
          error: "Failed to load YouTube recommendations.",
        });
      }
    } catch (err) {
      console.error("Ask error:", err);
      
      // Check if it was aborted by user (AbortError)
      if (err.name === 'AbortError') {
        // User manually stopped - don't show error, just clean up
        console.log('Request aborted by user');
        setErrorMsg("");
      } else {
        // Real error, not abort
        console.error('Real error:', err);
        setErrorMsg(err.message || "Failed to get tutor response");
      }
      
      // Clean up state regardless of error type
      setLoadingAsk(false);
      setIsTyping(false);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setTypingText("");
      abortControllerRef.current = null;
      
      // Remove placeholder/empty messages from the latest chat state
      setActiveChat(prevChat => {
        if (prevChat?.messages?.length > 0) {
          const lastMsg = prevChat.messages[prevChat.messages.length - 1];
          if (lastMsg.isPlaceholder || lastMsg.text === "" || (lastMsg.role === 'tutor' && !lastMsg.text)) {
            return {
              ...prevChat,
              messages: prevChat.messages.slice(0, -1)
            };
          }
        }
        return prevChat;
      });
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      
      
      {/* Chat display area with scroll-to-bottom control */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        <div
          ref={chatContainerRef}
          style={{
            height: "100%",
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderBottom: "3px solid #0055ffff",
            borderRadius: 10,
            // borderBottom: "none",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            padding: "14px",
            marginBottom: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            position: "relative"
          }}
        >

          {/* Warning banner when no PDF selected */}
      
        {selected === "all" && (
          !activeChat?.messages?.length && !loadingAsk ? (
            <div style={{
              background: "rgba(234, 179, 8, 0.15)",
              border: "1px solid rgba(234, 179, 8, 0.4)",
              borderRadius: "8px",
              padding: "4px 10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "#eab308",
              marginTop: "0px",
              marginBottom: "18px",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <span style={{ fontSize: "16px" }}>💡</span>
              <span>
                <strong>General Chat Mode:</strong> I'm ready for general questions. Want to discuss a specific PDF? Select one from above!
              </span>
            </div>
          ) : (
            <div style={{
              position: "absolute",
              top: 18,
              left: 18,
              zIndex: 10,
              background: "rgba(234, 179, 8, 0.15)",
              border: "1px solid rgba(234, 179, 8, 0.4)",
              borderRadius: "8px",
              padding: "6px 14px 6px 10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "#eab308",
              boxShadow: "0 2px 8px rgba(234,179,8,0.08)",
              pointerEvents: "none",
              minWidth: 0,
              maxWidth: "320px",
              width: "auto",
              boxSizing: "border-box"
            }}>
              <span style={{ fontSize: "16px" }}>💡</span>
              <span style={{ whiteSpace: "pre-line", fontWeight: 500 }}>
                <strong>General Chat Mode</strong>
              </span>
            </div>
          )
        )}
        {!activeChat?.messages?.length && !loadingAsk && (
          <div
            style={{
              color: "var(--muted)",
              textAlign: "center",
              marginTop: selected === "all" ? "0px" : "50px",
            }}
          >
            No messages yet. Start a conversation with your tutor below.
          </div>
        )}
        

        

        {activeChat?.messages?.map((m, idx) => {
          const isLastMessage = idx === activeChat.messages.length - 1;
          const showTyping = isLastMessage && (m.role === "tutor" || m.role === "assistant") && isTyping;
          const displayText = showTyping ? typingText : m.text;
          const isPlaceholder = m.isPlaceholder && !displayText;
          // Always show the first assistant/tutor response, do not filter it out
          return (
            <div
              key={idx}
              ref={(el) => (messageRefs.current[idx] = el)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: m.role === "user" ? "flex-end" : "flex-start",
                marginBottom: "20px",
              }}
            >
              <div
                className={`chat-message ${m.role === "user" ? "chat-message-user" : "chat-message-assistant"}`}
                style={{
                  maxWidth: m.role === "user" ? "80%" : "95%",
                  padding: m.role === "user" ? "12px 18px" : "0px",
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" 
                    ? getBubbleTheme()
                    : "var(--surface)",
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
                  fontSize: "15px",
                  lineHeight: "1.5",
                  boxShadow: m.role === "user" 
                    ? "0 4px 12px rgba(102, 126, 234, 0.25), 0 2px 4px rgba(102, 126, 234, 0.15)"
                    : "none",
                  color: m.role === "user" ? "#ffffff" : "var(--text)",
                  border: "none",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                {/* Only show label for Gini (tutor/assistant), not for user */}
                {m.role !== "user" && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "4px",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    <span>Gini</span>
                    {isPlaceholder && (
                      <span style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "#22c55e",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                      }}>
                        Gini is thinking...
                      </span>
                    )}
                  </div>
                )}
                <div style={{ lineHeight: "1.6" }}>
                  {isPlaceholder ? (
                    <span style={{ opacity: 0.6, fontSize: "14px" }}>
                      <span style={{ animation: "blink 0.8s infinite" }}>●</span>
                      <span style={{ animation: "blink 0.8s infinite 0.2s" }}>●</span>
                      <span style={{ animation: "blink 0.8s infinite 0.4s" }}>●</span>
                    </span>
                  ) : (m.role === "tutor" || m.role === "assistant") ? (
                    <>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          // Style markdown elements to match chat theme
                          p: ({node, children, ...props}) => {
                            // Convert page references to clickable badges
                            const processChildren = (children) => {
                              if (typeof children === 'string') {
                                // Match patterns like (Page 5) or "Page 5" or "on Page 5"
                                const parts = children.split(/(\(Page \d+\)|Page \d+)/gi);
                                return parts.map((part, idx) => {
                                  const match = part.match(/Page (\d+)/i);
                                  if (match) {
                                    const pageNum = match[1];
                                    return (
                                      <span
                                        key={idx}
                                        style={{
                                          display: "inline-block",
                                          padding: "1px 6px",
                                          margin: "0 2px",
                                          fontSize: "0.75em",
                                          fontWeight: 500,
                                          borderRadius: "3px",
                                          background: "rgba(124, 156, 255, 0.08)",
                                          color: "var(--text)",
                                          border: "1px solid rgba(124, 156, 255, 0.2)",
                                          cursor: "pointer",
                                          transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.background = "rgba(124, 156, 255, 0.15)";
                                          e.target.style.borderColor = "var(--accent)";
                                          e.target.style.color = "var(--accent)";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.background = "rgba(124, 156, 255, 0.08)";
                                          e.target.style.borderColor = "rgba(124, 156, 255, 0.2)";
                                          e.target.style.color = "var(--text)";
                                        }}
                                        onClick={() => {
                                          if (typeof props.onPdfPageClick === 'function') {
                                            props.onPdfPageClick(pageNum);
                                          }
                                        }}
                                        title={`Jump to Page ${pageNum}`}
                                      >
                                        {pageNum}
                                      </span>
                                    );
                                  }
                                  return part;
                                });
                              }
                              return children;
                            };
                            // Reduce margin between paragraphs
                            return (
                              <p style={{ margin: "0.6em 0", lineHeight: "1.5" }} {...props}>
                                {React.Children.map(children, child => 
                                  typeof child === 'string' ? processChildren(child) : child
                                )}
                              </p>
                            );
                          },
                          h1: ({node, ...props}) => <h1 style={{ fontSize: "1.4em", marginTop: "0.5em", marginBottom: "0.3em" }} {...props} />,
                          h2: ({node, ...props}) => <h2 style={{ fontSize: "1.3em", marginTop: "0.5em", marginBottom: "0.3em" }} {...props} />,
                          h3: ({node, ...props}) => <h3 style={{ fontSize: "1.2em", marginTop: "0.5em", marginBottom: "0.3em" }} {...props} />,
                          ul: ({node, ...props}) => <ul style={{ marginLeft: "1.2em", marginTop: "0.3em", marginBottom: "0.3em" }} {...props} />,
                          ol: ({node, ...props}) => <ol style={{ marginLeft: "1.2em", marginTop: "0.3em", marginBottom: "0.3em" }} {...props} />,
                          li: ({node, ...props}) => <li style={{ margin: "0.2em 0" }} {...props} />,
                          code: ({node, inline, className, children, ...props}) => {
                            const match = /language-(\w+)/.exec(className || "");
                            if (inline) {
                              return (
                                <code
                                  style={{
                                    background: "#355998ff",
                                    color: "#e6e6e6",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "0.97em",
                                    fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
                                  }}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <SyntaxHighlighter
                                style={oneDark}
                                language={match ? match[1] : undefined}
                                PreTag="div"
                                customStyle={{
                                  borderRadius: "9px",
                                  padding: "16px 18px",
                                  margin: "14px 0",
                                  fontSize: "1em",
                                  background: "rgba(8, 39, 92, 0.65)",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                  backdropFilter: "blur(8px)",
                                  WebkitBackdropFilter: "blur(8px)",
                                  border: "1px solid rgba(11, 100, 255, 0.65)",
                                  transition: "background 0.2s",
                                }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            );
                          },
                          blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 0, marginLeft: "0", opacity: 0.9, fontStyle: "italic" }} {...props} />,
                          strong: ({node, ...props}) => <strong style={{ fontWeight: 700 }} {...props} />,
                          em: ({node, ...props}) => <em style={{ fontStyle: "italic" }} {...props} />,
                          a: ({node, ...props}) => <a style={{ color: "var(--accent)", textDecoration: "underline" }} {...props} />,
                          table: ({node, ...props}) => <table style={{ borderCollapse: "collapse", width: "100%", marginTop: "0.5em", marginBottom: "0.5em" }} {...props} />,
                          th: ({node, ...props}) => <th style={{ border: "1px solid var(--border)", padding: "8px", background: "rgba(124, 156, 255, 0.1)" }} {...props} />,
                          td: ({node, ...props}) => <td style={{ border: "1px solid var(--border)", padding: "8px" }} {...props} />,
                        }}
                      >
                        {showTyping ? typingText : m.text}
                      </ReactMarkdown>
                      {showTyping && <span style={{ opacity: 0.5, animation: "blink 1s infinite", marginLeft: "2px" }}>▊</span>}
                    </>
                  ) : editingMessageIndex === idx ? (
                    // Edit mode for user messages
                    <div>
                      <textarea
              onPaste={e => {
                if (e.clipboardData && e.clipboardData.items) {
                  handlePasteOrDropImages(e.clipboardData.items);
                }
              }}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer && e.dataTransfer.items) {
                  handlePasteOrDropImages(e.dataTransfer.items);
                }
              }}
              onDragOver={e => {
                e.preventDefault();
              }}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: "60px",
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          border: "1px solid rgba(255, 255, 255, 0.3)",
                          borderRadius: "6px",
                          padding: "8px",
                          fontFamily: "inherit",
                          fontSize: "15px",
                          resize: "vertical",
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) {
                            onSaveEdit();
                          } else if (e.key === "Escape") {
                            onCancelEdit();
                          }
                        }}
                      />
                      <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                        <button
                          onClick={onSaveEdit}
                          disabled={!editedText.trim() || loadingAsk}
                          style={{
                            padding: "4px 12px",
                            fontSize: "12px",
                            borderRadius: "4px",
                            background: "rgba(34, 197, 94, 0.2)",
                            border: "1px solid rgba(34, 197, 94, 0.4)",
                            color: "#22c55e",
                            cursor: editedText.trim() && !loadingAsk ? "pointer" : "not-allowed",
                            opacity: editedText.trim() && !loadingAsk ? 1 : 0.5,
                          }}
                        >
                          Save & Regenerate
                        </button>
                        <button
                          onClick={onCancelEdit}
                          style={{
                            padding: "4px 12px",
                            fontSize: "12px",
                            borderRadius: "4px",
                            background: "rgba(239, 68, 68, 0.2)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#ef4444",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      <div style={{ marginTop: "4px", fontSize: "11px", opacity: 0.7 }}>
                        Ctrl+Enter to save • Esc to cancel
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Display images if present */}
                      {m.images && m.images.length > 0 && (
                        <div style={{ marginBottom: "8px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {m.images.map((imgUrl, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={imgUrl}
                              alt={`Attachment ${imgIdx + 1}`}
                              style={{
                                maxWidth: "200px",
                                maxHeight: "200px",
                                borderRadius: "8px",
                                objectFit: "cover",
                                border: "2px solid rgba(255, 255, 255, 0.3)",
                                cursor: "pointer",
                              }}
                              onClick={() => setModalImageUrl(imgUrl)}
                              title="Click to view full size"
                            />
                          ))}
                        </div>
                      )}
      {/* Modal for image preview */}
      {modalImageUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setModalImageUrl(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={modalImageUrl}
              alt="Preview"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: "10px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
                background: "#222"
              }}
            />
            <button
              onClick={() => setModalImageUrl(null)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                fontSize: 20,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
              }}
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>
      )}
                      <span style={{ 
                        whiteSpace: "pre-wrap",
                        fontWeight: 500,
                        color: m.role === "user" ? "#ffffff" : "var(--text)",
                        display: "block"
                      }}>{displayText}</span>
                      {m.edited && (
                        <span style={{
                          display: "inline-block",
                          marginTop: "4px",
                          fontSize: "10px",
                          opacity: 0.6,
                          fontStyle: "italic"
                        }}>
                          (edited)
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {/* Action buttons for user messages - below bubble, icon-only */}
              {m.role === "user" && editingMessageIndex !== idx && !loadingAsk && (
                <div
                  style={{
                    marginTop: "4px",
                    display: "flex",
                    gap: "4px",
                    alignItems: "center",
                    opacity: 0.7,
                  }}
                >
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(m.text);
                      setCopiedMessageId(idx);
                      setTimeout(() => setCopiedMessageId(null), 2000);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: copiedMessageId === idx ? "#22c55e" : "var(--muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      borderRadius: "4px",
                      transition: "all 0.2s",
                      width: "24px",
                      height: "24px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--surface)";
                      e.currentTarget.style.color = "var(--text)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = copiedMessageId === idx ? "#22c55e" : "var(--muted)";
                    }}
                    title="Copy message"
                  >
                    {copiedMessageId === idx ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => onEditMessage(idx, m.text)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      borderRadius: "4px",
                      transition: "all 0.2s",
                      width: "24px",
                      height: "24px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--surface)";
                      e.currentTarget.style.color = "var(--text)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--muted)";
                    }}
                    title="Edit message"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleAnalyzeForYouTube(m.text, idx)}
                    disabled={analyzingMessageId === idx}
                    style={{
                      background: analyzingMessageId === idx ? "rgba(124, 156, 255, 0.2)" : "transparent",
                      border: "none",
                      color: analyzingMessageId === idx ? "var(--accent)" : "var(--muted)",
                      cursor: analyzingMessageId === idx ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      borderRadius: "4px",
                      transition: "all 0.2s",
                      width: "24px",
                      height: "24px",
                    }}
                    onMouseEnter={(e) => {
                      if (analyzingMessageId !== idx) {
                        e.currentTarget.style.background = "var(--surface)";
                        e.currentTarget.style.color = "var(--text)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (analyzingMessageId !== idx) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--muted)";
                      }
                    }}
                    title="Analyze for YouTube recommendations"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"></polygon>
                    </svg>
                  </button>
                  {messageVersions[idx] && messageVersions[idx].length > 0 && (
                    <>
                      {/* Previous version button */}
                      <button
                        onClick={() => onPreviousVersion(idx)}
                        disabled={(currentVersionIndex[idx] ?? -1) >= messageVersions[idx].length - 1}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: (currentVersionIndex[idx] ?? -1) >= messageVersions[idx].length - 1 ? "var(--border)" : "#eab308",
                          cursor: (currentVersionIndex[idx] ?? -1) >= messageVersions[idx].length - 1 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "4px",
                          borderRadius: "4px",
                          transition: "all 0.2s",
                          width: "24px",
                          height: "24px",
                          opacity: (currentVersionIndex[idx] ?? -1) >= messageVersions[idx].length - 1 ? 0.3 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if ((currentVersionIndex[idx] ?? -1) < messageVersions[idx].length - 1) {
                            e.currentTarget.style.background = "var(--surface)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Previous version (older)"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                      </button>
                      
                      {/* Version indicator */}
                      <span style={{
                        fontSize: "11px",
                        color: "#eab308",
                        fontWeight: 500,
                        padding: "0 4px",
                      }}>
                        {(currentVersionIndex[idx] ?? -1) === -1 ? 'Latest' : `${messageVersions[idx].length - (currentVersionIndex[idx] ?? -1)}/${messageVersions[idx].length + 1}`}
                      </span>
                      
                      {/* Next version button */}
                      <button
                        onClick={() => onNextVersion(idx)}
                        disabled={(currentVersionIndex[idx] ?? -1) <= -1}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: (currentVersionIndex[idx] ?? -1) <= -1 ? "var(--border)" : "#eab308",
                          cursor: (currentVersionIndex[idx] ?? -1) <= -1 ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "4px",
                          borderRadius: "4px",
                          transition: "all 0.2s",
                          width: "24px",
                          height: "24px",
                          opacity: (currentVersionIndex[idx] ?? -1) <= -1 ? 0.3 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if ((currentVersionIndex[idx] ?? -1) > -1) {
                            e.currentTarget.style.background = "var(--surface)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                        title="Next version (newer)"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              )}
              {/* Action buttons for Gini (tutor/assistant), not for user */}
              {m.role !== "user" && !isPlaceholder && (
                  <div
                    style={{
                      // marginTop: "8px",
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    {/* Left side buttons */}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(m.text);
                          setCopiedMessageId(idx);
                          setTimeout(() => setCopiedMessageId(null), 2000);
                        }}
                        style={{
                          background: copiedMessageId === idx ? "rgba(34, 197, 94, 0.15)" : "none",
                          border: "none",
                          color: copiedMessageId === idx ? "#22c55e" : "var(--muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "6px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 500,
                          transition: "all 0.2s",
                          width: "28px",
                          height: "28px",
                        }}
                        onMouseEnter={(e) => {
                          if (copiedMessageId !== idx) {
                            e.currentTarget.style.background = "rgba(124, 156, 255, 0.1)";
                            e.currentTarget.style.color = "var(--accent)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (copiedMessageId !== idx) {
                            e.currentTarget.style.background = "none";
                            e.currentTarget.style.color = "var(--muted)";
                          }
                        }}
                        title={copiedMessageId === idx ? "Copied!" : "Copy to clipboard"}
                      >
                        {copiedMessageId === idx ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        )}
                      </button>
                      <button
                      onClick={() => {
                        if (speakingMessageId === idx) {
                          // Stop speaking this message
                          window.speechSynthesis.cancel();
                          setSpeakingMessageId(null);
                        } else {
                          // Stop any currently speaking message first
                          window.speechSynthesis.cancel();
                          setSpeakingMessageId(null);
                          
                          // Small delay to ensure previous speech is fully stopped
                          setTimeout(() => {
                            // Check if speech synthesis is available
                            if (!window.speechSynthesis) {
                              console.error('Speech synthesis not supported');
                              alert('Text-to-speech is not supported in your browser');
                              return;
                            }
                            
                            // Ensure voices are loaded
                            let availableVoices = window.speechSynthesis.getVoices();
                            if (availableVoices.length === 0) {
                              console.error('No voices available');
                              alert('Please wait for voices to load and try again');
                              return;
                            }
                            
                            // Set speaking state immediately for visual feedback
                            setSpeakingMessageId(idx);
                            
                            // Strip markdown formatting for natural speech
                            let cleanText = m.text
                              .replace(/Gini/gi, 'Ginny') // Fix pronunciation (hard G like "gun")
                              .replace(/#{1,6}\s+/g, '') // Remove markdown headers
                              .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
                              .replace(/\*(.+?)\*/g, '$1') // Remove italic
                              .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
                              .replace(/`(.+?)`/g, '$1') // Remove inline code
                              .replace(/```[\s\S]*?```/g, '') // Remove code blocks
                              .replace(/>\s+/g, '') // Remove blockquotes
                              .replace(/[-*+]\s+/g, '') // Remove list markers
                              .replace(/\d+\.\s+/g, '') // Remove numbered list markers
                              .replace(/\n+/g, '. ') // Replace newlines with pauses
                              .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // Remove emojis
                              .trim();
                            
                            if (!cleanText) {
                              console.error('No text to speak');
                              setSpeakingMessageId(null);
                              return;
                            }
                            
                            const utterance = new SpeechSynthesisUtterance(cleanText);
                            
                            // Try to find the user's preferred voice first
                            let selectedVoice = availableVoices.find(voice => voice.name === currentVoicePref);
                            
                            // If preferred voice not found, use fallback priority
                            if (!selectedVoice) {
                              selectedVoice = availableVoices.find(voice => voice.name === 'Google हिन्दी') ||
                                availableVoices.find(voice => voice.name.includes('Google') && voice.lang.startsWith('en')) ||
                                availableVoices.find(voice => voice.name.includes('Microsoft Zira')) ||
                                availableVoices.find(voice => voice.name.includes('Karen')) ||
                                availableVoices.find(voice => voice.name.includes('Victoria')) ||
                                availableVoices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female')) ||
                                availableVoices.find(voice => voice.lang.startsWith('en')) ||
                                availableVoices[0];
                            }
                            
                            if (selectedVoice) {
                              utterance.voice = selectedVoice;
                            }
                            
                            // Human-like speech settings
                            utterance.rate = 0.9;
                            utterance.pitch = 1.0;
                            utterance.volume = 1.0;
                            
                            // Track speaking state with proper cleanup
                            utterance.onstart = () => {
                              console.log('✓ Speech started for message:', idx);
                            };
                            
                            utterance.onend = () => {
                              console.log('✓ Speech ended for message:', idx);
                              setSpeakingMessageId(current => current === idx ? null : current);
                            };
                            
                            utterance.onerror = (event) => {
                              console.error('✗ Speech error:', event.error, event);
                              setSpeakingMessageId(null);
                            };
                            
                            // Ensure we're not in a paused state
                            if (window.speechSynthesis.paused) {
                              window.speechSynthesis.resume();
                            }
                            
                            // Start speaking
                            console.log('→ Starting speech for message:', idx, '| Voice:', selectedVoice?.name, '| Text length:', cleanText.length);
                            try {
                              window.speechSynthesis.speak(utterance);
                            } catch (error) {
                              console.error('✗ Failed to start speech:', error);
                              setSpeakingMessageId(null);
                              alert('Failed to start text-to-speech. Please try again.');
                            }
                          }, 100);
                        }
                      }}
                      style={{
                        background: speakingMessageId === idx ? "rgba(239, 68, 68, 0.15)" : "none",
                        border: "none",
                        color: speakingMessageId === idx ? "#ef4444" : "var(--muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 500,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (speakingMessageId !== idx) {
                          e.currentTarget.style.background = "rgba(124, 156, 255, 0.1)";
                          e.currentTarget.style.color = "var(--accent)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (speakingMessageId !== idx) {
                          e.currentTarget.style.background = "none";
                          e.currentTarget.style.color = "var(--muted)";
                        }
                      }}
                      title={speakingMessageId === idx ? "Stop reading" : "Read aloud"}
                    >
                      {speakingMessageId === idx ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                          </svg>
                          Stop
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                          </svg>
                          Read aloud
                        </>
                      )}
                    </button>
                    </div>
                    
                    {/* Right side - YouTube analyze button */}
                    <button
                      onClick={() => handleAnalyzeForYouTube(m.text, idx)}
                      disabled={generatingChatYt}
                      style={{
                        background: generatingChatYt 
                          ? "linear-gradient(135deg, rgba(124, 156, 255, 0.3) 0%, rgba(90, 123, 216, 0.25) 100%)" 
                          : "linear-gradient(135deg, rgba(124, 156, 255, 0.15) 0%, rgba(90, 123, 216, 0.1) 100%)",
                        border: "1px solid rgba(124, 156, 255, 0.3)",
                        color: generatingChatYt ? "var(--accent)" : "#7c9cff",
                        cursor: generatingChatYt ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
                        backgroundSize: generatingChatYt ? "200% 200%" : "100% 100%",
                        animation: generatingChatYt ? "gradientShift 2s ease infinite" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!generatingChatYt) {
                          e.currentTarget.style.background = "linear-gradient(135deg, rgba(124, 156, 255, 0.3) 0%, rgba(90, 123, 216, 0.25) 100%)";
                          e.currentTarget.style.borderColor = "rgba(124, 156, 255, 0.5)";
                          e.currentTarget.style.color = "#ffffff";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!generatingChatYt) {
                          e.currentTarget.style.background = "linear-gradient(135deg, rgba(124, 156, 255, 0.15) 0%, rgba(90, 123, 216, 0.1) 100%)";
                          e.currentTarget.style.borderColor = "rgba(124, 156, 255, 0.3)";
                          e.currentTarget.style.color = "#7c9cff";
                          e.currentTarget.style.transform = "translateY(0)";
                        }
                      }}
                      title="Analyze chat conversation and get YouTube video recommendations"
                    >
                      {generatingChatYt ? (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"></polygon>
                          </svg>
                          <span>Analyse & recommend YT video</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
            </div>
          );
        })}
        </div>
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            title="Scroll to latest"
            style={{
              position: "absolute",
              left: "50%",
              bottom: 22,
              transform: "translateX(-50%)",
              width: 36,
              height: 36,
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--btn-secondary-bg)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              boxShadow: "0 6px 16px rgba(0,0,0,0.22)",
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.2s ease",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-50%, -2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translate(-50%, 0)")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      

      {/* Input area */}
      <div
        style={{
          background: "#03183bff",
          // background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderRadius: 12,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          padding: "8px 14px",
          flexShrink: 0,
          boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.08), 0 -2px 4px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Input row - Image/toggle column and textarea */}
        {/* Uploaded Images Preview (above input area) */}
      {uploadedImages.length > 0 && (
        <div style={{
          display: "flex",
          flexDirection: "row",
          gap: "12px",
          marginBottom: 4,
          marginTop: 4,
          alignItems: "center",
          width: "100%"
        }}>
          {uploadedImages.map((url, idx) => (
            <div key={idx} style={{ position: "relative" }}>
              <img
                src={url}
                alt={`Upload ${idx + 1}`}
                style={{
                  width: "60px",
                  height: "60px",
                  objectFit: "cover",
                  borderRadius: "6px",
                  border: "2px solid var(--accent)",
                  boxShadow: "0 2px 8px rgba(124, 156, 255, 0.3)",
                  background: "#fff"
                }}
              />
              <button
                onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  border: "2px solid #fff",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}
                title="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          
          {/* Left side - Image upload button, toggle, and preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Image Upload Button */}
            <button
              onClick={() => document.getElementById('image-upload').click()}
              disabled={uploadingImage}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                // padding: "10px 12px",
                borderRadius: "10px",
                border: "2px solid var(--border)",
                background: uploadedImages.length > 0 ? "rgba(124, 156, 255, 0.12)" : "var(--border)",
                cursor: uploadingImage ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: uploadingImage ? 0.6 : 1,
                minHeight: "24px",
                whiteSpace: "nowrap",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
              }}
              onMouseEnter={(e) => {
                if (!uploadingImage) {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "rgba(124, 156, 255, 0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!uploadingImage) {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = uploadedImages.length > 0 ? "rgba(124, 156, 255, 0.1)" : "var(--surface)";
                }
              }}
              title="Add Image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text)" }}>
                {uploadingImage ? "Uploading..." : uploadedImages.length > 0 ? `${uploadedImages.length}` : "Add"}
              </span>
            </button>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                  handleImageUpload(files);
                  e.target.value = ''; // Reset input
                }
              }}
            />
            
            {/* Toggle Switch for Response Mode */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
              <div
                onClick={() => setInDepthMode(!inDepthMode)}
                style={{
                  width: "52px",
                  height: "24px",
                  borderRadius: "14px",
                  background: inDepthMode 
                    ? getBubbleTheme()
                    : 'var(--surface)',
                    // : "#4b5563",
                  position: "relative",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 3px",
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    left: inDepthMode ? "calc(100% - 25px)" : "3px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  }}
                />
              </div>
              <span style={{
                fontSize: "10px",
                color: inDepthMode ? "var(--accent)" : "#22c55e",
                fontWeight: 700,
                textAlign: "center",
                letterSpacing: "0.3px",
              }}>
                {inDepthMode ? "In-Depth" : "Concise"}
              </span>
            </div>
            
            {/* ...existing code... */}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
             background: "#03183bff",
            // background: 'var(--surface)',
            borderRadius: 12,
            // border: '2px solid var(--border)',
            // padding: '10px 14px',
            minHeight: 64,
            boxSizing: 'border-box',
            width: '100%',
            flex: 1,
          }}>
            <textarea
              ref={inputRef}
              rows={1}
              style={{
                flex: 1,
                width: '100%',
                background: "var(--input-bg)",
                color: "var(--text)",
                border: "3px solid var(--accent)",
                borderRadius: 10,
                padding: "14px 16px",
                resize: "none",
                fontFamily: "inherit",
                fontSize: "15px",
                minHeight: 90,
                maxHeight: 120,
                overflowY: 'auto',
                transition: 'all 0.2s ease',
                outline: "none",
                boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.1)",
                '::placeholder': { color: '#fff' }
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--accent)";
                e.target.style.boxShadow = "inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "inset 0 1px 3px rgba(0, 0, 0, 0.1)";
              }}
              value={question}
              onChange={e => {
                setQuestion(e.target.value);
                if (e.target) {
                  e.target.style.height = 'auto';
                  const newHeight = Math.max(78, Math.min(e.target.scrollHeight, 200));
                  e.target.style.height = newHeight + 'px';
                }
              }}
              placeholder={loadingAsk
                ? "Generating response...\n(you can type your next question)"
                : `Ask your tutor anything...\n(Enter to send • Shift+Enter for new line • Paste/drag images to upload)`}
              onPaste={e => {
                if (e.clipboardData && e.clipboardData.items) {
                  handlePasteOrDropImages(e.clipboardData.items);
                }
              }}
              onDrop={e => {
                e.preventDefault();
                if (e.dataTransfer && e.dataTransfer.items) {
                  handlePasteOrDropImages(e.dataTransfer.items);
                }
              }}
              onDragOver={e => {
                e.preventDefault();
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!loadingAsk) onAsk();
                }
              }}
            />
            <button
              type="button"
              onClick={handleMicClick}
              style={{
                minHeight: 51.87,
                width: 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                borderRadius: "10px",
                background: isListening ? 'rgba(34,197,94,0.12)' : 'var(--surface)',
                border: isListening ? '2px solid #22c55e' : '2px solid var(--border)',
                color: isListening ? '#22c55e' : 'var(--muted)',
                padding: "8px",
                margin: 0,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: isListening ? '2px solid #22c55e' : 'none',
                boxShadow: isListening ? '0 0 0 2px #22c55e33' : 'none',
              }}
              title={isListening ? 'Listening...' : 'Type with your voice'}
              aria-label="Type with your voice"
            >
              {isListening ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#22c55e"><circle cx="12" cy="12" r="10" opacity="0.2"/><rect x="9" y="4" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#22c55e" strokeWidth="2" fill="none"/></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="4" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              )}
            </button>
            <button
              onClick={loadingAsk ? onStopGeneration : onAsk}
              disabled={!loadingAsk && !question.trim()}
              style={{
                minHeight: 44,
                width: 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                borderRadius: "10px",
                background: loadingAsk 
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : question.trim() 
                    ? getBubbleTheme()
                    : "var(--surface)",
                border: "2px solid " + (loadingAsk ? "#ef4444" : question.trim() ? "transparent" : "var(--border)"),
                color: loadingAsk || question.trim() ? "#fff" : "var(--muted)",
                padding: "8px",
                cursor: (!loadingAsk && !question.trim()) ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                boxShadow: (loadingAsk || question.trim()) 
                  ? "0 4px 12px rgba(102, 126, 234, 0.3)"
                  : "0 1px 3px rgba(0, 0, 0, 0.08)",
                margin: 0,
              }}
            >
              {loadingAsk ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>Stop</span>
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>Send</span>
                </>
              )}
            </button>

          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div
          style={{
            marginTop: 8,
            color: "#ff7c7c",
            textAlign: "center",
            fontSize: "13px",
          }}
        >
          {errorMsg}
        </div>
      )}
    </div>
  );
}
