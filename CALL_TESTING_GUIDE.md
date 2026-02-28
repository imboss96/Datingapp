# Professional Call System - Testing Guide

## Quick Test Scenarios

### Scenario 1: Simple Voice Call (Happy Path)
**Setup**: Two users connected in different browsers

1. **User A initiates call**:
   - Click voice call button in chat
   - Confirm call dialog
   - ✓ Chat log shows: `[CALL] 📞 Outgoing voice call to {UserB} • HH:MM:SS`

2. **User B receives call**:
   - ✓ Ringing sound plays
   - ✓ Incoming call dialog appears
   - Chat log shows: `[CALL] 📱 Incoming voice call from {UserA} • HH:MM:SS`

3. **User B accepts**:
   - Click "Accept" button
   - ✓ Video call room opens
   - Chat log shows: `[CALL] ✅ Accepted voice call from {UserA} • HH:MM:SS`

4. **Call in progress**:
   - ✓ Audio flows both directions
   - ✓ Duration timer counts up
   - ✓ "Connected" badge shows in call info

5. **User A ends call**:
   - Click "End Call" button
   - ✓ Navigate back to chat
   - Chat log shows: `[CALL] 📞 Voice call ended with {UserB} • HH:MM:SS`

---

### Scenario 2: Call Rejection
**Setup**: Two users connected

1. **User A initiates video call**
2. **User B rejects** before accepting
   - ✓ Incoming dialog closes
   - Chat log shows: `[CALL] ❌ Rejected video call from {UserA} • HH:MM:SS`
3. **User A sees rejection** (if implemented):
   - ✓ Call dialog closes
   - Alert shows or log shows rejection

---

### Scenario 3: User Busy (Different Browser Windows)
**Setup**: User B already in call with User C

1. **User A tries to call User B**:
   - Initiates call to User B
   - ✓ Alert appears: "User B is currently on another call"
   - ✓ Chat log shows: `[CALL] ⏸️  Call to {UserB} failed - User is busy • HH:MM:SS`

2. **User A can't enter call room**:
   - ✓ Call room doesn't open
   - ✓ Audio doesn't start

---

### Scenario 4: User Unavailable
**Setup**: User B offline or not connected

1. **User A tries to call User B**:
   - Initiates call
   - ✓ Alert appears: "User unavailable right now"
   - ✓ Chat log shows: `[CALL] ❌ Call to {UserB} failed - User unavailable • HH:MM:SS`

---

### Scenario 5: Disconnect During Call
**Setup**: Active call in progress

1. **User B suddenly closes browser**:
   - Backend detects disconnect
   - ✓ User A's peer connection drops
   - ✓ User A can click "End Call" to return
   - Chat log shows: `[CALL] 📞 Voice call ended...`

2. **Backend cleans up**:
   - ✓ User B's call state removed
   - ✓ Call entry removed from active calls
   - ✓ User A receives call_end signal

---

## Browser Console Checks

### Expected Backend Logs:
```
[WebSocket] User {userId} registered
[WebSocket] call_incoming: from {A} to {B}
[WebSocket] Created new call: {callId}
[WebSocket] call_accepted: from {B} to {A}
[WebSocket] Call {callId} status updated to active
[WebSocket] call_end: from {A} to {B}
[WebSocket] Call {callId} ended - duration: {seconds}s
[WebSocket] Cleaned up call {callId} for disconnected user {userId}
```

### Expected Frontend Logs (ChatRoom):
```
[DEBUG ChatRoom] Initiating call to: {userId}, isVideo: false
[ChatRoom handleIncomingCall] Processing incoming call from: {userId}
[ChatRoom handleCallNotification] Received notification: call_busy
[ChatRoom] Call ended, logging event
```

### Expected Frontend Logs (VideoCallRoom):
```
[VideoCallRoom] Ending call - duration: 145 seconds
[VideoCallRoom] Call {callId} status updated to active
[VideoCallRoom] Other user ended the call
[VideoCallRoom] Call was rejected by remote user
```

---

## Call Log Message Examples

### What you'll see in chat:
```
23:45:12 ⬅️
[CALL] 📞 Outgoing voice call to Sarah • 14:30:45

23:45:15 ⬆️
[CALL] ✅ Accepted voice call from Sarah • 14:30:50

23:48:30 ⬅️
[CALL] 📞 Voice call ended with Sarah • 14:35:20

---

14:45:10 ⬆️
[CALL] 📱 Incoming video call from John • 14:45:10

14:45:15 ⬅️
[CALL] ❌ Rejected video call from John • 14:45:15

---

15:00:20 ⬅️
[CALL] ⏸️  Call to Mike failed - User is busy • 15:00:20

15:05:30 ⬅️
[CALL] ❌ Call to Emma failed - User unavailable • 15:05:30
```

---

## Performance Metrics (Optional)

Monitor these to ensure smooth operation:

1. **Call Initiation Time**: < 2 seconds from button click to ringing
2. **Audio Delay**: < 200ms between users
3. **Call State Update**: < 500ms from action to log appearance
4. **Disconnection Cleanup**: < 1 second to clean up and notify

---

## Known Limitations & Future Features

### Current Limitations:
- No call history stored (only current chat logs)
- No missed call indicators
- No call transfer between users
- No conference calls (3+ people)
- No call recording

### Coming Soon:
- [ ] Call history endpoint
- [ ] Missed calls badge
- [ ] Call duration stored in DB
- [ ] Push notifications for calls
- [ ] Call statistics/analytics

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No ringing sound | Check volume, verify `/audio/ringing-tone.mp3` exists |
| Call shows busy always | Check backend call state cleanup on disconnect |
| Call logs don't appear | Check ChatRoom has chatId, verify logCallEvent function |
| Call won't connect | Check WebRTC initialization, review console for errors |
| Disconnect doesn't cleanup | Ensure disconnect handler in websocket.js has proper cleanup |
| User joined alert doesn't show | Check VideoCallRoom useEffect dependencies |

---

## Code Validation

### Run these checks before deploying:

1. **Backend websocket.js**:
   - Verify activeCalls and userCallState maps exist
   - Verify busy check logic in call_incoming handler
   - Verify disconnect cleanup

2. **Frontend WebSocketProvider.tsx**:
   - Verify call_notification event dispatch
   - Verify call_busy and call_unavailable events are dispatched

3. **Frontend ChatRoom.tsx**:
   - Verify logCallEvent format matches documentation
   - Verify handleCallNotification handler exists
   - Verify call initiation sends toName parameter

4. **Frontend VideoCallRoom.tsx**:
   - Verify endCall includes duration
   - Verify call_rejected handler exists
   - Verify showAlert is imported

---

## Success Indicators

✅ All tests pass  
✅ No console errors  
✅ Call logs appear in chat (with emojis and timestamps)  
✅ Busy notifications work  
✅ Call duration sent to backend  
✅ Disconnect cleanup verified  
✅ Load tested with multiple concurrent calls  

---

## Support

For issues, check:
1. Browser console for error messages
2. Backend server logs for WebSocket activity
3. Network tab for WebSocket messages
4. Database for call state persistence
