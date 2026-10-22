import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthModal from './components/AuthModal';
import ChatRoom from './components/ChatRoom';
import P2PMarket from './components/P2PMarket';
import { logUserInterest, searchLikeminds } from './aiEngine';
import { MessageSquare, Search, User, Wallet, LogOut, Bell, Edit2, Sparkles, Trash2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  
  // Chat List States
  const [conversations, setConversations] = useState([]);
  const [chatFilter, setChatFilter] = useState('all');
  const [chatSearch, setChatSearch] = useState('');
  const [directUsername, setDirectUsername] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState(null);

  // AI Match & Log States
  const [logInput, setLogInput] = useState('');
  const [userLogs, setUserLogs] = useState([]);
  const [matchResults, setMatchResults] = useState([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchRecentConversations(session.user.id);
        fetchUserLogs(session.user.id);
        subscribeToProfileUpdates(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        fetchRecentConversations(session.user.id);
        fetchUserLogs(session.user.id);
        subscribeToProfileUpdates(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) setProfile(data);
  };

  const subscribeToProfileUpdates = (userId) => {
    supabase
      .channel(`public:profiles:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          setProfile(payload.new);
        }
      )
      .subscribe();
  };

  const fetchUserLogs = async (userId) => {
    const { data } = await supabase
      .from('user_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setUserLogs(data);
  };

  const fetchRecentConversations = async (userId) => {
    const { data: msgs, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return;

    if (msgs && msgs.length > 0) {
      const otherUserIds = [...new Set(msgs.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, gender_avatar')
        .in('id', otherUserIds);

      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(p => profileMap.set(p.id, p));
      }

      const map = new Map();
      msgs.forEach((m) => {
        const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
        const otherProfile = profileMap.get(otherId);

        if (!map.has(otherId) && otherProfile) {
          map.set(otherId, {
            user_id: otherId,
            username: otherProfile.username,
            gender_avatar: otherProfile.gender_avatar,
            lastMessage: m.message_text,
            created_at: m.created_at,
            is_unread: m.receiver_id === userId && !m.is_read,
          });
        }
      });
      setConversations(Array.from(map.values()));
    } else {
      setConversations([]);
    }
  };

  const handleLogData = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Saving interest vector...');

    try {
      await logUserInterest(session.user.id, logInput.trim());
      setStatusMessage('Log saved!');
      setLogInput('');
      await fetchUserLogs(session.user.id);
    } catch (err) {
      setStatusMessage(err.message || 'Failed to save log.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleDeleteSingleLog = async (logId) => {
    const { error } = await supabase.from('user_logs').delete().eq('id', logId);
    if (!error) {
      setUserLogs((prev) => prev.filter((l) => l.id !== logId));
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!window.confirm('Delete all your logged details?')) return;
    const { error } = await supabase.from('user_logs').delete().eq('user_id', session.user.id);
    if (!error) {
      setUserLogs([]);
    }
  };

  const handleFindLikeminds = async () => {
    if (!logInput.trim()) return;
    setLoadingAI(true);
    setStatusMessage('Searching AI vector database...');

    try {
      const rawResults = await searchLikeminds(logInput.trim(), session.user.id);
      
      const uniqueUsersMap = new Map();
      rawResults.forEach((match) => {
        if (!uniqueUsersMap.has(match.user_id)) {
          uniqueUsersMap.set(match.user_id, match);
        }
      });

      const deduplicatedResults = Array.from(uniqueUsersMap.values());

      setMatchResults(deduplicatedResults);
      setStatusMessage(
        deduplicatedResults.length > 0 
          ? `Found ${deduplicatedResults.length} match(es)!` 
          : 'No close matches found.'
      );
    } catch (err) {
      setStatusMessage(err.message || 'Failed to search database.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleStartDirectChat = async () => {
    if (!directUsername.trim()) return;
    const cleanUser = directUsername.replace('@', '').trim();
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUser)
      .single();

    if (data) {
      setSelectedChatUser({
        user_id: data.id,
        username: data.username,
        gender_avatar: data.gender_avatar,
      });
      setDirectUsername('');
    } else {
      alert(`User @${cleanUser} not found.`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.username.toLowerCase().includes(chatSearch.toLowerCase());
    if (chatFilter === 'unread') return matchesSearch && c.is_unread;
    if (chatFilter === 'read') return matchesSearch && !c.is_unread;
    return matchesSearch;
  });

  const inChatRoom = activeTab === 'chat' && selectedChatUser !== null;
