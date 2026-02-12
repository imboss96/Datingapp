
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_CHATS = [
  { id: '1', name: 'Elena', lastMessage: 'That sounds fun! Where should we meet?', time: '2m ago', image: 'https://picsum.photos/100/100?random=1', unread: 2 },
  { id: '2', name: 'Sarah', lastMessage: 'Hey! I saw you also like running!', time: '1h ago', image: 'https://picsum.photos/100/100?random=2', unread: 0 },
  { id: '3', name: 'Liam', lastMessage: 'Have you seen that new movie yet?', time: '3h ago', image: 'https://picsum.photos/100/100?random=3', unread: 0 },
];

const ChatList: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="md:hidden p-4 border-b">
        <h2 className="text-xl font-bold text-gray-800">Messages</h2>
      </div>

      <div className="p-4 border-b border-gray-50">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Matches</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
          {[4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex-shrink-0 text-center cursor-pointer group">
              <div className="w-14 h-14 rounded-full border-2 border-red-500 p-0.5 group-hover:scale-105 transition-transform">
                <img src={`https://picsum.photos/100/100?random=${i}`} className="w-full h-full rounded-full object-cover shadow-sm" alt="Match" />
              </div>
              <span className="text-[10px] font-bold mt-1.5 block text-gray-700">Maya</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Conversations</h3>
        </div>
        <div className="divide-y divide-gray-50">
            {MOCK_CHATS.map(chat => (
            <div 
                key={chat.id} 
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer group"
            >
                <div className="relative">
                    <img src={chat.image} className="w-14 h-14 rounded-full object-cover shadow-sm border border-gray-100" alt={chat.name} />
                    {chat.unread > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>}
                </div>
                <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-gray-900 truncate text-sm">{chat.name}</h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{chat.time}</span>
                </div>
                <p className={`text-xs truncate ${chat.unread > 0 ? 'font-bold text-gray-900' : 'text-gray-400 font-medium'}`}>
                    {chat.lastMessage}
                </p>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
