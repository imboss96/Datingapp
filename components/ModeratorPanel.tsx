
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface FlaggedItem {
  id: string;
  userId: string;
  message: string;
  status: 'pending' | 'warned' | 'banned' | 'dismissed';
  action?: string;
}

const FLAG_DATA = [
  { name: 'Mon', count: 12 },
  { name: 'Tue', count: 19 },
  { name: 'Wed', count: 15 },
  { name: 'Thu', count: 22 },
  { name: 'Fri', count: 30 },
  { name: 'Sat', count: 28 },
  { name: 'Sun', count: 14 },
];

const INITIAL_FLAGS: FlaggedItem[] = [
  { id: '1', userId: '#9201', message: '"Hey, you look hot. Can I get your number or something more private? 😉"', status: 'pending' },
  { id: '2', userId: '#9202', message: '"Let\'s meet up somewhere..need your location"', status: 'pending' },
  { id: '3', userId: '#9203', message: '"Can you send more photos?"', status: 'pending' },
];

const ModeratorPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'RESOLVED' | 'CHATS'>('PENDING');
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>(INITIAL_FLAGS);
  const [resolvedItems, setResolvedItems] = useState<FlaggedItem[]>([]);
  const navigate = useNavigate();

  const handleDismiss = (id: string) => {
    const item = flaggedItems.find(f => f.id === id);
    if (item) {
      setResolvedItems([...resolvedItems, { ...item, status: 'dismissed', action: 'Dismissed' }]);
      setFlaggedItems(flaggedItems.filter(f => f.id !== id));
    }
  };

  const handleWarn = (id: string) => {
    const item = flaggedItems.find(f => f.id === id);
    if (item) {
      setResolvedItems([...resolvedItems, { ...item, status: 'warned', action: 'User Warned' }]);
      setFlaggedItems(flaggedItems.filter(f => f.id !== id));
    }
  };

  const handleBan = (id: string) => {
    const item = flaggedItems.find(f => f.id === id);
    if (item) {
      setResolvedItems([...resolvedItems, { ...item, status: 'banned', action: 'User Banned' }]);
      setFlaggedItems(flaggedItems.filter(f => f.id !== id));
    }
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      <div className="p-6 bg-white border-b shadow-sm">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <i className="fa-solid fa-shield-halved text-red-500"></i>
          Mod Center
        </h2>
        <p className="text-sm text-gray-500 mt-1">AI-assisted moderation & reporting</p>
      </div>

      <div className="p-4 overflow-y-auto">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Security Analytics</h3>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={FLAG_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'PENDING' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => setActiveTab('CHATS')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'CHATS' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Live Chats
          </button>
          <button 
            onClick={() => setActiveTab('RESOLVED')}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeTab === 'RESOLVED' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          >
            Log
          </button>
        </div>

        {activeTab === 'PENDING' && (
          <div className="space-y-4">
            {flaggedItems.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-check-circle text-4xl text-emerald-100 mb-2"></i>
                <p className="text-gray-400 text-sm">No pending flags. Good job!</p>
              </div>
            ) : (
              flaggedItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <i className="fa-solid fa-comment-slash text-xs"></i>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Flagged Message</h4>
                        <p className="text-[10px] text-gray-500">From User ID: {item.userId}</p>
                      </div>
                    </div>
                    <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded uppercase">High Risk</span>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg mb-3 border border-gray-100 relative group">
                    <p className="text-xs text-gray-700 italic">{item.message}</p>
                    <button 
                      onClick={() => navigate('/chat/1')}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white shadow-sm border px-2 py-1 rounded text-[10px] font-bold text-blue-500 transition-opacity"
                    >
                      Edit Inline
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDismiss(item.id)}
                      className="flex-1 py-2 bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-md hover:bg-emerald-600 active:scale-95 transition-all"
                    >
                      Dismiss
                    </button>
                    <button 
                      onClick={() => handleWarn(item.id)}
                      className="flex-1 py-2 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-md hover:bg-amber-600 active:scale-95 transition-all"
                    >
                      Warn
                    </button>
                    <button 
                      onClick={() => handleBan(item.id)}
                      className="flex-1 py-2 bg-red-500 text-white text-[10px] font-bold rounded-lg shadow-md hover:bg-red-600 active:scale-95 transition-all"
                    >
                      Ban
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'CHATS' && (
          <div className="space-y-3">
            {[
              { id: '1', user1: 'Elena', user2: 'Mark', flags: 2 },
              { id: '2', user1: 'Sarah', user2: 'Alex', flags: 0 },
              { id: '3', user1: 'Liam', user2: 'Julia', flags: 1 },
            ].map(chat => (
              <div 
                key={chat.id} 
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-300"></div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{chat.user1} & {chat.user2}</h4>
                    <p className="text-[10px] text-gray-500">ID: {chat.id}-0x42</p>
                  </div>
                </div>
                {chat.flags > 0 && (
                  <div className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-1 rounded-full">
                    {chat.flags} FLAGGED
                  </div>
                )}
                <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'RESOLVED' && (
          <div className="space-y-3">
            {resolvedItems.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-inbox text-4xl text-gray-200 mb-2"></i>
                <p className="text-gray-400 text-sm">No resolved actions yet.</p>
              </div>
            ) : (
              resolvedItems.map(item => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        item.status === 'dismissed' ? 'bg-emerald-500' :
                        item.status === 'warned' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}>
                        {item.status === 'dismissed' ? '✓' :
                         item.status === 'warned' ? '⚠' :
                         '✕'}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">{item.action}</h4>
                        <p className="text-[10px] text-gray-500">{item.message.substring(0, 50)}...</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      item.status === 'dismissed' ? 'bg-emerald-100 text-emerald-600' :
                      item.status === 'warned' ? 'bg-amber-100 text-amber-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {item.userId}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeratorPanel;
