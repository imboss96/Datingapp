
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserProfile, Message, UserRole } from '../types';
import { geminiService } from '../services/geminiService';

interface ChatRoomProps {
  currentUser: UserProfile;
  onDeductCoin: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, onDeductCoin }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', senderId: 'other', text: 'Hey there! How is your day going?', timestamp: Date.now() - 3600000, isFlagged: false },
    { id: 'm2', senderId: 'me', text: 'Doing great! Just browsing Spark.', timestamp: Date.now() - 1800000, isFlagged: false },
  ]);
  const [inputText, setInputText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const isModerator = currentUser.role === UserRole.MODERATOR || currentUser.role === UserRole.ADMIN;

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Global economy check: Standard users pay 1 coin per message
    if (!currentUser.isPremium && currentUser.coins < 1) {
      alert("Out of coins! Top up your balance in your profile to keep chatting.");
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: inputText,
      timestamp: Date.now(),
      isFlagged: false
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    
    // Deduct coin if not premium
    if (!currentUser.isPremium) {
      onDeductCoin();
    }

    const moderation = await geminiService.moderateContent(inputText);
    if (!moderation.isSafe) {
      setMessages(prev => prev.map(m => 
        m.id === newMessage.id ? { ...m, isFlagged: true, flagReason: moderation.reason } : m
      ));
    }
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setEditText(msg.text);
  };

  const saveEdit = () => {
    if (!editingMessageId) return;
    setMessages(prev => prev.map(m => 
      m.id === editingMessageId 
        ? { ...m, text: editText, isEditedByModerator: true, isFlagged: false } 
        : m
    ));
    setEditingMessageId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  return (
    <div className="flex flex-col h-full bg-white md:bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate('/chats')} className="md:hidden text-gray-500 hover:text-red-500 transition-colors">
          <i className="fa-solid fa-chevron-left text-lg"></i>
        </button>
        <img src="https://picsum.photos/100/100?random=1" className="w-11 h-11 rounded-full border border-gray-100 shadow-sm" alt="User" />
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-lg leading-tight">Elena</h3>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">Active Now</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 shadow-sm">
              <i className="fa-solid fa-coins text-amber-500 text-xs"></i>
              <span className="text-[10px] font-black text-amber-800">{currentUser.isPremium ? '∞' : currentUser.coins}</span>
            </div>
            {isModerator && (
            <div className="hidden sm:flex bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase items-center gap-2 border border-blue-100 shadow-sm">
                <i className="fa-solid fa-shield-halved"></i>
                Moderator Access
            </div>
            )}
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                <i className="fa-solid fa-ellipsis-vertical text-lg"></i>
            </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isEditing = editingMessageId === msg.id;

            return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 max-w-[85%] md:max-w-[70%] group">
                    {isModerator && !isEditing && (
                    <button 
                        onClick={() => startEditing(msg)}
                        className={`opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-blue-500 transition-all ${isMe ? 'order-first' : 'order-last'}`}
                    >
                        <i className="fa-solid fa-pen-nib"></i>
                    </button>
                    )}
                    
                    <div className={`rounded-2xl px-5 py-3 text-sm shadow-sm relative ${
                    isMe ? 'bg-red-500 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                    } ${msg.isFlagged ? 'border-2 border-amber-400 bg-amber-50 text-amber-900' : ''} ${
                    isEditing ? 'ring-2 ring-blue-400 border-transparent w-full shadow-lg' : ''
                    }`}>
                    {isEditing ? (
                        <div className="flex flex-col gap-3 min-w-[280px]">
                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                            <i className="fa-solid fa-pen-to-square"></i> Moderator intervention
                        </div>
                        <textarea
                            className="w-full bg-white text-gray-800 p-3 rounded-xl border border-blue-100 focus:outline-none text-sm resize-none"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            autoFocus
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={cancelEdit} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                            <button onClick={saveEdit} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-transform">
                            Save Edits
                            </button>
                        </div>
                        </div>
                    ) : (
                        <>
                        <div className="leading-relaxed font-medium">{msg.text}</div>
                        
                        {msg.isEditedByModerator && (
                            <div className={`mt-2 pt-2 border-t flex items-center gap-1.5 ${isMe ? 'border-white/10' : 'border-gray-50'}`}>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                isMe ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                            }`}>
                                <i className="fa-solid fa-user-shield text-[8px]"></i>
                                Modified by Moderator
                            </span>
                            </div>
                        )}

                        {msg.isFlagged && (
                            <div className="mt-2 pt-2 border-t border-amber-200 text-[10px] font-bold flex items-center gap-1.5 text-amber-700 italic">
                            <i className="fa-solid fa-triangle-exclamation text-amber-500"></i>
                            Community Standard Review Pending
                            </div>
                        )}
                        </>
                    )}
                    </div>
                </div>
                <div className={`text-[9px] mt-1.5 font-bold tracking-tighter text-gray-400 uppercase ${isMe ? 'mr-1' : 'ml-1'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                </div>
            );
            })}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white md:bg-transparent border-t md:border-none sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white md:shadow-2xl md:rounded-3xl p-3 md:p-4 border border-gray-100">
            <div className="hidden sm:flex flex-col items-center">
              <i className="fa-solid fa-coins text-amber-500 text-xs"></i>
              <span className="text-[8px] font-black text-amber-700">-1</span>
            </div>
            <button className="text-gray-300 hover:text-gray-500 text-2xl px-2 transition-transform active:scale-90">
                <i className="fa-solid fa-circle-plus"></i>
            </button>
            <div className="flex-1 bg-gray-50 rounded-2xl px-5 py-3 flex items-center border border-gray-100">
                <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="bg-transparent w-full focus:outline-none text-sm text-gray-800 placeholder:text-gray-400"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
            </div>
            <button 
                onClick={handleSend}
                className="w-12 h-12 rounded-2xl spark-gradient text-white flex items-center justify-center shadow-lg hover:shadow-red-500/20 active:scale-95 transition-all disabled:grayscale disabled:opacity-30"
                disabled={!inputText.trim()}
            >
                <i className="fa-solid fa-paper-plane text-lg"></i>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
