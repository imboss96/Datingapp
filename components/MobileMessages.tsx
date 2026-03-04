import React from "react";
import "../styles/MobileMessages.css";

// Dummy data for demonstration
const activities = [
  { name: "You", letter: "Y", className: "av1" },
  { name: "Dipti", letter: "D", className: "av2" },
  { name: "Ruchika", letter: "R", className: "av3" },
  { name: "Harshita", letter: "H", className: "av4" },
  { name: "Am..", letter: "A", className: "av5" },
];

const messages = [
  { name: "Bandhavi", time: "23 min", preview: "Sticker 😍", badge: 1, letter: "B", className: "av1" },
  { name: "Bhavani", time: "27 min", preview: "Typing..", badge: 2, letter: "B", className: "av7" },
  { name: "Ritu", time: "33 min", preview: "Ok, see you then.", badge: 0, letter: "R", className: "av2" },
  { name: "Sukrutha", time: "50 min", preview: "You: Hey! What's up, long time..", badge: 0, letter: "S", className: "av5" },
  { name: "Bhargavi", time: "55 min", preview: "You: Hello how are you?", badge: 0, letter: "B", className: "av6" },
  { name: "Jayanthi", time: "1 hour", preview: "You: Great I will write later..", badge: 0, letter: "J", className: "av3" },
];

export default function MobileMessages() {
  return (
    <div className="phone">
      <div className="notch"></div>
      <div className="status-bar">
        <span className="time">9:41</span>
        <div className="icons">
          {/* ...SVG icons... */}
        </div>
      </div>
      <div className="screen">
        <div className="header">
          <h1>Messages</h1>
          <div className="header-icon">
            {/* ...SVG icon... */}
          </div>
        </div>
        <div className="search-wrap">
          {/* ...SVG icon... */}
          <input type="text" placeholder="Search" />
        </div>
        <div className="section-title">Activities</div>
        <div className="activities">
          {activities.map((a, i) => (
            <div className="activity-item" key={i}>
              <div className={`activity-avatar ${a.className}`}>
                <div className="letter">{a.letter}</div>
                <div className={i === 0 ? "ring-double" : "ring"}></div>
              </div>
              <span className="activity-name">{a.name}</span>
            </div>
          ))}
        </div>
        <div className="section-title">Messages</div>
        <div className="messages-list">
          {messages.map((m, i) => (
            <div className="msg-item" key={i}>
              <div className="msg-avatar">
                <div className={`inner ${m.className}"><div className="letter">${m.letter}</div></div>`}></div>
                <div className="ring"></div>
              </div>
              <div className="msg-content">
                <div className="msg-top">
                  <span className="msg-name">{m.name}</span>
                  <span className="msg-time">{m.time}</span>
                </div>
                <div className={`msg-preview${m.preview.startsWith('You:') ? ' you' : ''}`}>{m.preview}</div>
              </div>
              {m.badge > 0 && <div className="msg-badge">{m.badge}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="bottom-nav">
        <div className="nav-item">
          {/* ...SVG icon... */}
        </div>
        <div className="nav-item">
          {/* ...SVG icon... */}
        </div>
        <div className="nav-item active">
          {/* ...SVG icon... */}
          <div className="nav-dot"></div>
        </div>
        <div className="nav-item">
          {/* ...SVG icon... */}
        </div>
      </div>
    </div>
  );
}
